import { getStorage, setStorage } from '../services/storageService';

/**
 * Fonction maîtresse pour générer les salaires selon la règle du M+1 (Paiement le 5 du mois suivant).
 * Gère le calcul algorithmique dynamique : le salaire n'est pas fixe, il est la somme exacte 
 * des parts de projets (clients) couverts sur ce mois précis par cet employé.
 */
export const generatePendingSalaries = () => {
    const rhList = getStorage('mynds_rh', []);
    const clientsList = getStorage('mynds_clients', []);
    let bankTransactions = getStorage('mynds_bank_transactions', []);
    let isModified = false;

    const today = new Date();
    
    // Fonction helper pour vérifier si un projet client est actif dans un M/Y donné.
    const isMonthInContract = (client, targetY, targetM) => {
        if (!client || client.etatClient !== 'Actif') return false;
        const targetDateObj = new Date(targetY, targetM, 1);
        const start = client.dateDebut && client.dateDebut !== '-' ? new Date(client.dateDebut) : new Date(2000, 0, 1);
        
        let end;
        if (client.dateFin) {
            end = new Date(client.dateFin);
        } else if (client.regime === 'Projet' && client.dureeMois) {
            end = new Date(start.getFullYear(), start.getMonth() + parseInt(client.dureeMois) - 1, start.getDate());
        } else {
            end = new Date(targetY, 11, 31);
        }
        
        const startMonthObj = new Date(start.getFullYear(), start.getMonth(), 1);
        const endMonthObj = new Date(end.getFullYear(), end.getMonth(), 1);
        
        return targetDateObj >= startMonthObj && targetDateObj <= endMonthObj;
    };

    rhList.forEach(emp => {
        // Skip inactive employees or those without a start date.
        // Fixed salaries are bypassed because wages equal the aggregate of project parts.
        if (emp.actif === false || !emp.dateDebut) return;

        const startDate = new Date(emp.dateDebut);
        if (isNaN(startDate.getTime())) return;

        // Loop through each completed month since start date.
        let cursorDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
        const currentRefDate = new Date(today.getFullYear(), today.getMonth(), 1); 
        
        while (cursorDate < currentRefDate) {
            const mYear = cursorDate.getFullYear();
            const mMonth = cursorDate.getMonth();
            
            // Signature to prevent duplicate generation (e.g. SALAIRE_id_10_2025)
            const payrollSignature = `SALAIRE_DYN_${emp.id}_${mMonth}_${mYear}`;
            const existingTx = bankTransactions.find(t => t.payrollSignature === payrollSignature);
            
            if (!existingTx) {
                // Determine salary dynamically by querying active Client project costs
                let dynamicSalaryAmount = 0;
                let activeProjectsTally = [];
                
                clientsList.forEach(c => {
                    if (isMonthInContract(c, mYear, mMonth)) {
                        if (c.projectCosts && Array.isArray(c.projectCosts)) {
                            c.projectCosts.forEach(cost => {
                                if (cost.nom === emp.nom) {
                                    dynamicSalaryAmount += (parseFloat(cost.montant) || 0);
                                    if (!activeProjectsTally.includes(c.enseigne)) {
                                        activeProjectsTally.push(c.enseigne);
                                    }
                                }
                            });
                        }
                    }
                });
                
                // If sum is greater than 0, generate exactly 1 transaction for this month
                if (dynamicSalaryAmount > 0) {
                    
                    // The actual payment is expected on the 5th of M+1
                    const nextMonthIndex = mMonth + 1;
                    const paymentDate = new Date(mYear, nextMonthIndex, 5);
                    
                    const monthNames = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sept", "Oct", "Nov", "Déc"];
                    const labelMonth = monthNames[mMonth];
                    const memo = `${activeProjectsTally.length} projets (${activeProjectsTally.slice(0, 2).join(', ')}${activeProjectsTally.length > 2 ? ', ...' : ''})`;
                    
                    // Push securely to Bank array as Draft
                    const newTx = {
                        id: `TX_DYN_${Date.now()}_${Math.floor(Math.random()*10000)}`,
                        date: paymentDate.toISOString().split('T')[0],
                        amount: dynamicSalaryAmount,
                        type: 'Debit',
                        category: 'Salaires', // Critical metric match
                        client: emp.nom,
                        description: `Salaire ${labelMonth} ${mYear} - ${emp.nom} [${memo}]`,
                        statut: 'En attente',
                        isDraft: true,
                        payrollSignature: payrollSignature
                    };
                    
                    bankTransactions.push(newTx);
                    isModified = true;
                }
            }
            cursorDate.setMonth(cursorDate.getMonth() + 1);
        }
    });

    if (isModified) {
        setStorage('mynds_bank_transactions', bankTransactions);
        console.log("⚡ [Payroll M+1] Brouillons de salaires dynamiques calculés et injectés dans la Banque.");
    }
};
