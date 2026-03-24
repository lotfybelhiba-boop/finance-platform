import React, { useState, useEffect } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { getBankTransactions, getFactures } from '../services/storageService';

const monthNames = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sept", "Oct", "Nov", "Déc"];

const IncomeExpenseChart = ({ targetYear }) => {
    const [chartData, setChartData] = useState([]);
    const currentYear = targetYear !== undefined ? targetYear : new Date().getFullYear();

    useEffect(() => {
        const calculateData = () => {
            const manualTransactions = getBankTransactions() || [];
            const factures = getFactures() || [];

            // Initialize 12 months
            const data = monthNames.map((m, index) => ({
                name: m,
                recette: 0,
                charge: 0,
                monthIndex: index
            }));

            // Robust Date Parser to handle DD/MM/YYYY vs YYYY-MM-DD properly
            const parseToDateInfo = (dateStr) => {
                if (!dateStr) return null;
                if (typeof dateStr === 'string' && dateStr.includes('/')) {
                    const parts = dateStr.split('/');
                    if (parts.length === 3) {
                        return { month: parseInt(parts[1], 10) - 1, year: parseInt(parts[2], 10) }; // DD/MM/YYYY -> Month is 1-indexed in string
                    }
                }
                const d = new Date(dateStr);
                if (!isNaN(d.getTime())) return { month: d.getMonth(), year: d.getFullYear() };
                return null;
            };

            // Invoices marked as Paid = Recette (and potential Extra = Charge)
            factures.forEach(f => {
                if (f.statut === 'Paid') {
                    const dInfo = parseToDateInfo(f.datePaiement || f.dateEmi);
                    if (dInfo && (targetYear === 'all' || dInfo.year === currentYear)) {
                        data[dInfo.month].recette += (parseFloat(f.montant) || 0);
                        if (f.isExtra && f.coutExtra > 0) {
                            data[dInfo.month].charge += (parseFloat(f.coutExtra) || 0);
                        }
                    }
                }
            });

            // Bank transactions
            manualTransactions.forEach(t => {
                const dInfo = parseToDateInfo(t.date);
                if (dInfo && (targetYear === 'all' || dInfo.year === currentYear)) {
                    if (!t.isDraft) {
                        if (t.type === 'Credit') {
                            data[dInfo.month].recette += (parseFloat(t.amount) || 0);
                        } else if (t.type === 'Debit') {
                            data[dInfo.month].charge += (parseFloat(t.amount) || 0);
                        }
                    }
                }
            });

            setChartData(data);
        };

        calculateData();
        window.addEventListener('storage', calculateData);
        return () => {
            window.removeEventListener('storage', calculateData);
        };
    }, [currentYear]);

    const formatMoney = (val) => new Intl.NumberFormat('fr-TN', { style: 'currency', currency: 'TND', minimumFractionDigits: 0 }).format(val);

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div style={{
                    background: 'var(--card-bg)', backdropFilter: 'var(--glass-blur)', padding: '12px',
                    borderRadius: '8px', border: '1px solid var(--border-color)', boxShadow: 'var(--card-shadow)',
                    color: 'var(--text-main)', fontSize: '12px'
                }}>
                    <div style={{ fontWeight: '800', marginBottom: '8px' }}>{label}</div>
                    {payload.map((entry, index) => (
                        <div key={index} style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', marginBottom: '4px' }}>
                            <span style={{ color: entry.color, fontWeight: '600' }}>{entry.name} :</span>
                            <span style={{ fontWeight: '800' }}>{formatMoney(entry.value)}</span>
                        </div>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <div style={{ background: 'var(--card-bg)', padding: '16px', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: '0 4px 12px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '12px' }}>
                <h3 style={{ fontSize: '12px', fontWeight: '800', margin: 0, color: 'var(--text-main)' }}>Flux de Trésorerie (Réel)</h3>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '600', display: 'flex', gap: '8px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: '8px', height: '8px', borderRadius: '3px', background: '#10b981' }}/> Recettes</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: '8px', height: '8px', borderRadius: '3px', background: '#ef4444' }}/> Charges</span>
                </div>
            </div>

            <div style={{ width: '100%', height: '140px', marginTop: 'auto' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }} barGap={0} barCategoryGap="25%">
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.06)" />
                        <XAxis 
                            dataKey="name" 
                            axisLine={{ stroke: 'var(--border-color)', strokeWidth: 1 }} 
                            tickLine={false} 
                            tick={{ fontSize: 9, fill: 'var(--text-muted)', fontWeight: 700 }} 
                            dy={10}
                            interval={0}
                        />
                        <YAxis hide={true} />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)', radius: 4 }} />
                        <Bar dataKey="recette" name="Recettes" fill="#10b981" radius={[3, 3, 0, 0]} />
                        <Bar dataKey="charge" name="Charges" fill="#ef4444" radius={[3, 3, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default IncomeExpenseChart;
