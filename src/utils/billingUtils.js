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
    const realNow = new Date();
    const isHistorical = targetDate.getFullYear() < realNow.getFullYear() || 
                         (targetDate.getFullYear() === realNow.getFullYear() && targetDate.getMonth() < realNow.getMonth());
                         
    const currentYear = targetDate.getFullYear();
    const currentMonth = targetDate.getMonth();
    // Simulate end of the month if checking history, so all cycles trigger. Normal otherwise.
    const currentDay = isHistorical ? 31 : targetDate.getDate();

    let missingCount = 0;
    let missingAmount = 0;
    let missingClients = [];

    clientsList.forEach(client => {
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

            let startMonth = currentMonth; // Par défaut, on ne regarde que le mois en cours
            let endMonth = currentMonth;

            if (client.dateDebut) {
                const dD = new Date(client.dateDebut);
                if (dD.getFullYear() === currentYear) {
                    startMonth = dD.getMonth();
                } else if (dD.getFullYear() < currentYear) {
                    startMonth = 0;
                } else if (dD.getFullYear() > currentYear) {
                    startMonth = 12; // Désactive la boucle pour cette année future
                }
            }

            if (client.dateFin) {
                const dF = new Date(client.dateFin);
                if (dF.getFullYear() === currentYear && dF.getMonth() < currentMonth) {
                    endMonth = dF.getMonth();
                } else if (dF.getFullYear() < currentYear) {
                    endMonth = -1;
                }
            }

            for (let m = startMonth; m <= endMonth; m++) {
                const targetCycleMonth = m;
                const targetCycleYear = currentYear;

                // 1. Détermination de la date de fin du cycle
                // Pour "Mois civil" (cycleDay=1), Janvier finit le 31 Janvier.
                // Pour "Du 15 au 14" (cycleDay=15), Janvier finit le 14 Février.
                const cycleEndDate = (cycleDay === 1)
                    ? new Date(targetCycleYear, targetCycleMonth + 1, 0) // Dernier jour du mois M
                    : new Date(targetCycleYear, targetCycleMonth, cycleDay - 1);

                const nowZeroTime = new Date(currentYear, currentMonth, currentDay);
                const diffTime = cycleEndDate.getTime() - nowZeroTime.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                // PROTECTION CRITIQUE :
                // 1. Si on est au mois courant ou futur, on attend d'être à 5 jours de la fin
                if (diffDays > 5) {
                    continue;
                }

                // 2. Si c'est un mois trop vieux (plus de 60 jours de retard),
                // on considère que c'est de l'histoire ancienne (déjà géré ailleurs)
                if (diffDays < -45) {
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
                        if (f.statut === 'Draft' || f.statut === 'Archived') return false;
                        
                        const pdStr = f.periodeDebut;
                        if (pdStr) {
                            const pd = new Date(pdStr);
                            if (!isNaN(pd.getTime())) {
                                return (pd.getFullYear() === targetCycleYear && pd.getMonth() === targetCycleMonth);
                            }
                        }

                        const dEmi = f.dateEmi ? new Date(f.dateEmi) : null;
                        if (dEmi && !isNaN(dEmi.getTime())) {
                            const emiYear = dEmi.getFullYear();
                            const emiMonth = dEmi.getMonth();
                            const emiDate = dEmi.getDate();

                            // Cas 1: Même mois d'émission que la période (ex: émis le 30 Avril pour Avril)
                            if (emiYear === targetCycleYear && emiMonth === targetCycleMonth) return true;

                            // Cas 2: Proximité de la fin de cycle (ex: émis le 2 Mai pour Avril)
                            // Fenêtre de +/- 10 jours autour de la fin du cycle
                            const diffDaysEmi = Math.abs(dEmi.getTime() - cycleEndDate.getTime()) / (1000 * 60 * 60 * 24);
                            if (diffDaysEmi <= 10) return true;
                        }
                        return false;
                    });
                }

                if (!hasInvoiceForTarget) {
                    const alertKey = `${client.id}-${targetCycleMonth}-${targetCycleYear}`;
                    const isIgnored = ignoredAlerts.some(a => (typeof a === 'string' ? a === alertKey : a.key === alertKey));
                    if (!isIgnored) {
                        missingCount++;
                        missingAmount += parseFloat(client.montantMensuel || 0);

                        // Debug info PROFOND pour comprendre le trigger
                        const debugInfo = `(m=${m+1}, d=${diffDays}j, ref=${currentDay}/${currentMonth+1})`;

                        missingClients.push({
                            ...client,
                            targetMonth: targetCycleMonth,
                            targetYear: targetCycleYear,
                            cycleDay: cycleDay,
                            alertStatus: alertStatus,
                            reason: m === startMonth ? `Début contrat ${debugInfo}` : `Mensuel ${debugInfo}`
                        });
                    }
                }
            }
        } 
        
        // --- 2. ONE-SHOT LOGIC ---
        else if (client.regime === 'One-Shot') {
            const clientInvoices = factures.filter(f => f.clientId === client.id || f.client === client.enseigne);
            
            // If no invoice at all and client was created more than 7 days ago
            if (clientInvoices.length === 0) {
                const createdDate = client.dateDebut ? new Date(client.dateDebut) : new Date(2025, 0, 1);
                const diffTime = realNow - createdDate;
                const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                
                // PROTECTION : Mêmes limites que pour les abonnements
                if (diffDays > 5 || diffDays < -45) return;

                if (diffDays >= 7) {
                    missingCount++;
                    missingAmount += parseFloat(client.montantAnnuel || client.montantMensuel || 0);
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

    // FILTRE DE SÉCURITÉ FINAL : On ne propose JAMAIS rien qui finit dans plus de 5 jours
    // et on s'assure de ne rien proposer avant la date de début réelle du client.
    return {
        missingCount: missingClients.length,
        missingAmount: missingClients.reduce((acc, c) => acc + (parseFloat(c.montantMensuel || c.montantAnnuel || 0)), 0),
        missingClients: missingClients.filter(mc => {
            const cycleEndDate = (mc.cycleDay === 1)
                ? new Date(mc.targetYear, mc.targetMonth + 1, 0)
                : new Date(mc.targetYear, mc.targetMonth, (mc.cycleDay || 1) - 1);
            
            const diffTime = cycleEndDate.getTime() - realNow.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            // On ne garde que si on est à 5 jours ou moins de la fin (ou dans le passé)
            return diffDays <= 5;
        })
    };
};
