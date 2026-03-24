import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import SponsoringModal from '../components/SponsoringModal';
import { Search, Plus, Target, DollarSign, Activity, TrendingUp, Edit2, Trash2 } from 'lucide-react';
import { getStorage, setStorage } from '../services/storageService';

const defaultDummySponsoring = [
    {
        id: 'SPON-001',
        client: 'Global Mkt',
        plateforme: 'Meta',
        montantClientTND: 4200,
        fraisService: 30,
        tauxVente: 3.5,
        tauxAchat: 3.1,
        montantUSD: 1191.43,
        montantTNDBanque: 3693.43,
        montantTNDFacture: 4200,
        margeNette: 506.57,
        dateDebut: '2026-09-01',
        dateFin: '2026-09-30',
        statut: 'Actif'
    },
    {
        id: 'SPON-002',
        client: 'Studio Design',
        plateforme: 'Google Ads',
        montantClientTND: 1200,
        fraisService: 30,
        tauxVente: 3.4,
        tauxAchat: 3.1,
        montantUSD: 344.12,
        montantTNDBanque: 1066.77,
        montantTNDFacture: 1200,
        margeNette: 133.23,
        dateDebut: '2026-08-15',
        dateFin: '2026-09-15',
        statut: 'Terminé'
    }
];

const SponsoringPage = () => {
    const [sponsoringList, setSponsoringList] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const saved = getStorage('mynds_sponsoring');
        if (saved) {
            setSponsoringList(saved);
        } else {
            setSponsoringList(defaultDummySponsoring);
            setStorage('mynds_sponsoring', defaultDummySponsoring);
        }
    }, []);

    useEffect(() => {
        setStorage('mynds_sponsoring', sponsoringList);
    }, [sponsoringList]);

    const formatMoney = (val, currency = 'TND') => {
        if (currency === 'USD') {
            return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
        }
        return new Intl.NumberFormat('fr-TN', { style: 'currency', currency: 'TND', minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(val);
    };

    const handleSaveSponsoring = (newItem) => {
        if (editingItem) {
            setSponsoringList(sponsoringList.map(item => item.id === newItem.id ? newItem : item));
        } else {
            setSponsoringList([newItem, ...sponsoringList]);
        }
    };

    const handleEdit = (item) => {
        setEditingItem(item);
        setIsModalOpen(true);
    };

    const handleDelete = (id) => {
        if (window.confirm('Voulez-vous vraiment supprimer cet enregistrement de sponsoring ?')) {
            setSponsoringList(sponsoringList.filter(item => item.id !== id));
        }
    };

    const getStatusStyle = (status) => {
        switch (status) {
            case 'Actif': return { bg: 'rgba(34, 197, 94, 0.1)', color: 'var(--success)' };
            case 'Terminé': return { bg: 'rgba(100, 116, 139, 0.1)', color: 'var(--text-muted)' };
            case 'En pause': return { bg: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)' };
            default: return { bg: 'var(--bg-main)', color: 'var(--text-main)' };
        }
    };

    const getPlatformBrandColor = (platform) => {
        switch (platform) {
            case 'Meta': return '#1877F2';
            case 'Google Ads': return '#EA4335';
            case 'TikTok': return '#000000';
            case 'LinkedIn': return '#0A66C2';
            case 'Snapchat': return '#FFFC00';
            default: return 'var(--text-main)';
        }
    };

    // Filters
    const filteredList = sponsoringList.filter(item => {
        if (!item) return false;
        const clientStr = item.client || '';
        const platStr = item.plateforme || '';
        const searchStr = searchTerm || '';
        return clientStr.toLowerCase().includes(searchStr.toLowerCase()) ||
            platStr.toLowerCase().includes(searchStr.toLowerCase());
    });

    // KPIs
    const totalSpentUSD = sponsoringList.reduce((acc, curr) => acc + (curr ? parseFloat(curr.montantUSD) || 0 : 0), 0);
    const totalMargin = sponsoringList.reduce((acc, curr) => acc + (curr ? parseFloat(curr.margeNette) || 0 : 0), 0);
    const activeCampaigns = sponsoringList.filter(i => i?.statut === 'Actif').length;

    return (
        <div style={{ paddingBottom: '40px' }}>
            <Header title="Sponsoring & Ads" subtitle="Suivi des dépenses et marges publicitaires" />

            {/* KPI Cards (Shrinked & Organized) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                <div style={{ background: 'var(--card-bg)', borderRadius: '16px', padding: '16px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.1)', color: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <DollarSign size={20} strokeWidth={2.5} />
                    </div>
                    <div>
                        <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Dépensé (USD)</div>
                        <div style={{ fontSize: '20px', fontWeight: '900', color: 'var(--text-main)' }}>{formatMoney(totalSpentUSD, 'USD')}</div>
                    </div>
                </div>

                <div style={{ background: 'var(--card-bg)', borderRadius: '16px', padding: '16px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(34, 197, 94, 0.1)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <TrendingUp size={20} strokeWidth={2.5} />
                    </div>
                    <div>
                        <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Marge Nette (TND)</div>
                        <div style={{ fontSize: '20px', fontWeight: '900', color: totalMargin >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                            {totalMargin > 0 ? '+' : ''}{formatMoney(totalMargin)}
                        </div>
                    </div>
                </div>

                <div style={{ background: 'var(--card-bg)', borderRadius: '16px', padding: '16px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(255, 193, 5, 0.1)', color: 'var(--accent-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Activity size={20} strokeWidth={2.5} />
                    </div>
                    <div>
                        <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Campagnes Actives</div>
                        <div style={{ fontSize: '20px', fontWeight: '900', color: 'var(--text-main)' }}>{activeCampaigns}</div>
                    </div>
                </div>
            </div>

            {/* Actions Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
                    <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Rechercher un client, une plateforme..."
                        style={{ width: '100%', padding: '12px 16px 12px 42px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-main)', fontSize: '14px', outline: 'none' }}
                    />
                </div>

                <button onClick={() => { setEditingItem(null); setIsModalOpen(true); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', borderRadius: '12px', border: 'none', background: 'var(--text-main)', color: 'white', cursor: 'pointer', fontWeight: '600', fontSize: '14px', transition: 'transform 0.2s', ':hover': { transform: 'translateY(-2px)' } }}>
                    <Plus size={18} /> Nouveau Budget
                </button>
            </div>

            {/* Table */}
            <div style={{ background: 'var(--card-bg)', borderRadius: '24px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-main)' }}>
                                <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Client / Projet</th>
                                <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Plateforme</th>
                                <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Budget Client</th>
                                <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Achat / Facturé</th>
                                <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Marge Nette</th>
                                <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Statut</th>
                                <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredList.map((item) => {
                                const statusStyle = getStatusStyle(item.statut);
                                const platColor = getPlatformBrandColor(item.plateforme);
                                const margeValue = parseFloat(item.margeNette) || 0;

                                return (
                                    <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s', ':hover': { background: 'var(--bg-main)' } }}>
                                        <td style={{ padding: '16px 24px' }}>
                                            <div style={{ fontWeight: '700', color: 'var(--text-main)', fontSize: '14px' }}>{item.client}</div>
                                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>ID: {item.id}</div>
                                        </td>
                                        <td style={{ padding: '16px 24px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: platColor }}></div>
                                                <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-main)' }}>{item.plateforme}</span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '16px 24px' }}>
                                            <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-main)' }}>{formatMoney(item.montantClientTND || item.montantTNDFacture || 0)}</div>
                                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{formatMoney(item.montantUSD || 0, 'USD')} ({item.dateDebut})</div>
                                        </td>
                                        <td style={{ padding: '16px 24px' }}>
                                            <div style={{ fontSize: '13px', color: 'var(--danger)', fontWeight: '600', display: 'flex', justifyContent: 'space-between', width: '120px' }}>
                                                <span>Achat:</span> <span>{formatMoney(item.montantTNDBanque || 0)}</span>
                                            </div>
                                            <div style={{ fontSize: '13px', color: 'var(--success)', fontWeight: '600', display: 'flex', justifyContent: 'space-between', width: '120px', marginTop: '4px' }}>
                                                <span>Facturé:</span> <span>{formatMoney(item.montantTNDFacture || 0)}</span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '16px 24px' }}>
                                            <div style={{ fontSize: '14px', fontWeight: '800', color: margeValue >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                                                {margeValue > 0 ? '+' : ''}{formatMoney(margeValue)}
                                            </div>
                                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Vx: {item.tauxVente || 1} | Ax: {item.tauxAchat || 1}</div>
                                        </td>
                                        <td style={{ padding: '16px 24px' }}>
                                            <span style={{ padding: '4px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', background: statusStyle.bg, color: statusStyle.color }}>
                                                {item.statut}
                                            </span>
                                        </td>
                                        <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                <button onClick={() => handleEdit(item)} style={{ background: 'var(--success-bg)', border: 'none', borderRadius: '8px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--success)' }}>
                                                    <Edit2 size={16} />
                                                </button>
                                                <button onClick={() => handleDelete(item.id)} style={{ background: 'var(--danger-bg)', border: 'none', borderRadius: '8px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--danger)' }}>
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {filteredList.length === 0 && (
                        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                            Aucun enregistrement trouvé.
                        </div>
                    )}
                </div>
            </div>

            <SponsoringModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveSponsoring}
                initialData={editingItem}
            />
        </div>
    );
};

export default SponsoringPage;
