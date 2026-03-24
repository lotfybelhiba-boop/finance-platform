import React, { useState } from 'react';
import Header from '../components/Header';
import DevisModal from '../components/DevisModal';
import { Search, Plus } from 'lucide-react';

const DevisPage = () => {
    const [filter, setFilter] = useState('all');
    const [isModalOpen, setIsModalOpen] = useState(false);

    const [devisList, setDevisList] = useState([
        { id: 'DEV-2026-001', client: 'Future Corp', montant: 8500, date: '2026-09-12', validite: '2026-10-12', statut: 'Sent' },
        { id: 'DEV-2026-002', client: 'Green Energy', montant: 3200, date: '2026-09-14', validite: '2026-10-14', statut: 'Accepted' },
        { id: 'DEV-2026-003', client: 'Tech Build', montant: 4500, date: '2026-09-01', validite: '2026-10-01', statut: 'Rejected' },
        { id: 'DEV-2026-004', client: 'Local Shop', montant: 1200, date: '2026-09-18', validite: '2026-10-18', statut: 'Draft' },
    ]);

    const handleSaveDevis = (nouveauDevis) => {
        setDevisList([nouveauDevis, ...devisList]);
    };

    const formatMoney = (val) => new Intl.NumberFormat('fr-TN', { style: 'currency', currency: 'TND', minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(val);
    const formatNumber = (val) => new Intl.NumberFormat('fr-TN', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(val);

    const filteredDevis = filter === 'all' ? devisList : devisList.filter(d => d.statut === filter);

    const getStatusBadge = (status) => {
        switch (status) {
            case 'Accepted': return <span style={{ background: 'var(--success-bg)', color: 'var(--success)', padding: '6px 12px', borderRadius: '12px', fontSize: '13px', fontWeight: '600' }}>✅ Accepté</span>;
            case 'Sent': return <span style={{ background: 'var(--info-bg)', color: 'var(--info)', padding: '6px 12px', borderRadius: '12px', fontSize: '13px', fontWeight: '600' }}>📤 Envoyé</span>;
            case 'Rejected': return <span style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: '6px 12px', borderRadius: '12px', fontSize: '13px', fontWeight: '600' }}>❌ Refusé</span>;
            case 'Draft': return <span style={{ background: 'rgba(100, 116, 139, 0.1)', color: 'var(--text-muted)', padding: '6px 12px', borderRadius: '12px', fontSize: '13px', fontWeight: '600' }}>📝 Brouillon</span>;
            default: return status;
        }
    };

    return (
        <div>
            <Header title="Devis" subtitle="Gestion des propositions commerciales" />

            <div className="kpi-grid" style={{ marginBottom: '32px' }}>
                <div className="kpi-card" style={{ flex: 1, minWidth: '250px' }}>
                    <div className="kpi-title">Total Devis Ouverts</div>
                    <div className="kpi-value" style={{ color: 'var(--accent-gold)' }}>{formatMoney(9700)}</div>
                    <div className="kpi-subtext">En attente de réponse</div>
                </div>
                <div className="kpi-card" style={{ flex: 1, minWidth: '250px' }}>
                    <div className="kpi-title">Devis Acceptés (Mois)</div>
                    <div className="kpi-value" style={{ color: 'var(--success)' }}>{formatMoney(3200)}</div>
                    <div className="kpi-subtext">CA potentiel converti</div>
                </div>
                <div className="kpi-card" style={{ flex: 1, minWidth: '250px' }}>
                    <div className="kpi-title">Taux de conversion</div>
                    <div className="kpi-value">45%</div>
                    <div className="kpi-subtext">Historique sur 6 mois</div>
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: '12px', flex: 1 }}>
                    <div style={{ position: 'relative', width: '300px' }}>
                        <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input type="text" placeholder="Rechercher un devis..." style={{ width: '100%', padding: '12px 16px 12px 40px', borderRadius: '16px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', backdropFilter: 'var(--glass-blur)', fontSize: '14px', outline: 'none', color: 'var(--text-main)' }} />
                    </div>
                    <div style={{ display: 'flex', background: 'var(--card-bg)', backdropFilter: 'var(--glass-blur)', borderRadius: '16px', border: '1px solid var(--border-color)', padding: '4px' }}>
                        {['all', 'Draft', 'Sent', 'Accepted', 'Rejected'].map(f => (
                            <button key={f} onClick={() => setFilter(f)} style={{ padding: '8px 16px', borderRadius: '12px', border: 'none', background: filter === f ? 'var(--text-main)' : 'transparent', color: filter === f ? 'white' : 'var(--text-muted)', fontWeight: filter === f ? '600' : '500', cursor: 'pointer', fontSize: '13px', transition: 'all 0.2s' }}>
                                {f === 'all' ? 'Tous' : f === 'Draft' ? '📝 Brouillon' : f === 'Sent' ? '📤 Envoyé' : f === 'Accepted' ? '✅ Accepté' : '❌ Refusé'}
                            </button>
                        ))}
                    </div>
                </div>
                <button onClick={() => setIsModalOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', background: 'var(--accent-gold)', color: 'var(--text-main)', border: 'none', borderRadius: '16px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 12px rgba(255, 193, 5, 0.2)', transition: 'all 0.2s' }}>
                    <Plus size={18} /> Nouveau Devis
                </button>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ background: 'rgba(0,0,0,0.02)' }}>
                        <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            <th style={{ padding: '16px 24px' }}>Client & Réf</th>
                            <th style={{ padding: '16px 24px', textAlign: 'right' }}>Montant TTC</th>
                            <th style={{ padding: '16px 24px' }}>Date</th>
                            <th style={{ padding: '16px 24px' }}>Validité</th>
                            <th style={{ padding: '16px 24px', textAlign: 'center' }}>Statut</th>
                            <th style={{ padding: '16px 24px', textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredDevis.map((d) => (
                            <tr key={d.id} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '14px', transition: 'all 0.2s ease' }} onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.5)' }} onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}>
                                <td style={{ padding: '16px 24px' }}>
                                    <div style={{ fontWeight: '600', color: 'var(--text-main)', marginBottom: '4px' }}>{d.client}</div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{d.id}</div>
                                </td>
                                <td style={{ padding: '16px 24px', textAlign: 'right', fontWeight: '700', color: 'var(--text-main)' }}>{formatNumber(d.montant)}</td>
                                <td style={{ padding: '16px 24px', color: 'var(--text-muted)' }}>{d.date}</td>
                                <td style={{ padding: '16px 24px', color: 'var(--text-muted)' }}>{d.validite}</td>
                                <td style={{ padding: '16px 24px', textAlign: 'center' }}>{getStatusBadge(d.statut)}</td>
                                <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                                    <button style={{ background: 'transparent', border: '1px solid var(--border-color)', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', color: 'var(--text-main)' }}>Voir</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <DevisModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveDevis}
            />
        </div>
    );
};

export default DevisPage;
