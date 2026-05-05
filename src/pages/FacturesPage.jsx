import React, { useState, useMemo, useEffect } from 'react';
import Header from '../components/Header';
import FactureModal from '../components/FactureModal';
import InvoicePreviewModal from '../components/InvoicePreviewModal';
import InvoiceAuditModal from '../components/InvoiceAuditModal';
import InvoiceStatusHistoryChart from '../components/InvoiceStatusHistoryChart';
import { Search, Plus, Trash2, Edit, Send, Printer, History, ShieldCheck, Archive, Download, CheckCircle2, AlertCircle, Clock, Eye, FileText, ChevronDown, ChevronRight } from 'lucide-react';
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
    const [expandedGroups, setExpandedGroups] = useState({});
    const [factures, setFactures] = useState(() => {
        const monthNames = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
        let parsed = getFactures();
        if (parsed && parsed.length > 0) {
            let modified = false;
            const usedIds = new Set();
            parsed = parsed.map((f) => {
                // Migration : renommer les anciennes factures ND vers Client_Mois_Année
                const isOldND = f.id && (f.id.startsWith('ND-') || f.id === 'non déclarée');
                if (isOldND && f.client) {
                    const dateRef = new Date(f.periodeDebut || f.dateEmi);
                    if (!isNaN(dateRef.getTime())) {
                        const baseName = `${f.client}_${monthNames[dateRef.getMonth()]}_${dateRef.getFullYear()}`;
                        let newId = baseName;
                        let counter = 2;
                        while (usedIds.has(newId)) {
                            newId = `${baseName}_${counter}`;
                            counter++;
                        }
                        usedIds.add(newId);
                        modified = true;
                        return { ...f, id: newId };
                    }
                }
                usedIds.add(f.id);
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
        if (facture.isTodo) {
            // Auto-remplissage complet du formulaire pour les propositions
            setFactureToEdit(null);
            setQuickInvoiceClient(facture.clientId);
            setQuickInvoiceTargetDate({
                month: facture.targetMonth,
                year: facture.targetYear,
                cycleDay: facture.cycleDay
            });
        } else {
            setFactureToEdit(facture);
        }
        setIsModalOpen(true);
    };

    const handlePreview = (facture) => {
        setPreviewFacture(facture);
    };

    const handleSaveFacture = (nouvelleFacture) => {
        setFactures(prev => {
            // Si on est en mode édition, on remplace la facture originale (via son ancien ID)
            if (factureToEdit) {
                return prev.map(f => f.id === factureToEdit.id ? nouvelleFacture : f);
            }
            // Sinon (ajout d'une nouvelle ou proposition Todo emise), on evite les doublons
            const existsIdx = prev.findIndex(f => f.id === nouvelleFacture.id);
            if (existsIdx !== -1) {
                return prev.map((f, i) => i === existsIdx ? nouvelleFacture : f);
            }
            return [nouvelleFacture, ...prev];
        });
        setIsModalOpen(false);
        setFactureToEdit(null);
        setQuickInvoiceClient(null);
        setQuickInvoiceTargetDate(null);
    };

    const handleDelete = (id) => {
        setConfirmModal({ isOpen: true, type: 'delete_single', id: id, message: 'Voulez-vous supprimer la facture ' + id + ' ?' });
    };

    const handleIgnore = (clientId, month, year) => {
        const key = `TODO-${clientId}-${month}-${year}`;
        const newIgnored = [...ignoredAlerts, key];
        setIgnoredAlerts(newIgnored);
        setStorage('mynds_ignored_alerts', newIgnored);
    };

    const handleRestoreAlert = (key) => {
        const newIgnored = ignoredAlerts.filter(k => k !== key);
        setIgnoredAlerts(newIgnored);
        setStorage('mynds_ignored_alerts', newIgnored);
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
        
        if (activeTab === 'archive') {
            return all.filter(f => f.statut === 'Archived').filter(f => {
                if (clientFilter !== 'all' && f.client !== clientFilter) return false;
                if (yearFilter !== 'all') {
                    const dateStr = f.periodeDebut || f.dateEmi;
                    if (!dateStr) return false;
                    const year = dateStr.split('-')[0];
                    if (year !== yearFilter) return false;
                }
                return true;
            });
        }

        const base = all.filter(f => f.statut !== 'Archived');
        return base.filter(f => {
            if (filter !== 'all' && f.statut !== filter) return false;
            if (clientFilter !== 'all' && f.client !== clientFilter) return false;
            if (monthFilter !== 'all') {
                const dateStr = f.periodeDebut || f.dateEmi;
                if (!dateStr) return false;
                const month = parseInt(dateStr.split('-')[1], 10);
                if (month !== parseInt(monthFilter)) return false;
            }
            if (yearFilter !== 'all') {
                const dateStr = f.periodeDebut || f.dateEmi;
                if (!dateStr) return false;
                const year = dateStr.split('-')[0];
                if (year !== yearFilter) return false;
            }
            return true;
        });
    }, [todoFactures, factures, filter, clientFilter, monthFilter, yearFilter, activeTab]);

    const sortedFactures = useMemo(() => {
        if (!sortConfig.key) return filteredFactures;
        return [...filteredFactures].sort((a, b) => {
            let aVal = a[sortConfig.key] || '';
            let bVal = b[sortConfig.key] || '';
            if (sortConfig.key === 'id') return sortConfig.direction === 'asc' ? aVal.localeCompare(bVal, undefined, { numeric: true }) : bVal.localeCompare(aVal, undefined, { numeric: true });
            return sortConfig.direction === 'asc' ? (aVal < bVal ? -1 : 1) : (aVal > bVal ? -1 : 1);
        });
    }, [filteredFactures, sortConfig]);

    const groupedFactures = useMemo(() => {
        const monthNames = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
        const groups = {};
        
        sortedFactures.forEach(f => {
            const dateStr = f.periodeDebut || f.dateEmi;
            if (!dateStr) return;
            
            // Parsing robuste YYYY-MM-DD pour éviter les décalages TZ
            const parts = dateStr.split('-');
            const year = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1; // 0-based
            
            if (isNaN(year) || isNaN(month)) return;
            
            const key = `${monthNames[month]} ${year}`;
            if (!groups[key]) groups[key] = { label: key, month, year, items: [] };
            groups[key].items.push(f);
        });
        // Sort groups: most recent first
        return Object.values(groups).sort((a, b) => (b.year - a.year) || (b.month - a.month));
    }, [sortedFactures]);

    // Auto-expand groups when filters change
    useEffect(() => {
        if ((activeTab === 'registry' || activeTab === 'archive') && groupedFactures.length > 0) {
            if (activeTab === 'archive' || (activeTab === 'registry' && filter !== 'all') || clientFilter !== 'all' || monthFilter !== 'all' || yearFilter !== 'all') {
                // If a specific filter is applied, or if we are in the Archive tab, expand ALL groups
                const allExpanded = {};
                groupedFactures.forEach(g => allExpanded[g.label] = true);
                setExpandedGroups(allExpanded);
            } else if (Object.keys(expandedGroups).length === 0) {
                // Default view: expand only the most recent month
                setExpandedGroups({ [groupedFactures[0].label]: true });
            }
        }
    }, [activeTab, groupedFactures, filter, clientFilter, monthFilter, yearFilter]);

    const toggleGroup = (label) => setExpandedGroups(prev => ({ ...prev, [label]: !prev[label] }));

    const getStatusSelect = (facture) => {
        const style = { padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: '700', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', width: 'fit-content' };
        if (facture.isTodo) return <span style={{...style, background: 'rgba(239, 68, 68, 0.05)', color: 'var(--danger)', border: '1px dashed var(--danger)'}}>À FAIRE</span>;
        
        const colors = {
            'Paid (Reconciled)': { bg: 'rgba(16, 185, 129, 0.15)', text: '#059669', icon: <ShieldCheck size={12} /> },
            'Paid (Unreconciled)': { bg: 'rgba(16, 185, 129, 0.05)', text: '#059669', icon: <CheckCircle2 size={12} /> },
            'Partially Paid': { bg: 'rgba(59, 130, 246, 0.1)', text: '#2563eb', icon: <Clock size={12} /> },
            Sent: { bg: 'rgba(245, 158, 11, 0.1)', text: '#d97706', icon: <Send size={12} /> },
            Late: { bg: 'rgba(239, 68, 68, 0.1)', text: '#dc2626', icon: <AlertCircle size={12} /> },
            Pending: { bg: 'rgba(100, 116, 139, 0.1)', text: '#475569', icon: <FileText size={12} /> },
            Archived: { bg: 'rgba(15, 23, 42, 0.05)', text: '#64748b', icon: <Archive size={12} /> }
        };
        const c = colors[facture.statut] || colors.Pending;

        return (
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <select 
                    value={facture.statut} 
                    onChange={(e) => {
                        const newStatus = e.target.value;
                        if (newStatus.includes('Paid')) {
                            setPaymentModalInfo({ 
                                id: facture.id, 
                                client: facture.client, 
                                amount: facture.montant,
                                currentStatus: newStatus,
                                isNonDeclare: facture.id && (facture.id.startsWith('ND-') || facture.id === 'non déclarée')
                            });
                        } else {
                            setFactures(prev => prev.map(f => f.id === facture.id ? {...f, statut: newStatus} : f));
                        }
                    }}
                    style={{ ...style, background: c.bg, color: c.text, appearance: 'none', paddingRight: '20px' }}
                >
                    <option value='Paid (Reconciled)'>Paid (Reconciled)</option>
                    <option value='Paid (Unreconciled)'>Paid (Unreconciled)</option>
                    <option value='Partially Paid'>Partially Paid</option>
                    <option value='Sent'>Sent (Envoyée)</option>
                    <option value='Pending'>Pending (En attente)</option>
                    <option value='Late'>Late (Retard)</option>
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

    const enAttenteSum = factures.filter(f => f.statut === 'Sent' || f.statut === 'Late' || f.statut === 'Partially Paid' || f.statut === 'Paid (Unreconciled)').reduce((acc, f) => acc + (parseFloat(f.montant) - (f.montantPaye || 0)), 0);
    const recuSum = factures.filter(f => f.statut.includes('Paid')).reduce((acc, f) => acc + (f.montantPaye || parseFloat(f.montant)), 0);
    const retardCount = factures.filter(f => f.statut === 'Late').length;

    const monthLabels = ["Jan", "Fev", "Mar", "Avr", "Mai", "Juin", "Juil", "Aou", "Sep", "Oct", "Nov", "Dec"];
    const numberingMatrix = useMemo(() => {
        const selectedYear = yearFilter === 'all' ? new Date().getFullYear() : parseInt(yearFilter, 10);
        const realFactures = factures.filter(f => !f.isTodo && f.statut !== 'Archived');
        
        // Filtre : Uniquement les clients déclarés (TVA) payant via BIAT
        return clients
            .filter(c => c.sousTVA !== false && c.sousTVA !== 'Non')
            .sort((a, b) => a.enseigne.localeCompare(b.enseigne))
            .map(clientObj => {
                const clientFacts = realFactures.filter(f => f.clientId === clientObj.id || f.client === clientObj.enseigne);
                const isND = false; // Par définition
                
                const dateDebut = clientObj.dateDebut ? new Date(clientObj.dateDebut) : null;
                const dateFin = clientObj.dateFin ? new Date(clientObj.dateFin) : null;

                const months = Array(12).fill(null).map((_, m) => {
                    const monthDate = new Date(selectedYear, m, 1);
                    let isOutOfService = false;
                    if (dateDebut) {
                        const startM = new Date(dateDebut.getFullYear(), dateDebut.getMonth(), 1);
                        if (monthDate < startM) isOutOfService = true;
                    }
                    if (dateFin) {
                        const endM = new Date(dateFin.getFullYear(), dateFin.getMonth(), 1);
                        if (monthDate > endM) isOutOfService = true;
                    }

                    const monthFacts = clientFacts.filter(f => {
                        const d = new Date(f.periodeDebut || f.dateEmi);
                        return d.getFullYear() === selectedYear && d.getMonth() === m;
                    });
                    return { ids: monthFacts.map(f => f.id), isOutOfService };
                });
                return { client: clientObj.enseigne, isND, months };
            });
    }, [factures, clients, yearFilter]);

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
                    { id: 'numbering', label: 'Numerotation', icon: '#' },
                    { id: 'audit', label: 'Audit', icon: '⚖️' },
                    { id: 'archive', label: 'Archive', icon: '🗄️' }
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
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button 
                                                onClick={() => handleIgnore(mc.id, mc.targetMonth, mc.targetYear)}
                                                className='action-btn delete'
                                                title="Ignorer cette proposition"
                                                style={{ border: '1px solid var(--border-color)', height: '36px', width: '36px' }}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                            <button 
                                                onClick={() => { setQuickInvoiceClient(mc.id); setQuickInvoiceTargetDate({ month: mc.targetMonth, year: mc.targetYear, cycleDay: mc.cycleDay }); setIsModalOpen(true); }}
                                                className='btn-primary' style={{ padding: '10px 20px' }}
                                            >
                                                ÉMETTRE
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            { (activeTab === 'registry' || activeTab === 'archive') && (
                <div className='tab-content-fade-in'>
                    { activeTab === 'registry' && (
                    <div className='glass-card' style={{ padding: '12px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <select value={filter} onChange={e => setFilter(e.target.value)} style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid var(--border-color)', fontWeight: '400', fontSize: '11px', fontFamily: 'var(--professional-font)' }}>
                                <option value='all'>Tous Statuts</option>
                                <option value='Paid (Reconciled)'>Payée (Rapprochée)</option>
                                <option value='Paid (Unreconciled)'>Payée (À rapprocher)</option>
                                <option value='Partially Paid'>Partiellement payée</option>
                                <option value='Sent'>Sent (Envoyée)</option>
                                <option value='Pending'>Pending (En attente)</option>
                                <option value='Late'>Late (En Retard)</option>
                            </select>
                            <select value={clientFilter} onChange={e => setClientFilter(e.target.value)} style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid var(--border-color)', fontWeight: '400', fontSize: '11px', fontFamily: 'var(--professional-font)' }}>
                                <option value='all'>Tous Clients</option>
                                {[...new Set(factures.map(f => f.client))].filter(Boolean).sort().map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <select value={yearFilter} onChange={e => setYearFilter(e.target.value)} style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid var(--border-color)', fontWeight: '400', fontSize: '11px', fontFamily: 'var(--professional-font)' }}>
                                <option value='all'>Toutes Années</option>
                                <option value='2024'>2024</option>
                                <option value='2025'>2025</option>
                                <option value='2026'>2026</option>
                            </select>
                        </div>
                        <button onClick={() => setIsModalOpen(true)} className='btn-primary' style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Plus size={14} /> Nouvelle Facture
                        </button>
                    </div>
                    )}

                    { activeTab === 'archive' && (
                    <div className='glass-card' style={{ padding: '12px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(15, 23, 42, 0.02)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ background: '#e2e8f0', padding: '6px 10px', borderRadius: '6px', color: '#475569', fontWeight: '800', fontSize: '11px' }}>
                                FACTURES ARCHIVÉES
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <select value={clientFilter} onChange={e => setClientFilter(e.target.value)} style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid var(--border-color)', fontWeight: '400', fontSize: '11px', fontFamily: 'var(--professional-font)' }}>
                                    <option value='all'>Tous Clients</option>
                                    {[...new Set(factures.map(f => f.client))].filter(Boolean).sort().map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                                <select value={yearFilter} onChange={e => setYearFilter(e.target.value)} style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid var(--border-color)', fontWeight: '400', fontSize: '11px', fontFamily: 'var(--professional-font)' }}>
                                    <option value='all'>Toutes Années</option>
                                    <option value='2024'>2024</option>
                                    <option value='2025'>2025</option>
                                    <option value='2026'>2026</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    )}

                    <div className='glass-card' style={{ overflow: 'hidden' }}>
                        {groupedFactures.map(group => {
                            const isOpen = expandedGroups[group.label];
                            const groupTotal = group.items.reduce((s, f) => s + (parseFloat(f.montant) || 0), 0);
                            const paidCount = group.items.filter(f => f.statut === 'Paid').length;
                            return (
                                <div key={group.label}>
                                    {/* Month Header */}
                                    <div 
                                        onClick={() => toggleGroup(group.label)}
                                        style={{ 
                                            padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                            background: isOpen ? '#F9FAFB' : '#fff', borderBottom: '1px solid var(--border-color)',
                                            cursor: 'pointer', userSelect: 'none', transition: 'background 0.15s'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            {isOpen ? <ChevronDown size={16} style={{ color: '#6B7280' }} /> : <ChevronRight size={16} style={{ color: '#6B7280' }} />}
                                            <span style={{ fontWeight: '900', fontSize: '13px', color: 'var(--text-main)', fontFamily: 'var(--professional-font)' }}>{group.label}</span>
                                            <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '600', background: '#F3F4F6', padding: '2px 8px', borderRadius: '10px' }}>
                                                {group.items.length} facture{group.items.length > 1 ? 's' : ''}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                            <span style={{ fontSize: '10px', color: '#059669', fontWeight: '700' }}>{paidCount}/{group.items.length} payées</span>
                                            <span style={{ fontWeight: '900', fontSize: '12px', color: 'var(--text-main)', fontFamily: 'var(--professional-font)' }}>{formatMoney(groupTotal)}</span>
                                        </div>
                                    </div>

                                    {/* Month Rows */}
                                    {isOpen && (
                                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                            <thead>
                                                <tr style={{ background: 'var(--table-header-bg)', borderBottom: '1px solid var(--border-color)', fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', fontFamily: 'var(--professional-font)' }}>
                                                    <th style={{ padding: '6px 16px', textAlign: 'left', fontWeight: '700' }}>Client & N° Facture</th>
                                                    <th style={{ padding: '6px 16px', textAlign: 'left', fontWeight: '700' }}>Période</th>
                                                    <th style={{ padding: '6px 16px', textAlign: 'right', fontWeight: '700' }}>Montant (TND)</th>
                                                    <th style={{ padding: '6px 16px', textAlign: 'center', fontWeight: '700' }}>Statut</th>
                                                    <th style={{ padding: '6px 16px', textAlign: 'right', fontWeight: '700' }}>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {group.items.map(f => {
                                                    const clientObj = clients.find(c => c.id === f.clientId || c.enseigne === f.client);
                                                    const isND = (f.id && (f.id.startsWith('ND-') || f.id === 'non déclarée')) 
                                                        || f.compteEncaissement === 'QNB' 
                                                        || (clientObj && (clientObj.sousTVA === false || clientObj.sousTVA === 'Non'));
                                                    
                                                    if (f.isTodo) {
                                                        return (
                                                            <tr key={f.id} className="registry-row" style={{ background: 'rgba(255, 193, 7, 0.04)' }}>
                                                                <td style={{ padding: '6px 16px' }}>
                                                                    <div style={{ fontWeight: '700', fontSize: '11px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                        {f.client}
                                                                        <span style={{ fontSize: '8px', fontWeight: '900', padding: '2px 6px', borderRadius: '4px', background: f.alertStatus === 'urgent' ? 'rgba(220,38,38,0.08)' : 'rgba(245,158,11,0.08)', color: f.alertStatus === 'urgent' ? '#DC2626' : '#D97706', border: `1px dashed ${f.alertStatus === 'urgent' ? '#DC2626' : '#D97706'}` }}>
                                                                            {f.alertStatus === 'urgent' ? 'URGENT' : 'À FAIRE'}
                                                                        </span>
                                                                    </div>
                                                                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Proposition automatique</div>
                                                                </td>
                                                                <td style={{ padding: '6px 16px' }}>
                                                                    <div style={{ color: 'var(--text-main)', fontSize: '10px' }}>{f.periodeDebut}</div>
                                                                    <div style={{ color: 'var(--text-muted)', fontSize: '9px' }}>au {f.periodeFin}</div>
                                                                </td>
                                                                <td style={{ padding: '6px 16px', textAlign: 'right' }}>
                                                                    <div style={{ fontWeight: '700', fontSize: '11px', color: '#D97706' }}>{formatNumber(f.montant)}</div>
                                                                </td>
                                                                <td colSpan="2" style={{ padding: '6px 16px', textAlign: 'right' }}>
                                                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                                        <button 
                                                                            onClick={() => handleIgnore(f.clientId, f.targetMonth, f.targetYear)}
                                                                            className='action-btn delete'
                                                                            title="Ignorer cette proposition"
                                                                        >
                                                                            <Trash2 size={12} />
                                                                        </button>
                                                                        <button 
                                                                            onClick={() => handleEdit(f)}
                                                                            className='btn-primary'
                                                                            style={{ padding: '6px 16px', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}
                                                                        >
                                                                            <Plus size={12} /> ÉMETTRE
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    }
                                                    
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
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {activeTab === 'audit' && (
                <div className='tab-content-fade-in'>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <div>
                            <h3 style={{ fontSize: '18px', fontWeight: '900', margin: 0 }}>Récapitulatif de Contrôle</h3>
                            <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '4px 0 0' }}>Audit des factures émises et format papier</p>
                        </div>
                        <button 
                            onClick={() => setIsAuditModalOpen(true)}
                            className='btn-primary'
                            style={{ padding: '8px 20px', display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--accent-gold)', color: '#000' }}
                        >
                            <Search size={14} /> DIAGNOSTIC AVANCÉ (IGNORÉES)
                        </button>
                    </div>
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

            {activeTab === 'numbering' && (
                <div className='tab-content-fade-in'>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <div>
                            <h3 style={{ fontSize: '16px', fontWeight: '900', margin: 0, fontFamily: 'var(--professional-font)' }}>Matrice de Num&eacute;rotation</h3>
                            <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '4px 0 0' }}>Vue crois&eacute;e Client x Mois</p>
                        </div>
                        <select value={yearFilter} onChange={e => setYearFilter(e.target.value)} style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid var(--border-color)', fontWeight: '600', fontSize: '11px', fontFamily: 'var(--professional-font)' }}>
                            {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>
                    <div className='glass-card' style={{ overflow: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
                            <thead>
                                <tr style={{ background: 'var(--table-header-bg)', borderBottom: '2px solid var(--border-color)' }}>
                                    <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '10px', fontWeight: '900', color: 'var(--text-main)', fontFamily: 'var(--professional-font)', position: 'sticky', left: 0, background: 'var(--table-header-bg)', zIndex: 1, minWidth: '140px' }}>CLIENT</th>
                                    {monthLabels.map((m, i) => (
                                        <th key={i} style={{ padding: '10px 6px', textAlign: 'center', fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', fontFamily: 'var(--professional-font)', minWidth: '80px' }}>{m}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {numberingMatrix.map((row, idx) => (
                                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                        <td style={{ padding: '8px 12px', fontWeight: '800', fontSize: '11px', fontFamily: 'var(--professional-font)', position: 'sticky', left: 0, background: '#fff', zIndex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                {row.client}
                                                <span style={{ fontSize: '8px', fontWeight: '800', padding: '1px 5px', borderRadius: '3px', background: row.isND ? 'rgba(180,83,9,0.08)' : 'rgba(5,150,105,0.08)', color: row.isND ? '#B45309' : '#059669' }}>
                                                    {row.isND ? 'ND' : 'BIAT'}
                                                </span>
                                            </div>
                                        </td>
                                        {row.months.map((monthData, m) => (
                                            <td key={m} style={{ 
                                                padding: '4px 4px', 
                                                textAlign: 'center', 
                                                verticalAlign: 'top',
                                                background: monthData.isOutOfService ? '#F3F4F6' : 'transparent'
                                            }}>
                                                {monthData.ids.length === 0 ? (
                                                    <span style={{ color: '#D1D5DB', fontSize: '12px' }}>
                                                        {monthData.isOutOfService ? '×' : '—'}
                                                    </span>
                                                ) : (
                                                    monthData.ids.map((id, k) => (
                                                        <div key={k} style={{ 
                                                            fontSize: '9px', fontWeight: '700', fontFamily: 'var(--professional-font)',
                                                            padding: '3px 4px', borderRadius: '3px', marginBottom: monthData.ids.length > 1 ? '2px' : 0,
                                                            background: row.isND ? 'rgba(245,158,11,0.06)' : 'rgba(59,130,246,0.06)',
                                                            color: row.isND ? '#92400E' : '#1E40AF',
                                                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '90px',
                                                            cursor: 'default'
                                                        }} title={id}>
                                                            {id}
                                                        </div>
                                                    ))
                                                )}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                                {numberingMatrix.length === 0 && (
                                    <tr><td colSpan={13} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>Aucune facture pour cette ann&eacute;e</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {isModalOpen && (
                <FactureModal 
                    isOpen={isModalOpen} 
                    onClose={() => { setIsModalOpen(false); setFactureToEdit(null); setQuickInvoiceClient(null); setQuickInvoiceTargetDate(null); }} 
                    onSave={handleSaveFacture} 
                    factureToEdit={factureToEdit} 
                    targetClient={quickInvoiceClient} 
                    targetDate={quickInvoiceTargetDate}
                    clientsList={clients}
                />
            )}

            {previewFacture && (
                <InvoicePreviewModal 
                    isOpen={!!previewFacture} 
                    onClose={() => setPreviewFacture(null)} 
                    facture={previewFacture} 
                />
            )}
            
            <InvoiceAuditModal isOpen={isAuditModalOpen} onClose={() => setIsAuditModalOpen(false)} onRestoreAlert={handleRestoreAlert} />
            
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
