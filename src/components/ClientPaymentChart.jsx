import React, { useState, useEffect } from 'react';
import {
    ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ZAxis
} from 'recharts';
import { getClients, getFactures } from '../services/storageService';

const monthNames = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sept", "Oct", "Nov", "Déc"];

const ClientPaymentChart = () => {
    const [scatterData, setScatterData] = useState([]);
    const [clientNames, setClientNames] = useState([]);

    useEffect(() => {
        const calculateChartData = () => {
            try {
                const clientsList = getClients();
                const facturesList = getFactures();

                // Get active clients
                const activeClients = clientsList.filter(c => c.etatClient === 'Actif').map(c => c.enseigne);
                setClientNames(activeClients);

                const currentYear = new Date().getFullYear();
                const currentMonthIndex = new Date().getMonth();
                const currentDay = new Date().getDate();

                const newScatterData = [];

                monthNames.forEach((monthStr, monthIndex) => {
                    activeClients.forEach((clientName, clientIndex) => {
                        const clientObj = clientsList.find(c => c.enseigne === clientName);

                        // Find invoices for this client in this month/year
                        const clientInvoicesForMonth = facturesList.filter(f => {
                            if (f.client !== clientName) return false;
                            const invDate = new Date(f.dateEmi);
                            return invDate.getMonth() === monthIndex && invDate.getFullYear() === currentYear;
                        });

                        let status = null;

                        if (clientInvoicesForMonth.length > 0) {
                            // Invoice exists
                            // Prioritize worst status if multiple? Let's just take the first or worst.
                            const hasLate = clientInvoicesForMonth.some(f => f.statut === 'Late');
                            const hasSent = clientInvoicesForMonth.some(f => f.statut === 'Sent');
                            const hasPaid = clientInvoicesForMonth.some(f => f.statut === 'Paid');

                            if (hasLate) status = -1; // Red
                            else if (hasSent) status = 2; // Yellow
                            else if (hasPaid) status = 1; // Green
                            // Draft or Archived won't show
                        } else {
                            // No invoice exists
                            if (clientObj && clientObj.regime === 'Abonnement') { // Added clientObj check
                                // Check if forgotten
                                const billingDay = clientObj.jourPaiement || 5;
                                const isPastMonth = monthIndex < currentMonthIndex;
                                const isPastDayThisMonth = monthIndex === currentMonthIndex && currentDay > billingDay;

                                if (isPastMonth || isPastDayThisMonth) {
                                    status = -2; // Black (Forgotten)
                                }
                            }
                        }

                        if (status !== null) {
                            newScatterData.push({
                                month: monthStr,
                                clientIndex: clientIndex,
                                clientName: clientName,
                                status: status
                            });
                        }
                    });
                });

                setScatterData(newScatterData);

            } catch (e) {
                console.error("Erreur génération graphique paiements", e);
            }
        };

        // Poll or listen for storage changes (naive approach: just run once on mount, but let's assume it updates on reload)
        calculateChartData();

        // Listen to storage changes to update chart dynamically if FacturesPage changes it
        window.addEventListener('storage', calculateChartData);
        // Also a custom interval to catch same-tab localstorage changes if not using a global state manager
        const interval = setInterval(calculateChartData, 2000);

        return () => {
            window.removeEventListener('storage', calculateChartData);
            clearInterval(interval);
        };
    }, []);

    // Custom Tooltip for the Scatter points
    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            let statusText = '';
            let statusColor = '';

            switch (data.status) {
                case 1:
                    statusText = 'Payée';
                    statusColor = 'var(--success)';
                    break;
                case 2:
                    statusText = 'Envoyée (En attente)';
                    statusColor = 'var(--warning)';
                    break;
                case -1:
                    statusText = 'Impayée / En retard';
                    statusColor = 'var(--danger)';
                    break;
                case -2:
                    statusText = 'Oubli (Non facturé)';
                    statusColor = '#000000'; // Black
                    break;
                default:
                    statusText = 'Inconnu';
                    statusColor = 'var(--text-muted)';
            }

            return (
                <div style={{
                    background: 'var(--card-bg)',
                    backdropFilter: 'var(--glass-blur)',
                    WebkitBackdropFilter: 'var(--glass-blur)',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    boxShadow: 'var(--card-shadow)',
                    color: 'var(--text-main)',
                    fontSize: '13px'
                }}>
                    <strong>{data.clientName}</strong><br />
                    Mois: {data.month}<br />
                    Statut: <span style={{ color: statusColor, fontWeight: 'bold' }}>{statusText}</span>
                </div>
            );
        }
        return null;
    };

    const getDotColor = (status) => {
        switch (status) {
            case 1: return 'var(--success)';
            case 2: return 'var(--warning)';
            case -1: return 'var(--danger)';
            case -2: return '#0f172a'; // Near black, nicely fits the UI
            default: return 'transparent';
        }
    };

    return (
        <div className="card" style={{ marginBottom: '24px', padding: '16px' }}>
            <h3 style={{ fontSize: '14px', marginBottom: '4px', color: 'var(--text-main)' }}>Paiements Clients</h3>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <span><span style={{ color: 'var(--success)' }}>●</span> Payé</span>
                <span><span style={{ color: 'var(--warning)' }}>●</span> Envoyé</span>
                <span><span style={{ color: 'var(--danger)' }}>●</span> En retard</span>
                <span><span style={{ color: '#0f172a' }}>●</span> Oubli/Non facturé</span>
            </p>

            {clientNames.length === 0 ? (
                <div style={{ height: '240px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '13px', background: 'var(--bg-main)', borderRadius: '12px', border: '1px dashed var(--border-color)' }}>
                    Aucun client actif. Ajoutez des clients pour voir le graphique.
                </div>
            ) : (
                <div style={{ height: `${Math.max(240, clientNames.length * 35)}px`, width: '100%', paddingRight: '10px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart margin={{ top: 10, right: 10, bottom: 0, left: 70 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />

                            {/* X-Axis: Months */}
                            <XAxis
                                type="category"
                                dataKey="month"
                                name="Mois"
                                allowDuplicatedCategory={false}
                                tick={{ fontSize: 10, fill: 'var(--text-muted)', fontWeight: 500 }}
                                axisLine={false}
                                tickLine={false}
                            />

                            {/* Y-Axis: Clients */}
                            <YAxis
                                type="number"
                                dataKey="clientIndex"
                                name="Client"
                                tickFormatter={(index) => clientNames[index]}
                                ticks={clientNames.map((_, i) => i)}
                                domain={[-0.5, clientNames.length - 0.5]}
                                tick={{ fontSize: 10, fill: 'var(--text-muted)', fontWeight: 500 }}
                                axisLine={false}
                                tickLine={false}
                                width={80}
                            />

                            {/* Z-Axis helps control the size of the scatter dots */}
                            <ZAxis type="number" range={[60, 60]} />

                            <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomTooltip />} />

                            <Scatter data={scatterData}>
                                {scatterData.map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={getDotColor(entry.status)}
                                    />
                                ))}
                            </Scatter>
                        </ScatterChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
};

export default ClientPaymentChart;
