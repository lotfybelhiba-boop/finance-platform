import React, { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { getFactures, getBankTransactions, getClients } from '../services/storageService';

const KPICard = ({ title, value, subtext, subtextNode, variation, isNet = false, alert = null }) => {
    return (
        <div className={`kpi-card ${isNet ? 'kpi-card-net' : ''}`}>
            <div className="kpi-title">{title}</div>
            <div className="kpi-value">{value}</div>
            {subtext && <div className="kpi-subtext" style={{ marginTop: '4px' }}>{subtext}</div>}
            {subtextNode && <div className="kpi-subtext" style={{ marginTop: '4px', width: '100%' }}>{subtextNode}</div>}

            {variation && (
                <div className={`kpi-variation ${variation > 0 ? 'positive' : 'negative'}`}>
                    {variation > 0 ? '▲' : '▼'} {Math.abs(variation)}%
                </div>
            )}

            {alert && (
                <div style={{
                    marginTop: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'var(--danger-bg)',
                    color: 'var(--danger)',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '600'
                }}>
                    <AlertTriangle size={14} />
                    {alert}
                </div>
            )}
        </div>
    );
};

const KPIGrid = () => {
    const formatMoney = (val) => new Intl.NumberFormat('fr-TN', { style: 'currency', currency: 'TND', minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(val);

    const [factures, setFactures] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [clients, setClients] = useState([]);

    useEffect(() => {
        setFactures(getFactures());
        setTransactions(getBankTransactions());
        setClients(getClients());
    }, []);

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1; // 1-indexed

    // 1. Recettes du mois : Somme des factures à envoyer (Draft)
    const recettesAEnvoyer = factures
        .filter(f => f.statut === 'Draft')
        .reduce((sum, f) => sum + (parseFloat(f.montant) || 0), 0);

    // Compute draft salaries from active clients' project costs
    const activeClients = clients.filter(c => c.etatClient === 'Actif');
    const computedDrafts = [];
    const currentMonthPrefix = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

    activeClients.forEach(c => {
        if (c.projectCosts && Array.isArray(c.projectCosts)) {
            const localRoleMap = {};
            c.projectCosts.forEach(cost => {
                const role = cost.nom;
                const amt = parseFloat(cost.montant) || 0;
                if (role && amt > 0) {
                    localRoleMap[role] = (localRoleMap[role] || 0) + amt;
                }
            });

            Object.entries(localRoleMap).forEach(([role, amount]) => {
                const uniqueDraftId = `draft-salary-${c.id}-${role}-${currentMonthPrefix}`;
                const alreadyValidated = transactions.some(t => t.originalDraftId === uniqueDraftId);

                if (!alreadyValidated) {
                    computedDrafts.push({
                        id: uniqueDraftId,
                        date: new Date().toISOString().split('T')[0],
                        amount: amount,
                        type: 'Debit',
                        category: 'Mynds Salaire',
                        isDraft: true // Explicitly marked as draft
                    });
                }
            });
        }
    });

    const allTransactions = [...transactions, ...computedDrafts];

    // 2. Charges du mois (Pro / Perso) via les transactions bancaires du mois en cours
    const currentMonthTransactions = allTransactions.filter(t => {
        if (!t.date) return false;
        const d = new Date(t.date);
        return d.getFullYear() === currentYear && (d.getMonth() + 1) === currentMonth;
    });

    // chargesPro: only actual debits (NO DRAFTS) and not Perso
    const chargesPro = currentMonthTransactions
        .filter(t => t.type === 'Debit' && t.category !== 'Perso' && !t.isDraft)
        .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

    const chargesPerso = currentMonthTransactions
        .filter(t => t.type === 'Debit' && t.category === 'Perso' && !t.isDraft)
        .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

    const totalChargesMois = chargesPro + chargesPerso;

    // Remaining logic (Bénéfice Net Trésorerie globale) 
    const allCredits = allTransactions.filter(t => t.type === 'Credit').reduce((s, t) => s + (parseFloat(t.amount) || 0), 0) +
        factures.filter(f => f.statut === 'Paid').reduce((s, f) => s + (parseFloat(f.montant) || 0), 0);
    const allDebits = allTransactions.filter(t => t.type === 'Debit').reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
    const beneficeNet = allCredits - allDebits;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="kpi-grid" style={{ marginBottom: '0' }}>
                <KPICard
                    title="Bénéfice net (Trésorerie)"
                    value={formatMoney(beneficeNet)}
                    subtext="Recettes − Charges − Salaires − TVA"
                    isNet={true}
                />
            </div>

            <div className="kpi-grid">
                <KPICard
                    title="Recettes du mois (À envoyer)"
                    value={formatMoney(recettesAEnvoyer)}
                    subtext="Total des factures en statut Brouillon"
                />

                <KPICard
                    title="Charges du mois"
                    value={formatMoney(totalChargesMois)}
                    subtextNode={
                        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                            <div style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--info)', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: '700' }}>
                                Pro : {formatMoney(chargesPro)}
                            </div>
                            <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: '700' }}>
                                Perso : {formatMoney(chargesPerso)}
                            </div>
                        </div>
                    }
                />

                {/* Optional / Placeholders for remaining layout symmetry */}
                <KPICard
                    title="TVA facturée clients"
                    value={formatMoney(0)}
                    subtext="19% sur CA HT (À implémenter)"
                />

                <KPICard
                    title="TVA nette à payer"
                    value={formatMoney(0)}
                    subtext="Collectée − Déductible"
                />
            </div>
        </div>
    );
};

export default KPIGrid;
