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
        if (client.regime === 'Abonnement' && client.etatClient === 'Actif') {
            let cycleDay = 1;
            if (client.modeCycle === 'Du 15 au 14') {
                cycleDay = 15;
            } else if ((client.modeCycle === "Date de début" || client.modeCycle === "Date d'entrée") && client.dateDebut) {
                const d = new Date(client.dateDebut);
                if (!isNaN(d.getTime())) cycleDay = d.getDate();
            } else if (client.modeCycle === 'Personnalisé' && client.jourCycle) {
                cycleDay = parseInt(client.jourCycle, 10);
            } else {
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

            let startMonth = 0;
            let endMonth = currentMonth;

            if (client.dateDebut) {
                const dD = new Date(client.dateDebut);
                if (dD.getFullYear() === currentYear) {
                    startMonth = dD.getMonth();
                    if (dD.getDate() > cycleDay) {
                        startMonth++;
                    }
                } else if (dD.getFullYear() > currentYear) {
                    startMonth = 12;
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

                // L'alerte se déclenche à la FIN du cycle de facturation (ou J-2 max)
                // La facture de Mars (m=2) pour cycleDay=15 (15/03 -> 14/04) s'alerte le 15/04 (m+1)
                const alertTriggerDate = new Date(targetCycleYear, targetCycleMonth + 1, cycleDay);

                const nowZeroTime = new Date(currentYear, currentMonth, currentDay);
                const diffTime = alertTriggerDate.getTime() - nowZeroTime.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                if (diffDays > 2) {
                    continue;
                }

                let alertStatus = 'urgent';
                if (diffDays > 0 && diffDays <= 2) {
                    alertStatus = 'warning';
                }

                const clientInvoices = factures.filter(f => f.clientId === client.id);
                let hasInvoiceForTarget = false;

                if (clientInvoices.length > 0) {
                    hasInvoiceForTarget = clientInvoices.some(f => {
                        if (f.periodeDebut) {
                            const pd = new Date(f.periodeDebut);
                            if (!isNaN(pd.getTime())) {
                                // L'invoice couvre ce cycle si son mois/année de début = targetCycleMonth
                                if (pd.getFullYear() === targetCycleYear && pd.getMonth() === targetCycleMonth) {
                                    return true;
                                }
                            }
                        }

                        // Fallback: Date d'émission
                        const dEmi = f.dateEmi ? new Date(f.dateEmi) : null;
                        if (dEmi && !isNaN(dEmi.getTime())) {
                            if (dEmi.getMonth() === targetCycleMonth && dEmi.getFullYear() === targetCycleYear) return true;
                            if (dEmi.getMonth() === ((targetCycleMonth + 1) % 12)) {
                                if (Math.abs(dEmi.getDate() - cycleDay) <= 5) return true;
                            }
                        }
                        return false;
                    });
                }

                if (!hasInvoiceForTarget) {
                    const alertKey = `${client.id}-${targetCycleMonth}-${targetCycleYear}`;

                    if (!ignoredAlerts.includes(alertKey)) {
                        missingCount++;
                        missingAmount += parseFloat(client.montantMensuel || 0);

                        missingClients.push({
                            ...client,
                            targetMonth: targetCycleMonth,
                            targetYear: targetCycleYear,
                            cycleDay: cycleDay,
                            alertStatus: alertStatus
                        });
                    }
                }
            }
        }
    });

    return { count: missingCount, amount: missingAmount, missingClients };
};
