import React from 'react';
import Header from '../components/Header';
import ClientPaymentChart from '../components/ClientPaymentChart';
import MonthlySummaryCard from '../components/MonthlySummaryCard';
import AlertsBlock from '../components/AlertsBlock';
import MonthlyCalendarCard from '../components/MonthlyCalendarCard';
import IncomeExpenseChart from '../components/IncomeExpenseChart';
import InvoiceTypesChart from '../components/InvoiceTypesChart';
import CashflowForecastChart from '../components/CashflowForecastChart';
import EmployeeWorkloadChart from '../components/EmployeeWorkloadChart';
import ScrollingBanner from '../components/ScrollingBanner';
import UpcomingDeadlinesCard from '../components/UpcomingDeadlinesCard';
import { useData } from '../context/DataContext';
import { getStorage } from '../services/storageService';
import { FileText, Users, CreditCard, Activity, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Wallet, Percent, DollarSign, Briefcase, RefreshCw, Zap } from 'lucide-react';
import { isInvoiceNonDeclare } from '../utils/billingUtils';

const DashboardPage = () => {
    const { clients = [], factures = [], bankTransactions: manualTransactions = [], employees = [], loading } = useData();
    const [companyBanks, setCompanyBanks] = React.useState([]);
    const [selectedMonth, setSelectedMonth] = React.useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = React.useState(new Date().getFullYear());

    React.useEffect(() => {
        const banks = getStorage('mynds_company_banks', [
            { id: '1', bank_name: 'BIAT', swift_bic: 'BIATTNTN', account_number: '08000000000000000000', currency: 'TND', isDefault: true, actif: true },
            { id: '2', bank_name: 'QNB', swift_bic: 'QNBTNTN', account_number: '12000000000000000000', currency: 'TND', isDefault: false, actif: true }
        ]);
        setCompanyBanks(banks);
    }, []);

    if (loading) {
        return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'var(--text-muted)' }}>Chargement du tableau de bord...</div>;
    }

    const employeeCount = employees?.length || 0;

    const formatMoney = (amount) => {
        return new Intl.NumberFormat('fr-TN', { style: 'currency', currency: 'TND', minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(amount);
    };

    const autoTransactions = factures
        .filter(f => f.statut === 'Paid')
        .flatMap(f => {
            const clientObj = clients.find(c => c.id === f.clientId || c.enseigne === f.client);
            const isNonDeclare = isInvoiceNonDeclare(f, clientObj);
            
            const baseTrans = {
                amount: parseFloat(f.montant) || 0,
                bank: f.compteEncaissement || (isNonDeclare ? 'QNB' : 'BIAT'),
                type: 'Credit'
            };

            const generated = [baseTrans];

            if (f.isExtra && f.coutExtra > 0) {
                generated.push({
                    amount: parseFloat(f.coutExtra) || 0,
                    bank: f.compteEncaissement || (isNonDeclare ? 'QNB' : 'BIAT'),
                    type: 'Debit'
                });
            }

            return generated;
        });

    const allTransactions = [...manualTransactions, ...autoTransactions];

    const activeBanks = companyBanks.filter(b => b.actif);
    
    const bankBalances = activeBanks.reduce((acc, b) => {
        acc[b.bank_name] = allTransactions
            .filter(t => t.bank === b.bank_name)
            .reduce((total, curr) => total + (curr.type === 'Credit' ? (parseFloat(curr.amount) || 0) : -(parseFloat(curr.amount) || 0)), 0);
        return acc;
    }, {});

    const balanceEspeces = allTransactions
        .filter(t => t.bank === 'Espèces')
        .reduce((acc, curr) => acc + (curr.type === 'Credit' ? (parseFloat(curr.amount) || 0) : -(parseFloat(curr.amount) || 0)), 0);

    const balanceTech = allTransactions
        .filter(t => t.category === 'Charges CT' && t.type === 'Debit')
        .reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0)
        - (getStorage('mynds_sponsoring', []) || []).reduce((acc, curr) => acc + (parseFloat(curr.montantTNDBanque) || 0), 0);

    const totalBankBalance = Object.values(bankBalances).reduce((a, b) => a + b, 0) + balanceEspeces;

    // --- Global Operations Metrics ---
    // Total Clients Actifs
    const activeClients = clients.filter(c => c.etatClient === 'Actif');
    
    // Breakdown Abonnements vs One-Shot
    const abonnementCount = activeClients?.filter(c => c.regime === 'Abonnement').length || 0;
    const oneShotCount = activeClients?.filter(c => c.regime === 'One-Shot').length || 0;


    return (
        <div>
            <Header 
                showMonthSelector={false} 
                title="" 
                subtitle="" 
                rightContent={
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value === 'all' ? 'all' : parseInt(e.target.value))} style={{ padding: '8px 16px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-main)', cursor: 'pointer', outline: 'none', fontWeight: '700', fontSize: '13px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                            <option value="all">Tous les mois</option>
                            {['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'].map((m, i) => (
                                <option key={i} value={i}>{m}</option>
                            ))}
                        </select>
                        <select value={selectedYear} onChange={e => setSelectedYear(e.target.value === 'all' ? 'all' : parseInt(e.target.value))} style={{ padding: '8px 16px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-main)', cursor: 'pointer', outline: 'none', fontWeight: '700', fontSize: '13px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                            <option value="all">Toutes les années</option>
                            {[...Array(5)].map((_, i) => {
                                const y = new Date().getFullYear() - 2 + i;
                                return <option key={y} value={y}>{y}</option>;
                            })}
                        </select>
                    </div>
                }
            />
            
            <div style={{ marginBottom: '24px' }}>
                <ScrollingBanner />
            </div>

            {/* TOP LAYOUT: Trésorerie + KPIs (Left) & Calendar (Right) */}
            <div style={{ display: 'flex', gap: '24px', marginBottom: '32px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                
                {/* LEFT COLUMN: Bank Balances + Operations Bar */}
                <div style={{ flex: '2 1 600px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    
                    {/* Bank Balances */}
                    <div style={{
                        background: 'var(--text-main)',
                        padding: '12px 24px',
                        borderRadius: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
                        color: 'white'
                    }}>
                        <div>
                            <div style={{ fontSize: '10px', fontWeight: '800', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '2px' }}>Trésorerie Totale</div>
                            <div style={{ fontSize: '24px', fontWeight: '900', letterSpacing: '-0.5px' }}>{formatMoney(totalBankBalance)}</div>
                        </div>

                        <div style={{ display: 'flex', gap: '24px', borderLeft: '1px dashed rgba(255,255,255,0.15)', paddingLeft: '24px', flex: 1, overflowX: 'auto', paddingBottom: '4px' }}>
                            {activeBanks.map((bank, idx) => (
                                <div key={bank.id}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: idx === 0 ? '#3b82f6' : (idx === 1 ? '#ef4444' : '#10b981') }}></div>
                                        <div style={{ fontSize: '9px', fontWeight: '800', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>{bank.bank_name}</div>
                                    </div>
                                    <div style={{ fontSize: '16px', fontWeight: '800', color: idx === 0 ? '#93c5fd' : (idx === 1 ? '#fca5a5' : '#6ee7b7') }}>{formatMoney(bankBalances[bank.bank_name] || 0)}</div>
                                </div>
                            ))}
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }}></div>
                                    <div style={{ fontSize: '9px', fontWeight: '800', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Cash</div>
                                </div>
                                <div style={{ fontSize: '16px', fontWeight: '800', color: '#6ee7b7' }}>{formatMoney(balanceEspeces)}</div>
                            </div>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#a855f7' }}></div>
                                    <div style={{ fontSize: '9px', fontWeight: '800', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Carte Tech</div>
                                </div>
                                <div style={{ fontSize: '16px', fontWeight: '800', color: '#d8b4fe' }}>{formatMoney(balanceTech)}</div>
                            </div>
                        </div>
                    </div>

                    {/* HORIZONTAL GLOBAL OPERATIONS BAR */}
                    <div style={{ 
                        display: 'flex', gap: '16px', padding: '16px 20px', 
                        background: 'var(--card-bg)', borderRadius: '16px', border: '1px solid var(--border-color)',
                        alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
                        flexWrap: 'wrap'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', padding: '10px', borderRadius: '12px' }}>
                                <Users size={20} />
                            </div>
                            <div>
                                <div style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>Clients Actifs</div>
                                <div style={{ fontSize: '18px', fontWeight: '900', color: 'var(--text-main)', display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                                    {activeClients?.length || 0}
                                </div>
                            </div>
                        </div>

                        <div style={{ width: '1px', height: '32px', background: 'var(--border-color)' }}></div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '10px', borderRadius: '12px' }}>
                                <RefreshCw size={20} />
                            </div>
                            <div>
                                <div style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>Abonnements</div>
                                <div style={{ fontSize: '18px', fontWeight: '900', color: 'var(--text-main)', display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                                    {abonnementCount}
                                </div>
                            </div>
                        </div>

                        <div style={{ width: '1px', height: '32px', background: 'var(--border-color)' }}></div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', padding: '10px', borderRadius: '12px' }}>
                                <Zap size={20} />
                            </div>
                            <div>
                                <div style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>One-Shot</div>
                                <div style={{ fontSize: '18px', fontWeight: '900', color: 'var(--text-main)', display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                                    {oneShotCount}
                                </div>
                            </div>
                        </div>

                        <div style={{ width: '1px', height: '32px', background: 'var(--border-color)' }}></div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', padding: '10px', borderRadius: '12px' }}>
                                <Briefcase size={20} />
                            </div>
                            <div>
                                <div style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>Équipe (RH)</div>
                                <div style={{ fontSize: '18px', fontWeight: '900', color: 'var(--text-main)', display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                                    {employeeCount}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* PREDICTIVE FORECAST ROW */}
                    <div style={{ marginBottom: '20px' }}>
                        <CashflowForecastChart 
                            totalBankBalance={totalBankBalance} 
                            factures={factures} 
                            bankTransactions={manualTransactions} 
                            daysToProject={45}
                        />
                    </div>

                    {/* ROW FOR MINI GRAPHS (Income/Expense + future ones) */}
                    <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                        <div style={{ flex: '1 1 320px', minWidth: '320px', maxWidth: '400px' }}>
                            <IncomeExpenseChart targetYear={selectedYear} />
                        </div>
                        <div style={{ flex: '1 1 250px', minWidth: '250px', maxWidth: '300px' }}>
                            <InvoiceTypesChart targetMonth={selectedMonth} targetYear={selectedYear} />
                        </div>
                        <div style={{ flex: '1 1 250px', minWidth: '250px', maxWidth: '300px' }}>
                            <EmployeeWorkloadChart />
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN: Calendar */}
                <div style={{ flex: '1 1 260px', minWidth: '260px', maxWidth: '340px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <MonthlyCalendarCard />
                    <UpcomingDeadlinesCard 
                        factures={factures} 
                        transactions={manualTransactions} 
                        clients={clients} 
                    />
                </div>
            </div>

            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', marginBottom: '24px', alignItems: 'flex-start' }}>
                {/* Left side: Payment Chart */}
                <div style={{ flex: '3 1 600px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <ClientPaymentChart />
                </div>

                {/* Right side: Monthly Summary & Alerts */}
                <div style={{ flex: '1 1 260px', minWidth: '260px', maxWidth: '340px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <MonthlySummaryCard />
                    <AlertsBlock targetMonth={selectedMonth} targetYear={selectedYear} />
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;
