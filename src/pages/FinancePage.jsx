import React, { useState, useEffect } from 'react';
import { PieChart, Trash2, User, Plus } from 'lucide-react';
import { getBankTransactions, getFactures, getClients, getStorage, setStorage } from '../services/storageService';

const FinancePage = () => {
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [factures, setFactures] = useState([]);
    const [clients, setClients] = useState([]);
    const [paymentHistory, setPaymentHistory] = useState({});
    const [transactions, setTransactions] = useState([]);
    const [showActiveClients, setShowActiveClients] = useState(false);

    useEffect(() => {
        setTransactions(getBankTransactions());
        setClients(getClients());
        setFactures(getFactures());

        const storedPayments = getStorage('mynds_payment_tracking_v2');
        if (storedPayments) {
            setPaymentHistory(storedPayments);
        } else {
            const oldPayments = getStorage('mynds_payment_tracking');
            if (oldPayments) {
                const migrated = { [new Date().getFullYear()]: oldPayments };
                setPaymentHistory(migrated);
                setStorage('mynds_payment_tracking_v2', migrated);
            }
        }
    }, []);




    const togglePayment = (clientId, monthIndex) => {
        const history = { ...paymentHistory };
        if (!history[selectedYear]) {
            history[selectedYear] = {};
        }
        if (!history[selectedYear][clientId]) {
            history[selectedYear][clientId] = Array(12).fill(false);
        }
        history[selectedYear][clientId][monthIndex] = !history[selectedYear][clientId][monthIndex];
        setPaymentHistory(history);
        setStorage('mynds_payment_tracking_v2', history);
    };

    const isMonthInContract = (client, monthIndex, year) => {
        if (!client) return false;
        const target = new Date(year, monthIndex, 1);
        const start = client.dateDebut && client.dateDebut !== '-' ? new Date(client.dateDebut) : new Date(2000, 0, 1);
        
        let end;
        if (client.dateFin) {
            end = new Date(client.dateFin);
        } else if (client.regime === 'Projet' && client.dureeMois) {
            end = new Date(start.getFullYear(), start.getMonth() + parseInt(client.dureeMois) - 1, start.getDate());
        } else {
            end = new Date(year, 11, 31);
        }
        
        const startMonth = new Date(start.getFullYear(), start.getMonth(), 1);
        const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);
        
        return target >= startMonth && target <= endMonth;
    };

    const getCellStatus = (client, monthIndex) => {
        if (!isMonthInContract(client, monthIndex, selectedYear)) {
            return 'na';
        }

        const clientId = client.id;
        const history = paymentHistory[selectedYear] || {};
        const isPaid = history[clientId] && history[clientId][monthIndex];
        if (isPaid) return 'paid';

        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        if (selectedYear < currentYear) return 'late';
        if (selectedYear === currentYear) {
            if (monthIndex < currentMonth) return 'late';
            if (monthIndex === currentMonth) {
                const dueDay = client?.jourPaiement || 5;
                if (now.getDate() > dueDay) return 'late';
            }
        }
        return 'future';
    };

    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

    // === FIND CHARGES FROM TRANSACTIONS FOR THE YEAR ===
    const transactionsForYear = transactions.filter(t => {
        const year = new Date(t.date).getFullYear();
        return year === selectedYear && t.type === 'Debit';
    });

    const totalExploitations = transactionsForYear
        .filter(t => t.category === 'Charges' && t.chargeType === 'Exploitations')
        .reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);

    const totalRH = transactionsForYear
        .filter(t => t.category === 'Charges' && t.chargeType === 'Ressources Humaines')
        .reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);

    const totalPerso = transactionsForYear
        .filter(t => t.category === 'Perso')
        .reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);

    // === CALCULATIONS: GLOBAL BILAN (Based on Active Clients) ===
    const activeClients = clients.filter(c => c.etatClient === 'Actif');

    const filteredClientsByYear = activeClients.filter(client => {
        if (!client.dateDebut || client.dateDebut === '-') return true;
        const startYear = new Date(client.dateDebut).getFullYear();
        let endYear = selectedYear; // Par défaut: calcul toujours vers la fin de l'année scrutée
        
        if (client.dateFin) {
            endYear = new Date(client.dateFin).getFullYear();
        } else if (client.regime === 'Projet' && client.dureeMois) {
            const start = new Date(client.dateDebut);
            // Calcule l'année d'expiration exacte si on n'a qu'une durée en mois
            endYear = new Date(start.getFullYear(), start.getMonth() + parseInt(client.dureeMois) - 1, 1).getFullYear();
        }
        
        return selectedYear >= startYear && selectedYear <= endYear;
    });

    // === CALCULATIONS: GLOBAL BILAN (Monthly Equivalent) ===
    const getMonthlyEquivalent = (client, field) => {
        if (client.regime === 'Abonnement') {
            if (field === 'revenue') return parseFloat(client.montantMensuel) || 0;
            if (field === 'costs') return parseFloat(client.totalCosts) || 0;
            if (field === 'margin') return parseFloat(client.netMargin) || 0;
        } else {
            const duration = parseFloat(client.dureeMois) || 1;
            if (field === 'revenue') return (parseFloat(client.montantTotal) || 0) / duration;
            if (field === 'costs') return (parseFloat(client.totalCosts) || 0) / duration;
            if (field === 'margin') return (parseFloat(client.netMargin) || 0) / duration;
        }
        return 0;
    };

    const globalRevenueMonthly = filteredClientsByYear.reduce((acc, curr) => acc + getMonthlyEquivalent(curr, 'revenue'), 0);
    const revenueAboCount = filteredClientsByYear.filter(c => c.regime === 'Abonnement').reduce((acc, curr) => acc + getMonthlyEquivalent(curr, 'revenue'), 0);
    const revenueProjetCount = filteredClientsByYear.filter(c => c.regime !== 'Abonnement').reduce((acc, curr) => acc + getMonthlyEquivalent(curr, 'revenue'), 0);

    const globalCostsMonthly = filteredClientsByYear.reduce((acc, curr) => acc + getMonthlyEquivalent(curr, 'costs'), 0);
    const globalNetMonthlyAvg = filteredClientsByYear.reduce((acc, curr) => acc + getMonthlyEquivalent(curr, 'margin'), 0);
    const globalMarginRate = globalRevenueMonthly > 0 ? (globalNetMonthlyAvg / globalRevenueMonthly) * 100 : 0;

    const formatMoney = (amount) => {
        return new Intl.NumberFormat('fr-TN', { style: 'currency', currency: 'TND', minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(amount);
    };

    const formatNumber = (amount) => {
        return new Intl.NumberFormat('fr-TN', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(amount);
    };

    // === CALCULATIONS: CASH INFLOW (Trésorerie) ===
    // === CALCULATIONS: ACTIVITÉ (Engagement) vs TRÉSORERIE (Cash) ===
    const monthlyCAFacture = Array(12).fill(0); // HT Billed
    const caDetails = Array(12).fill().map(() => ({}));
    const reelDetails = Array(12).fill().map(() => ({}));
    const chargesDetails = Array(12).fill().map(() => ({}));
    const remainderDetails = Array(12).fill().map(() => ({}));
    const monthlyCARealise = Array(12).fill(0); // HT Billed & Successfully Paid
    const monthlyRecetteTTC = Array(12).fill(0); // TTC Paid
    const monthlyTVACollectee = Array(12).fill(0); // TVA Paid
    const monthlyCharges = Array(12).fill(0);
    const monthlyTVAGagnee = Array(12).fill(0);

    factures.forEach(f => {
        const tvaRate = (f.isExonore || f.applyTva === false) ? 0 : 0.19;
        const amountTTC = parseFloat(f.montant) || 0;
        const amountHT = amountTTC / (1 + tvaRate);
        const amountTVA = amountTTC - amountHT;

        // 1. VISION ACTIVITÉ (Factures Émises - excluant les brouillons)
        if (f.statut !== 'Draft' && f.statut !== 'Archived') {
            const dStrActivity = f.periodeFin || f.dateEmi;
            if (dStrActivity) {
                const dAct = new Date(dStrActivity);
                if (!isNaN(dAct.getTime()) && dAct.getFullYear() === selectedYear) {
                    monthlyCAFacture[dAct.getMonth()] += amountHT;
                    caDetails[dAct.getMonth()][f.client || 'Inconnu'] = (caDetails[dAct.getMonth()][f.client || 'Inconnu'] || 0) + amountHT;
                    
                    const restAmount = amountHT - (f.statut === 'Paid' ? amountHT : (f.paiements && f.paiements.length > 0 ? f.paiements.reduce((acc,p)=>acc+(parseFloat(p.montant)||0)/(1+tvaRate), 0) : 0));
                    if(restAmount > 0.1) remainderDetails[dAct.getMonth()][f.client || 'Inconnu'] = (remainderDetails[dAct.getMonth()][f.client || 'Inconnu'] || 0) + restAmount;
                    
                    // Out of what was billed for this service month, how much was actually paid?
                    if (f.statut === 'Paid') {
                        monthlyCARealise[dAct.getMonth()] += amountHT;
                        reelDetails[dAct.getMonth()][f.client || 'Inconnu'] = (reelDetails[dAct.getMonth()][f.client || 'Inconnu'] || 0) + amountHT;
                    } else if (f.paiements && f.paiements.length > 0) {
                        const partialTTC = f.paiements.reduce((acc, p) => acc + (parseFloat(p.montant) || 0), 0);
                        const partialHT = partialTTC / (1 + tvaRate);
                        monthlyCARealise[dAct.getMonth()] += partialHT;
                        reelDetails[dAct.getMonth()][f.client || 'Inconnu'] = (reelDetails[dAct.getMonth()][f.client || 'Inconnu'] || 0) + partialHT;
                    }
                }
            }
        }

        // 2. VISION TRÉSORERIE (Encaissements Réels)
        if (f.paiements && f.paiements.length > 0) {
            f.paiements.forEach(p => {
                const d = new Date(p.date);
                if (!isNaN(d.getTime()) && d.getFullYear() === selectedYear) {
                    const pAmountTTC = parseFloat(p.montant) || 0;
                    const pAmountTVA = pAmountTTC - (pAmountTTC / (1 + tvaRate));
                    monthlyRecetteTTC[d.getMonth()] += pAmountTTC;
                    monthlyTVACollectee[d.getMonth()] += pAmountTVA;
                }
            });
        } else if (f.statut === 'Paid') {
            const dStr = f.datePaiement || f.dateEmi;
            if (dStr) {
                const d = new Date(dStr);
                if (!isNaN(d.getTime()) && d.getFullYear() === selectedYear) {
                    monthlyRecetteTTC[d.getMonth()] += amountTTC;
                    monthlyTVACollectee[d.getMonth()] += amountTVA;
                }
            }
        }
    });

    transactionsForYear.forEach(t => {
        const d = new Date(t.date);
        if (!isNaN(d.getTime()) && t.category !== 'Perso') {
            const amount = parseFloat(t.amount) || 0;
            monthlyCharges[d.getMonth()] += amount;
            const chargeName = t.chargeType === 'Ressources Humaines' ? (t.description || t.chargeType) : (t.category || 'Charge');
            chargesDetails[d.getMonth()][chargeName] = (chargesDetails[d.getMonth()][chargeName] || 0) + amount;
            
            if (t.chargeType !== 'Ressources Humaines') {
                const tvaPortion = amount - (amount / 1.19);
                monthlyTVAGagnee[d.getMonth()] += tvaPortion;
            }
        }
    });

    const monthlyCashNet = monthlyRecetteTTC.map((recetteTTC, idx) => 
        (recetteTTC - monthlyTVACollectee[idx]) - (monthlyCharges[idx] - monthlyTVAGagnee[idx])
    );
    const monthlyBeneficeTheorique = monthlyCAFacture.map((ca, idx) => 
        ca - (monthlyCharges[idx] - monthlyTVAGagnee[idx])
    );
    const monthlyBeneficeReel = monthlyCARealise.map((caReel, idx) => 
        caReel - (monthlyCharges[idx] - monthlyTVAGagnee[idx])
    );

    const totalCAFacture = monthlyCAFacture.reduce((acc, curr) => acc + curr, 0);
    const totalRecetteTTC = monthlyRecetteTTC.reduce((acc, curr) => acc + curr, 0);
    const totalTVACollectee = monthlyTVACollectee.reduce((acc, curr) => acc + curr, 0);
    const totalCharges = monthlyCharges.reduce((acc, curr) => acc + curr, 0);
    const totalTVAGagnee = monthlyTVAGagnee.reduce((acc, curr) => acc + curr, 0);
    const totalCashNet = monthlyCashNet.reduce((acc, curr) => acc + curr, 0);
    const totalBeneficeTheorique = monthlyBeneficeTheorique.reduce((acc, curr) => acc + curr, 0);
    const totalTVADue = totalTVACollectee - totalTVAGagnee;

    return (
        <div className="page" style={{ paddingBottom: '60px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <PieChart size={24} color="var(--primary-color)" />
                    <h1 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>Finance & Bilan Global</h1>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-muted)' }}>ANNÉE</span>
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                        style={{ padding: '8px 16px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-main)', fontSize: '14px', fontWeight: '700', outline: 'none', cursor: 'pointer' }}
                    >
                        {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
            </div>



            {/* Charges KPIs Section */}
            <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>

                    {/* Exploitations Block */}
                    <div style={{
                        background: 'white', padding: '10px 14px', borderRadius: '12px',
                        border: '1px solid rgba(245, 158, 11, 0.1)', // Gold/Orange tone
                        boxShadow: '0 2px 8px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', gap: '4px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f59e0b' }}></div>
                            <div style={{ fontSize: '9px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Charges d'Exploitations</div>
                        </div>
                        <div style={{ fontSize: '16px', fontWeight: '900', color: 'var(--text-main)' }}>{formatMoney(totalExploitations)}</div>
                    </div>

                    {/* RH Block */}
                    <div style={{
                        background: 'white', padding: '10px 14px', borderRadius: '12px',
                        border: '1px solid rgba(59, 130, 246, 0.1)', // Blue tone
                        boxShadow: '0 2px 8px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', gap: '4px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#3b82f6' }}></div>
                            <div style={{ fontSize: '9px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Ressources Humaines</div>
                        </div>
                        <div style={{ fontSize: '16px', fontWeight: '900', color: 'var(--text-main)' }}>{formatMoney(totalRH)}</div>
                    </div>

                    {/* Perso Block */}
                    <div style={{
                        background: 'white', padding: '10px 14px', borderRadius: '12px',
                        border: '1px solid rgba(139, 92, 246, 0.1)', // Purple tone
                        boxShadow: '0 2px 8px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', gap: '4px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#8b5cf6' }}></div>
                            <div style={{ fontSize: '9px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Dépenses Personnelles</div>
                        </div>
                        <div style={{ fontSize: '16px', fontWeight: '900', color: 'var(--text-main)' }}>{formatMoney(totalPerso)}</div>
                    </div>

                </div>
            </div>

            {activeClients.length === 0 ? (
                <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <PieChart size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
                    <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>Aucun client actif</h3>
                    <p style={{ fontSize: '14px', maxWidth: '400px', margin: '0 auto' }}>
                        Ajoutez des clients avec le régime "Abonnement" dans la page Clients pour voir votre bilan financier global.
                    </p>
                </div>
            ) : (
                <>
                    {/* Global Bilan KPI Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
                        <div className="kpi-card" style={{ padding: '10px 14px', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.1)', background: 'rgba(59, 130, 246, 0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '4px' }}>
                            <div className="kpi-title" style={{ fontSize: '9px', color: '#3b82f6', marginBottom: '0' }}>Total C.A. Mensuel</div>
                            <div className="kpi-value" style={{ fontSize: '16px', marginBottom: '0' }}>{formatMoney(globalRevenueMonthly)}</div>
                            <div style={{ display: 'flex', gap: '8px', fontSize: '8px', fontWeight: '800', opacity: 0.7 }}>
                                <span style={{ color: 'var(--accent-gold)' }}>ABO: {formatMoney(revenueAboCount).replace('TND', '').trim()}</span>
                                <span style={{ color: 'var(--text-secondary)' }}>PROJ: {formatMoney(revenueProjetCount).replace('TND', '').trim()}</span>
                            </div>
                        </div>
                        <div className="kpi-card" style={{ padding: '10px 14px', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.1)', background: 'rgba(239, 68, 68, 0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '4px' }}>
                            <div className="kpi-title" style={{ fontSize: '9px', color: '#ef4444', marginBottom: '0' }}>Total Charges</div>
                            <div className="kpi-value" style={{ fontSize: '16px', color: '#ef4444' }}>- {formatMoney(globalCostsMonthly)}</div>
                        </div>
                        <div className="kpi-card" style={{ padding: '10px 14px', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.1)', background: 'rgba(16, 185, 129, 0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '4px' }}>
                            <div className="kpi-title" style={{ fontSize: '9px', color: '#10b981', marginBottom: '0' }}>Bénéfice Net</div>
                            <div className="kpi-value" style={{ fontSize: '16px', color: '#10b981' }}>{formatMoney(globalNetMonthlyAvg)}</div>
                        </div>
                        <div className="kpi-card" style={{ padding: '10px 14px', borderRadius: '12px', border: '1px solid rgba(245, 158, 11, 0.1)', background: 'rgba(245, 158, 11, 0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '4px' }}>
                            <div className="kpi-variation positive" style={{ top: '6px', right: '6px', opacity: 0.8, fontSize: '8px', padding: '2px 4px' }}>
                                {globalMarginRate >= 20 ? 'Rentable' : 'Risqué'}
                            </div>
                            <div className="kpi-title" style={{ fontSize: '9px', color: '#f59e0b', marginBottom: '0' }}>Rentabilité</div>
                            <div className="kpi-value" style={{ fontSize: '16px', color: globalMarginRate >= 50 ? '#10b981' : globalMarginRate >= 20 ? '#f59e0b' : '#ef4444' }}>
                                {globalMarginRate.toFixed(1)}%
                            </div>
                        </div>
                    </div>

                    {/* Table des Projets Sauvegardés */}
                    <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '24px', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
                        <div 
                            onClick={() => setShowActiveClients(!showActiveClients)}
                            style={{ padding: '12px 16px', borderBottom: showActiveClients ? '1px solid var(--border-color)' : 'none', background: 'var(--bg-main)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', transition: 'background 0.2s' }}
                            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.02)'}
                            onMouseOut={(e) => e.currentTarget.style.background = 'var(--bg-main)'}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ background: 'var(--accent-gold)', width: '4px', height: '14px', borderRadius: '4px' }}></div>
                                <h3 style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-main)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Détail des Clients Actifs</h3>
                            </div>
                            <div style={{ transform: showActiveClients ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s', color: 'var(--text-muted)' }}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                            </div>
                        </div>
                        {showActiveClients && (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ background: 'white', borderBottom: '1px solid var(--border-color)' }}>
                                        <th style={{ padding: '3px 8px', fontSize: '8px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Projet</th>
                                        <th style={{ padding: '3px 8px', fontSize: '8px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Période</th>
                                        <th style={{ padding: '3px 8px', fontSize: '8px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Durée</th>
                                        <th style={{ padding: '3px 8px', fontSize: '8px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>C.A. (HT)</th>
                                        <th style={{ padding: '3px 8px', fontSize: '8px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Charges</th>
                                        <th style={{ padding: '3px 8px', fontSize: '8px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Bénéfice Net</th>
                                        <th style={{ padding: '3px 8px', fontSize: '8px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Statut</th>
                                        <th style={{ padding: '3px 8px', fontSize: '8px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'center' }}>-</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredClientsByYear.map((client) => {
                                        // Logic to detect payment issues for this client in selectedYear
                                        let alertStatus = { type: 'ok', msg: 'OK' };
                                        const now = new Date();

                                        for (let m = 0; m < 12; m++) {
                                            // 1. Is the client supposed to pay for this month?
                                            const currentIter = new Date(selectedYear, m, 1);
                                            const todayMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

                                            if (isMonthInContract(client, m, selectedYear) && currentIter <= todayMonthStart) {
                                                // 2. Check if paid (Manual or Invoice)
                                                const isManualPaid = paymentHistory[selectedYear]?.[client.id]?.[m];
                                                const invoice = factures.find(f => {
                                                    const d = new Date(f.dateEmi);
                                                    return f.client === client.enseigne && d.getMonth() === m && d.getFullYear() === selectedYear;
                                                });
                                                const isInvoicePaid = invoice && invoice.statut === 'Paid';

                                                if (!isManualPaid && !isInvoicePaid) {
                                                    // Check if it's late or just missing
                                                    const isLate = currentIter < todayMonthStart || (m === now.getMonth() && selectedYear === now.getFullYear() && now.getDate() > (client.jourPaiement || 5));

                                                    if (invoice && invoice.statut !== 'Paid') {
                                                        alertStatus = { type: 'late', msg: 'Retard' };
                                                        break; // Priority to Late
                                                    } else if (isLate) {
                                                        alertStatus = { type: 'missing', msg: 'Manquant' };
                                                    }
                                                }
                                            }
                                        }

                                        return (
                                            <tr key={client.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s', fontSize: '10px' }}>
                                                <td style={{ padding: '3px 8px', fontWeight: '800', color: 'var(--text-main)', fontSize: '10px', whiteSpace: 'nowrap' }}>{client.enseigne}</td>
                                                <td style={{ padding: '3px 8px', color: 'var(--text-muted)', fontSize: '9px', whiteSpace: 'nowrap' }}>
                                                    {client.dateDebut && client.dateDebut !== '-' ? (
                                                        `${new Date(client.dateDebut).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })} → ${client.dateFin ? new Date(client.dateFin).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : 'Indéfini'}`
                                                    ) : '-'}
                                                </td>
                                                <td style={{ padding: '3px 8px' }}>
                                                    <span style={{ background: 'var(--bg-main)', padding: '1px 4px', borderRadius: '4px', fontSize: '8px', fontWeight: '700', whiteSpace: 'nowrap' }}>{client.dureeService || 'Indéfini'}</span>
                                                </td>
                                                <td style={{ padding: '3px 8px', fontWeight: '800', color: 'var(--text-main)' }}>{formatNumber(getMonthlyEquivalent(client, 'revenue'))}</td>
                                                <td style={{ padding: '3px 8px', fontWeight: '700', color: '#ef4444' }}>- {formatNumber(getMonthlyEquivalent(client, 'costs'))}</td>
                                                <td style={{ padding: '3px 8px', fontWeight: '800', color: '#10b981' }}>{formatNumber(getMonthlyEquivalent(client, 'margin'))}</td>
                                                <td style={{ padding: '3px 8px' }}>
                                                    <span style={{
                                                        padding: '1px 5px',
                                                        borderRadius: '4px',
                                                        fontSize: '8px',
                                                        fontWeight: '800',
                                                        background: alertStatus.type === 'late' ? '#fef2f2' : alertStatus.type === 'missing' ? '#fffbeb' : '#f0fdf4',
                                                        color: alertStatus.type === 'late' ? '#ef4444' : alertStatus.type === 'missing' ? '#f59e0b' : '#10b981',
                                                        border: `1px solid ${alertStatus.type === 'late' ? '#fee2e2' : alertStatus.type === 'missing' ? '#fef3c7' : '#dcfce7'}`,
                                                        whiteSpace: 'nowrap'
                                                    }}>
                                                        {alertStatus.msg}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '3px 8px', textAlign: 'center' }}>
                                                    <User size={9} color="var(--text-muted)" style={{ opacity: 0.3 }} />
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                                            )}
                    </div>

                    {/* Activité Section (Engagement / Facturation) */}
                    <div style={{ background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', marginBottom: '24px', overflow: 'hidden' }}>
                        <div style={{ padding: '12px 16px', borderBottom: '1px dashed var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-main)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ background: '#3b82f6', width: '4px', height: '14px', borderRadius: '4px' }}></div>
                                <h3 style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-main)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px', cursor: 'help' }} title="Note : Les charges personnelles de Lotfi ne sont pas incluses dans les calculs d'activité (Seuls les frais professionnels de l'agence sont comptés).">Activité Mensuelle (Productivité Facturée)</h3>
                            </div>
                            <div style={{ fontSize: '13px', fontWeight: '900', color: '#3b82f6', background: 'rgba(59, 130, 246, 0.1)', padding: '4px 12px', borderRadius: '8px' }}>
                                Total C.A.: {formatMoney(totalCAFacture)}
                            </div>
                        </div>
                        <div style={{ overflowX: 'auto', padding: '12px' }}>
                            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '4px 2px', textAlign: 'center' }}>
                                <thead>
                                    <tr>
                                        <th style={{ padding: '4px 8px', fontSize: '9px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'left', minWidth: '80px' }}>Indicateur</th>
                                        {months.map(m => <th key={m} style={{ padding: '4px 8px', fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', width: 'calc((100% - 80px) / 12)' }}>{m}</th>)}
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td style={{ padding: '4px 8px', fontSize: '10px', fontWeight: '800', color: 'var(--text-main)', textAlign: 'left', cursor: 'help' }} title="Total des factures émises sur ce mois (hors statut Brouillon)">C.A. Facturé (HT)</td>
                                        {monthlyCAFacture.map((amount, idx) => (
                                            <td key={`ca-${idx}`} style={{ padding: '6px', background: amount > 0 ? 'rgba(59, 130, 246, 0.05)' : 'rgba(0,0,0,0.02)', borderRadius: '6px', cursor: amount > 0 ? 'help' : 'default' }} title={amount > 0 ? `C.A de ${months[idx]}:\n` + Object.entries(caDetails[idx]).map(([n,v])=>`- ${n} : ${formatMoney(v)}`).join('\n') + `\n\nTotal : ${formatMoney(amount)}` : ''}>
                                                <div style={{ fontSize: '11px', fontWeight: '800', color: amount > 0 ? '#2563eb' : 'var(--text-muted)' }}>
                                                    {amount > 0 ? formatNumber(amount) : '-'}
                                                </div>
                                            </td>
                                        ))}
                                    </tr>
                                    <tr>
                                        <td style={{ padding: '4px 8px', fontSize: '10px', fontWeight: '800', color: 'var(--text-main)', textAlign: 'left', cursor: 'help' }} title="Dépenses professionnelles réelles du mois (Exclut la TVA et les transactions Perso)">Charges (Générales)</td>
                                        {monthlyCharges.map((amount, idx) => (
                                            <td key={`char-act-${idx}`} style={{ padding: '6px', background: amount > 0 ? 'rgba(239, 68, 68, 0.05)' : 'rgba(0,0,0,0.02)', borderRadius: '6px', cursor: amount > 0 ? 'help' : 'default' }} title={amount > 0 ? `Charges de ${months[idx]}:\n` + Object.entries(chargesDetails[idx]).map(([n,v])=>`- ${n} : ${formatMoney(v)}`).join('\n') + `\n\nTotal : ${formatMoney(amount)}` : ''}>
                                                <div style={{ fontSize: '11px', fontWeight: '800', color: amount > 0 ? '#ef4444' : 'var(--text-muted)' }}>
                                                    {amount > 0 ? `- ${formatNumber(amount)}` : '-'}
                                                </div>
                                            </td>
                                        ))}
                                    </tr>
                                    <tr>
                                        <td style={{ padding: '4px 8px', fontSize: '10px', fontWeight: '900', color: 'var(--text-main)', textAlign: 'left', borderTop: '2px dashed var(--border-color)', cursor: 'help' }} title="Ce que l'agence a facturé moins les charges (Reflète la rentabilité si 100% des factures étaient payées)">Bénéfice Théorique</td>
                                        {monthlyBeneficeTheorique.map((amount, idx) => {
                                            const hasActivity = monthlyCAFacture[idx] > 0 || monthlyCharges[idx] > 0;
                                            return (
                                                <td key={`bent-${idx}`} style={{ padding: '6px', background: hasActivity ? (amount >= 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)') : 'transparent', borderRadius: '6px', borderTop: '2px dashed var(--border-color)', cursor: hasActivity ? 'help' : 'default' }} title={hasActivity ? `BÉNÉFICE THÉORIQUE (${months[idx]})\n--------------------\n[+] FACTURÉ :\n` + (Object.keys(caDetails[idx]).length > 0 ? Object.entries(caDetails[idx]).map(([n,v])=>`+ ${n} : ${formatMoney(v)}`).join('\n') : '  (Aucun montant facturé)') + `\n\n[-] CHARGES :\n` + (Object.keys(chargesDetails[idx]).length > 0 ? Object.entries(chargesDetails[idx]).map(([n,v])=>`- ${n} : ${formatMoney(v)}`).join('\n') : '  (Aucune charge)') + `\n--------------------\n= RÉSULTAT NET : ${formatMoney(amount)}` : ''}>
                                                    <div style={{ fontSize: '11px', fontWeight: '900', color: hasActivity ? (amount >= 0 ? '#059669' : '#ef4444') : 'var(--text-muted)' }}>
                                                        {hasActivity ? formatNumber(amount) : '-'}
                                                    </div>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                    <tr>
                                        <td style={{ padding: '4px 8px', fontSize: '10px', fontWeight: '900', color: 'var(--text-main)', textAlign: 'left', borderTop: '1px solid var(--border-color)', cursor: 'help' }} title="La rentabilité réelle de l'agence : Total des encaissements (flux bancaire) moins les charges réelles">Bénéfice Réel (Encaissé)</td>
                                        {monthlyBeneficeReel.map((amount, idx) => {
                                            const hasActivity = monthlyCAFacture[idx] > 0 || monthlyCharges[idx] > 0;
                                            return (
                                                <td key={`benr-${idx}`} style={{ padding: '6px', background: hasActivity ? (amount >= 0 ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)') : 'transparent', borderRadius: '6px', borderTop: '1px solid var(--border-color)', cursor: hasActivity ? 'help' : 'default' }} title={hasActivity ? `BÉNÉFICE RÉEL (ENCAISSÉ) (${months[idx]})\n--------------------\n[+] ENCAISSEMENTS :\n` + (Object.keys(reelDetails[idx]).length > 0 ? Object.entries(reelDetails[idx]).map(([n,v])=>`+ ${n} : ${formatMoney(v)}`).join('\n') : '  (Aucun encaissement)') + `\n\n[-] CHARGES :\n` + (Object.keys(chargesDetails[idx]).length > 0 ? Object.entries(chargesDetails[idx]).map(([n,v])=>`- ${n} : ${formatMoney(v)}`).join('\n') : '  (Aucune charge)') + `\n--------------------\n= RÉSULTAT NET : ${formatMoney(amount)}` : ''}>
                                                    <div style={{ fontSize: '11px', fontWeight: '900', color: hasActivity ? (amount >= 0 ? '#059669' : '#ef4444') : 'var(--text-muted)' }}>
                                                        {hasActivity ? formatNumber(amount) : '-'}
                                                    </div>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                
                                    <tr>
                                        <td style={{ padding: '4px 8px', fontSize: '10px', fontWeight: '900', color: '#ef4444', textAlign: 'left', borderTop: '2px dotted var(--border-color)', opacity: 0.8, cursor: 'help' }} title="Montant qu'il reste à percevoir sur les factures émises ce mois-ci (Créances / En attente)">Reste à Encaisser</td>
                                        {monthlyCAFacture.map((ca, idx) => {
                                            const rest = ca - monthlyCARealise[idx];
                                            const hasActivity = ca > 0;
                                            return (
                                                <td key={`rest-${idx}`} style={{ padding: '6px', background: 'transparent', borderRadius: '6px', borderTop: '2px dotted var(--border-color)', cursor: hasActivity && rest > 0 ? 'help' : 'default' }} title={hasActivity && rest > 0 ? `Reste à percevoir (${months[idx]}):\n` + Object.entries(remainderDetails[idx]).filter(([_,v])=>v>0.1).map(([n,v])=>`- ${n} : ${formatMoney(v)}`).join('\n') + `\n\nTotal Restant : ${formatMoney(rest)}` : ''}>
                                                    <div style={{ fontSize: '11px', fontWeight: '900', color: hasActivity && rest > 0 ? '#ef4444' : 'var(--text-muted)' }}>
                                                        {hasActivity && rest > 0 ? formatNumber(rest) : '-'}
                                                    </div>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Cash Flow Section (Trésorerie & TVA) */}
                    <div style={{ background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', marginBottom: '24px', overflow: 'hidden' }}>
                        <div style={{ padding: '12px 16px', borderBottom: '1px dashed var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-main)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ background: '#10b981', width: '4px', height: '14px', borderRadius: '4px' }}></div>
                                <h3 style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-main)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Trésorerie & Déclarations TVA (Encaissements)</h3>
                            </div>
                            <div style={{ fontSize: '13px', fontWeight: '900', color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '4px 12px', borderRadius: '8px' }}>
                                TVA Due Annuelle: {formatMoney(totalTVADue)}
                            </div>
                        </div>
                        <div style={{ overflowX: 'auto', padding: '12px' }}>
                            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '4px 2px', textAlign: 'center' }}>
                                <thead>
                                    <tr>
                                        <th style={{ padding: '4px 8px', fontSize: '9px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'left', minWidth: '80px' }}>Flux</th>
                                        {months.map(m => <th key={m} style={{ padding: '4px 8px', fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', width: 'calc((100% - 80px) / 12)' }}>{m}</th>)}
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td style={{ padding: '4px 8px', fontSize: '10px', fontWeight: '800', color: 'var(--text-main)', textAlign: 'left' }}>Recette (TTC Reçu)</td>
                                        {monthlyRecetteTTC.map((amount, idx) => (
                                            <td key={`rec-${idx}`} style={{ padding: '6px', background: amount > 0 ? 'rgba(16, 185, 129, 0.05)' : 'rgba(0,0,0,0.02)', borderRadius: '6px' }}>
                                                <div style={{ fontSize: '11px', fontWeight: '800', color: amount > 0 ? '#059669' : 'var(--text-muted)' }}>
                                                    {amount > 0 ? formatNumber(amount) : '-'}
                                                </div>
                                            </td>
                                        ))}
                                    </tr>
                                    <tr>
                                        <td style={{ padding: '4px 8px', fontSize: '10px', fontWeight: '800', color: 'var(--text-main)', textAlign: 'left' }}>TVA Collectée (Sur Reçus)</td>
                                        {monthlyTVACollectee.map((amount, idx) => (
                                            <td key={`tva-${idx}`} style={{ padding: '6px', background: amount > 0 ? 'rgba(245, 158, 11, 0.05)' : 'rgba(0,0,0,0.02)', borderRadius: '6px' }}>
                                                <div style={{ fontSize: '11px', fontWeight: '700', color: amount > 0 ? '#d97706' : 'var(--text-muted)' }}>
                                                    {amount > 0 ? formatNumber(amount) : '-'}
                                                </div>
                                            </td>
                                        ))}
                                    </tr>
                                    <tr>
                                        <td style={{ padding: '4px 8px', fontSize: '10px', fontWeight: '800', color: 'var(--text-main)', textAlign: 'left' }}>TVA Déductible (Achats)</td>
                                        {monthlyTVAGagnee.map((amount, idx) => (
                                            <td key={`tvag-${idx}`} style={{ padding: '6px', background: amount > 0 ? 'rgba(59, 130, 246, 0.05)' : 'rgba(0,0,0,0.02)', borderRadius: '6px' }}>
                                                <div style={{ fontSize: '11px', fontWeight: '800', color: amount > 0 ? '#3b82f6' : 'var(--text-muted)' }}>
                                                    {amount > 0 ? `+ ${formatNumber(amount)}` : '-'}
                                                </div>
                                            </td>
                                        ))}
                                    </tr>
                                    <tr>
                                        <td style={{ padding: '4px 8px', fontSize: '10px', fontWeight: '900', color: 'var(--text-main)', textAlign: 'left', borderTop: '2px dashed var(--border-color)' }}>Flux Net (Cash)</td>
                                        {monthlyCashNet.map((amount, idx) => {
                                            const hasActivity = monthlyRecetteTTC[idx] > 0 || monthlyCharges[idx] > 0;
                                            return (
                                                <td key={`cashn-${idx}`} style={{ padding: '6px', background: hasActivity ? (amount >= 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)') : 'transparent', borderRadius: '6px', borderTop: '2px dashed var(--border-color)' }}>
                                                    <div style={{ fontSize: '11px', fontWeight: '900', color: hasActivity ? (amount >= 0 ? '#059669' : '#ef4444') : 'var(--text-muted)' }}>
                                                        {hasActivity ? formatNumber(amount) : '-'}
                                                    </div>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Side-by-Side Tracking Tables */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '16px', marginBottom: '24px' }}>
                        
                        {/* Table du Suivi des Paiements Annuels */}
                        <div style={{ background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', overflow: 'hidden' }}>
                            <div style={{ padding: '6px 12px', borderBottom: '1px dashed var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ background: '#3b82f6', width: '3px', height: '10px', borderRadius: '4px' }}></div>
                                    <h3 style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-main)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tracking Paiements</h3>
                                </div>
                                <div style={{ display: 'flex', gap: '8px', fontSize: '8px', fontWeight: '700', color: 'var(--text-muted)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: '8px', height: '8px', borderRadius: '3px', background: '#10b981' }}></div> Payé</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: '8px', height: '8px', borderRadius: '3px', background: 'rgba(16, 185, 129, 0.3)' }}></div> Facture (Auto)</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444' }}></div> Retard</div>
                                </div>
                            </div>
                            <div style={{ overflowX: 'auto', padding: '4px' }}>
                                <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 2px', textAlign: 'center' }}>
                                    <thead>
                                        <tr>
                                            <th style={{ padding: '2px 6px', fontSize: '9px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'left', minWidth: '90px' }}>Client Actif</th>
                                            {months.map(m => <th key={m} style={{ padding: '2px', fontSize: '8px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', width: '24px' }}>{m}</th>)}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {clients.filter(c => c.etatClient === 'Actif').map((client) => (
                                            <tr key={client.id} style={{ transition: 'background 0.2s' }}>
                                                <td style={{ padding: '3px 6px', fontSize: '9px', fontWeight: '800', color: 'var(--text-main)', textAlign: 'left', borderRadius: '4px 0 0 4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100px' }}>
                                                    {client.enseigne}
                                                </td>
                                                {months.map((_, idx) => {
                                                    const status = getCellStatus(client, idx);
                                                    const invoiceForMonth = factures.find(f => {
                                                        const d = new Date(f.dateEmi);
                                                        return f.client === client.enseigne && d.getMonth() === idx && d.getFullYear() === selectedYear;
                                                    });
                                                    const isAutoPaid = invoiceForMonth && invoiceForMonth.statut === 'Paid';
                                                    const isManuallyPaid = paymentHistory[selectedYear]?.[client.id]?.[idx] || false;
                                                    const isChecked = isAutoPaid || isManuallyPaid;

                                                    if (status === 'na') {
                                                        return (
                                                            <td key={idx} style={{ padding: '1px' }}>
                                                                <div style={{ width: '16px', height: '16px', margin: '0 auto', background: 'rgba(0,0,0,0.02)', borderRadius: '4px' }}></div>
                                                            </td>
                                                        );
                                                    }

                                                    return (
                                                        <td key={idx} style={{ padding: '1px' }}>
                                                            <div 
                                                                onClick={() => !isAutoPaid && togglePayment(client.id, idx)}
                                                                style={{ 
                                                                    width: '16px', height: '16px', borderRadius: '4px', margin: '0 auto',
                                                                    border: isChecked ? 'none' : (status === 'future' ? '1px dashed var(--border-color)' : '1px solid var(--border-color)'),
                                                                    background: isAutoPaid ? 'rgba(16, 185, 129, 0.2)' : (isChecked ? '#10b981' : (status === 'late' ? 'rgba(239, 68, 68, 0.05)' : 'transparent')),
                                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                    cursor: isAutoPaid ? 'default' : 'pointer',
                                                                    transition: 'all 0.2s',
                                                                    opacity: status === 'future' && !isChecked ? 0.3 : 1
                                                                }}
                                                                title={isAutoPaid ? "Payé automatiquement par facture" : `Marquer payé pour ${months[idx]}`}
                                                            >
                                                                {isChecked && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={isAutoPaid ? '#059669' : 'white'} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                                                                {status === 'late' && !isChecked && <div style={{width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444'}}></div>}
                                                            </div>
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Table du Suivi des Paiements Facturés (Automatique) */}
                        <div style={{ background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', overflow: 'hidden' }}>
                            <div style={{ padding: '6px 12px', borderBottom: '1px dashed var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ background: 'var(--accent-gold)', width: '3px', height: '10px', borderRadius: '4px' }}></div>
                                    <h3 style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-main)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>État Pièces Factures</h3>
                                </div>
                                <div style={{ display: 'flex', gap: '8px', fontSize: '8px', fontWeight: '700', color: 'var(--text-muted)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }}></div> Réglée</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f59e0b' }}></div> Partiel</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444' }}></div> Non Réglée</div>
                                </div>
                            </div>
                            <div style={{ overflowX: 'auto', padding: '4px' }}>
                                <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 2px', textAlign: 'center' }}>
                                    <thead>
                                        <tr>
                                            <th style={{ padding: '2px 6px', fontSize: '8px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'left', minWidth: '90px' }}>Client Actif</th>
                                            {months.map(m => <th key={m} style={{ padding: '2px', fontSize: '7px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', width: '24px' }}>{m}</th>)}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {clients.filter(c => c.etatClient === 'Actif').map((client) => (
                                            <tr key={client.id} style={{ transition: 'background 0.2s' }}>
                                                <td style={{ padding: '3px 6px', fontSize: '9px', fontWeight: '800', color: 'var(--text-main)', textAlign: 'left', borderRadius: '4px 0 0 4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100px' }}>
                                                    {client.enseigne}
                                                </td>
                                                {months.map((_, idx) => {
                                                    const isContractActive = isMonthInContract(client, idx, selectedYear);
                                                    const invoiceForMonth = factures.find(f => {
                                                        let targetDate = new Date(f.dateEmi);
                                                        if (f.periodeDebut) {
                                                            const pd = new Date(f.periodeDebut);
                                                            if (!isNaN(pd.getTime())) targetDate = pd;
                                                        }
                                                        return f.client === client.enseigne && targetDate.getMonth() === idx && targetDate.getFullYear() === selectedYear;
                                                    });

                                                    let indicator = null;
                                                    if (invoiceForMonth) {
                                                        const isPartiallyPaid = invoiceForMonth.montantPaye > 0 && invoiceForMonth.statut !== 'Paid';
                                                        if (invoiceForMonth.statut === 'Paid') {
                                                            indicator = <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', margin: '0 auto', boxShadow: '0 0 6px rgba(16,185,129,0.4)' }}></div>;
                                                        } else if (isPartiallyPaid) {
                                                            indicator = <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f59e0b', margin: '0 auto', boxShadow: '0 0 6px rgba(245,158,11,0.4)' }}></div>;
                                                        } else {
                                                            indicator = <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444', margin: '0 auto', boxShadow: '0 0 6px rgba(239,68,68,0.4)' }}></div>;
                                                        }
                                                    } else if (!isContractActive) {
                                                        indicator = <div style={{ width: '16px', height: '16px', margin: '0 auto', background: 'rgba(0,0,0,0.02)', borderRadius: '4px' }}></div>;
                                                    } else {
                                                        // Future or simply no invoice yet
                                                        indicator = <div style={{ width: '3px', height: '3px', borderRadius: '50%', background: 'var(--border-color)', margin: '0 auto' }}></div>;
                                                    }

                                                    return (
                                                        <td key={idx} style={{ padding: '1px' }}>
                                                            {indicator}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Table du Suivi des Paiements Facturés (Automatique) */}
                    {/* Table du Détail Financier des Paiements (Montants) */}
                    <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '40px', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
                        <div style={{ padding: '6px 12px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-main)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <div style={{ background: '#10b981', width: '3px', height: '10px', borderRadius: '4px' }}></div>
                                <h3 style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-main)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Détail Financier des Paiements</h3>
                            </div>
                            <div style={{ fontSize: '8px', color: 'var(--text-muted)', fontWeight: '700' }}>Montants en <span style={{ fontWeight: '800', color: 'var(--primary-color)' }}>TND</span></div>
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center' }}>
                                <thead>
                                    <tr style={{ background: 'white', borderBottom: '1px solid var(--border-color)' }}>
                                        <th style={{ padding: '6px 12px', fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'left', minWidth: '120px' }}>Client</th>
                                        {months.map(m => (
                                            <th key={m} style={{ padding: '6px 4px', fontSize: '9px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', minWidth: '60px' }}>{m}</th>
                                        ))}
                                        <th style={{ padding: '6px 8px', fontSize: '10px', fontWeight: '800', color: '#10b981', textTransform: 'uppercase', minWidth: '85px', borderLeft: '1px dashed var(--border-color)' }}>Total Payé</th>
                                        <th style={{ padding: '6px 8px', fontSize: '10px', fontWeight: '800', color: '#ef4444', textTransform: 'uppercase', minWidth: '85px' }}>Total Impayé</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(() => {
                                        const monthlyTotals = Array(12).fill(null).map(() => ({ paid: 0, unpaid: 0 }));
                                        let grandTotalPaid = 0;
                                        let grandTotalUnpaid = 0;
                                        const activeClients = clients.filter(c => c.etatClient === 'Actif');

                                        return (
                                            <>
                                                {activeClients.map((client) => {
                                                    let clientPaid = 0;
                                                    let clientUnpaid = 0;

                                                    return (
                                                        <tr key={client.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s', fontSize: '11px' }}>
                                                            <td style={{ padding: '6px 12px', fontWeight: '800', color: 'var(--text-main)', textAlign: 'left', borderRight: '1px dashed var(--border-color)', background: 'var(--bg-main)', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
                                                                {client.enseigne}
                                                            </td>
                                                            {months.map((_, idx) => {
                                                                const isContractActive = isMonthInContract(client, idx, selectedYear);

                                                                const invoicesForMonth = factures.filter(f => {
                                                                    let targetDate = new Date(f.dateEmi);
                                                                    if (f.periodeDebut) {
                                                                        const pd = new Date(f.periodeDebut);
                                                                        if (!isNaN(pd.getTime())) targetDate = pd;
                                                                    }
                                                                    return f.client === client.enseigne && targetDate.getMonth() === idx && targetDate.getFullYear() === selectedYear;
                                                                });

                                                                let monthPaid = 0;
                                                                let monthUnpaid = 0;
                                                                let hasActivity = isContractActive || invoicesForMonth.length > 0;

                                                                if (hasActivity) {
                                                                    invoicesForMonth.forEach(f => {
                                                                        const amountOwed = parseFloat(f.montant) || 0;
                                                                        const amountPaid = f.statut === 'Paid' ? amountOwed : (parseFloat(f.montantPaye) || 0);
                                                                        const amountRemaining = amountOwed - amountPaid;
                                                                        
                                                                        monthPaid += amountPaid;
                                                                        monthUnpaid += amountRemaining;
                                                                    });

                                                                    monthlyTotals[idx].paid += monthPaid;
                                                                    monthlyTotals[idx].unpaid += monthUnpaid;
                                                                    clientPaid += monthPaid;
                                                                    clientUnpaid += monthUnpaid;
                                                                    grandTotalPaid += monthPaid;
                                                                    grandTotalUnpaid += monthUnpaid;
                                                                }

                                                                const totalAmount = monthPaid + monthUnpaid;
                                                                let statusColor = 'transparent';
                                                                let bgStripes = 'none';

                                                                if (!hasActivity) {
                                                                    return (
                                                                        <td key={idx} style={{ padding: '4px', borderRight: '1px dashed rgba(0,0,0,0.03)', verticalAlign: 'middle' }}>
                                                                            <div style={{ width: '16px', height: '16px', margin: '0 auto', background: 'rgba(0,0,0,0.02)', borderRadius: '4px' }}></div>
                                                                        </td>
                                                                    );
                                                                }

                                                                if (totalAmount > 0) {
                                                                    if (monthUnpaid === 0) { // All paid
                                                                        statusColor = 'rgba(16, 185, 129, 0.05)';
                                                                    } else if (monthPaid === 0) { // All unpaid
                                                                        statusColor = 'rgba(239, 68, 68, 0.05)';
                                                                    } else { // Mixed
                                                                        statusColor = 'rgba(239, 68, 68, 0.03)';
                                                                        bgStripes = 'repeating-linear-gradient(45deg, rgba(16,185,129,0.03), rgba(16,185,129,0.03) 4px, rgba(239,68,68,0.03) 4px, rgba(239,68,68,0.03) 8px)';
                                                                    }
                                                                }

                                                                return (
                                                                    <td key={idx} style={{ padding: '4px', borderRight: '1px dashed rgba(0,0,0,0.03)', background: bgStripes !== 'none' ? bgStripes : statusColor, verticalAlign: 'middle' }}>
                                                                        <div style={{ fontSize: '10px', fontWeight: '800', whiteSpace: 'nowrap' }}>
                                                                            {totalAmount > 0 ? (
                                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'center', lineHeight: '1.2' }}>
                                                                                    {monthPaid > 0 && <span style={{ color: '#059669' }}>{formatNumber(monthPaid)}</span>}
                                                                                    {monthUnpaid > 0 && <span style={{ color: '#ef4444' }}>{formatNumber(monthUnpaid)}</span>}
                                                                                </div>
                                                                            ) : <span style={{ color: 'var(--border-color)' }}>-</span>}
                                                                        </div>
                                                                    </td>
                                                                );
                                                            })}
                                                            <td style={{ padding: '6px 8px', borderLeft: '1px dashed var(--border-color)', background: 'rgba(16, 185, 129, 0.03)', verticalAlign: 'middle' }}>
                                                                <div style={{ fontSize: '11px', fontWeight: '800', color: '#059669' }}>
                                                                    {clientPaid > 0 ? formatNumber(clientPaid) : '-'}
                                                                </div>
                                                            </td>
                                                            <td style={{ padding: '6px 8px', background: 'rgba(239, 68, 68, 0.03)', verticalAlign: 'middle' }}>
                                                                <div style={{ fontSize: '11px', fontWeight: '800', color: '#ef4444' }}>
                                                                    {clientUnpaid > 0 ? formatNumber(clientUnpaid) : '-'}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                                
                                                {/* Footer Totals Row */}
                                                <tr style={{ borderTop: '1px dashed var(--border-color)', background: 'var(--bg-main)' }}>
                                                    <td style={{ padding: '8px 12px', fontSize: '10px', fontWeight: '800', color: 'var(--text-main)', textAlign: 'left', borderRight: '1px dashed var(--border-color)', verticalAlign: 'middle' }}>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', lineHeight: '1.2' }}>
                                                            <span style={{ color: '#059669' }}>Total Payé</span>
                                                            <span style={{ color: '#ef4444' }}>Total Impayé</span>
                                                        </div>
                                                    </td>
                                                    {monthlyTotals.map((t, idx) => (
                                                        <td key={'total-'+idx} style={{ padding: '6px 4px', borderRight: '1px dashed rgba(0,0,0,0.03)', verticalAlign: 'middle' }}>
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'center', fontSize: '10px', fontWeight: '800', lineHeight: '1.2' }}>
                                                                {t.paid > 0 ? <span style={{ color: '#059669' }}>{formatNumber(t.paid)}</span> : <span style={{ color: 'var(--border-color)' }}>-</span>}
                                                                {t.unpaid > 0 ? <span style={{ color: '#ef4444' }}>{formatNumber(t.unpaid)}</span> : <span style={{ color: 'var(--border-color)' }}>-</span>}
                                                            </div>
                                                        </td>
                                                    ))}
                                                    <td style={{ padding: '8px', borderLeft: '1px dashed var(--border-color)', background: 'rgba(16, 185, 129, 0.08)', verticalAlign: 'middle' }}>
                                                        <div style={{ fontSize: '12px', fontWeight: '800', color: '#059669' }}>
                                                            {formatMoney(grandTotalPaid).replace('TND', '').trim()}
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '8px', background: 'rgba(239, 68, 68, 0.08)', verticalAlign: 'middle' }}>
                                                        <div style={{ fontSize: '12px', fontWeight: '800', color: '#ef4444' }}>
                                                            {formatMoney(grandTotalUnpaid).replace('TND', '').trim()}
                                                        </div>
                                                    </td>
                                                </tr>
                                            </>
                                        );
                                    })()}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </>
            )}
        </div>
    );
};

export default FinancePage;
