import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, ComposedChart, Bar } from 'recharts';

const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div style={{ background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', minWidth: '220px' }}>
                <p style={{ margin: '0 0 8px 0', fontWeight: '800', fontSize: '13px', color: 'var(--text-main)', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                    {data.displayDate} {data.isToday ? <span style={{ color: '#3b82f6', fontSize: '10px', marginLeft: '6px' }}>(Aujourd'hui)</span> : ''}
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>Solde Projeté :</span>
                    <span style={{ fontSize: '16px', fontWeight: '900', color: data.balance >= 0 ? '#10b981' : '#ef4444' }}>
                        {new Intl.NumberFormat('fr-TN', { style: 'currency', currency: 'TND' }).format(data.balance)}
                    </span>
                </div>
                
                {data.details && data.details.length > 0 && (
                    <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed var(--border-color)' }}>
                        <p style={{ margin: '0 0 6px 0', fontSize: '10px', textTransform: 'uppercase', fontWeight: '800', color: 'var(--text-muted)' }}>Mouvements Prévus :</p>
                        <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                            {data.details.map((event, idx) => (
                                <li key={idx} style={{ fontSize: '11px', display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                    <span style={{ color: 'var(--text-secondary)', fontWeight: '600', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '140px' }} title={event.description}>
                                        {event.description}
                                    </span>
                                    <span style={{ fontWeight: '800', color: event.type === 'in' ? '#10b981' : '#ef4444' }}>
                                        {event.type === 'in' ? '+' : '-'}{new Intl.NumberFormat('fr-TN', { maximumFractionDigits: 0 }).format(event.amount)}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        );
    }
    return null;
};

const CashflowForecastChart = ({ totalBankBalance = 0, factures = [], bankTransactions = [], daysToProject = 45 }) => {
    
    const data = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const eventsMap = {};

        const addEvent = (dateStr, amount, type, description) => {
            if (!eventsMap[dateStr]) {
                eventsMap[dateStr] = { in: 0, out: 0, details: [] };
            }
            if (type === 'in') {
                eventsMap[dateStr].in += amount;
            } else {
                eventsMap[dateStr].out += amount;
            }
            eventsMap[dateStr].details.push({ amount, type, description });
        };

        // 1. INCOMING: Sent or Late factures
        factures.forEach(f => {
            if (f.statut === 'Sent' || f.statut === 'Late') {
                const amount = parseFloat(f.montant) || 0;
                let targetDate = f.echeance ? new Date(f.echeance) : new Date(f.dateEmi);
                
                // If late, due date is in the past, or date is invalid, project it for TODAY
                if (isNaN(targetDate.getTime()) || targetDate < today) {
                    targetDate = new Date(today);
                }
                
                const dateStr = targetDate.toISOString().split('T')[0];
                addEvent(dateStr, amount, 'in', `Fact. ${f.client}`);
            }
        });

        // 2. OUTGOING: Draft transactions
        bankTransactions.forEach(t => {
            if (t.isDraft || t.statut === 'En attente') {
                const amount = parseFloat(t.amount) || 0;
                let targetDate = new Date(t.date || t.paymentDate);
                
                // Fallback to today if date is missing/invalid or in the past
                if (isNaN(targetDate.getTime()) || targetDate < today) {
                    targetDate = new Date(today);
                }

                const dateStr = targetDate.toISOString().split('T')[0];
                const type = (t.type === 'Credit') ? 'in' : 'out';
                addEvent(dateStr, amount, type, t.description || t.desc || 'Brouillon Bancaire');
            }
        });

        // 3. Build Timeline
        let currentBalance = totalBankBalance;
        const timeline = [];
        let lowestBalance = currentBalance;

        for (let i = 0; i <= daysToProject; i++) {
            const cursorDate = new Date(today);
            cursorDate.setDate(today.getDate() + i);
            const dateStr = cursorDate.toISOString().split('T')[0];
            const displayDate = cursorDate.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });

            const dayEvents = eventsMap[dateStr] || { in: 0, out: 0, details: [] };
            
            currentBalance += dayEvents.in;
            currentBalance -= dayEvents.out;

            if (currentBalance < lowestBalance) lowestBalance = currentBalance;

            timeline.push({
                dateStr,
                displayDate,
                balance: currentBalance,
                cashIn: dayEvents.in > 0 ? dayEvents.in : null,
                cashOut: dayEvents.out > 0 ? -dayEvents.out : null,
                details: dayEvents.details,
                isToday: i === 0
            });
        }

        return { timeline, lowestBalance };
    }, [totalBankBalance, factures, bankTransactions, daysToProject]);

    const formatShortYAxis = (val) => {
        if (val >= 1000 || val <= -1000) return `${(val / 1000).toFixed(1)}k`;
        return val;
    };

    return (
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '20px', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                    <h2 style={{ fontSize: '16px', fontWeight: '900', color: 'var(--text-main)', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', background: '#3b82f6' }}></span>
                        Prévisionnel de Trésorerie
                    </h2>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>
                        Projection du Solde Global sur {daysToProject} jours (Factures vs Brouillons)
                    </div>
                </div>
                <div style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', padding: '6px 12px', borderRadius: '10px', fontSize: '12px', fontWeight: '800' }}>
                    T+45
                </div>
            </div>

            <div style={{ width: '100%', height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={data.timeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorPositive" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorPositiveFill" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                            </linearGradient>
                            
                            <linearGradient id="colorNegative" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorNegativeFill" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" opacity={0.5} />
                        <XAxis 
                            dataKey="displayDate" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 10, fill: 'var(--text-muted)', fontWeight: 600 }} 
                            dy={10}
                            minTickGap={20}
                        />
                        <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 10, fill: 'var(--text-muted)', fontWeight: 600 }} 
                            tickFormatter={formatShortYAxis}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--text-muted)', strokeWidth: 1, strokeDasharray: '5 5' }} />
                        
                        <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="3 3" opacity={0.5} />
                        
                        <Bar dataKey="cashOut" fill="#ef4444" barSize={4} radius={[0, 0, 4, 4]} opacity={0.6} />
                        <Bar dataKey="cashIn" fill="#10b981" barSize={4} radius={[4, 4, 0, 0]} opacity={0.6} />
                        
                        <Area 
                            type="monotone" 
                            dataKey="balance" 
                            stroke={data.lowestBalance < 0 ? "#ef4444" : "#3b82f6"} 
                            strokeWidth={3}
                            fill={data.lowestBalance < 0 ? "url(#colorNegativeFill)" : "url(#colorPositiveFill)"} 
                            activeDot={{ r: 6, fill: 'var(--bg-main)', stroke: data.lowestBalance < 0 ? "#ef4444" : "#3b82f6", strokeWidth: 3 }}
                            animationDuration={1500}
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default CashflowForecastChart;
