import React from 'react';
import { MOCK_DATA } from '../utils/mockData.js';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
    LineChart, Line, PieChart, Pie, Cell
} from 'recharts';

const ChartsSection = () => {
    const { history, charges } = MOCK_DATA;

    // Prepare Donut Data
    const donutData = charges.breakdown;
    const COLORS = ['#FFC105', '#1E293B', '#64748B', '#94A3B8', '#10B981']; // Updated to softer Slate colors and softer green

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: '24px', marginBottom: '32px' }}>

            {/* 6-month Bar Chart */}
            <div className="card">
                <h3 style={{ fontSize: '16px', marginBottom: '24px', color: 'var(--text-main)' }}>Évolution Trésorerie (6 mois)</h3>
                <div style={{ height: '300px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={history} margin={{ top: 5, right: 0, left: -20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                            <XAxis dataKey="month" tick={{ fontSize: 13, fill: 'var(--text-muted)', fontWeight: 500 }} axisLine={false} tickLine={false} tickMargin={10} />
                            <YAxis tick={{ fontSize: 13, fill: 'var(--text-muted)', fontWeight: 500 }} axisLine={false} tickLine={false} tickMargin={10} />
                            <RechartsTooltip cursor={{ fill: 'rgba(0,0,0,0.02)' }} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 40px -10px rgba(0,0,0,0.1)' }} />
                            <Legend iconType="circle" wrapperStyle={{ fontSize: '13px', paddingTop: '20px', fontWeight: 500, color: 'var(--text-muted)' }} />
                            <Bar dataKey="recettes" name="Recettes (HT)" fill="#FFC105" radius={[6, 6, 0, 0]} barSize={16} />
                            <Bar dataKey="charges" name="Charges" fill="#94A3B8" radius={[6, 6, 0, 0]} barSize={16} />
                            <Bar dataKey="salaires" name="Salaires" fill="#1E293B" radius={[6, 6, 0, 0]} barSize={16} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%' }}>

                    {/* TVA Line Chart */}
                    <div className="card" style={{ flex: 1 }}>
                        <h3 style={{ fontSize: '14px', marginBottom: '16px', color: 'var(--text-main)' }}>TVA à Payer</h3>
                        <div style={{ height: '120px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={history} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                                    <XAxis dataKey="month" hide />
                                    <YAxis tick={{ fontSize: 12, fill: 'var(--text-muted)', fontWeight: 500 }} axisLine={false} tickLine={false} tickMargin={10} />
                                    <RechartsTooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 40px -10px rgba(0,0,0,0.1)' }} />
                                    <Line type="monotone" dataKey="tvaNette" name="TVA Nette" stroke="#EF4444" strokeWidth={3} dot={{ r: 4, fill: '#EF4444', strokeWidth: 2, stroke: '#FFFFFF' }} activeDot={{ r: 6 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Donut Charges */}
                    <div className="card" style={{ flex: 1 }}>
                        <h3 style={{ fontSize: '14px', marginBottom: '8px', color: 'var(--text-main)' }}>Répartition Charges</h3>
                        <div style={{ height: '140px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={donutData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={40}
                                        outerRadius={60}
                                        paddingAngle={2}
                                        dataKey="value"
                                    >
                                        {donutData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} style={{ outline: 'none' }} stroke="rgba(255,255,255,0.5)" strokeWidth={2} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 40px -10px rgba(0,0,0,0.1)' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default ChartsSection;
