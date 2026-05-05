import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import InvoicePreviewModal from '../components/InvoicePreviewModal';
import { History, Search, Printer, Calendar, Undo2, ArrowUpRight, ArrowDownLeft, Landmark, FileText, FileSignature, AlertCircle, Users, RotateCcw, Lock, Bot, Activity } from 'lucide-react';
import { getFactures, saveFactures, getStorage, setStorage } from '../services/storageService';
import { api } from '../services/api';

const HistoriquePage = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [previewFacture, setPreviewFacture] = useState(null);
    const [activeTab, setActiveTab] = useState('Factures'); // 'Factures', 'Devis', 'Banque', 'Clients', 'Audit'
    const [ignoredTxs, setIgnoredTxs] = useState(() => getStorage('mynds_ignored_transactions', []));
    const [auditLog, setAuditLog] = useState({});
    const [loadingAudit, setLoadingAudit] = useState(false);

    const [factures, setFactures] = useState(() => {
        try {
            const allFactures = getFactures();
            const parsed = allFactures.filter(f => f.statut === 'Archived');
            return parsed.sort((a, b) => new Date(b.dateEmi) - new Date(a.dateEmi));
        } catch (e) {
            console.error("Erreur de chargement de l'historique des factures", e);
            return [];
        }
    });

    useEffect(() => {
        setStorage('mynds_ignored_transactions', ignoredTxs);
    }, [ignoredTxs]);

    useEffect(() => {
        const handleStorage = () => {
            const allFactures = getFactures();
            const parsed = allFactures.filter(f => f.statut === 'Archived');
            setFactures(parsed.sort((a, b) => new Date(b.dateEmi) - new Date(a.dateEmi)));
        };
        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, []);

    useEffect(() => {
        if (activeTab === 'Audit' && Object.keys(auditLog).length === 0) {
            loadAudit();
        }
    }, [activeTab]);

    const loadAudit = async () => {
        setLoadingAudit(true);
        try {
            const data = await api.get('/audit-history');
            setAuditLog(data || {});
        } catch (e) {
            console.error("Failed to load audit log", e);
        } finally {
            setLoadingAudit(false);
        }
    };

    const handlePrint = (facture) => {
        setPreviewFacture(facture);
    };

    const handleRestore = (id) => {
        if (window.confirm("Voulez-vous restaurer cette facture vers la vue principale ?")) {
            try {
                const allFactures = getFactures();
                if (allFactures.length > 0) {
                    const updatedFactures = allFactures.map(f => {
                        if (f.id === id) {
                            let newStatus = 'Sent';
                            if (f.echeance !== 'N/A' && new Date(f.echeance) < new Date()) {
                                newStatus = 'Late';
                            }
                            return { ...f, statut: newStatus };
                        }
                        return f;
                    });

                    saveFactures(updatedFactures);

                    // Update local state by removing it from the view
                    setFactures(factures.filter(f => f.id !== id));
                    alert("Facture restaurée avec succès.");
                }
            } catch (error) {
                console.error("Erreur lors de la restauration", error);
            }
        }
    };

    const formatMoney = (val) => new Intl.NumberFormat('fr-TN', { style: 'currency', currency: 'TND', minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(val);
    const formatNumber = (val) => new Intl.NumberFormat('fr-TN', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(val);

    const handleRestoreCharge = (id) => {
        if (window.confirm("Voulez-vous restaurer cette charge pour qu'elle réapparaisse dans la Banque ?")) {
            setIgnoredTxs(ignoredTxs.filter(item => item.id !== id));
            alert("Charge restaurée avec succès.");
        }
    };

    // Filtering logic
    const filteredFactures = factures.filter(f =>
        f.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.statut.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Global Stats for Historique
    const totalFacture = factures.reduce((acc, f) => acc + (f.montant || 0), 0);
    const totalEnCaisse = factures.filter(f => f.statut === 'Paid').reduce((acc, f) => acc + (f.montant || 0), 0);
    const countTotal = factures.length;
    const countAbonnement = factures.filter(f => f.lignes && f.lignes.some(l => l.desc.toLowerCase().includes('abonnement'))).length;

    const getStatusBadge = (status) => {
        switch (status) {
            case 'Paid': return <span style={{ color: 'var(--success)', fontWeight: '700', fontSize: '12px' }}>Payée</span>;
            case 'Sent': return <span style={{ color: 'var(--info)', fontWeight: '700', fontSize: '12px' }}>Envoyée</span>;
            case 'Late': return <span style={{ color: 'var(--danger)', fontWeight: '700', fontSize: '12px' }}>En retard</span>;
            case 'Draft': return <span style={{ color: 'var(--text-muted)', fontWeight: '700', fontSize: '12px' }}>Brouillon</span>;
            case 'Archived': return <span style={{ color: 'var(--text-muted)', fontWeight: '700', fontSize: '12px' }}>Archivée</span>;
            default: return status;
        }
    };

    return (
        <div>
            <Header title="Historique" subtitle="Registre complet des archives et événements passés" />

            {/* Tab Navigation */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                <button
                    onClick={() => setActiveTab('Factures')}
                    style={{
                        padding: '10px 24px',
                        borderRadius: '12px',
                        border: 'none',
                        background: activeTab === 'Factures' ? 'rgba(56, 189, 248, 0.1)' : 'transparent',
                        color: activeTab === 'Factures' ? '#0284c7' : 'var(--text-muted)',
                        fontSize: '14px',
                        fontWeight: '800',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}
                >
                    <FileText size={18} /> Factures
                </button>
                <div style={{ width: '1px', background: 'var(--border-color)', margin: '0 8px' }}></div>
                <button
                    onClick={() => setActiveTab('Devis')}
                    style={{
                        padding: '10px 24px',
                        borderRadius: '12px',
                        border: 'none',
                        background: activeTab === 'Devis' ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
                        color: activeTab === 'Devis' ? '#10b981' : 'var(--text-muted)',
                        fontSize: '14px',
                        fontWeight: '800',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}
                >
                    <FileSignature size={18} /> Devis
                </button>
                <div style={{ width: '1px', background: 'var(--border-color)', margin: '0 8px' }}></div>
                <button
                    onClick={() => setActiveTab('Banque')}
                    style={{
                        padding: '10px 24px',
                        borderRadius: '12px',
                        border: 'none',
                        background: activeTab === 'Banque' ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
                        color: activeTab === 'Banque' ? '#ef4444' : 'var(--text-muted)',
                        fontSize: '14px',
                        fontWeight: '800',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}
                >
                    <Landmark size={18} /> Banque & Charges
                </button>
                <div style={{ width: '1px', background: 'var(--border-color)', margin: '0 8px' }}></div>
                <button
                    onClick={() => setActiveTab('Clients')}
                    style={{
                        padding: '10px 24px',
                        borderRadius: '12px',
                        border: 'none',
                        background: activeTab === 'Clients' ? 'rgba(139, 92, 246, 0.1)' : 'transparent',
                        color: activeTab === 'Clients' ? '#8b5cf6' : 'var(--text-muted)',
                        fontSize: '14px',
                        fontWeight: '800',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}
                >
                    <Users size={18} /> Clients
                </button>
                <div style={{ width: '1px', background: 'var(--border-color)', margin: '0 8px' }}></div>
                <button
                    onClick={() => setActiveTab('Audit')}
                    style={{
                        padding: '10px 24px',
                        borderRadius: '12px',
                        border: 'none',
                        background: activeTab === 'Audit' ? 'rgba(245, 158, 11, 0.1)' : 'transparent',
                        color: activeTab === 'Audit' ? '#f59e0b' : 'var(--text-muted)',
                        fontSize: '14px',
                        fontWeight: '800',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}
                >
                    <Activity size={18} /> Journal Audit (PG)
                </button>
            </div>

            {activeTab === 'Factures' && (
                <>
                    {/* Synthese Rapide */}
                    <div className="card" style={{ marginBottom: '16px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--card-bg)' }}>
                        <div style={{ display: 'flex', gap: '32px' }}>
                            <div>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.5px', marginBottom: '4px' }}>Total Facturé HT</div>
                                <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-main)' }}>{formatMoney(totalFacture)}</div>
                            </div>
                            <div style={{ width: '1px', background: 'var(--border-color)' }}></div>
                            <div>
                                <div style={{ fontSize: '11px', color: 'var(--success)', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.5px', marginBottom: '4px' }}>Total Encaissé</div>
                                <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--success)' }}>{formatMoney(totalEnCaisse)}</div>
                            </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '600' }}><span style={{ color: 'var(--text-main)', fontWeight: '800' }}>{countTotal}</span> Documents émis</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Dont {countAbonnement} factures d'abonnement</div>
                        </div>
                    </div>

            {/* Recherche Compacte */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ position: 'relative', width: '300px' }}>
                    <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                        type="text"
                        placeholder="Rechercher (Client, Référence, Statut)..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ width: '100%', padding: '10px 16px 10px 36px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', fontSize: '13px', outline: 'none', color: 'var(--text-main)' }}
                    />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '13px', fontWeight: '500' }}>
                    <Calendar size={16} /> Trié par date décroissante
                </div>
            </div>

            {/* Table Minimaliste (Lecture Seule) */}
            <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ background: 'rgba(0,0,0,0.02)' }}>
                        <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            <th style={{ padding: '10px 16px', width: '40px' }}><History size={14} /></th>
                            <th style={{ padding: '10px 16px' }}>Référence</th>
                            <th style={{ padding: '10px 16px' }}>Client</th>
                            <th style={{ padding: '10px 16px' }}>Période Concernée</th>
                            <th style={{ padding: '10px 16px' }}>Mois Cible</th>
                            <th style={{ padding: '10px 16px' }}>Émission</th>
                            <th style={{ padding: '10px 16px', textAlign: 'right' }}>Montant TTC</th>
                            <th style={{ padding: '10px 16px', textAlign: 'center' }}>Statut</th>
                            <th style={{ padding: '10px 16px', textAlign: 'right' }}>Document</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredFactures.length > 0 ? (
                            filteredFactures.map((f, index) => (
                                <tr key={f.id + index} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.2s' }} onMouseOver={e => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.02)'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                                    <td style={{ padding: '8px 16px', fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>{factures.length - index}</td>
                                    <td style={{ padding: '8px 16px' }}>
                                        {f.id === 'non déclarée' || (f.id && f.id.startsWith('ND-')) ? (
                                            <span style={{ fontSize: '10px', color: 'var(--danger)', fontWeight: '800', background: 'rgba(239, 68, 68, 0.08)', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase' }}>ND</span>
                                        ) : (
                                            <span style={{ fontSize: '12px', color: 'var(--text-main)', fontWeight: '600', fontFamily: 'monospace' }}>{f.id}</span>
                                        )}
                                    </td>
                                    <td style={{ padding: '8px 16px', fontWeight: '700', color: 'var(--text-main)', fontSize: '13px' }}>{f.client}</td>
                                    <td style={{ padding: '8px 16px', color: 'var(--text-muted)', fontSize: '12px' }}>
                                        {(f.periodeDebut && f.periodeFin) ? (
                                            <div style={{ background: 'rgba(15, 23, 42, 0.04)', padding: '2px 6px', borderRadius: '4px', display: 'inline-block' }}>
                                                {new Date(f.periodeDebut).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })} - {new Date(f.periodeFin).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                                            </div>
                                        ) : (
                                            <span style={{ fontStyle: 'italic', opacity: 0.5 }}>NC</span>
                                        )}
                                    </td>
                                    <td style={{ padding: '8px 16px', color: 'var(--text-main)', fontSize: '12px', fontWeight: '600', textTransform: 'capitalize' }}>
                                        {f.periodeFin ? new Date(f.periodeFin).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }) : new Date(f.dateEmi).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}
                                    </td>
                                    <td style={{ padding: '8px 16px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: '500' }}>{new Date(f.dateEmi).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                    <td style={{ padding: '8px 16px', textAlign: 'right', fontWeight: '800', color: 'var(--text-main)', fontSize: '13px' }}>{formatNumber(f.montant)}</td>
                                    <td style={{ padding: '8px 16px', textAlign: 'center' }}>
                                        {getStatusBadge(f.statut)}
                                    </td>
                                    <td style={{ padding: '8px 16px', textAlign: 'right' }}>
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                                            <button
                                                onClick={() => handleRestore(f.id)}
                                                title="Restaurer à la vue principale"
                                                style={{ background: 'var(--bg-main)', border: '1px solid var(--border-color)', padding: '6px', borderRadius: '6px', cursor: 'pointer', color: 'var(--text-muted)', transition: 'all 0.2s', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                                                onMouseOver={e => { e.currentTarget.style.color = 'var(--text-main)'; e.currentTarget.style.borderColor = 'var(--text-main)' }}
                                                onMouseOut={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border-color)' }}
                                            >
                                                <Undo2 size={14} />
                                            </button>
                                            <button
                                                onClick={() => handlePrint(f)}
                                                title="Voir PDF"
                                                style={{ background: 'var(--bg-main)', border: '1px solid var(--border-color)', padding: '6px', borderRadius: '6px', cursor: 'pointer', color: 'var(--text-main)', transition: 'all 0.2s', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                                                onMouseOver={e => { e.currentTarget.style.color = 'var(--accent-gold)'; e.currentTarget.style.borderColor = 'var(--accent-gold)' }}
                                                onMouseOut={e => { e.currentTarget.style.color = 'var(--text-main)'; e.currentTarget.style.borderColor = 'var(--border-color)' }}
                                            >
                                                <Printer size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="8" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>Aucune facture trouvée dans l'historique.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            </>
            )}

            {activeTab === 'Devis' && (
                <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <AlertCircle size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
                    <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '8px' }}>Historique des Devis</h3>
                    <p style={{ fontSize: '13px', maxWidth: '400px', margin: '0 auto' }}>L'historique des devis archivés ou refusés apparaîtra ici. Interface en cours de connexion.</p>
                </div>
            )}

            {activeTab === 'Banque' && (
                <>
                <div style={{ marginBottom: '16px', color: 'var(--text-muted)', fontSize: '13px' }}>
                    Retrouvez ici toutes les transactions et charges que vous avez masquées du tableau de bord principal. 
                    Vous pouvez les restaurer à tout moment pour qu'elles soient à nouveau comptabilisées.
                </div>
                <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead style={{ background: 'rgba(0,0,0,0.02)' }}>
                            <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                <th style={{ padding: '10px 16px' }}>Date</th>
                                <th style={{ padding: '10px 16px' }}>Opération</th>
                                <th style={{ padding: '10px 16px' }}>Type & Nature</th>
                                <th style={{ padding: '10px 16px' }}>Mois Cible</th>
                                <th style={{ padding: '10px 16px', textAlign: 'right' }}>Montant</th>
                                <th style={{ padding: '10px 16px', textAlign: 'center' }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {ignoredTxs.length > 0 ? (
                                ignoredTxs.map((t) => (
                                    <tr key={t.id} style={{ borderBottom: '1px solid var(--border-color)', background: 'white' }} className="table-row-hover">
                                        <td style={{ padding: '8px 16px', fontSize: '11px', color: 'var(--text-muted)', fontWeight: '500' }}>
                                            {t.date ? new Date(t.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) : '-'}
                                        </td>
                                        <td style={{ padding: '8px 16px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <div style={{ fontWeight: '700', color: 'var(--text-main)', fontSize: '12px' }}>{t.desc}</div>
                                                {t.isDraft && (
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '2px', background: 'rgba(245, 158, 11, 0.1)', color: '#d97706', padding: '1px 4px', borderRadius: '4px', fontSize: '8px', fontWeight: '800', textTransform: 'uppercase' }}>
                                                        Brouillon
                                                    </span>
                                                )}
                                                {t.isAuto && (
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '2px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '1px 4px', borderRadius: '4px', fontSize: '8px', fontWeight: '800', textTransform: 'uppercase' }}>
                                                        <Bot size={10} /> Auto
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td style={{ padding: '8px 16px', fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)' }}>
                                            {t.chargeType || t.category} <span style={{ opacity: 0.5, fontWeight: '400', fontSize: '10px' }}>{t.chargeNature ? `(${t.chargeNature})` : ''}</span>
                                        </td>
                                        <td style={{ padding: '8px 16px', fontSize: '11px', color: 'var(--text-muted)' }}>
                                            {t.serviceMonth || '-'}
                                        </td>
                                        <td style={{ padding: '8px 16px', textAlign: 'right' }}>
                                            <div style={{ fontWeight: '800', fontSize: '12px', color: 'var(--text-muted)' }}>
                                                {t.type === 'Debit' ? '-' : '+'}{formatMoney(t.amount)}
                                            </div>
                                        </td>
                                        <td style={{ padding: '8px 16px', textAlign: 'center' }}>
                                            <button 
                                                onClick={() => handleRestoreCharge(t.id)} 
                                                title="Restaurer cette charge pour la Banque" 
                                                style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: '800', cursor: 'pointer', transition: 'all 0.2s', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                                onMouseOver={e => e.currentTarget.style.background = 'rgba(16, 185, 129, 0.2)'}
                                                onMouseOut={e => e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)'}
                                            >
                                                <RotateCcw size={14} /> Restaurer
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>Aucune charge ignorée.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                </>
            )}

            {activeTab === 'Audit' && (
                <div className="card" style={{ padding: '0', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                    <div style={{ padding: '16px', background: 'rgba(245, 158, 11, 0.05)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontWeight: '800', color: '#b45309', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Activity size={18} /> Historique des Synchronisations PostgreSQL
                        </div>
                        <button onClick={loadAudit} style={{ background: 'white', border: '1px solid #d1d5db', padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>Rafraîchir</button>
                    </div>
                    {loadingAudit ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Chargement du journal...</div>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                             <thead style={{ background: 'rgba(0,0,0,0.02)', textAlign: 'left' }}>
                                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '10px', textTransform: 'uppercase' }}>
                                    <th style={{ padding: '12px 16px' }}>Clé Événement</th>
                                    <th style={{ padding: '12px 16px' }}>Date de Sync</th>
                                    <th style={{ padding: '12px 16px' }}>Statut</th>
                                    <th style={{ padding: '12px 16px' }}>Détails / Raison</th>
                                </tr>
                             </thead>
                             <tbody>
                                {Object.entries(auditLog).length > 0 ? (
                                    Object.entries(auditLog).sort((a,b) => new Date(b[1].date) - new Date(a[1].date)).map(([key, val]) => (
                                        <tr key={key} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '13px' }}>
                                            <td style={{ padding: '12px 16px', fontWeight: '700', color: 'var(--text-main)', fontFamily: 'monospace' }}>{key}</td>
                                            <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{new Date(val.date).toLocaleString('fr-FR')}</td>
                                            <td style={{ padding: '12px 16px' }}>
                                                <span style={{ 
                                                    background: val.status === 'Synced' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                                    color: val.status === 'Synced' ? '#10b981' : '#ef4444',
                                                    padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '800'
                                                }}>{val.status}</span>
                                            </td>
                                            <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{val.reason || 'Sychronisation réussie.'}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr><td colSpan="4" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Aucun journal d'audit disponible.</td></tr>
                                )}
                             </tbody>
                        </table>
                    )}
                </div>
            )}

            <InvoicePreviewModal
                isOpen={!!previewFacture}
                onClose={() => setPreviewFacture(null)}
                facture={previewFacture}
            />
        </div>
    );
};

export default HistoriquePage;
