import React, { useState, useMemo, useEffect } from 'react';
import Header from '../components/Header';
import FactureModal from '../components/FactureModal';
import InvoicePreviewModal from '../components/InvoicePreviewModal';
import InvoiceAuditModal from '../components/InvoiceAuditModal';
import InvoiceStatusHistoryChart from '../components/InvoiceStatusHistoryChart';
import { Search, Plus, Trash2, Edit, Send, Printer, History, ShieldCheck, Archive, Download, CheckCircle2, AlertCircle, Clock, Eye, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { getFactures, saveFactures, getClients, getStorage, setStorage } from '../services/storageService';
import { calculatePendingInvoices } from '../utils/billingUtils';

const FacturesPage = () => {
    const navigate = useNavigate();
    const [clients, setClients] = useState(() => getClients() || []);
    const [filter, setFilter] = useState('all');
    const [clientFilter, setClientFilter] = useState('all');
    const [monthFilter, setMonthFilter] = useState('all');
    const [yearFilter, setYearFilter] = useState(new Date().getFullYear().toString());
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
    const [showMatrix, setShowMatrix] = useState(false);
    const [previewFacture, setPreviewFacture] = useState(null);
    const [selectedFactures, setSelectedFactures] = useState([]);
    const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'registry', 'audit'
    const [paymentModalInfo, setPaymentModalInfo] = useState(null);
    const [factureToEdit, setFactureToEdit] = useState(null);
    const [factures, setFactures] = useState(() => {
        let parsed = getFactures();
        if (parsed && parsed.length > 0) {
            let modified = false;
            parsed = parsed.map((f, index) => {
                if (f.dateEmi && f.dateEmi.startsWith('2026-01')) {
                    const clientName = f.client?.toLowerCase() || '';
                    if (clientName.includes('globaleep') && !f.id?.startsWith('N01-2026')) {
                        f.id = 'N01-2026-001';
                        modified = true;
                    } else if (clientName.includes('geste') && !f.id?.startsWith('N03-2026')) {
                        f.id = 'N03-2026-001';
                        modified = true;
                    } else if (clientName.includes('bosch') && !f.id?.startsWith('N04-2026')) {
                        f.id = 'N04-2026-001';
                        modified = true;
                    } else if (clientName.includes('majour') && f.id !== 'non déclarée' && !f.id.startsWith('ND-')) {
                        f.id = 'non déclarée';
                        modified = true;
                    }
                }
                if (f.id === 'non déclarée') {
                    modified = true;
                    return { ...f, id: 'ND-' + Date.now().toString().slice(-6) + '-' + index };
                }
                return f;
            });
            if (modified) saveFactures(parsed);
            return parsed;
        }
        return [];
    });

    const [ignoredAlerts, setIgnoredAlerts] = useState(() => getStorage('mynds_ignored_alerts', []));
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, type: null, id: null, message: '' });

    const pendingInvoicesStats = useMemo(() => {
        try {
            const effectiveYear = yearFilter === 'all' ? new Date().getFullYear() : parseInt(yearFilter, 10);
            const effectiveMonth = monthFilter === 'all' ? new Date().getMonth() : parseInt(monthFilter, 10) - 1;
            const targetDate = new Date(effectiveYear, effectiveMonth, 28);
            return calculatePendingInvoices(clients, factures, ignoredAlerts, targetDate);
        } catch (e) {
            return { count: 0, amount: 0, missingClients: [] };
        }
    }, [clients, factures, ignoredAlerts, yearFilter, monthFilter]);

    const todoFactures = useMemo(() => {
        return pendingInvoicesStats.missingClients.map(mc => ({
            id: 'TODO-' + mc.enseigne + '-' + mc.targetMonth + '-' + mc.targetYear, 
            isTodo: true,
            clientId: mc.id,
            client: mc.enseigne,
            statut: 'A faire',
            montant: mc.montantMensuel,
            dateEmi: mc.targetYear + '-' + String(mc.targetMonth + 1).padStart(2, '0') + '-' + String(mc.cycleDay || 1).padStart(2, '0'),
            periodeDebut: mc.cycleDay === 1 
                ? mc.targetYear + '-' + String(mc.targetMonth + 1).padStart(2, '0') + '-01'
                : new Date(mc.targetYear, mc.targetMonth - 1, mc.cycleDay).toISOString().split('T')[0],
            periodeFin: mc.cycleDay === 1
                ? new Date(mc.targetYear, mc.targetMonth + 1, 0).toISOString().split('T')[0]
                : new Date(mc.targetYear, mc.targetMonth, mc.cycleDay - 1).toISOString().split('T')[0],
            cycleDay: mc.cycleDay,
            targetMonth: mc.targetMonth,
            targetYear: mc.targetYear,
            alertStatus: mc.alertStatus
        }));
    }, [pendingInvoicesStats]);

    const [quickInvoiceClient, setQuickInvoiceClient] = useState(null);
    const [quickInvoiceTargetDate, setQuickInvoiceTargetDate] = useState(null);

    useEffect(() => {
        const syncData = () => {
            const f = getFactures(); if (f) setFactures(f);
            const c = getClients(); if (c) setClients(c);
            const i = getStorage('mynds_ignored_alerts', []); setIgnoredAlerts(i);
        };
        window.addEventListener('storage', syncData);
        return () => window.removeEventListener('storage', syncData);
    }, []);

    useEffect(() => { saveFactures(factures); }, [factures]);

    const handlePaperToggle = (id) => {
        setFactures(prev => prev.map(f => f.id === id ? { ...f, isPaper: !f.isPaper } : f));
    };

    const handleEdit = (facture) => {
        setFactureToEdit(facture);
        setIsModalOpen(true);
    };

    const handlePreview = (facture) => {
        setPreviewFacture(facture);
    };

    const handleSaveFacture = (nouvelleFacture) => {
        setFactures(prev => {
            const exists = prev.find(f => f.id === nouvelleFacture.id);
            if (exists) return prev.map(f => f.id === nouvelleFacture.id ? nouvelleFacture : f);
            return [nouvelleFacture, ...prev];
        });
        setIsModalOpen(false);
    };

    const handleDelete = (id) => {
        setConfirmModal({ isOpen: true, type: 'delete_single', id: id, message: 'Voulez-vous supprimer la facture ' + id + ' ?' });
    };

    const executeConfirmAction = () => {
        const { type, id } = confirmModal;
        if (type === 'delete_single') setFactures(prev => prev.filter(f => f.id !== id));
        else if (type === 'delete_mass') {
            setFactures(prev => prev.filter(f => !selectedFactures.includes(f.id)));
            setSelectedFactures([]);
        }
        setConfirmModal({ isOpen: false, type: null, id: null, message: '' });
    };

    const formatMoney = (val) => new Intl.NumberFormat('fr-TN', { style: 'currency', currency: 'TND', minimumFractionDigits: 1 }).format(val);
    const formatNumber = (val) => new Intl.NumberFormat('fr-TN', { minimumFractionDigits: 1 }).format(val);

    const filteredFactures = useMemo(() => {
        const all = [...todoFactures, ...factures];
        const base = filter === 'Archived' ? all : all.filter(f => f.statut !== 'Archived');
        return base.filter(f => {
            if (filter !== 'all' && f.statut !== filter) return false;
            if (clientFilter !== 'all' && f.client !== clientFilter) return false;
            if (monthFilter !== 'all') {
                const d = new Date(f.dateEmi);
                if (d.getMonth() + 1 !== parseInt(monthFilter)) return false;
            }
            if (yearFilter !== 'all') {
                const d = new Date(f.dateEmi);
                if (d.getFullYear().toString() !== yearFilter) return false;
            }
            return true;
        });
    }, [todoFactures, factures, filter, clientFilter, monthFilter, yearFilter]);

    const sortedFactures = useMemo(() => {
        if (!sortConfig.key) return filteredFactures;
        return [...filteredFactures].sort((a, b) => {
            let aVal = a[sortConfig.key] || '';
            let bVal = b[sortConfig.key] || '';
            if (sortConfig.key === 'id') return sortConfig.direction === 'asc' ? aVal.localeCompare(bVal, undefined, { numeric: true }) : bVal.localeCompare(aVal, undefined, { numeric: true });
            return sortConfig.direction === 'asc' ? (aVal < bVal ? -1 : 1) : (aVal > bVal ? -1 : 1);
        });
    }, [filteredFactures, sortConfig]);

    const getStatusSelect = (facture) => {
        const style = { padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: '700', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', width: 'fit-content' };
        if (facture.isTodo) return <span style={{...style, background: 'rgba(239, 68, 68, 0.05)', color: 'var(--danger)', border: '1px dashed var(--danger)'}}>À FAIRE</span>;
        
        const colors = {
            Paid: { bg: 'rgba(16, 185, 129, 0.1)', text: '#059669', icon: <CheckCircle2 size={12} /> },
            Sent: { bg: 'rgba(245, 158, 11, 0.1)', text: '#d97706', icon: <Clock size={12} /> },
            Late: { bg: 'rgba(239, 68, 68, 0.1)', text: '#dc2626', icon: <AlertCircle size={12} /> },
            Draft: { bg: 'rgba(100, 116, 139, 0.1)', text: '#475569', icon: <FileText size={12} /> },
            Archived: { bg: 'rgba(15, 23, 42, 0.05)', text: '#64748b', icon: <Archive size={12} /> }
        };
        const c = colors[facture.statut] || colors.Draft;

        return (
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <select 
                    value={facture.statut} 
                    onChange={(e) => {
                        const newStatus = e.target.value;
                        if (newStatus === 'Paid') {
                            setPaymentModalInfo({ 
                                id: facture.id, 
                                client: facture.client, 
                                amount: facture.montant,
                                isNonDeclare: facture.id && (facture.id.startsWith('ND-') || facture.id === 'non déclarée')
                            });
                        } else {
                            setFactures(prev => prev.map(f => f.id === facture.id ? {...f, statut: newStatus} : f));
                        }
                    }}
                    style={{ ...style, background: c.bg, color: c.text, appearance: 'none', paddingRight: '20px' }}
                >
                    <option value='Paid'>Paid</option>
                    <option value='Sent'>Sent</option>
                    <option value='Late'>Late</option>
                    <option value='Draft'>Draft</option>
                    <option value='Archived'>Archived</option>
                </select>
                <div style={{ position: 'absolute', right: '8px', pointerEvents: 'none', color: c.text, display: 'flex' }}>
                    {c.icon}
                </div>
            </div>
        );
    };

    const reconciliationData = useMemo(() => {
        const groups = {};
        factures.filter(f => !f.isTodo && f.statut !== 'Archived').forEach(f => {
            if (!groups[f.client]) groups[f.client] = { name: f.client, emitted: 0, paper: 0, months: new Set() };
            groups[f.client].emitted += 1;
            if (f.isPaper) groups[f.client].paper += 1;
            if (f.dateEmi) {
                const d = new Date(f.dateEmi);
                groups[f.client].months.add(d.toLocaleDateString('fr-FR', { month: 'short' }) + ' ' + d.getFullYear().toString().slice(-2));
            }
        });
        return Object.values(groups).sort((a,b) => a.name.localeCompare(b.name));
    }, [factures]);

    const enAttenteSum = factures.filter(f => f.statut === 'Sent' || f.statut === 'Late').reduce((acc, f) => acc + (parseFloat(f.montant) - (f.montantPaye || 0)), 0);
    const recuSum = factures.filter(f => f.statut === 'Paid').reduce((acc, f) => acc + parseFloat(f.montant), 0);
    const retardCount = factures.filter(f => f.statut === 'Late').length;

    return (
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 20px', fontFamily: 'Outfit, sans-serif' }}>
            <style>
                {`
                    :root {
                        --accent-gold: #FFC107;
                        --accent-gold-soft: rgba(255, 193, 7, 0.1);
                        --card-bg: #FFFFFF;
                        --border-color: #E5E7EB;
                        --text-main: #1F2937;
                        --text-muted: #6B7280;
                        --success: #059669;
                        --success-bg: rgba(5, 150, 105, 0.08);
                        --danger: #DC2626;
                        --danger-bg: rgba(220, 38, 38, 0.08);
                        --table-header-bg: #F9FAFB;
                        --professional-font: "Tahoma", "Arial", sans-serif;
                    }
                    .tab-content-fade-in { animation: fadeIn 0.2s ease-out; }
                    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                    .glass-card { background: #fff; border: 1px solid var(--border-color); border-radius: 4px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
                    .btn-primary { background: #374151; color: #fff; border: none; border-radius: 4px; font-weight: 600; cursor: pointer; transition: all 0.2s; font-family: var(--professional-font); font-size: 11px; }
                    .btn-primary:hover { background: #111827; }
                    .registry-row { transition: background 0.1s; border-bottom: 1px solid var(--border-color); font-family: var(--professional-font); font-size: 11px; }
                    .registry-row:hover { background: #F3F4F6; }
                    .action-btn { background: transparent; color: var(--text-muted); border: 1px solid transparent; border-radius: 4px; width: 28px; height: 28px; display: flex; alignItems: center; justifyContent: center; cursor: pointer; transition: all 0.2s; }
                    .action-btn:hover { background: #fff; color: var(--text-main); border-color: #D1D5DB; }
                    .action-btn.delete:hover { border-color: #FEE2E2; color: var(--danger); }
                `}
            </style>

            <Header title='Factures' subtitle='Management & Billing Overview' />

            <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', background: '#F3F4F6', padding: '4px', borderRadius: '6px', width: 'fit-content' }}>
                {[
                    { id: 'overview', label: 'Dashboard', icon: '📊' },
                    { id: 'registry', label: 'Registre', icon: '📋' },
                    { id: 'audit', label: 'Audit', icon: '⚖️' }
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px',
                            background: activeTab === tab.id ? '#FFFFFF' : 'transparent',
                            color: activeTab === tab.id ? 'var(--text-main)' : 'var(--text-muted)',
                            border: 'none', borderRadius: '4px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s',
                            boxShadow: activeTab === tab.id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                            fontFamily: 'var(--professional-font)'
                        }}
                    >
                         {tab.label}
                    </button>
                ))}
            </div>

            {activeTab === 'overview' && (
                <div className='tab-content-fade-in'>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '32px' }}>
                        <div className='glass-card' style={{ padding: '24px' }}>
                            <div style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: '900', marginBottom: '8px', letterSpacing: '1px' }}>EN ATTENTE</div>
                            <div style={{ fontSize: '32px', fontWeight: '900' }}>{formatMoney(enAttenteSum)}</div>
                        </div>
                        <div className='glass-card' style={{ padding: '24px' }}>
                            <div style={{ color: 'var(--success)', fontSize: '11px', fontWeight: '900', marginBottom: '8px', letterSpacing: '1px' }}>DÉCLARÉ REÇU</div>
                            <div style={{ fontSize: '32px', fontWeight: '900' }}>{formatMoney(recuSum)}</div>
                        </div>
                        <div className='glass-card' style={{ padding: '24px' }}>
                            <div style={{ color: 'var(--danger)', fontSize: '11px', fontWeight: '900', marginBottom: '8px', letterSpacing: '1px' }}>LITIGES / RETARD</div>
                            <div style={{ fontSize: '32px', fontWeight: '900' }}>{retardCount} <span style={{fontSize: '14px', fontWeight: '500'}}>Factures</span></div>
                        </div>
                    </div>

                    <div style={{ marginBottom: '32px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: '900' }}>VIGILANCE FACTURATION</h3>
                            <button onClick={() => setShowMatrix(!showMatrix)} style={{ fontSize: '12px', fontWeight: '800', border: '1px solid var(--border-color)', background: '#fff', padding: '8px 16px', borderRadius: '12px', cursor: 'pointer' }}>
                                {showMatrix ? 'Masquer Matrice' : 'Voir Matrice Annuelle'}
                            </button>
                        </div>

                        {showMatrix && (
                            <div className='glass-card' style={{ padding: '24px', marginBottom: '24px' }}>
                                <InvoiceStatusHistoryChart 
                                    missingClients={pendingInvoicesStats.missingClients} 
                                    facturesList={factures}
                                    clientsList={clients}
                                    ignoredAlerts={ignoredAlerts}
                                />
                            </div>
                        )}

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
                            {pendingInvoicesStats.missingClients.slice(0, 6).map((mc, idx) => (
                                <div key={idx} className='glass-card' style={{ padding: '24px', position: 'relative', overflow: 'hidden' }}>
                                    {mc.alertStatus === 'urgent' && <div style={{ position: 'absolute', top: 0, right: 0, background: 'var(--danger)', color: '#fff', fontSize: '10px', fontWeight: '900', padding: '4px 12px', borderBottomLeftRadius: '12px' }}>URGENT</div>}
                                    <div style={{ fontWeight: '900', fontSize: '16px', marginBottom: '4px' }}>{mc.enseigne}</div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '20px' }}>
                                        Période: {new Date(mc.targetYear, mc.targetMonth).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed var(--border-color)', paddingTop: '16px' }}>
                                        <div>
                                            <div style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)' }}>MONTANT PRÉVU</div>
                                            <div style={{ fontSize: '18px', fontWeight: '900' }}>{formatMoney(mc.montantMensuel)}</div>
                                        </div>
                                        <button 
                                            onClick={() => { setQuickInvoiceClient(mc.id); setQuickInvoiceTargetDate({ month: mc.targetMonth, year: mc.targetYear, cycleDay: mc.cycleDay }); setIsModalOpen(true); }}
                                            className='btn-primary' style={{ padding: '10px 20px' }}
                                        >
                                            ÉMETTRE
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'registry' && (
                <div className='tab-content-fade-in'>
                    <div className='glass-card' style={{ padding: '12px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <select value={filter} onChange={e => setFilter(e.target.value)} style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid var(--border-color)', fontWeight: '400', fontSize: '11px', fontFamily: 'var(--professional-font)' }}>
                                <option value='all'>Tous Statuts</option>
                                <option value='Paid'>Payée</option>
                                <option value='Sent'>En attente</option>
                                <option value='Late'>En Retard</option>
                            </select>
                            <select value={clientFilter} onChange={e => setClientFilter(e.target.value)} style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid var(--border-color)', fontWeight: '400', fontSize: '11px', fontFamily: 'var(--professional-font)' }}>
                                <option value='all'>Tous Clients</option>
                                {[...new Set(factures.map(f => f.client))].filter(Boolean).sort().map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <button onClick={() => setIsModalOpen(true)} className='btn-primary' style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Plus size={14} /> Nouvelle Facture
                        </button>
                    </div>

                    <div className='glass-card' style={{ overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: 'var(--table-header-bg)', borderBottom: '1px solid var(--border-color)', fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', fontFamily: 'var(--professional-font)' }}>
                                    <th style={{ padding: '8px 16px', textAlign: 'left', fontWeight: '700' }}>Client & N° Facture</th>
                                    <th style={{ padding: '8px 16px', textAlign: 'left', fontWeight: '700' }}>Période</th>
                                    <th style={{ padding: '8px 16px', textAlign: 'right', fontWeight: '700' }}>Montant (TND)</th>
                                    <th style={{ padding: '8px 16px', textAlign: 'center', fontWeight: '700' }}>Statut</th>
                                    <th style={{ padding: '8px 16px', textAlign: 'right', fontWeight: '700' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedFactures.map(f => {
                                    const isND = f.id && (f.id.startsWith('ND-') || f.id === 'non déclarée');
                                    return (
                                        <tr key={f.id} className="registry-row">
                                            <td style={{ padding: '6px 16px' }}>
                                                <div style={{ fontWeight: '700', fontSize: '11px', color: 'var(--text-main)', marginBottom: '1px' }}>{f.client}</div>
                                                <div style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    {f.id} 
                                                    <span style={{ color: '#D1D5DB' }}>•</span>
                                                    <span style={{ fontSize: '9px', fontWeight: '600', color: isND ? '#B45309' : '#059669' }}>
                                                        {isND ? 'Non Déclarée' : 'Déclarée (BIAT)'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td style={{ padding: '6px 16px' }}>
                                                <div style={{ color: 'var(--text-main)', fontSize: '10px' }}>{f.periodeDebut}</div>
                                                <div style={{ color: 'var(--text-muted)', fontSize: '9px' }}>au {f.periodeFin}</div>
                                            </td>
                                            <td style={{ padding: '6px 16px', textAlign: 'right' }}>
                                                <div style={{ fontWeight: '700', fontSize: '11px' }}>{formatNumber(f.montant)}</div>
                                            </td>
                                            <td style={{ padding: '6px 16px', textAlign: 'center' }}>
                                                <div style={{ display: 'flex', justifyContent: 'center' }}>
                                                    {getStatusSelect(f)}
                                                </div>
                                            </td>
                                            <td style={{ padding: '6px 16px', textAlign: 'right' }}>
                                                <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                                                    <button onClick={() => handlePreview(f)} className="action-btn" title="Aperçu"><Eye size={14} /></button>
                                                    <button onClick={() => handleEdit(f)} className="action-btn" title="Modifier"><Edit size={14} /></button>
                                                    <button onClick={() => handlePreview({ ...f, autoDownload: true })} className="action-btn" title="Imprimer"><Printer size={14} /></button>
                                                    <button onClick={() => handlePaperToggle(f.id)} className="action-btn" style={{ color: f.isPaper ? '#D97706' : '' }} title="Format Papier"><FileText size={14} /></button>
                                                    <button onClick={() => handleDelete(f.id)} className="action-btn delete" title="Supprimer"><Trash2 size={14} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'audit' && (
                <div className='tab-content-fade-in'>
                    <div className='glass-card' style={{ overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--border-color)', fontSize: '11px' }}>
                                    <th style={{ padding: '16px', textAlign: 'left' }}>Client</th>
                                    <th style={{ padding: '16px', textAlign: 'center' }}>Émises</th>
                                    <th style={{ padding: '16px', textAlign: 'center' }}>Papiers</th>
                                    <th style={{ padding: '16px' }}>Mois</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reconciliationData.map((data, idx) => (
                                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                        <td style={{ padding: '16px', fontWeight: '900' }}>{data.name}</td>
                                        <td style={{ padding: '16px', textAlign: 'center' }}>{data.emitted}</td>
                                        <td style={{ padding: '16px', textAlign: 'center' }}>{data.paper}</td>
                                        <td style={{ padding: '16px', fontSize: '11px' }}>{[...data.months].join(', ')}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {isModalOpen && (
                <FactureModal 
                    isOpen={isModalOpen} 
                    onClose={() => { setIsModalOpen(false); setFactureToEdit(null); }} 
                    onSave={handleSaveFacture} 
                    factureToEdit={factureToEdit} 
                    initialClientName={clients.find(c => c.id === quickInvoiceClient)?.enseigne} 
                    targetDate={quickInvoiceTargetDate}
                />
            )}

            {previewFacture && (
                <InvoicePreviewModal 
                    isOpen={!!previewFacture} 
                    onClose={() => setPreviewFacture(null)} 
                    facture={previewFacture} 
                />
            )}
            
            <InvoiceAuditModal isOpen={isAuditModalOpen} onClose={() => setIsAuditModalOpen(false)} onRestoreAlert={() => {}} />
            
            {confirmModal.isOpen && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div className='glass-card' style={{ padding: '24px', maxWidth: '400px' }}>
                        <p>{confirmModal.message}</p>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                            <button onClick={() => setConfirmModal({isOpen: false})} style={{ padding: '8px 16px', background: 'none', border: '1px solid var(--border-color)', borderRadius: '12px', cursor: 'pointer' }}>Annuler</button>
                            <button onClick={executeConfirmAction} className='btn-primary' style={{ padding: '8px 16px', background: 'var(--danger)' }}>Supprimer</button>
                        </div>
                    </div>
                </div>
            )}

            {paymentModalInfo && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
                    <div className='glass-card' style={{ padding: '32px', maxWidth: '440px', width: '90%', animation: 'modalIn 0.3s ease-out' }}>
                        <style>{`@keyframes modalIn { from { opacity: 0; transform: scale(0.9) translateY(20px); } to { opacity: 1; transform: scale(1) translateY(0); } }`}</style>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <CheckCircle2 size={24} />
                            </div>
                            <div>
                                <h3 style={{ fontSize: '18px', fontWeight: '900', margin: 0 }}>Confirmer Paiement</h3>
                                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>Enregistrement du flux financier plateforme</p>
                            </div>
                        </div>

                        <div style={{ background: '#f8fafc', borderRadius: '16px', padding: '16px', marginBottom: '24px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>Client</span>
                                <span style={{ fontSize: '12px', fontWeight: '800' }}>{paymentModalInfo.client}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>Montant</span>
                                <span style={{ fontSize: '16px', fontWeight: '900' }}>{formatMoney(paymentModalInfo.amount)}</span>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <label style={{ fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Date effective du paiement</label>
                                <input 
                                    type="date" 
                                    defaultValue={new Date().toISOString().split('T')[0]} 
                                    id="confirm-payment-date"
                                    style={{ padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)', fontSize: '14px', fontWeight: '700' }} 
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <label style={{ fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Compte de destination</label>
                                <select 
                                    id="confirm-payment-bank"
                                    defaultValue={paymentModalInfo.isNonDeclare ? 'QNB' : 'BIAT'}
                                    style={{ padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)', fontSize: '14px', fontWeight: '700' }}
                                >
                                    <option value="BIAT">🏦 BIAT (Déclaré)</option>
                                    <option value="QNB">🔵 QNB (Perso/ND)</option>
                                    <option value="Espèces">💰 Espèces (Cash)</option>
                                </select>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button 
                                onClick={() => setPaymentModalInfo(null)} 
                                style={{ flex: 1, padding: '14px', borderRadius: '12px', border: '1px solid var(--border-color)', background: '#fff', fontWeight: '800', cursor: 'pointer' }}
                            >
                                Annuler
                            </button>
                            <button 
                                onClick={() => {
                                    const date = document.getElementById('confirm-payment-date').value;
                                    const bank = document.getElementById('confirm-payment-bank').value;
                                    setFactures(prev => prev.map(f => f.id === paymentModalInfo.id ? {
                                        ...f, 
                                        statut: 'Paid', 
                                        datePaiement: date, 
                                        compteEncaissement: bank 
                                    } : f));
                                    setPaymentModalInfo(null);
                                }} 
                                style={{ flex: 1, padding: '14px', borderRadius: '12px', border: 'none', background: 'var(--text-main)', color: '#fff', fontWeight: '800', cursor: 'pointer' }}
                            >
                                Valider
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FacturesPage;
