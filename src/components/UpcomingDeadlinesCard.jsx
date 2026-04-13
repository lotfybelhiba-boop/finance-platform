import React from 'react';
import { CreditCard, ShieldCheck, Banknote, Calendar, CheckCircle2 } from 'lucide-react';
import { getBankTransactions, saveBankTransactions, generateId } from '../services/storageService';

const UpcomingDeadlinesCard = ({ transactions = [], factures = [], clients = [] }) => {
    const formatMoney = (amount) => {
        return new Intl.NumberFormat('fr-TN', { style: 'currency', currency: 'TND', minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(amount);
    };

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const currentMonthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    const currentMonthName = now.toLocaleDateString('fr-FR', { month: 'long' });

    // 1. PROJECTED SALARIES (Cross-referenced with Bank)
    const activeClients = clients.filter(c => c.etatClient === 'Actif');
    
    const rhPaymentsCurrentMonth = transactions.filter(t => 
        (t.chargeType === 'RH' || t.chargeType === 'Ressources Humaines' || t.category === 'RH') && 
        t.type === 'Debit' &&
        t.serviceMonth === currentMonthStr
    );

    const rhBreakdown = [];
    let totalPendingSalaries = 0;
    
    activeClients.forEach(client => {
        if (client.projectCosts && client.projectCosts.length > 0) {
            client.projectCosts.forEach(cost => {
                const amount = parseFloat(cost.montant) || 0;
                if (amount > 0) {
                    const isPaid = rhPaymentsCurrentMonth.some(p => 
                        p.desc?.toLowerCase().includes(cost.nom?.toLowerCase()) || 
                        (cost.nom && p.desc?.toLowerCase().includes(cost.nom.toLowerCase()))
                    );

                    rhBreakdown.push({
                        id: cost.id,
                        name: cost.nom || 'Inconnu',
                        project: client.enseigne,
                        amount: amount,
                        status: isPaid ? 'Paid' : 'Pending'
                    });

                    if (!isPaid) {
                        totalPendingSalaries += amount;
                    }
                }
            });
        }
    });

    const lastMonthRHBank = transactions.filter(t => (t.chargeType === 'RH' || t.desc?.toLowerCase().includes('salaire')) && t.type === 'Debit')
                                      .reduce((acc, t) => {
                                          const d = new Date(t.date);
                                          if (now - d < 45 * 24 * 60 * 60 * 1000) return acc + (parseFloat(t.amount) || 0);
                                          return acc;
                                      }, 0);

    const finalSalariesTotal = rhBreakdown.length > 0 ? totalPendingSalaries : (rhPaymentsCurrentMonth.length > 0 ? 0 : lastMonthRHBank);

    // --- PAYMENT VALIDATION LOGIC ---
    const handleSettlePayment = (items) => {
        const confirmMsg = items.length > 1 
            ? `Valider le paiement de ${items.length} salaires pour un total de ${formatMoney(items.reduce((acc, i) => acc + i.amount, 0))} ?` 
            : `Confirmer le paiement du salaire de ${items[0].name} (${formatMoney(items[0].amount)}) ?`;

        if (!window.confirm(confirmMsg)) return;

        const currentTxs = getBankTransactions();
        const newTxs = [...currentTxs];

        items.forEach(item => {
            // Default payment date to the 5th of the current month
            const paymentDate = new Date(currentYear, currentMonth, 5).toISOString().split('T')[0];
            
            newTxs.push({
                id: generateId('TRX'),
                date: new Date().toISOString().split('T')[0],
                desc: `Salaire ${item.name} - ${currentMonthName} ${currentYear}`,
                bank: 'BIAT',
                type: 'Debit',
                amount: item.amount,
                category: 'Charges',
                chargeType: 'RH',
                chargeNature: 'Fixes',
                serviceMonth: currentMonthStr,
                paymentDate: paymentDate,
                isAuto: false
            });
        });

        saveBankTransactions(newTxs);
        window.dispatchEvent(new Event('storage'));
        alert(items.length > 1 ? "Tous les salaires ont été validés." : `Salaire de ${items[0].name} validé.`);
    };

    // 2. VAT (TAXES)
    const currentMonthFactures = factures.filter(f => {
        const d = f.datePaiement ? new Date(f.datePaiement) : new Date(f.dateEmi);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear && f.statut === 'Paid';
    });

    const currentMonthCharges = transactions.filter(t => {
        const d = new Date(t.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear && t.type === 'Debit' && t.category !== 'Perso';
    });

    const tvaCollectee = currentMonthFactures.reduce((acc, f) => {
        const tvaRate = (f.isExonore || f.applyTva === false) ? 0 : 0.19;
        const ttc = parseFloat(f.montant) || 0;
        const ht = ttc / (1 + tvaRate);
        return acc + (ttc - ht);
    }, 0);

    const tvaDeductible = currentMonthCharges.reduce((acc, t) => {
        if (t.chargeType === 'RH' || t.chargeType === 'Ressources Humaines') return acc;
        const amount = parseFloat(t.amount) || 0;
        const tvaPart = amount - (amount / 1.19);
        return acc + tvaPart;
    }, 0);

    const tvaDue = Math.max(0, tvaCollectee - tvaDeductible);

    // 3. MYNDS CHARGES
    const otherChargesTransactions = transactions.filter(t => 
        t.type === 'Debit' && 
        t.category === 'Charges' && 
        t.chargeType !== 'Ressources Humaines' &&
        t.chargeType !== 'RH' &&
        t.category !== 'Perso'
    );

    const estimatedOtherCharges = otherChargesTransactions.reduce((acc, t) => {
        const d = new Date(t.date);
        if (now - d < 30 * 24 * 60 * 60 * 1000) {
            return acc + (parseFloat(t.amount) || 0);
        }
        return acc;
    }, 0);

    const DeadlineItem = ({ icon: Icon, title, amount, date, color, bgColor, tooltipData = null, type }) => {
        const [showTooltip, setShowTooltip] = React.useState(false);
        const pendingItems = tooltipData?.filter(i => i.status === 'Pending') || [];

        return (
            <div 
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '12px', 
                    padding: '12px', 
                    borderRadius: '16px', 
                    background: 'var(--bg-main)', 
                    border: '1px solid var(--border-color)',
                    transition: 'all 0.2s',
                    position: 'relative',
                    cursor: tooltipData ? 'help' : 'default',
                    zIndex: showTooltip ? 100 : 1
                }}
            >
                <div style={{ 
                    width: '40px', 
                    height: '40px', 
                    borderRadius: '12px', 
                    background: bgColor, 
                    color: color, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    boxShadow: `0 4px 10px ${color}15`
                }}>
                    <Icon size={20} />
                </div>
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '1px' }}>
                        {title}
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: '900', color: amount > 0 ? 'var(--text-main)' : 'var(--success)' }}>
                        {amount > 0 ? formatMoney(amount) : 'Paiements effectués'}
                    </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)' }}>
                        <Calendar size={12} />
                        {date}
                    </div>
                    <div style={{ fontSize: '9px', fontWeight: '800', color: amount > 0 ? color : 'var(--success)', marginTop: '2px', textTransform: 'uppercase' }}>
                        {amount > 0 ? 'À prévoir' : 'Fini'}
                    </div>
                </div>

                {/* Tooltip Breakdown & Validation */}
                {showTooltip && tooltipData && tooltipData.length > 0 && (
                    <div style={{
                        position: 'absolute',
                        bottom: '100%',
                        left: '0',
                        right: '0',
                        width: '280px',
                        background: 'rgba(15, 23, 42, 0.95)',
                        backdropFilter: 'blur(12px)',
                        padding: '16px',
                        borderRadius: '20px',
                        zIndex: 200,
                        marginBottom: '12px',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        animation: 'fadeIn 0.2s ease-out'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px' }}>
                            <div style={{ fontSize: '9px', fontWeight: '800', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>
                                Statut des Ressources
                            </div>
                            {type === 'salaries' && pendingItems.length > 0 && (
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleSettlePayment(pendingItems); }}
                                    style={{ background: 'var(--success)', color: 'white', border: 'none', borderRadius: '6px', fontSize: '9px', fontWeight: '900', padding: '4px 8px', cursor: 'pointer', textTransform: 'uppercase' }}
                                >
                                    Tout Solder
                                </button>
                            )}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {tooltipData.map((item, idx) => (
                                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: item.status === 'Paid' ? 'rgba(255,255,255,0.5)' : 'white' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span style={{ fontWeight: '700', textDecoration: item.status === 'Paid' ? 'line-through' : 'none' }}>{item.name}</span>
                                            {item.status === 'Paid' && <CheckCircle2 size={12} color="#10b981" />}
                                        </div>
                                        <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)' }}>{item.project}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <span style={{ fontWeight: '800', color: item.status === 'Paid' ? 'rgba(255,255,255,0.3)' : 'var(--accent-gold)' }}>{formatMoney(item.amount)}</span>
                                        {type === 'salaries' && item.status === 'Pending' && (
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleSettlePayment([item]); }}
                                                style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', borderRadius: '4px', padding: '4px', cursor: 'pointer' }}
                                                title="Valider le paiement"
                                            >
                                                <CheckCircle2 size={14} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
            <h3 style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-main)', margin: '0 0 4px 4px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Prochaines Échéances
            </h3>
            
            <DeadlineItem 
                icon={Banknote} 
                title="Prochains Salaires" 
                amount={finalSalariesTotal} 
                date="01/05" 
                color="#8b5cf6" 
                bgColor="rgba(139, 92, 246, 0.1)" 
                tooltipData={rhBreakdown}
                type="salaries"
            />
            
            <DeadlineItem 
                icon={ShieldCheck} 
                title="Prochaine TVA" 
                amount={tvaDue} 
                date="15/05" 
                color="#f59e0b" 
                bgColor="rgba(245, 158, 11, 0.1)" 
                type="tax"
            />
            
            <DeadlineItem 
                icon={CreditCard} 
                title="Charges Mynds" 
                amount={estimatedOtherCharges} 
                date="28/05" 
                color="#ef4444" 
                bgColor="rgba(239, 68, 68, 0.1)" 
                type="charges"
            />
            
            <style>
                {`
                    @keyframes fadeIn {
                        from { opacity: 0; transform: translateY(10px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                `}
            </style>
        </div>
    );
};

export default UpcomingDeadlinesCard;
