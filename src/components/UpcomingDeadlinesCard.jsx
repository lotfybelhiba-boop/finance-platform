import React from 'react';
import { CreditCard, ShieldCheck, Banknote, Calendar, CheckCircle2 } from 'lucide-react';
import { getBankTransactions, saveBankTransactions, generateId } from '../services/storageService';

const formatMoney = (amount) => {
    return new Intl.NumberFormat('fr-TN', { style: 'currency', currency: 'TND', minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(amount);
};

const DeadlineItem = ({ icon: Icon, title, amount, date, color, bgColor, tooltipData = null, type, onSettle }) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const pendingItems = tooltipData?.filter(i => i.status === 'Pending') || [];

    return (
        <div 
            style={{ 
                borderRadius: '16px', 
                background: 'var(--bg-main)', 
                border: '1px solid var(--border-color)',
                overflow: 'hidden',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
                zIndex: isOpen ? 5 : 1
            }}
        >
            <div 
                onClick={() => tooltipData && setIsOpen(!isOpen)}
                style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '12px', 
                    padding: '14px 12px', 
                    cursor: tooltipData ? 'pointer' : 'default',
                    transition: 'background 0.2s',
                    position: 'relative',
                    zIndex: 2,
                    userSelect: 'none'
                }}
                onMouseEnter={(e) => tooltipData && (e.currentTarget.style.background = 'rgba(0,0,0,0.02)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
                <div style={{ 
                    width: '32px', 
                    height: '32px', 
                    borderRadius: '10px', 
                    background: bgColor, 
                    color: color, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    pointerEvents: 'none'
                }}>
                    <Icon size={16} />
                </div>
                <div style={{ flex: 1, pointerEvents: 'none' }}>
                    <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {title}
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: '900', color: amount > 0 ? 'var(--text-main)' : 'var(--success)' }}>
                        {amount > 0 ? formatMoney(amount) : 'Paiements effectués'}
                    </div>
                </div>
                <div style={{ textAlign: 'right', pointerEvents: 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '9px', fontWeight: '700', color: 'var(--text-muted)' }}>
                        <Calendar size={10} />
                        {date}
                    </div>
                    <div style={{ fontSize: '8px', fontWeight: '800', color: amount > 0 ? color : 'var(--success)', marginTop: '1px', textTransform: 'uppercase' }}>
                        {amount > 0 ? 'À prévoir' : 'Fini'}
                    </div>
                </div>
            </div>

            {/* Accordion Content */}
            {isOpen && tooltipData && (
                <div style={{
                    padding: '0 12px 12px 12px',
                    borderTop: '1px dashed var(--border-color)',
                    background: 'rgba(0,0,0,0.01)',
                    animation: 'slideDown 0.2s ease-out',
                    position: 'relative',
                    zIndex: 3
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', marginBottom: '4px' }}>
                        <div style={{ fontSize: '9px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                            Détail des paiements
                        </div>
                        {type === 'salaries' && pendingItems.length > 0 && (
                            <button 
                                onClick={(e) => { 
                                    e.preventDefault();
                                    e.stopPropagation(); 
                                    onSettle(pendingItems); 
                                }}
                                style={{ 
                                    background: 'var(--success)', 
                                    color: 'white', 
                                    border: 'none', 
                                    borderRadius: '4px', 
                                    fontSize: '8px', 
                                    fontWeight: '900', 
                                    padding: '3px 8px', 
                                    cursor: 'pointer', 
                                    textTransform: 'uppercase',
                                    position: 'relative',
                                    zIndex: 10
                                }}
                            >
                                Tout Solder
                            </button>
                        )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {tooltipData.map((item, idx) => (
                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: item.status === 'Paid' ? 'var(--text-muted)' : 'var(--text-main)' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ fontWeight: '700', textDecoration: item.status === 'Paid' ? 'line-through' : 'none', opacity: item.status === 'Paid' ? 0.6 : 1 }}>{item.name}</span>
                                        {item.type === 'Ponctuel' && <span style={{ fontSize: '8px', padding: '2px 4px', borderRadius: '4px', background: 'rgba(245,158,11,0.1)', color: '#f59e0b', fontWeight: '800', textTransform: 'uppercase' }}>Unique</span>}
                                        {item.status === 'Paid' && <CheckCircle2 size={12} color="#10b981" />}
                                    </div>
                                    <span style={{ fontSize: '9px', color: 'var(--text-muted)', opacity: 0.7 }}>{item.project}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{ fontWeight: '800', color: item.status === 'Paid' ? 'var(--text-muted)' : 'var(--text-main)' }}>{formatMoney(item.amount)}</span>
                                    {type === 'salaries' && item.status === 'Pending' && (
                                        <button 
                                            onClick={(e) => { 
                                                e.preventDefault();
                                                e.stopPropagation(); 
                                                onSettle([item]); 
                                            }}
                                            style={{ 
                                                background: 'var(--bg-main)', 
                                                color: 'var(--text-main)', 
                                                border: '1px solid var(--border-color)', 
                                                borderRadius: '4px', 
                                                padding: '3px', 
                                                cursor: 'pointer',
                                                position: 'relative',
                                                zIndex: 10
                                            }}
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

const UpcomingDeadlinesCard = ({ transactions = [], factures = [], clients = [] }) => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const currentMonthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    const currentMonthName = now.toLocaleDateString('fr-FR', { month: 'long' });

    // 1. PROJECTED SALARIES (Cross-referenced with Bank)
    const activeClients = clients.filter(c => c.etatClient === 'Actif');
    
    const rhPaymentsCurrentMonth = transactions.filter(t => 
        (t.chargeType === 'RH' || t.chargeType === 'Ressources Humaines' || t.category === 'RH' || t.category === 'Salaires') && 
        t.type === 'Debit' &&
        t.serviceMonth === currentMonthStr
    );

    const rhBreakdown = [];
    let totalPendingSalaries = 0;
    
    // Copy pools to "consume" matches and handle multiple entries for same person/project
    let availableCurrentMonthTxs = [...rhPaymentsCurrentMonth];
    let availableAllTxs = [...transactions];

    activeClients.forEach(client => {
        if (client.projectCosts && client.projectCosts.length > 0) {
            client.projectCosts.forEach(cost => {
                const amount = parseFloat(cost.montant) || 0;
                if (amount > 0) {
                    const isOneShot = cost.recurrence === 'Ponctuel';
                    const costNameLower = (cost.nom || '').toLowerCase().trim();
                    const clientNameLower = (client.enseigne || '').toLowerCase().trim();
                    
                    if (isOneShot) {
                        // Check global history for one-shot
                        let txIndex = availableAllTxs.findIndex(t => {
                            const descLower = (t.desc || '').toLowerCase();
                            const isRH = t.chargeType === 'RH' || t.category === 'RH' || t.category === 'Salaires' || descLower.includes('salaire');
                            const matchesName = costNameLower && descLower.includes(costNameLower);
                            const matchesProject = clientNameLower && descLower.includes(clientNameLower);
                            const matchesAmount = Math.abs((parseFloat(t.amount) || 0) - amount) < 0.01;
                            return isRH && t.type === 'Debit' && matchesName && matchesProject && matchesAmount;
                        });

                        if (txIndex === -1) {
                            txIndex = availableAllTxs.findIndex(t => {
                                const descLower = (t.desc || '').toLowerCase();
                                const isRH = t.chargeType === 'RH' || t.category === 'RH' || t.category === 'Salaires' || descLower.includes('salaire');
                                const matchesName = costNameLower && descLower.includes(costNameLower);
                                const matchesProject = clientNameLower && descLower.includes(clientNameLower);
                                return isRH && t.type === 'Debit' && matchesName && matchesProject;
                            });
                        }

                        if (txIndex !== -1) {
                            availableAllTxs.splice(txIndex, 1);
                            return;
                        }

                        rhBreakdown.push({
                            id: cost.id,
                            name: cost.nom || 'Inconnu',
                            project: client.enseigne,
                            amount: amount,
                            status: 'Pending',
                            type: 'Ponctuel'
                        });
                        totalPendingSalaries += amount;
                    } else {
                        // Recurring logic
                        let txIndex = availableCurrentMonthTxs.findIndex(p => {
                            const descLower = (p.desc || '').toLowerCase();
                            const matchesName = costNameLower && descLower.includes(costNameLower);
                            const matchesProject = clientNameLower && descLower.includes(clientNameLower);
                            const matchesAmount = Math.abs((parseFloat(p.amount) || 0) - amount) < 0.01;
                            return matchesName && matchesProject && matchesAmount;
                        });

                        if (txIndex === -1) {
                            txIndex = availableCurrentMonthTxs.findIndex(p => {
                                const descLower = (p.desc || '').toLowerCase();
                                const matchesName = costNameLower && descLower.includes(costNameLower);
                                const matchesProject = clientNameLower && descLower.includes(clientNameLower);
                                return matchesName && matchesProject;
                            });
                        }

                        const isPaid = txIndex !== -1;
                        if (isPaid) {
                            availableCurrentMonthTxs.splice(txIndex, 1);
                        }

                        rhBreakdown.push({
                            id: cost.id,
                            name: cost.nom || 'Inconnu',
                            project: client.enseigne,
                            amount: amount,
                            status: isPaid ? 'Paid' : 'Pending',
                            type: 'Mensuel'
                        });

                        if (!isPaid) {
                            totalPendingSalaries += amount;
                        }
                    }
                }
            });
        }
    });

    const lastMonthRHBank = transactions.filter(t => (t.chargeType === 'RH' || t.category === 'Salaires' || t.desc?.toLowerCase().includes('salaire')) && t.type === 'Debit')
                                      .reduce((acc, t) => {
                                          const d = new Date(t.date);
                                          if (now - d < 45 * 24 * 60 * 60 * 1000) return acc + (parseFloat(t.amount) || 0);
                                          return acc;
                                      }, 0);

    const finalSalariesTotal = rhBreakdown.length > 0 ? totalPendingSalaries : (rhPaymentsCurrentMonth.length > 0 ? 0 : lastMonthRHBank);

    const handleSettlePayment = (items) => {
        const totalToPay = items.reduce((acc, i) => acc + i.amount, 0);
        
        const confirmMsg = items.length > 1 
            ? `Valider le paiement de ${items.length} salaires pour un total de ${formatMoney(totalToPay)} ?` 
            : `Confirmer le paiement du salaire de ${items[0].name} (${formatMoney(items[0].amount)}) ?`;

        if (!window.confirm(confirmMsg)) return;

        const currentTxs = getBankTransactions();
        const newTxs = [...currentTxs];

        items.forEach(item => {
            const paymentDate = new Date(currentYear, currentMonth, 5).toISOString().split('T')[0];
            
            newTxs.push({
                id: generateId(),
                date: new Date().toISOString().split('T')[0],
                desc: `Salaire ${item.name} (${item.project}) - ${currentMonthName} ${currentYear}`,
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
        window.dispatchEvent(new CustomEvent('mynds_data_updated'));
        
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

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
            <h3 style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-main)', margin: '0 0 4px 4px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Prochaines Échéances
            </h3>
            
            <DeadlineItem 
                icon={Banknote} 
                title={`Prochains Salaires (${currentMonthName})`} 
                amount={finalSalariesTotal} 
                date={`05/${String(currentMonth + 1).padStart(2, '0')}`} 
                color="#8b5cf6" 
                bgColor="rgba(139, 92, 246, 0.1)" 
                tooltipData={rhBreakdown}
                type="salaries"
                onSettle={handleSettlePayment}
            />
            
            <DeadlineItem 
                icon={ShieldCheck} 
                title="Prochaine TVA" 
                amount={tvaDue} 
                date={`15/${String(currentMonth + 1).padStart(2, '0')}`} 
                color="#f59e0b" 
                bgColor="rgba(245, 158, 11, 0.1)" 
                type="tax"
            />
            
            <DeadlineItem 
                icon={CreditCard} 
                title="Charges Mynds" 
                amount={estimatedOtherCharges} 
                date={`28/${String(currentMonth + 1).padStart(2, '0')}`} 
                color="#ef4444" 
                bgColor="rgba(239, 68, 68, 0.1)" 
                type="charges"
            />
            
            <style>
                {`
                    @keyframes slideDown {
                        from { opacity: 0; transform: translateY(-10px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                `}
            </style>
        </div>
    );
};

export default UpcomingDeadlinesCard;

