import React, { useState, useEffect } from 'react';
import { PieChart, User, CreditCard } from 'lucide-react';
import { getBankTransactions, getFactures, getClients, getStorage, setStorage } from '../services/storageService';

const FinancePage = () => {
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [factures, setFactures] = useState([]);
    const [clients, setClients] = useState([]);
    const [paymentHistory, setPaymentHistory] = useState({});
    const [transactions, setTransactions] = useState([]);
    const [showActiveClients, setShowActiveClients] = useState(false);
    const [activeTab, setActiveTab] = useState('Bilan'); // 'Bilan', 'RH', or 'Staff'
    const [sponsoringList, setSponsoringList] = useState([]);

    useEffect(() => {
        setTransactions(getBankTransactions());
        setClients(getClients());
        setFactures(getFactures());
        setSponsoringList(getStorage('mynds_sponsoring', []));

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

    // === DATA FILTERING ===
    const transactionsForYear = transactions.filter(t => {
        const year = new Date(t.date).getFullYear();
        return year === selectedYear;
    });

    // === CHARGES CALCULATION (Business & Personal) ===
    const totalExploitations = transactionsForYear
        .filter(t => t.type === 'Debit' && t.category === 'Charges' && t.chargeType === 'Exploitations')
        .reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);

    const totalRH = transactionsForYear
        .filter(t => t.type === 'Debit' && t.category === 'Charges' && t.chargeType === 'Ressources Humaines')
        .reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);

    const totalPerso = transactionsForYear
        .filter(t => t.type === 'Debit' && t.category === 'Perso')
        .reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);

    // === CHARGES CT & SPONSORING ===
    const totalVirementsCT = transactionsForYear
        .filter(t => t.type === 'Debit' && t.category === 'Charges CT')
        .reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);

    const totalSponsoringYear = sponsoringList
        .filter(s => {
            const date = new Date(s.dateDebut);
            return date.getFullYear() === selectedYear;
        })
        .reduce((acc, curr) => acc + (parseFloat(curr.montantTNDBanque) || 0), 0);

    const monthlyPerso = Array(12).fill(0);
    const persoDetails = Array(12).fill().map(() => ({}));
    
    transactionsForYear
        .filter(t => t.type === 'Debit' && t.category === 'Perso')
        .forEach(t => {
            const d = new Date(t.date);
            const m = d.getMonth();
            monthlyPerso[m] += (parseFloat(t.amount) || 0);
            const cat = t.persoCategory || 'Autre';
            persoDetails[m][cat] = (persoDetails[m][cat] || 0) + (parseFloat(t.amount) || 0);
        });

    // === GLOBAL BILAN (Active Clients) ===
    const activeClients = clients.filter(c => c.etatClient === 'Actif');

    const filteredClientsByYear = activeClients.filter(client => {
        if (!client.dateDebut || client.dateDebut === '-') return true;
        const startYear = new Date(client.dateDebut).getFullYear();
        let endYear = selectedYear;
        
        if (client.dateFin) {
            endYear = new Date(client.dateFin).getFullYear();
        } else if (client.regime === 'Projet' && client.dureeMois) {
            const start = new Date(client.dateDebut);
            endYear = new Date(start.getFullYear(), start.getMonth() + parseInt(client.dureeMois) - 1, 1).getFullYear();
        }
        
        return selectedYear >= startYear && selectedYear <= endYear;
    });

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

    // === ACTIVITÉ vs TRÉSORERIE ===
    const monthlyCAFacture = Array(12).fill(0);
    const caDetails = Array(12).fill().map(() => ({}));
    const reelDetails = Array(12).fill().map(() => ({}));
    const chargesDetails = Array(12).fill().map(() => ({}));
    const remainderDetails = Array(12).fill().map(() => ({}));
    const monthlyCARealise = Array(12).fill(0);
    const monthlyRecetteTTC = Array(12).fill(0);
    const monthlyTVACollectee = Array(12).fill(0);
    const monthlyCharges = Array(12).fill(0);
    const monthlyTVAGagnee = Array(12).fill(0);

    factures.forEach(f => {
        const tvaRate = (f.isExonore || f.applyTva === false) ? 0 : 0.19;
        const amountTTC = parseFloat(f.montant) || 0;
        const amountHT = amountTTC / (1 + tvaRate);
        const amountTVA = amountTTC - amountHT;

        if (f.statut !== 'Draft' && f.statut !== 'Archived') {
            const dStrActivity = f.periodeFin || f.dateEmi;
            if (dStrActivity) {
                const dAct = new Date(dStrActivity);
                if (!isNaN(dAct.getTime()) && dAct.getFullYear() === selectedYear) {
                    monthlyCAFacture[dAct.getMonth()] += amountHT;
                    caDetails[dAct.getMonth()][f.client || 'Inconnu'] = (caDetails[dAct.getMonth()][f.client || 'Inconnu'] || 0) + amountHT;
                    
                    const restAmount = amountHT - (f.statut === 'Paid' ? amountHT : (f.paiements && f.paiements.length > 0 ? f.paiements.reduce((acc,p)=>acc+(parseFloat(p.montant)||0)/(1+tvaRate), 0) : 0));
                    if(restAmount > 0.1) remainderDetails[dAct.getMonth()][f.client || 'Inconnu'] = (remainderDetails[dAct.getMonth()][f.client || 'Inconnu'] || 0) + restAmount;
                    
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
        if (!isNaN(d.getTime()) && t.category !== 'Perso' && t.type === 'Debit') {
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

    const monthlyCashNet = monthlyRecetteTTC.map((rec, idx) => (rec - monthlyTVACollectee[idx]) - (monthlyCharges[idx] - monthlyTVAGagnee[idx]));
    const monthlyBeneficeTheorique = monthlyCAFacture.map((ca, idx) => ca - (monthlyCharges[idx] - monthlyTVAGagnee[idx]));
    const monthlyBeneficeReel = monthlyCARealise.map((caReel, idx) => caReel - (monthlyCharges[idx] - monthlyTVAGagnee[idx]));

    const totalCAFacture = monthlyCAFacture.reduce((acc, curr) => acc + curr, 0);
    const totalRecetteTTC = monthlyRecetteTTC.reduce((acc, curr) => acc + curr, 0);
    const totalTVACollectee = monthlyTVACollectee.reduce((acc, curr) => acc + curr, 0);
    const totalCharges = monthlyCharges.reduce((acc, curr) => acc + curr, 0);
    const totalTVAGagnee = monthlyTVAGagnee.reduce((acc, curr) => acc + curr, 0);
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

            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', background: 'rgba(0,0,0,0.03)', padding: '4px', borderRadius: '12px', width: 'fit-content' }}>
                <button 
                    onClick={() => setActiveTab('Bilan')}
                    style={{ padding: '8px 16px', borderRadius: '10px', border: 'none', background: activeTab === 'Bilan' ? 'white' : 'transparent', color: activeTab === 'Bilan' ? 'var(--primary-color)' : 'var(--text-muted)', fontSize: '12px', fontWeight: '800', cursor: 'pointer', boxShadow: activeTab === 'Bilan' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none', transition: 'all 0.2s' }}
                >
                    Audit & Bilan Global
                </button>
                <button 
                    onClick={() => setActiveTab('RH')}
                    style={{ padding: '8px 16px', borderRadius: '10px', border: 'none', background: activeTab === 'RH' ? 'white' : 'transparent', color: activeTab === 'RH' ? '#3b82f6' : 'var(--text-muted)', fontSize: '12px', fontWeight: '800', cursor: 'pointer', boxShadow: activeTab === 'RH' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none', transition: 'all 0.2s' }}
                >
                    Charges RH (Vue Projets)
                </button>
                <button 
                    onClick={() => setActiveTab('Staff')}
                    style={{ padding: '8px 16px', borderRadius: '10px', border: 'none', background: activeTab === 'Staff' ? 'white' : 'transparent', color: activeTab === 'Staff' ? '#8b5cf6' : 'var(--text-muted)', fontSize: '12px', fontWeight: '800', cursor: 'pointer', boxShadow: activeTab === 'Staff' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none', transition: 'all 0.2s' }}
                >
                    Vue par Collaborateur
                </button>
            </div>

            {activeTab === 'Bilan' ? (
                <>

            {/* Charges KPIs Section */}
            <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                    <div style={{ background: 'white', padding: '10px 14px', borderRadius: '12px', border: '1px solid rgba(245, 158, 11, 0.1)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f59e0b' }}></div>
                            <div style={{ fontSize: '9px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Charges Exploitations</div>
                        </div>
                        <div style={{ fontSize: '16px', fontWeight: '900', color: 'var(--text-main)' }}>{formatMoney(totalExploitations)}</div>
                    </div>

                    <div style={{ background: 'white', padding: '10px 14px', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.1)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#3b82f6' }}></div>
                            <div style={{ fontSize: '9px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Ressources Humaines</div>
                        </div>
                        <div style={{ fontSize: '16px', fontWeight: '900', color: 'var(--text-main)' }}>{formatMoney(totalRH)}</div>
                    </div>

                    <div style={{ background: 'white', padding: '10px 14px', borderRadius: '12px', border: '1px solid rgba(139, 92, 246, 0.1)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#8b5cf6' }}></div>
                            <div style={{ fontSize: '9px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Carte Tech & Spons.</div>
                        </div>
                        <div style={{ fontSize: '16px', fontWeight: '900', color: 'var(--text-main)' }}>{formatMoney(totalVirementsCT)}</div>
                        <div style={{ fontSize: '8px', color: 'var(--text-muted)', fontWeight: '700' }}>SPONS: {formatMoney(totalSponsoringYear)}</div>
                    </div>

                    <div style={{ background: 'white', padding: '10px 14px', borderRadius: '12px', border: '1px solid rgba(100, 116, 139, 0.1)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#64748b' }}></div>
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
                    <p style={{ fontSize: '14px', maxWidth: '400px', margin: '0 auto' }}>Ajoutez des clients pour voir le bilan financier.</p>
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
                            <div className="kpi-variation positive" style={{ top: '6px', right: '6px', opacity: 0.8, fontSize: '8px', padding: '2px 4px' }}>{globalMarginRate >= 20 ? 'Rentable' : 'Risqué'}</div>
                            <div className="kpi-title" style={{ fontSize: '9px', color: '#f59e0b', marginBottom: '0' }}>Rentabilité</div>
                            <div className="kpi-value" style={{ fontSize: '16px', color: globalMarginRate >= 50 ? '#10b981' : globalMarginRate >= 20 ? '#f59e0b' : '#ef4444' }}>{globalMarginRate.toFixed(1)}%</div>
                        </div>
                    </div>

                    {/* Active Clients Table */}
                    <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '24px', border: '1px solid var(--border-color)', borderRadius: '12px', background: 'var(--card-bg)' }}>
                        <div onClick={() => setShowActiveClients(!showActiveClients)} style={{ padding: '10px 16px', borderBottom: showActiveClients ? '1px solid var(--border-color)' : 'none', background: 'linear-gradient(to right, var(--bg-main), transparent)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ background: 'var(--accent-gold)', width: '3px', height: '14px', borderRadius: '4px' }}></div>
                                <h3 style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-main)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Détail des Clients Actifs</h3>
                                <span style={{ fontSize: '10px', background: 'var(--accent-gold)', color: 'var(--text-main)', padding: '2px 6px', borderRadius: '10px', fontWeight: '900' }}>{filteredClientsByYear.length}</span>
                            </div>
                            <div style={{ transform: showActiveClients ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s', color: 'var(--text-muted)' }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                            </div>
                        </div>
                        
                        {showActiveClients && (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                    <thead style={{ background: 'rgba(0,0,0,0.01)' }}>
                                        <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                            <th style={{ padding: '4px 8px', fontSize: '9px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Client & Régime</th>
                                            <th style={{ padding: '4px 8px', fontSize: '9px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Période / Durée</th>
                                            <th style={{ padding: '4px 8px', fontSize: '9px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px', textAlign: 'right' }}>C.A. HT</th>
                                            <th style={{ padding: '4px 8px', fontSize: '9px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px', textAlign: 'right' }}>Charges</th>
                                            <th style={{ padding: '4px 8px', fontSize: '9px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px', textAlign: 'right' }}>Bénéfice</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredClientsByYear.map((client) => {
                                            const rev = getMonthlyEquivalent(client, 'revenue');
                                            const cst = getMonthlyEquivalent(client, 'costs');
                                            const marg = getMonthlyEquivalent(client, 'margin');
                                            const isAbo = client.regime === 'Abonnement';

                                            return (
                                                <tr key={client.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.03)', fontSize: '10.5px', transition: 'background 0.2s' }}>
                                                    <td style={{ padding: '2px 8px' }}>
                                                        <span style={{ fontWeight: '800', color: 'var(--text-main)' }}>{client.enseigne}</span>
                                                        <span style={{ fontSize: '8px', color: isAbo ? '#3b82f6' : '#8b5cf6', marginLeft: '6px', textTransform: 'uppercase', fontWeight: '700' }}>
                                                            {isAbo ? 'ABO' : 'O.S'}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '2px 8px', color: 'var(--text-muted)' }}>
                                                        {client.dateDebut || '-'} <span style={{ fontSize: '9px', opacity: 0.7 }}>({client.dureeService || (client.dureeMois ? `${client.dureeMois}m` : '-')})</span>
                                                    </td>
                                                    <td style={{ padding: '2px 8px', textAlign: 'right', fontWeight: '700', color: 'var(--text-main)' }}>
                                                        {formatNumber(rev)}
                                                    </td>
                                                    <td style={{ padding: '2px 8px', textAlign: 'right', color: '#ef4444', fontWeight: '600' }}>
                                                        -{formatNumber(cst)}
                                                    </td>
                                                    <td style={{ padding: '2px 8px', textAlign: 'right' }}>
                                                        <span style={{ fontWeight: '900', color: marg >= 0 ? '#059669' : '#ef4444' }}>
                                                            {formatNumber(marg)}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Activity Section */}
                    <div style={{ background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '24px', overflow: 'hidden' }}>
                        <div style={{ padding: '12px 16px', background: 'var(--bg-main)', borderBottom: '1px dashed var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ background: '#3b82f6', width: '4px', height: '14px', borderRadius: '4px' }}></div>
                                <h3 style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-main)', margin: 0, textTransform: 'uppercase' }}>Activité Mensuelle</h3>
                            </div>
                        </div>
                        <div style={{ overflowX: 'auto', padding: '12px' }}>
                            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '4px', textAlign: 'center' }}>
                                <thead>
                                    <tr>
                                        <th style={{ padding: '4px 8px', fontSize: '9px', fontWeight: '800', textAlign: 'left' }}>Indicateur</th>
                                        {months.map(m => <th key={m} style={{ fontSize: '10px', fontWeight: '800' }}>{m}</th>)}
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td style={{ textAlign: 'left', fontSize: '10px', fontWeight: '800' }}>C.A. Facturé (HT)</td>
                                        {monthlyCAFacture.map((v, i) => (
                                            <td key={i} style={{ background: 'rgba(59, 130, 246, 0.05)', borderRadius: '4px', fontSize: '11px', cursor: v > 0 ? 'help' : 'default' }}
                                                title={v > 0 ? `Détail ${months[i]}:\n` + Object.entries(caDetails[i]).sort((a,b)=>b[1]-a[1]).map(([n,val])=>`- ${n}: ${formatNumber(val)}`).join('\n') : ''}>
                                                {v > 0 ? formatNumber(v) : '-'}
                                            </td>
                                        ))}
                                    </tr>
                                    <tr>
                                        <td style={{ textAlign: 'left', fontSize: '10px', fontWeight: '800', color: '#10b981' }}>C.A. Réalisé/Encaissé (HT)</td>
                                        {monthlyCARealise.map((v, i) => (
                                            <td key={i} style={{ background: 'rgba(16, 185, 129, 0.05)', borderRadius: '4px', fontSize: '11px', color: '#10b981', cursor: v > 0 ? 'help' : 'default' }}
                                                title={v > 0 ? `Encaissé ${months[i]}:\n` + Object.entries(reelDetails[i]).sort((a,b)=>b[1]-a[1]).map(([n,val])=>`- ${n}: ${formatNumber(val)}`).join('\n') : ''}>
                                                {v > 0 ? formatNumber(v) : '-'}
                                            </td>
                                        ))}
                                    </tr>
                                    <tr style={{ borderTop: '1px dashed rgba(239, 68, 68, 0.1)' }}>
                                        <td style={{ textAlign: 'left', fontSize: '10px', fontWeight: '800' }}>Charges (Générales)</td>
                                        {monthlyCharges.map((v, i) => (
                                            <td key={i} style={{ background: 'rgba(239, 68, 68, 0.05)', borderRadius: '4px', fontSize: '11px', color: '#ef4444', cursor: v > 0 ? 'help' : 'default' }}
                                                title={v > 0 ? `Détail Charges ${months[i]}:\n` + Object.entries(chargesDetails[i]).sort((a,b)=>b[1]-a[1]).map(([n,val])=>`- ${n}: ${formatNumber(val)}`).join('\n') : ''}>
                                                {v > 0 ? `-${formatNumber(v)}` : '-'}
                                            </td>
                                        ))}
                                    </tr>
                                    <tr>
                                        <td style={{ textAlign: 'left', fontSize: '10px', fontWeight: '800', borderLeft: '3px solid #f59e0b', paddingLeft: '8px' }}>Reste à Recouvrer (HT)</td>
                                        {months.map((_, i) => {
                                            const v = Object.values(remainderDetails[i]).reduce((a,b)=>a+b, 0);
                                            return (
                                                <td key={i} style={{ background: v > 0 ? 'rgba(245, 158, 11, 0.03)' : 'transparent', borderRadius: '4px', fontSize: '11px', color: '#f59e0b', cursor: v > 0 ? 'help' : 'default' }}
                                                    title={v > 0 ? `À recouvrer ${months[i]}:\n` + Object.entries(remainderDetails[i]).sort((a,b)=>b[1]-a[1]).map(([n,val])=>`- ${n}: ${formatNumber(val)}`).join('\n') : ''}>
                                                    {v > 0 ? formatNumber(v) : '-'}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                    <tr style={{ borderTop: '1px solid var(--border-color)' }}>
                                        <td style={{ textAlign: 'left', fontSize: '10px', fontWeight: '900' }}>Bénéfice Réel</td>
                                        {monthlyBeneficeReel.map((v, i) => <td key={i} style={{ background: v >= 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', borderRadius: '4px', fontSize: '11px', fontWeight: '900', color: v >= 0 ? '#059669' : '#ef4444' }}>{v !== 0 ? formatNumber(v) : '-'}</td>)}
                                    </tr>

                                </tbody>
                            </table>
                        </div>
                    </div>



                    {/* Trésorerie & Déclarations TVA (Encaissements) */}
                    <div style={{ background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '24px', overflow: 'hidden' }}>
                        <div style={{ padding: '12px 16px', background: 'var(--bg-main)', borderBottom: '1px dashed var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ background: '#10b981', width: '4px', height: '14px', borderRadius: '4px' }}></div>
                                <h3 style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-main)', margin: 0, textTransform: 'uppercase' }}>Trésorerie & Déclarations TVA (Encaissements)</h3>
                            </div>
                        </div>
                        <div style={{ overflowX: 'auto', padding: '12px' }}>
                            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '4px', textAlign: 'center' }}>
                                <thead>
                                    <tr>
                                        <th style={{ padding: '4px 8px', fontSize: '9px', fontWeight: '800', textAlign: 'left' }}>Mois</th>
                                        <th style={{ fontSize: '10px', fontWeight: '800' }}>Recette TTC</th>
                                        <th style={{ fontSize: '10px', fontWeight: '800', color: '#ef4444' }}>TVA Collectée</th>
                                        <th style={{ fontSize: '10px', fontWeight: '800', color: '#10b981' }}>TVA Déductible</th>
                                        <th style={{ fontSize: '10px', fontWeight: '800', color: '#f59e0b' }}>TVA Due</th>
                                        <th style={{ fontSize: '10px', fontWeight: '900', background: 'rgba(0,0,0,0.02)', borderRadius: '4px' }}>Flux Net (Tréso)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {months.map((m, i) => {
                                        const tvaDue = monthlyTVACollectee[i] - monthlyTVAGagnee[i];
                                        return (
                                            <tr key={i}>
                                                <td style={{ textAlign: 'left', fontSize: '10px', fontWeight: '800' }}>{m}</td>
                                                <td style={{ background: 'rgba(16, 185, 129, 0.05)', borderRadius: '4px', fontSize: '11px' }}>{monthlyRecetteTTC[i] > 0 ? formatNumber(monthlyRecetteTTC[i]) : '-'}</td>
                                                <td style={{ background: 'rgba(239, 68, 68, 0.05)', borderRadius: '4px', fontSize: '11px', color: '#ef4444' }}>{monthlyTVACollectee[i] > 0 ? formatNumber(monthlyTVACollectee[i]) : '-'}</td>
                                                <td style={{ background: 'rgba(16, 185, 129, 0.05)', borderRadius: '4px', fontSize: '11px', color: '#10b981' }}>{monthlyTVAGagnee[i] > 0 ? formatNumber(monthlyTVAGagnee[i]) : '-'}</td>
                                                <td style={{ background: tvaDue > 0 ? 'rgba(245, 158, 11, 0.08)' : 'rgba(0,0,0,0.02)', borderRadius: '4px', fontSize: '11px', fontWeight: '800', color: '#f59e0b' }}>{tvaDue !== 0 ? formatNumber(tvaDue) : '-'}</td>
                                                <td style={{ background: monthlyCashNet[i] >= 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', borderRadius: '4px', fontSize: '11px', fontWeight: '900', color: monthlyCashNet[i] >= 0 ? '#059669' : '#ef4444' }}>{monthlyCashNet[i] !== 0 ? formatNumber(monthlyCashNet[i]) : '-'}</td>
                                            </tr>
                                        );
                                    })}
                                    <tr style={{ borderTop: '2px solid var(--border-color)', fontWeight: '900', background: 'var(--bg-main)' }}>
                                        <td style={{ textAlign: 'left', fontSize: '10px', padding: '8px 4px' }}>TOTAL {selectedYear}</td>
                                        <td style={{ fontSize: '12px' }}>{formatNumber(totalRecetteTTC)}</td>
                                        <td style={{ fontSize: '12px', color: '#ef4444' }}>{formatNumber(totalTVACollectee)}</td>
                                        <td style={{ fontSize: '12px', color: '#10b981' }}>{formatNumber(totalTVAGagnee)}</td>
                                        <td style={{ fontSize: '12px', color: '#f59e0b', background: 'rgba(245, 158, 11, 0.1)' }}>{formatNumber(totalTVADue)}</td>
                                        <td style={{ fontSize: '13px', color: '#059669', background: 'rgba(16, 185, 129, 0.1)' }}>{formatNumber(monthlyCashNet.reduce((a,b)=>a+b, 0))}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* État Pièces Factures (Grid) */}
                    <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '24px', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
                        <div style={{ padding: '6px 12px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-main)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <div style={{ background: 'var(--accent-gold)', width: '3px', height: '10px', borderRadius: '4px' }}></div>
                                <h3 style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-main)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>État Pièces Factures</h3>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '8px', fontWeight: '700', color: 'var(--text-muted)' }}>
                                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }}></div> PAYÉ
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '8px', fontWeight: '700', color: 'var(--text-muted)' }}>
                                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f59e0b' }}></div> PARTIEL
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '8px', fontWeight: '700', color: 'var(--text-muted)' }}>
                                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444' }}></div> IMPAYÉ
                                </div>
                            </div>
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center' }}>
                                <thead>
                                    <tr style={{ background: 'white', borderBottom: '1px solid var(--border-color)' }}>
                                        <th style={{ padding: '6px 12px', fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'left', minWidth: '120px' }}>Client</th>
                                        {months.map(m => <th key={m} style={{ padding: '6px 4px', fontSize: '9px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{m}</th>)}
                                    </tr>
                                </thead>
                                <tbody>
                                    {activeClients.map((client) => (
                                        <tr key={client.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s' }}>
                                            <td style={{ padding: '4px 12px', fontSize: '11px', fontWeight: '800', color: 'var(--text-main)', textAlign: 'left', borderRight: '1px dashed var(--border-color)', background: 'var(--bg-main)' }}>
                                                {client.enseigne}
                                            </td>
                                            {months.map((_, idx) => {
                                                const isContractActive = isMonthInContract(client, idx, selectedYear);
                                                const invoices = factures.filter(f => {
                                                    let targetDate = new Date(f.dateEmi);
                                                    if (f.periodeDebut) {
                                                        const pd = new Date(f.periodeDebut);
                                                        if (!isNaN(pd.getTime())) targetDate = pd;
                                                    }
                                                    return f.client === client.enseigne && targetDate.getMonth() === idx && targetDate.getFullYear() === selectedYear;
                                                });

                                                let indicator = null;
                                                if (invoices.length > 0) {
                                                    const allPaid = invoices.every(f => f.statut === 'Paid');
                                                    const somePaid = invoices.some(f => f.statut === 'Paid' || (f.montantPaye && parseFloat(f.montantPaye) > 0));
                                                    if (allPaid) {
                                                        indicator = <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', margin: '0 auto', boxShadow: '0 0 6px rgba(16,185,129,0.4)' }}></div>;
                                                    } else if (somePaid) {
                                                        indicator = <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f59e0b', margin: '0 auto', boxShadow: '0 0 6px rgba(245,158,11,0.4)' }}></div>;
                                                    } else {
                                                        indicator = <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444', margin: '0 auto', boxShadow: '0 0 6px rgba(239,68,68,0.4)' }}></div>;
                                                    }
                                                } else if (!isContractActive) {
                                                    indicator = <div style={{ width: '16px', height: '16px', margin: '0 auto', background: 'rgba(0,0,0,0.02)', borderRadius: '4px' }}></div>;
                                                } else {
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

                    {/* Détail Financier des Paiements (Montants) */}
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

                                                                const totalAmount = monthPaid + monthUnpaid;
                                                                return (
                                                                    <td key={idx} style={{ padding: '4px', borderRight: '1px dashed rgba(0,0,0,0.03)', verticalAlign: 'middle' }}>
                                                                        <div style={{ fontSize: '10px', fontWeight: '800' }}>
                                                                            {totalAmount > 0 ? (
                                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'center' }}>
                                                                                    {monthPaid > 0 && <span style={{ color: '#059669' }}>{formatNumber(monthPaid)}</span>}
                                                                                    {monthUnpaid > 0 && <span style={{ color: '#ef4444' }}>{formatNumber(monthUnpaid)}</span>}
                                                                                </div>
                                                                            ) : <div style={{ width: '16px', height: '16px', margin: '0 auto', background: 'rgba(0,0,0,0.02)', borderRadius: '4px' }}></div>}
                                                                        </div>
                                                                    </td>
                                                                );
                                                            })}
                                                            <td style={{ padding: '6px 8px', borderLeft: '1px dashed var(--border-color)', background: 'rgba(16, 185, 129, 0.03)', verticalAlign: 'middle' }}>
                                                                <div style={{ fontSize: '11px', fontWeight: '800', color: '#059669' }}>{clientPaid > 0 ? formatNumber(clientPaid) : '-'}</div>
                                                            </td>
                                                            <td style={{ padding: '6px 8px', background: 'rgba(239, 68, 68, 0.03)', verticalAlign: 'middle' }}>
                                                                <div style={{ fontSize: '11px', fontWeight: '800', color: '#ef4444' }}>{clientUnpaid > 0 ? formatNumber(clientUnpaid) : '-'}</div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                                <tr style={{ borderTop: '1px dashed var(--border-color)', background: 'var(--bg-main)' }}>
                                                    <td style={{ padding: '8px 12px', fontSize: '10px', fontWeight: '800', color: 'var(--text-main)', textAlign: 'left', borderRight: '1px dashed var(--border-color)' }}>TOTAL</td>
                                                    {monthlyTotals.map((t, idx) => (
                                                        <td key={idx} style={{ padding: '6px 4px', borderRight: '1px dashed rgba(0,0,0,0.03)' }}>
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'center', fontSize: '10px', fontWeight: '800' }}>
                                                                {t.paid > 0 && <span style={{ color: '#059669' }}>{formatNumber(t.paid)}</span>}
                                                                {t.unpaid > 0 && <span style={{ color: '#ef4444' }}>{formatNumber(t.unpaid)}</span>}
                                                            </div>
                                                        </td>
                                                    ))}
                                                    <td style={{ padding: '8px', borderLeft: '1px dashed var(--border-color)', background: 'rgba(16, 185, 129, 0.08)' }}>
                                                        <div style={{ fontSize: '12px', fontWeight: '800', color: '#059669' }}>{formatNumber(grandTotalPaid)}</div>
                                                    </td>
                                                    <td style={{ padding: '8px', background: 'rgba(239, 68, 68, 0.08)' }}>
                                                        <div style={{ fontSize: '12px', fontWeight: '800', color: '#ef4444' }}>{formatNumber(grandTotalUnpaid)}</div>
                                                    </td>
                                                </tr>
                                            </>
                                        );
                                    })()}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Sidebar or Footer Tracking Paiements (Mini tables) */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px', marginBottom: '24px' }}>


                        {/* Flux Bancaire Mensuel (HT) */}
                        <div style={{ background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                            <div style={{ padding: '8px 12px', background: 'var(--bg-main)', borderBottom: '1px dashed var(--border-color)', fontSize: '10px', fontWeight: '800', textTransform: 'uppercase' }}>Résultat Bancaire Mensuel (Business)</div>
                            <div style={{ overflowX: 'auto', padding: '12px' }}>
                                <table style={{ width: '100%', textAlign: 'center' }}>
                                    <thead>
                                        <tr>
                                            <th style={{ textAlign: 'left', fontSize: '9px' }}>Mois</th>
                                            <th style={{ fontSize: '9px' }}>Encaisse</th>
                                            <th style={{ fontSize: '9px' }}>Charges</th>
                                            <th style={{ fontSize: '9px' }}>Flux Net</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {months.map((m, i) => (
                                            <tr key={i} style={{ fontSize: '11px' }}>
                                                <td style={{ textAlign: 'left', fontWeight: '800' }}>{m}</td>
                                                <td style={{ color: '#059669' }}>{formatNumber(monthlyCARealise[i])}</td>
                                                <td style={{ color: '#ef4444' }}>{formatNumber(monthlyCharges[i])}</td>
                                                <td style={{ fontWeight: '900', color: monthlyBeneficeReel[i] >= 0 ? '#059669' : '#ef4444' }}>{formatNumber(monthlyBeneficeReel[i])}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                </>
            )}
            </>
            ) : activeTab === 'RH' ? (
                <div style={{ background: 'var(--card-bg)', borderRadius: '24px', border: '1px solid var(--border-color)', padding: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <div>
                            <h3 style={{ fontSize: '14px', fontWeight: '900', color: 'var(--text-main)', margin: 0 }}>Suivi Annuel des Charges RH</h3>
                            <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '2px 0 0 0', fontWeight: '600' }}>Coûts directs (Mensuels & Ponctuels) affectés aux projets</p>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)' }}>
                                <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#3b82f6' }}></div> Mensuel
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)' }}>
                                <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#f59e0b' }}></div> Ponctuel
                            </div>
                        </div>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                    <th style={{ padding: '12px 16px', fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'left', minWidth: '180px' }}>Projet / Client</th>
                                    {months.map(m => (
                                        <th key={m} style={{ padding: '12px 8px', fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'center' }}>{m}</th>
                                    ))}
                                    <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: '900', color: 'var(--text-main)', textTransform: 'uppercase', textAlign: 'right', background: 'rgba(0,0,0,0.02)' }}>Total Annuel</th>
                                </tr>
                            </thead>
                            <tbody>
                                {activeClients.map(client => {
                                    let rowTotal = 0;
                                    return (
                                        <tr key={client.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.03)', transition: 'background 0.2s' }}>
                                            <td style={{ padding: '12px 16px' }}>
                                                <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-main)' }}>{client.enseigne}</div>
                                                <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: '600' }}>{client.projet || 'Projet Standard'}</div>
                                            </td>
                                            {months.map((_, idx) => {
                                                const isInContract = isMonthInContract(client, idx, selectedYear);
                                                if (!isInContract) return <td key={idx} style={{ padding: '4px', textAlign: 'center' }}><div style={{ width: '14px', height: '14px', margin: '0 auto', background: 'rgba(0,0,0,0.02)', borderRadius: '4px' }}></div></td>;

                                                let monthTotal = 0;
                                                let monthDetails = [];

                                                client.projectCosts?.forEach(cost => {
                                                    const amount = parseFloat(cost.montant) || 0;
                                                    const isOneShot = cost.recurrence === 'Ponctuel';
                                                    let isRelevant = false;

                                                    if (isOneShot) {
                                                        const date = cost.dateDebut ? new Date(cost.dateDebut) : (client.dateDebut ? new Date(client.dateDebut) : null);
                                                        if (date && date.getFullYear() === selectedYear && date.getMonth() === idx) {
                                                            isRelevant = true;
                                                        }
                                                    } else {
                                                        const costStart = cost.dateDebut ? new Date(cost.dateDebut) : null;
                                                        const costEnd = cost.dateFin ? new Date(cost.dateFin) : null;
                                                        const target = new Date(selectedYear, idx, 1);
                                                        const isStartOk = !costStart || target >= new Date(costStart.getFullYear(), costStart.getMonth(), 1);
                                                        const isEndOk = !costEnd || target <= new Date(costEnd.getFullYear(), costEnd.getMonth(), 1);
                                                        if (isStartOk && isEndOk) isRelevant = true;
                                                    }

                                                    if (isRelevant) {
                                                        monthTotal += amount;
                                                        monthDetails.push({ name: cost.nom, amount, isOneShot });
                                                    }
                                                });

                                                rowTotal += monthTotal;

                                                return (
                                                    <td key={idx} style={{ padding: '4px', textAlign: 'center', borderRight: '1px solid rgba(0,0,0,0.02)' }}>
                                                        {monthTotal > 0 ? (
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'center' }}>
                                                                <div style={{ fontSize: '10px', fontWeight: '900', color: 'var(--text-main)' }}>{formatNumber(monthTotal)}</div>
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                                                                    {monthDetails.map((det, dIdx) => (
                                                                        <div key={dIdx} style={{ 
                                                                            fontSize: '7.5px', 
                                                                            lineHeight: '1',
                                                                            color: det.isOneShot ? '#b45309' : '#3b82f6', 
                                                                            fontWeight: '700',
                                                                            whiteSpace: 'nowrap',
                                                                            background: det.isOneShot ? 'rgba(245, 158, 11, 0.05)' : 'rgba(59, 130, 246, 0.03)',
                                                                            padding: '1px 3px',
                                                                            borderRadius: '2px'
                                                                        }}>
                                                                            {det.name}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        ) : <div style={{ fontSize: '10px', color: 'rgba(0,0,0,0.05)' }}>-</div>}
                                                    </td>
                                                );
                                            })}
                                            <td style={{ padding: '12px 16px', textAlign: 'right', background: 'rgba(0,0,0,0.02)' }}>
                                                <div style={{ fontSize: '12px', fontWeight: '900', color: 'var(--text-main)' }}>{formatMoney(rowTotal)}</div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                <tr style={{ background: 'var(--bg-main)', borderTop: '2px solid var(--border-color)' }}>
                                    <td style={{ padding: '16px', fontSize: '11px', fontWeight: '900' }}>TOTAL MENSUEL</td>
                                    {months.map((_, idx) => {
                                        let colTotal = 0;
                                        activeClients.forEach(client => {
                                            client.projectCosts?.forEach(cost => {
                                                const amount = parseFloat(cost.montant) || 0;
                                                const isOneShot = cost.recurrence === 'Ponctuel';
                                                if (isOneShot) {
                                                    const date = cost.dateDebut ? new Date(cost.dateDebut) : null;
                                                    if (date && date.getFullYear() === selectedYear && date.getMonth() === idx) colTotal += amount;
                                                } else if (isMonthInContract(client, idx, selectedYear)) {
                                                    const costStart = cost.dateDebut ? new Date(cost.dateDebut) : null;
                                                    const costEnd = cost.dateFin ? new Date(cost.dateFin) : null;
                                                    const target = new Date(selectedYear, idx, 1);
                                                    if ((!costStart || target >= new Date(costStart.getFullYear(), costStart.getMonth(), 1)) && (!costEnd || target <= new Date(costEnd.getFullYear(), costEnd.getMonth(), 1))) {
                                                        colTotal += amount;
                                                    }
                                                }
                                            });
                                        });
                                        return (
                                            <td key={idx} style={{ textAlign: 'center', fontSize: '11px', fontWeight: '900', color: 'var(--text-main)' }}>
                                                {colTotal > 0 ? formatNumber(colTotal) : '-'}
                                            </td>
                                        );
                                    })}
                                    <td style={{ padding: '16px', textAlign: 'right', fontSize: '13px', fontWeight: '900', color: 'var(--primary-color)', background: 'rgba(0,0,0,0.04)' }}>
                                        {formatMoney(activeClients.reduce((acc, client) => acc + (client.projectCosts?.reduce((s, c) => {
                                            const amt = parseFloat(c.montant) || 0;
                                            if (c.recurrence === 'Ponctuel') {
                                                const d = c.dateDebut ? new Date(c.dateDebut) : null;
                                                return (d && d.getFullYear() === selectedYear) ? s + amt : s;
                                            }
                                            // Mensuel logic (approximation for total year active months)
                                            let activeMonths = 0;
                                            for(let i=0; i<12; i++) {
                                                if (isMonthInContract(client, i, selectedYear)) {
                                                    const costStart = c.dateDebut ? new Date(c.dateDebut) : null;
                                                    const costEnd = c.dateFin ? new Date(c.dateFin) : null;
                                                    const target = new Date(selectedYear, i, 1);
                                                    if ((!costStart || target >= new Date(costStart.getFullYear(), costStart.getMonth(), 1)) && (!costEnd || target <= new Date(costEnd.getFullYear(), costEnd.getMonth(), 1))) activeMonths++;
                                                }
                                            }
                                            return s + (amt * activeMonths);
                                        }, 0) || 0), 0))}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div style={{ background: 'var(--card-bg)', borderRadius: '24px', border: '1px solid var(--border-color)', padding: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <div>
                            <h3 style={{ fontSize: '14px', fontWeight: '900', color: 'var(--text-main)', margin: 0 }}>Suivi par Collaborateur (RH)</h3>
                            <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '2px 0 0 0', fontWeight: '600' }}>Répartition des charges par ressource à travers les projets</p>
                        </div>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                    <th style={{ padding: '12px 16px', fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'left', minWidth: '160px' }}>Collaborateur</th>
                                    {months.map(m => (
                                        <th key={m} style={{ padding: '12px 8px', fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'center' }}>{m}</th>
                                    ))}
                                    <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: '900', color: 'var(--text-main)', textTransform: 'uppercase', textAlign: 'right', background: 'rgba(0,0,0,0.02)' }}>Total RH Annuel</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(() => {
                                    // Extract unique RH names
                                    const allStaffNames = new Set();
                                    activeClients.forEach(c => c.projectCosts?.forEach(pc => { if(pc.nom) allStaffNames.add(pc.nom); }));
                                    const sortedStaff = Array.from(allStaffNames).sort();

                                    return sortedStaff.map(staffName => {
                                        let staffYearTotal = 0;
                                        return (
                                            <tr key={staffName} style={{ borderBottom: '1px solid rgba(0,0,0,0.03)', transition: 'background 0.2s' }}>
                                                <td style={{ padding: '12px 16px' }}>
                                                    <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-main)' }}>{staffName}</div>
                                                </td>
                                                {months.map((_, idx) => {
                                                    let staffMonthTotal = 0;
                                                    let projectsForStaff = [];

                                                    activeClients.forEach(client => {
                                                        const isInContract = isMonthInContract(client, idx, selectedYear);
                                                        if (!isInContract) return;

                                                        client.projectCosts?.forEach(cost => {
                                                            if (cost.nom === staffName) {
                                                                const amount = parseFloat(cost.montant) || 0;
                                                                const isOneShot = cost.recurrence === 'Ponctuel';
                                                                let isRelevant = false;

                                                                if (isOneShot) {
                                                                    const date = cost.dateDebut ? new Date(cost.dateDebut) : (client.dateDebut ? new Date(client.dateDebut) : null);
                                                                    if (date && date.getFullYear() === selectedYear && date.getMonth() === idx) isRelevant = true;
                                                                } else {
                                                                    const costStart = cost.dateDebut ? new Date(cost.dateDebut) : null;
                                                                    const costEnd = cost.dateFin ? new Date(cost.dateFin) : null;
                                                                    const target = new Date(selectedYear, idx, 1);
                                                                    const isStartOk = !costStart || target >= new Date(costStart.getFullYear(), costStart.getMonth(), 1);
                                                                    const isEndOk = !costEnd || target <= new Date(costEnd.getFullYear(), costEnd.getMonth(), 1);
                                                                    if (isStartOk && isEndOk) isRelevant = true;
                                                                }

                                                                if (isRelevant) {
                                                                    staffMonthTotal += amount;
                                                                    projectsForStaff.push({ client: client.enseigne, isOneShot });
                                                                }
                                                            }
                                                        });
                                                    });

                                                    staffYearTotal += staffMonthTotal;

                                                    return (
                                                        <td key={idx} style={{ padding: '4px', textAlign: 'center', borderRight: '1px solid rgba(0,0,0,0.02)' }}>
                                                            {staffMonthTotal > 0 ? (
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'center' }}>
                                                                    <div style={{ fontSize: '10px', fontWeight: '900', color: '#8b5cf6' }}>{formatNumber(staffMonthTotal)}</div>
                                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                                                                        {projectsForStaff.map((p, pIdx) => (
                                                                            <div key={pIdx} style={{ 
                                                                                fontSize: '7px', 
                                                                                lineHeight: '1',
                                                                                color: 'var(--text-muted)', 
                                                                                fontWeight: '700',
                                                                                whiteSpace: 'nowrap',
                                                                                background: p.isOneShot ? 'rgba(245, 158, 11, 0.05)' : 'rgba(0,0,0,0.03)',
                                                                                padding: '1px 2px',
                                                                                borderRadius: '2px'
                                                                            }}>
                                                                                {p.client}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            ) : <div style={{ fontSize: '10px', color: 'rgba(0,0,0,0.05)' }}>-</div>}
                                                        </td>
                                                    );
                                                })}
                                                <td style={{ padding: '12px 16px', textAlign: 'right', background: 'rgba(139, 92, 246, 0.03)' }}>
                                                    <div style={{ fontSize: '12px', fontWeight: '900', color: '#8b5cf6' }}>{formatMoney(staffYearTotal)}</div>
                                                </td>
                                            </tr>
                                        );
                                    });
                                })()}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FinancePage;
