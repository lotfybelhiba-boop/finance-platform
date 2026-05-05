// src/utils/billingUtils.js

/**
 * Calcule globalement et avec précision les factures en attente basées
 * sur le "Cycle de facturation" personnalisé de chaque client.
 * 
 * @param {Array} clientsList - La liste complète des clients
 * @param {Array} factures - La liste complète des factures
 * @param {Array} ignoredAlerts - (Optionnel) tableau de clés d'alertes ignorées
 * @returns {Object} { count, amount, missingClients }
 */
export const calculatePendingInvoices = (clientsList, factures, ignoredAlerts = [], targetDate = new Date()) => {
    // 0. DE-DUPLICATION of clientsList by name to prevent phantom alerts from local data inconsistencies
    const normalize = (s) => (s || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '').trim();
    const uniqueClientsMap = {};
    
    clientsList.forEach(c => {
        let nameKey = normalize(c.enseigne);
        if (!nameKey) return;
        if (nameKey.includes('bosch')) nameKey = 'robertboschtunisie';
        
        if (!uniqueClientsMap[nameKey]) {
            uniqueClientsMap[nameKey] = c;
        } else {
            // Keep the one with a price if possible
            const existing = uniqueClientsMap[nameKey];
            const score = (c.montantMensuel || 0) + (c.montantTotal || 0) + (c.servicesRecurrents?.length || 0);
            const existingScore = (existing.montantMensuel || 0) + (existing.montantTotal || 0) + (existing.servicesRecurrents?.length || 0);
            if (score > existingScore) {
                uniqueClientsMap[nameKey] = c;
            }
        }
    });
    const dedupedClients = Object.values(uniqueClientsMap);

    const realNow = new Date();
    const isHistorical = targetDate.getFullYear() < realNow.getFullYear() || 
                         (targetDate.getFullYear() === realNow.getFullYear() && targetDate.getMonth() < realNow.getMonth());
                         
    const currentYear = targetDate.getFullYear();
    const currentMonth = targetDate.getMonth();
    // Simulate end of the month if checking history, so all cycles trigger. Normal otherwise.
    const currentDay = isHistorical ? 31 : targetDate.getDate();

    let missingClients = [];

    dedupedClients.forEach(client => {
        if (client.etatClient !== 'Actif') return;

        // --- 1. SUBSCRIPTION (ABONNEMENT) LOGIC ---
        if (client.regime === 'Abonnement') {
            let cycleDay = 1;
            if (client.modeCycle === 'Du 15 au 14') {
                cycleDay = 15;
            } else if (client.modeCycle?.includes('Mois civil')) {
                cycleDay = 1;
            } else if ((client.modeCycle === "Date de début" || client.modeCycle === "Date d'entrée") && client.dateDebut) {
                const d = new Date(client.dateDebut);
                if (!isNaN(d.getTime())) cycleDay = d.getDate();
            } else if (client.modeCycle === 'Personnalisé' && client.jourCycle) {
                cycleDay = parseInt(client.jourCycle, 10);
            } else {
                // Fallback for older data or missing mode
                if (client.jourFacturation) {
                    cycleDay = parseInt(client.jourFacturation, 10);
                } else if (client.dateDebut) {
                    const d = new Date(client.dateDebut);
                    if (!isNaN(d.getTime())) cycleDay = d.getDate();
                } else if (client.jourPaiement) {
                    cycleDay = parseInt(client.jourPaiement, 10) || 1;
                }
            }

            if (isNaN(cycleDay) || cycleDay < 1 || cycleDay > 31) cycleDay = 1;

            const isElkindy = client.enseigne && client.enseigne.toLowerCase().includes('elkindy');
            
            let startYear = currentYear;
            let endYear = currentYear;

            if (isElkindy && client.dateDebut) {
                const dD = new Date(client.dateDebut);
                if (!isNaN(dD.getTime())) {
                    startYear = dD.getFullYear();
                }
            }

            for (let y = startYear; y <= endYear; y++) {
                let startMonth = 0;
                let endMonth = 11;

                if (y === currentYear) {
                    endMonth = currentMonth;
                }

                if (client.dateDebut) {
                    const dD = new Date(client.dateDebut);
                    if (dD.getFullYear() === y) {
                        startMonth = dD.getMonth();
                    } else if (dD.getFullYear() > y) {
                        startMonth = 12; // Désactive la boucle pour cette année future
                    }
                }

                if (client.dateFin) {
                    const dF = new Date(client.dateFin);
                    if (dF.getFullYear() === y && dF.getMonth() < endMonth) {
                        endMonth = dF.getMonth();
                    } else if (dF.getFullYear() < y) {
                        endMonth = -1; // Désactive la boucle
                    }
                }

                for (let m = startMonth; m <= endMonth; m++) {
                    const targetCycleMonth = m;
                    const targetCycleYear = y;

                    // 1. Détermination de la date de DÉBUT du cycle (la facturation se déclenche en début de période)
                    const cycleStartDate = (cycleDay === 1)
                        ? new Date(targetCycleYear, targetCycleMonth, 1) // 1er jour du mois M
                        : new Date(targetCycleYear, targetCycleMonth - 1, cycleDay);

                    const nowZeroTime = new Date(currentYear, currentMonth, currentDay);
                    const diffTime = cycleStartDate.getTime() - nowZeroTime.getTime();
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                    // PROTECTION CRITIQUE :
                    // 1. Si on est au mois courant ou futur, on attend d'être à 5 jours de la fin
                    if (diffDays > 5) {
                        continue;
                    }

                    // 2. Si c'est un mois trop vieux (plus de 60 jours de retard),
                    // on considère que c'est de l'histoire ancienne (déjà géré ailleurs)
                    // SAUF pour Elkindy qui souhaite rattraper son historique !
                    if (!isElkindy && diffDays < -45) {
                        continue;
                    }

                    let alertStatus = 'urgent';
                    // Urgent si on est à 2 jours ou moins de la fin du cycle
                    // Warning si on est entre 3 et 5 jours
                    if (diffDays > 2) {
                        alertStatus = 'warning';
                    }

                    const clientInvoices = factures.filter(f => 
                        (f.clientId && f.clientId === client.id) || 
                        (f.client && client.enseigne && (
                            f.client.toLowerCase().includes(client.enseigne.toLowerCase()) || 
                            client.enseigne.toLowerCase().includes(f.client.toLowerCase())
                        ))
                    );

                    let hasInvoiceForTarget = false;

                    if (clientInvoices.length > 0) {
                        hasInvoiceForTarget = clientInvoices.some(f => {
                            if (f.statut === 'Archived') return false;
                            if (f.isExtra) return false; // IMPORTANT: Les extras (isExtra) ne comptabilisent PAS mensuellement !
                        
                        // 1. Match by explicit Period (periodeDebut)
                        const pdStr = f.periodeDebut;
                        if (pdStr) {
                            const pd = new Date(pdStr);
                            if (!isNaN(pd.getTime())) {
                                const expectedMonth = (cycleDay === 1) ? targetCycleMonth : targetCycleMonth - 1;
                                const expectedYear = (expectedMonth < 0) ? targetCycleYear - 1 : targetCycleYear;
                                const normMonth = (expectedMonth < 0) ? 11 : expectedMonth;
                                
                                return pd.getFullYear() === expectedYear && pd.getMonth() === normMonth;
                            }
                        }

                        // 2. Match by Emission Date (tolerant range)
                        const dEmi = f.dateEmi ? new Date(f.dateEmi) : null;
                        if (dEmi && !isNaN(dEmi.getTime())) {
                            const emiYear = dEmi.getFullYear();
                            const emiMonth = dEmi.getMonth();
                            
                            // Match if emitted in the same month OR the following month
                            if (emiYear === targetCycleYear) {
                                if (emiMonth === targetCycleMonth) return true;
                                if (emiMonth === targetCycleMonth + 1) return true;
                            } else if (emiYear === targetCycleYear + 1 && targetCycleMonth === 11 && emiMonth === 0) {
                                return true; // Dec -> Jan case
                            }
                        }
                        
                        // 3. Fallback: match by name and description if available
                        const targetMonthName = new Date(targetCycleYear, targetCycleMonth).toLocaleDateString('fr-FR', { month: 'long' });
                        const containsMonth = f.lignes?.some(l => 
                            l.desc?.toLowerCase().includes(targetMonthName.toLowerCase()) ||
                            l.desc?.toLowerCase().includes(String(targetCycleYear))
                        );
                        if (containsMonth && f.clientId === client.id) return true;

                        return false;
                    });
                }

                    if (!hasInvoiceForTarget) {
                        const alertKey = `${client.id}-${targetCycleMonth}-${targetCycleYear}`;
                        const isIgnored = ignoredAlerts.some(a => (typeof a === 'string' ? a === alertKey : a.key === alertKey));
                        if (!isIgnored) {
                            // Debug info PROFOND pour comprendre le trigger
                            const debugInfo = `(m=${m+1}, y=${y}, d=${diffDays}j)`;
    
                            missingClients.push({
                                ...client,
                                targetMonth: targetCycleMonth,
                                targetYear: targetCycleYear,
                                cycleDay: cycleDay,
                                alertStatus: alertStatus,
                                reason: (m === startMonth && y === startYear) ? `Début contrat ${debugInfo}` : `Mensuel ${debugInfo}`
                            });
                        }
                    }
                }
            }
        } 
        
        // --- 2. ONE-SHOT LOGIC ---
        else if (client.regime === 'One-Shot') {
            const clientInvoices = factures.filter(f => f.clientId === client.id || f.client === client.enseigne);
            
            // If no invoice at all, check if it's time to bill
            if (clientInvoices.length === 0) {
                const createdDate = client.dateDebut ? new Date(client.dateDebut) : new Date(2025, 0, 1);
                const diffTime = realNow - createdDate;
                const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                
                // Show alert between 7 and 90 days after start date (not too early, not too old)
                if (diffDays >= 7 && diffDays <= 90) {
                    missingClients.push({
                        ...client,
                        targetMonth: realNow.getMonth(),
                        targetYear: realNow.getFullYear(),
                        alertStatus: diffDays > 14 ? 'urgent' : 'warning',
                        reason: 'Facturation initiale attendue'
                    });
                }
            }
        }
    });

    // FINAL FILTERING & Totals Calculation
    const filteredMissing = missingClients.filter(mc => {
        const cycleStartDate = (mc.cycleDay === 1)
            ? new Date(mc.targetYear, mc.targetMonth, 1)
            : new Date(mc.targetYear, mc.targetMonth - 1, mc.cycleDay || 1);
        
        const diffTime = cycleStartDate.getTime() - realNow.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        return diffDays <= 5;
    });

    const getMontant = (c) => {
        if (c.regime === 'Abonnement') return parseFloat(c.montantMensuel || 0);
        return parseFloat(c.montantTotal || c.montantAnnuel || c.montantMensuel || 0);
    };

    return {
        missingCount: filteredMissing.length,
        missingAmount: filteredMissing.reduce((acc, c) => acc + getMontant(c), 0),
        count: filteredMissing.length,
        amount: filteredMissing.reduce((acc, c) => acc + getMontant(c), 0),
        missingClients: filteredMissing
    };
};
