import React from 'react';
import { MOCK_DATA } from '../utils/mockData.js';

const ClientTable = () => {
    const { clients, tvaRate, timbreFiscal } = MOCK_DATA;

    const formatMoney = (val) => new Intl.NumberFormat('fr-TN', { style: 'currency', currency: 'TND', minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(val);

    const getStatusBadge = (status) => {
        switch (status) {
            case 'Payée': return <span style={{ background: 'var(--success-bg)', color: 'var(--success)', padding: '6px 12px', borderRadius: '12px', fontSize: '13px', fontWeight: '600', border: '1px solid rgba(16, 185, 129, 0.2)' }}>✅ Payée</span>;
            case 'En attente': return <span style={{ background: 'var(--warning-bg)', color: 'var(--warning)', padding: '6px 12px', borderRadius: '12px', fontSize: '13px', fontWeight: '600', border: '1px solid rgba(245, 158, 11, 0.2)' }}>⏳ En attente</span>;
            case 'En retard': return <span style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: '6px 12px', borderRadius: '12px', fontSize: '13px', fontWeight: '600', border: '1px solid rgba(239, 68, 68, 0.2)' }}>🔴 En retard</span>;
            case 'Non envoyée': return <span style={{ background: 'rgba(100, 116, 139, 0.1)', color: 'var(--text-muted)', padding: '6px 12px', borderRadius: '12px', fontSize: '13px', fontWeight: '600', border: '1px solid rgba(100, 116, 139, 0.2)' }}>⚠️ Non implémentée</span>;
            default: return status;
        }
    };

    return (
        <div className="card">
            <h3 style={{ fontSize: '20px', marginBottom: '24px', color: 'var(--text-main)', display: 'flex', alignItems: 'center' }}>
                Clients du mois
            </h3>

            <div style={{ overflowX: 'auto', borderRadius: '16px', border: '1px solid var(--border-color)', background: 'rgba(255, 255, 255, 0.4)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px', background: 'rgba(0,0,0,0.02)' }}>
                            <th style={{ padding: '12px 16px' }}>Client</th>
                            <th style={{ padding: '12px 16px' }}>Type</th>
                            <th style={{ padding: '12px 16px', textAlign: 'right' }}>Montant HT</th>
                            <th style={{ padding: '12px 16px', textAlign: 'right' }}>TVA ({tvaRate}%)</th>
                            <th style={{ padding: '12px 16px', textAlign: 'center' }}>Timbre</th>
                            <th style={{ padding: '12px 16px', textAlign: 'right' }}>Total TTC</th>
                            <th style={{ padding: '12px 16px', textAlign: 'center' }}>Statut</th>
                        </tr>
                    </thead>
                    <tbody>
                        {clients.map((c) => {
                            const tva = c.montantHT * (tvaRate / 100);
                            const ttc = c.montantHT + tva + timbreFiscal;

                            return (
                                <tr key={c.id} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '14px', transition: 'all 0.2s ease', backgroundColor: 'transparent' }} onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.8)'; e.currentTarget.style.transform = 'scale(1.002)'; }} onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.transform = 'none'; }}>
                                    <td style={{ padding: '18px 16px', fontWeight: '600', color: 'var(--text-main)' }}>{c.nom}</td>
                                    <td style={{ padding: '18px 16px', color: 'var(--text-muted)', fontWeight: 500 }}>
                                        {c.type === 'Abonnement' ? '🔁 Abonnement' : '🎯 Projet'}
                                    </td>
                                    <td style={{ padding: '18px 16px', textAlign: 'right', fontWeight: 500 }}>{formatMoney(c.montantHT)}</td>
                                    <td style={{ padding: '18px 16px', textAlign: 'right', color: 'var(--text-muted)' }}>{formatMoney(tva)}</td>
                                    <td style={{ padding: '18px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>+{formatMoney(timbreFiscal)}</td>
                                    <td style={{ padding: '18px 16px', textAlign: 'right', fontWeight: '700', color: 'var(--text-main)' }}>{formatMoney(ttc)}</td>
                                    <td style={{ padding: '18px 16px', textAlign: 'center' }}>{getStatusBadge(c.statut)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ClientTable;
