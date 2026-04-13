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
import { getBankTransactions, getFactures, getClients, getStorage } from '../services/storageService';
import { Users, Briefcase, RefreshCw, Zap } from 'lucide-react';

const DashboardPage = () => {
    const [manualTransactions, setManualTransactions] = React.useState([]);
    const [factures, setFactures] = React.useState([]);
    const [clients, setClients] = React.useState([]);
    const [employeeCount, setEmployeeCount] = React.useState(0);

    React.useEffect(() => {
        const loadDashboardData = () => {
            setManualTransactions(getBankTransactions() || []);
            setFactures(getFactures() || []);
            setClients(getClients() || []);
            
            // Recompute real headcount from HR module (fallback to counting unique active members)
            const rhTeam = getStorage('mynds_rh', []);
            if (rhTeam && rhTeam.length > 0) {
                setEmployeeCount(rhTeam.length);
            } else {
                setEmployeeCount(0); // Optional: we could compute from projectCosts but rhTeam is truth
            }
        };

        loadDashboardData();
        window.addEventListener('storage', loadDashboardData);
        return () => window.removeEventListener('storage', loadDashboardData);
    }, []);

    const formatMoney = (amount) => {
        return new Intl.NumberFormat('fr-TN', { style: 'currency', currency: 'TND', minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(amount);
    };

    const autoTransactions = factures
        .filter(f => f.statut === 'Paid')
        .flatMap(f => {
            const isNonDeclare = f.id.startsWith('ND-');
            
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

    const balanceBIAT = allTransactions
        .filter(t => t.bank === 'BIAT')
        .reduce((acc, curr) => acc + (curr.type === 'Credit' ? (parseFloat(curr.amount) || 0) : -(parseFloat(curr.amount) || 0)), 0);

    const balanceQNB = allTransactions
        .filter(t => t.bank === 'QNB')
        .reduce((acc, curr) => acc + (curr.type === 'Credit' ? (parseFloat(curr.amount) || 0) : -(parseFloat(curr.amount) || 0)), 0);

    const balanceEspeces = allTransactions
        .filter(t => t.bank === 'Espèces')
        .reduce((acc, curr) => acc + (curr.type === 'Credit' ? (parseFloat(curr.amount) || 0) : -(parseFloat(curr.amount) || 0)), 0);

    const totalBankBalance = balanceBIAT + balanceQNB + balanceEspeces;

    // --- Global Operations Metrics ---
    // Total Clients Actifs
    const activeClients = clients.filter(c => c.etatClient === 'Actif');
    
    // Breakdown Abonnements vs One-Shot
    const abonnementCount = activeClients.filter(c => c.regime === 'Abonnement').length;
    const oneShotCount = activeClients.filter(c => c.regime === 'One-Shot').length;

    const [selectedMonth, setSelectedMonth] = React.useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = React.useState(new Date().getFullYear());

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

                        <div style={{ display: 'flex', gap: '24px', borderLeft: '1px dashed rgba(255,255,255,0.15)', paddingLeft: '24px' }}>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#3b82f6' }}></div>
                                    <div style={{ fontSize: '9px', fontWeight: '800', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>BIAT (Société)</div>
                                </div>
                                <div style={{ fontSize: '16px', fontWeight: '800', color: '#93c5fd' }}>{formatMoney(balanceBIAT)}</div>
                            </div>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444' }}></div>
                                    <div style={{ fontSize: '9px', fontWeight: '800', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>QNB (Perso)</div>
                                </div>
                                <div style={{ fontSize: '16px', fontWeight: '800', color: '#fca5a5' }}>{formatMoney(balanceQNB)}</div>
                            </div>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }}></div>
                                    <div style={{ fontSize: '9px', fontWeight: '800', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Cash (Espèces)</div>
                                </div>
                                <div style={{ fontSize: '16px', fontWeight: '800', color: '#6ee7b7' }}>{formatMoney(balanceEspeces)}</div>
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
                                    {activeClients.length}
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
