import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { getClients } from '../services/storageService';

const EmployeeWorkloadChart = () => {
    const [data, setData] = useState([]);

    useEffect(() => {
        const calculateWorkload = () => {
            const clients = getClients() || [];
            const activeClients = clients.filter(c => c.etatClient === 'Actif');

            const counts = {};

            activeClients.forEach(client => {
                if (client.projectCosts && Array.isArray(client.projectCosts)) {
                    // Extract unique employees per project so an employee isn't counted twice for the same client
                    const uniqueEmployeesOnProject = new Set();
                    client.projectCosts.forEach(cost => {
                        const empName = cost.nom ? cost.nom.trim() : 'Inconnu';
                        if (empName) uniqueEmployeesOnProject.add(empName);
                    });

                    uniqueEmployeesOnProject.forEach(emp => {
                        if (!counts[emp]) counts[emp] = 0;
                        counts[emp]++;
                    });
                }
            });

            // Convert object to sorted array (descending by project count)
            const processedData = Object.keys(counts).map(key => ({
                name: key.length > 12 ? key.substring(0, 10) + '...' : key,
                fullName: key,
                projects: counts[key]
            })).sort((a, b) => b.projects - a.projects).slice(0, 6); // Top 6 for compactness

            setData(processedData);
        };

        calculateWorkload();
        window.addEventListener('storage', calculateWorkload);
        return () => window.removeEventListener('storage', calculateWorkload);
    }, []);

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div style={{
                    background: 'var(--card-bg)', backdropFilter: 'var(--glass-blur)', padding: '10px 14px',
                    borderRadius: '8px', border: '1px solid var(--border-color)', boxShadow: 'var(--card-shadow)',
                    color: 'var(--text-main)', fontSize: '12px'
                }}>
                    <div style={{ fontWeight: '800', marginBottom: '4px', color: '#3b82f6' }}>{data.fullName}</div>
                    <div>Impliqué(e) sur <strong>{data.projects}</strong> projet(s)</div>
                </div>
            );
        }
        return null;
    };

    return (
        <div style={{ background: 'var(--card-bg)', padding: '16px', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: '0 4px 12px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', height: '100%' }}>
            <h3 style={{ fontSize: '12px', fontWeight: '800', margin: '0 0 12px 0', color: 'var(--text-main)' }}>Charge Équipe (Projets/RH)</h3>
            
            <div style={{ flex: 1, width: '100%', height: '140px' }}>
                {data.length === 0 ? (
                    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: 'var(--text-muted)' }}>
                        Aucune ressource affectée
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart layout="vertical" data={data} margin={{ top: 0, right: 20, left: 0, bottom: 0 }} barCategoryGap="20%">
                            <XAxis type="number" hide />
                            <YAxis 
                                type="category" 
                                dataKey="name" 
                                width={75} 
                                axisLine={{ stroke: 'var(--border-color)', strokeWidth: 1 }} 
                                tickLine={false} 
                                tick={{ fontSize: 10, fill: 'var(--text-muted)', fontWeight: 600 }} 
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.02)' }} />
                            <Bar dataKey="projects" radius={[0, 4, 4, 0]}>
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={'#3b82f6'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
};

export default EmployeeWorkloadChart;
