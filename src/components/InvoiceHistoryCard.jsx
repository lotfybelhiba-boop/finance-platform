import React from 'react';
import { ArrowUpRight, ArrowDownRight, Clock } from 'lucide-react';

const MOCK_INVOICES = [
    { id: 'N01-2026-001', client: 'TechCorp SA', amount: 4500, date: '12 Sep 2026', status: 'paid' },
    { id: 'N02-2026-001', client: 'Global Mkt', amount: 1250, date: '08 Sep 2026', status: 'paid' },
    { id: 'N03-2026-001', client: 'Studio Design', amount: 3200, date: '05 Sep 2026', status: 'pending' },
    { id: 'N04-2026-001', client: 'Retail Plus', amount: 800, date: '01 Sep 2026', status: 'paid' },
    { id: 'N05-2026-001', client: 'Acme Corp', amount: 5500, date: '28 Aug 2026', status: 'late' },
];

const InvoiceHistoryCard = () => {
    const formatMoney = (val) => new Intl.NumberFormat('fr-TN', { style: 'currency', currency: 'TND', minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(val);

    return (
        <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>Dernières Factures</h3>
                <button style={{ background: 'transparent', border: 'none', color: 'var(--accent-gold)', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>Voir tout</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
                {MOCK_INVOICES.map((inv) => (
                    <div key={inv.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '16px', borderBottom: '1px solid var(--border-color)', transition: 'transform 0.2s', cursor: 'pointer' }} onMouseOver={(e) => e.currentTarget.style.transform = 'translateX(4px)'} onMouseOut={(e) => e.currentTarget.style.transform = 'translateX(0)'}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: inv.status === 'paid' ? 'var(--success-bg)' : inv.status === 'pending' ? 'var(--warning-bg)' : 'var(--danger-bg)', color: inv.status === 'paid' ? 'var(--success)' : inv.status === 'pending' ? 'var(--warning)' : 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {inv.status === 'paid' ? <ArrowUpRight size={18} /> : inv.status === 'pending' ? <Clock size={18} /> : <ArrowDownRight size={18} />}
                            </div>
                            <div>
                                <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '2px' }}>{inv.client}</div>
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{inv.date}</div>
                            </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-main)' }}>{formatMoney(inv.amount)}</div>
                            <div style={{ fontSize: '11px', fontWeight: '600', color: inv.status === 'paid' ? 'var(--success)' : inv.status === 'pending' ? 'var(--warning)' : 'var(--danger)', marginTop: '2px', textTransform: 'uppercase' }}>
                                {inv.status === 'paid' ? 'Payée' : inv.status === 'pending' ? 'En attente' : 'En retard'}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default InvoiceHistoryCard;
