import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { getFactures, getClients } from '../services/storageService';
import { calculatePendingInvoices } from '../utils/billingUtils';

const InvoiceTypesChart = ({ targetMonth, targetYear }) => {
    const [data, setData] = useState([]);
    
    const selectedMonth = targetMonth !== undefined ? targetMonth : new Date().getMonth();
    const selectedYear = targetYear !== undefined ? targetYear : new Date().getFullYear();

    useEffect(() => {
        const calculateData = () => {
            const facturesList = getFactures() || [];
            const clientsList = getClients() || [];

            const targetDate = (selectedYear === 'all' || selectedMonth === 'all') 
                ? new Date() 
                : new Date(selectedYear, selectedMonth, 15);

            let brouillons = 0, brouillonsMt = 0, brouillonsClients = [];
            let envoyees = 0, envoyeesMt = 0, envoyeesClients = [];
            let payees = 0, payeesMt = 0, payeesClients = [];
            let enRetard = 0, enRetardMt = 0, enRetardClients = [];

            // 1. Calculer "À faire" pour le mois sélectionné
            const pendingStats = calculatePendingInvoices(clientsList, facturesList, [], targetDate);
            let aFaire = pendingStats.count;
            let aFaireMt = pendingStats.amount || 0;
            let aFaireClients = pendingStats.missingClients.map(c => c.enseigne);

            // 2. Calculer le reste selon le statut filtré par mois/année
            facturesList.forEach(f => {
                const dRef = f.dateEmi ? new Date(f.dateEmi) : (f.periodeDebut ? new Date(f.periodeDebut) : null);
                if (!dRef || isNaN(dRef.getTime())) return;
                
                const passYear = selectedYear === 'all' || dRef.getFullYear() === selectedYear;
                const passMonth = selectedMonth === 'all' || dRef.getMonth() === selectedMonth;
                
                if (passYear && passMonth) {
                    const mt = parseFloat(f.montant) || 0;
                    const clientName = f.client || 'Inconnu';
                    if (f.statut === 'Draft') { brouillons++; brouillonsMt += mt; if (!brouillonsClients.includes(clientName)) brouillonsClients.push(clientName); }
                    else if (f.statut === 'Sent') { envoyees++; envoyeesMt += mt; if (!envoyeesClients.includes(clientName)) envoyeesClients.push(clientName); }
                    else if (f.statut === 'Paid') { payees++; payeesMt += mt; if (!payeesClients.includes(clientName)) payeesClients.push(clientName); }
                    else if (f.statut === 'Late') { enRetard++; enRetardMt += mt; if (!enRetardClients.includes(clientName)) enRetardClients.push(clientName); }
                }
            });

            const processedData = [
                { name: 'À FAIRE', value: aFaire, montant: aFaireMt, clients: aFaireClients, color: '#94a3b8' }, // gris
                { name: 'Brouillons', value: brouillons, montant: brouillonsMt, clients: brouillonsClients, color: '#64748b' }, // gris foncé
                { name: 'Envoyées', value: envoyees, montant: envoyeesMt, clients: envoyeesClients, color: '#f59e0b' }, // orange warning
                { name: 'En Retard', value: enRetard, montant: enRetardMt, clients: enRetardClients, color: '#ef4444' }, // rouge danger
                { name: 'Payées', value: payees, montant: payeesMt, clients: payeesClients, color: '#10b981' } // vert success
            ].filter(item => item.value > 0);

            setData(processedData);
        };

        calculateData();
        window.addEventListener('storage', calculateData);
        return () => window.removeEventListener('storage', calculateData);
    }, [selectedMonth, selectedYear]);

    const formatMoney = (val) => new Intl.NumberFormat('fr-TN', { style: 'currency', currency: 'TND', minimumFractionDigits: 0 }).format(val);

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            const entry = payload[0].payload;
            return (
                <div style={{
                    background: 'var(--card-bg)', backdropFilter: 'var(--glass-blur)', padding: '10px 14px',
                    borderRadius: '8px', border: '1px solid var(--border-color)', boxShadow: 'var(--card-shadow)',
                    color: 'var(--text-main)', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px',
                    maxWidth: '220px'
                }}>
                    <span style={{ fontWeight: '700', color: entry.color }}>{entry.name}</span>
                    <span style={{ fontWeight: '800', fontSize: '14px' }}>{entry.value} facture(s)</span>
                    {entry.montant > 0 && (
                        <span style={{ fontWeight: '600', color: 'var(--text-muted)' }}>{formatMoney(entry.montant)}</span>
                    )}
                    {entry.clients && entry.clients.length > 0 && (
                        <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px solid var(--border-color)', fontSize: '10px', color: 'var(--text-muted)', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {entry.clients.slice(0, 7).map((c, i) => (
                                <span key={i} style={{ background: 'rgba(0,0,0,0.05)', padding: '2px 6px', borderRadius: '4px' }}>{c}</span>
                            ))}
                            {entry.clients.length > 7 && (
                                <span style={{ padding: '2px 4px', fontSize: '9px', fontStyle: 'italic', alignSelf: 'center' }}>
                                    +{entry.clients.length - 7} autres
                                </span>
                            )}
                        </div>
                    )}
                </div>
            );
        }
        return null;
    };

    const renderCustomLegend = (props) => {
        const { payload } = props;
        return (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)' }}>
                {payload.map((entry, index) => (
                    <li key={`item-${index}`} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: entry.color }}></span>
                        <span style={{ flex: 1 }}>{entry.value}</span>
                        <span style={{ fontWeight: '800', color: 'var(--text-main)' }}>{entry.payload.value}</span>
                    </li>
                ))}
            </ul>
        );
    };

    return (
        <div style={{ background: 'var(--card-bg)', padding: '16px', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: '0 4px 12px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', height: '100%' }}>
            <h3 style={{ fontSize: '12px', fontWeight: '800', margin: '0 0 12px 0', color: 'var(--text-main)' }}>Répartition (Statuts)</h3>
            
            <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                {data.length === 0 ? (
                    <div style={{ width: '100%', textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)' }}>Aucune donnée</div>
                ) : (
                    <ResponsiveContainer width="100%" height={140}>
                        <PieChart>
                            <Pie
                                data={data}
                                cx="40%"
                                cy="50%"
                                innerRadius={40}
                                outerRadius={60}
                                paddingAngle={4}
                                dataKey="value"
                                stroke="none"
                                cornerRadius={4}
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                            <Legend content={renderCustomLegend} layout="vertical" verticalAlign="middle" align="right" />
                        </PieChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
};

export default InvoiceTypesChart;
