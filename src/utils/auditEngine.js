
/**
 * Moteur d'Audit Intelligent de la Facturation V3 - DÉTERMINISTE
 * Basé sur une Clé Business Unique et un Historique de Décision Persistant.
 */

export const runSmartAudit = (clients, factures, auditHistory = {}) => {
    const anomalies = [];
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // 1. Indexation pour performance O(N)
    const facturesByClient = new Map();
    factures.forEach(f => {
        if (!f.clientId) return;
        if (!facturesByClient.has(f.clientId)) facturesByClient.set(f.clientId, []);
        facturesByClient.get(f.clientId).push(f);
    });

    // 2. Indexation des IDs existants pour les gaps de séquence
    const existingIds = new Set(factures.map(f => f.id));

    clients.forEach(client => {
        if (client.etatClient !== 'Actif') return;
        const clientFactures = facturesByClient.get(client.id) || [];
        
        // Un client est "Déclaré" s'il a un contrat BIAT ou est marqué explicitement
        const isDeclared = client.isDeclared || (client.numCompte && client.numCompte.includes('BIAT'));

        // --- ÉTAPE A : RECONSTITUTION DE LA TIMELINE (THÉORIQUE) ---
        if (client.regime === 'Abonnement' || client.montantMensuel > 0) {
            const startDate = client.dateDebut ? new Date(client.dateDebut) : null;
            if (startDate && !isNaN(startDate.getTime())) {
                let cy = startDate.getFullYear();
                let cm = startDate.getMonth();

                while (cy < currentYear || (cy === currentYear && cm <= currentMonth)) {
                    const periodStr = `${cy}-${String(cm + 1).padStart(2, '0')}`;
                    const billingType = client.regime === 'Abonnement' ? 'MENSUEL' : 'SERVICE';
                    
                    // GÉNÉRATION DE LA BUSINESS KEY UNIQUE
                    const businessKey = `${client.id}_${periodStr}_${billingType}`;
                    
                    // 1. Vérifier si l'audit historique bloque cette clé (IGNORED / DELETED)
                    const historyRecord = auditHistory[businessKey];
                    if (historyRecord && (historyRecord.status === 'IGNORED' || historyRecord.status === 'DELETED')) {
                        // On passe au mois suivant sans rien proposer
                    } else {
                        // 2. Chercher si une facture correspond déjà à cette période
                        const existingForPeriod = clientFactures.filter(f => {
                            if (f.auditKey === businessKey) return true;
                            if (f.periodeDebut) {
                                const pd = new Date(f.periodeDebut);
                                return pd.getFullYear() === cy && pd.getMonth() === cm && !f.isExtra;
                            }
                            return false;
                        });

                        if (existingForPeriod.length === 0) {
                            // MANQUANTE -> TO_CREATE
                            const monthLabel = new Date(cy, cm).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
                            anomalies.push({
                                id: `audit-${businessKey}`,
                                businessKey: businessKey,
                                type: 'MISSING_INVOICE',
                                severity: (cy < currentYear || (cy === currentYear && cm < currentMonth)) ? 'danger' : 'warning',
                                clientName: client.enseigne,
                                clientId: client.id,
                                isDeclared: isDeclared,
                                targetMonth: cm,
                                targetYear: cy,
                                label: monthLabel,
                                description: `Aucune facture détectée pour ${monthLabel}.`,
                                suggestion: {
                                    id: null, // Sera calculé au moment de la création pour combler les gaps
                                    client: client.enseigne,
                                    clientId: client.id,
                                    montant: client.montantMensuel || 0,
                                    periodeDebut: `${cy}-${String(cm + 1).padStart(2, '0')}-01`,
                                    periodeFin: new Date(cy, cm + 1, 0).toISOString().split('T')[0],
                                    dateEmi: new Date(cy, cm + 1, 0).toISOString().split('T')[0],
                                    desc: `Services ${billingType.toLowerCase()} - ${monthLabel}`,
                                    auditKey: businessKey
                                }
                            });
                        } else {
                            // 3. VÉRIFICATION DES ÉCARTS (ANOMALY_AMOUNT)
                            const mainFacture = existingForPeriod[0];
                            const expectedAmount = parseFloat(client.montantMensuel || 0);
                            const actualAmount = parseFloat(mainFacture.totalHT || mainFacture.montant || 0);
                            
                            if (Math.abs(expectedAmount - actualAmount) > 1 && expectedAmount > 0) {
                                anomalies.push({
                                    id: `diff-${businessKey}`,
                                    businessKey: businessKey,
                                    type: 'AMOUNT_MISMATCH',
                                    severity: 'warning',
                                    clientName: client.enseigne,
                                    clientId: client.id,
                                    label: `Écart de montant (${periodStr})`,
                                    description: `Facturé: ${actualAmount} TND vs Attendu: ${expectedAmount} TND.`,
                                    suggestion: { editId: mainFacture.id, action: 'REVIEW' }
                                });
                            }
                        }
                    }

                    cm++; if (cm > 11) { cm = 0; cy++; }
                }
            }
        }

        // --- ÉTAPE B : ANALYSE DES SAUTS DE SÉQUENCE (GAPS) ---
        const groups = {};
        clientFactures.forEach(f => {
            const match = f.id.match(/^([A-Za-z-]+)(\d+)$/);
            if (match) {
                const prefix = match[1];
                const num = parseInt(match[2], 10);
                if (!groups[prefix]) groups[prefix] = [];
                groups[prefix].push({ num, id: f.id });
            }
        });

        Object.keys(groups).forEach(p => {
            const sorted = groups[p].sort((a, b) => a.num - b.num);
            let count = 0;
            for (let i = 0; i < sorted.length - 1 && count < 30; i++) {
                for (let n = sorted[i].num + 1; n < sorted[i+1].num && count < 5; n++) {
                    const candidateId = `${p}${String(n).padStart(sorted[i].id.length - p.length, '0')}`;
                    
                    // Vérifier si cet ID manquant n'est pas déjà dans l'historique DELETED
                    const gapKey = `GAP_${client.id}_${candidateId}`;
                    if (auditHistory[gapKey]?.status === 'DELETED' || auditHistory[gapKey]?.status === 'IGNORED') continue;

                    if (!existingIds.has(candidateId)) {
                        count++;
                        // Si on a des anomalies de type MISSING_INVOICE sans ID pour ce client, on peut "lier" l'ID
                        const openMissing = anomalies.find(a => a.clientId === client.id && a.type === 'MISSING_INVOICE' && !a.suggestion.id);
                        if (openMissing) {
                            openMissing.suggestion.id = candidateId;
                            openMissing.label = `N° ${candidateId} (${openMissing.label})`;
                            openMissing.type = 'SEQUENCE_GAP';
                        } else {
                            anomalies.push({
                                id: `gap-${candidateId}`,
                                gapKey: gapKey,
                                type: 'SEQUENCE_GAP',
                                severity: 'warning',
                                clientName: client.enseigne,
                                clientId: client.id,
                                label: `N° ${candidateId} (Orphelin)`,
                                description: `Numéro manquant dans la séquence ${p}.`,
                                suggestion: { id: candidateId, client: client.enseigne, clientId: client.id, manualId: true, montant: client.montantMensuel || 0, desc: `Régularisation numéro ${candidateId}` }
                            });
                        }
                    }
                }
            }
        });
    });

    return anomalies;
};
