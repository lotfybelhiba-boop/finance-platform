import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import { Search, Plus, Trash2, Filter, ArrowUpRight, CreditCard, Heart, MoreHorizontal, EyeOff, LayoutGrid } from 'lucide-react';
import { getBankTransactions, saveBankTransactions, getStorage, setStorage } from '../services/storageService';
import { generatePendingPersoCharges, PERSO_CATEGORIES } from '../utils/persoUtils';
import ImportChargesModal from '../components/ImportChargesModal';

const ViePersoPage = () => {
    const [transactions, setTransactions] = useState(() => getBankTransactions());
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState(null);
    const [ignoredTxs, setIgnoredTxs] = useState(() => getStorage('mynds_ignored_transactions', []));
    const [showHistory, setShowHistory] = useState(false);

    // Initial load and sync
    useEffect(() => {
        generatePendingPersoCharges();
        const syncData = () => {
            setTransactions(getBankTransactions());
            setIgnoredTxs(getStorage('mynds_ignored_transactions', []));
        };
        window.addEventListener('storage', syncData);
        return () => window.removeEventListener('storage', syncData);
    }, []);

    useEffect(() => {
        setStorage('mynds_ignored_transactions', ignoredTxs);
    }, [ignoredTxs]);

    const formatMoney = (amount) => {
        return new Intl.NumberFormat('fr-TN', { style: 'currency', currency: 'TND', minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(amount);
    };

    const handleSave = (t) => {
        const newTxs = editingTransaction && editingTransaction.id !== undefined
            ? transactions.map(item => item.id === t.id ? t : item)
            : [...transactions, { ...t, id: Date.now() }];
        
        setTransactions(newTxs);
        saveBankTransactions(newTxs);
        setIsModalOpen(false);
        setEditingTransaction(null);

        // Auto-save recurrent config if needed
        if (t.isRecurrent) {
            const configs = getStorage('mynds_perso_config', []);
            if (!configs.some(c => c.name === t.desc && c.category === t.persoCategory)) {
                const newConfig = {
                    id: Date.now(),
                    name: t.desc,
                    amount: t.amount,
                    category: t.persoCategory,
                    day: new Date(t.date).getDate(),
                    bank: t.bank,
                    active: true
                };
                setStorage('mynds_perso_config', [...configs, newConfig]);
            }
        }
    };

    const handleImportSave = (imported) => {
        const newTxs = [...transactions, ...imported];
        setTransactions(newTxs);
        saveBankTransactions(newTxs);
        setIsImportModalOpen(false);
    };

    const handleDelete = (id) => {
        if (window.confirm("Supprimer définitivement ?")) {
            const newTxs = transactions.filter(t => t.id !== id);
            setTransactions(newTxs);
            saveBankTransactions(newTxs);
        }
    };

    const toggleIgnore = (t) => {
        const alreadyIgnored = ignoredTxs.some(item => item.id === t.id);
        if (alreadyIgnored) {
            setIgnoredTxs(ignoredTxs.filter(item => item.id !== t.id));
        } else {
            setIgnoredTxs([...ignoredTxs, t]);
        }
    };

    const persoTransactions = transactions
        .filter(t => t.category === 'Perso' && !ignoredTxs.some(i => i.id === t.id))
        .filter(t => (t.desc || '').toLowerCase().includes(searchTerm.toLowerCase()))
        .sort((a,b) => new Date(b.date) - new Date(a.date));

    const totalStats = PERSO_CATEGORIES.map(cat => ({
        name: cat,
        total: persoTransactions.filter(t => t.persoCategory === cat).reduce((acc, t) => acc + (parseFloat(t.amount) || 0), 0)
    })).filter(s => s.total > 0).sort((a,b) => b.total - a.total);

    const totalPersoMonth = persoTransactions.reduce((acc, t) => acc + (parseFloat(t.amount) || 0), 0);

    return (
        <div style={{ padding: '0 24px' }}>
            <Header showMonthSelector={false} title="Vie Personnelle" subtitle="Gestion des dépenses privées" />

            {/* Resume Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '24px', marginBottom: '24px' }}>
                <div style={{ background: 'var(--text-main)', padding: '24px', borderRadius: '24px', color: 'white', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ fontSize: '12px', fontWeight: '800', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', marginBottom: '8px' }}>Dépenses Personnelles (Période Courante)</div>
                    <div style={{ fontSize: '36px', fontWeight: '900' }}>{formatMoney(totalPersoMonth)}</div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                         <span style={{ fontSize: '10px', background: 'rgba(255,255,255,0.1)', padding: '4px 10px', borderRadius: '8px', fontWeight: '700' }}>Compte QNB Principal</span>
                         <span style={{ fontSize: '10px', background: 'rgba(255,193,5,0.2)', padding: '4px 10px', borderRadius: '8px', fontWeight: '700', color: '#FFC105' }}>Privé & Familial</span>
                    </div>
                </div>

                <div style={{ background: 'white', padding: '24px', borderRadius: '24px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column' }}>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                        <LayoutGrid size={20} color="#64748b" />
                        <h3 style={{ fontSize: '14px', fontWeight: '900', color: 'var(--text-main)', margin: 0 }}>Répartition par Catégorie</h3>
                     </div>
                     <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', maxHeight: '120px' }}>
                        {totalStats.length > 0 ? totalStats.map(s => (
                            <div key={s.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                                <span style={{ fontWeight: '600', color: 'var(--text-muted)' }}>{s.name}</span>
                                <span style={{ fontWeight: '800', color: 'var(--text-main)' }}>{formatMoney(s.total)}</span>
                            </div>
                        )) : <div style={{ fontSize: '12px', color: '#cbd5e1', fontStyle: 'italic' }}>Aucune donnée de dépense</div>}
                     </div>
                </div>
            </div>

            {/* Main Table Card */}
            <div className="card">
                <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ position: 'relative' }}>
                        <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                            type="text"
                            placeholder="Rechercher une dépense..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ padding: '8px 12px 8px 36px', borderRadius: '12px', border: '1px solid var(--border-color)', outline: 'none', width: '250px', fontSize: '13px' }}
                        />
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={() => setIsImportModalOpen(true)} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <ArrowUpRight size={16} /> Importer
                        </button>
                        <button onClick={() => { setEditingTransaction(null); setIsModalOpen(true); }} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Plus size={16} /> Nouvelle Dépense
                        </button>
                    </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table className="clean-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Désignation</th>
                                <th>Catégorie</th>
                                <th>Banque</th>
                                <th className="text-right">Montant</th>
                                <th className="text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {persoTransactions.length === 0 ? (
                                <tr><td colSpan="6" className="text-center" style={{ padding: '40px', color: 'var(--text-muted)' }}>Aucune dépense personnelle trouvée.</td></tr>
                            ) : (
                                persoTransactions.map((t) => (
                                    <tr key={t.id}>
                                        <td className="clean-secondary-text">{new Date(t.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div className="clean-primary-text">{t.desc}</div>
                                                {t.isAuto && <span className="status-paid" style={{ fontSize: '9px' }}>PRÉVU</span>}
                                            </div>
                                        </td>
                                        <td className="clean-secondary-text">
                                            <span style={{ background: 'rgba(139, 92, 246, 0.08)', color: '#8b5cf6', padding: '2px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '800' }}>{t.persoCategory || 'Autre'}</span>
                                        </td>
                                        <td className="clean-secondary-text">{t.bank}</td>
                                        <td className="text-right" style={{ fontWeight: '800', color: '#1e293b' }}>{formatMoney(t.amount)}</td>
                                        <td className="text-center">
                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                <button onClick={() => { setEditingTransaction(t); setIsModalOpen(true); }} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><MoreHorizontal size={16} /></button>
                                                <button onClick={() => toggleIgnore(t)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', opacity: 0.6 }}><Trash2 size={16} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* History Section */}
            <div style={{ marginTop: '32px', textAlign: 'center', marginBottom: '60px' }}>
                <button onClick={() => setShowHistory(!showHistory)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '12px', fontWeight: '700', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                    <EyeOff size={14} /> {showHistory ? 'Masquer l\'historique' : 'Voir les éléments archivés'}
                </button>
            </div>

            {isModalOpen && (
                <PersoTransactionModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleSave}
                    transaction={editingTransaction}
                />
            )}

            {isImportModalOpen && (
                <ImportChargesModal
                    isOpen={isImportModalOpen}
                    onClose={() => setIsImportModalOpen(false)}
                    onSave={handleImportSave}
                    existingTransactions={transactions}
                    importCategory="Perso"
                />
            )}
        </div>
    );
};

const PersoTransactionModal = ({ isOpen, onClose, onSave, transaction }) => {
    const [formData, setFormData] = useState(transaction || {
        date: new Date().toISOString().split('T')[0],
        desc: '',
        bank: 'QNB',
        type: 'Debit',
        amount: 0,
        category: 'Perso',
        persoCategory: 'Autre',
        isRecurrent: false
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }} onClick={onClose}>
            <div className="card" style={{ width: '100%', maxWidth: '420px', padding: 0, position: 'relative', background: 'white', borderRadius: '24px', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
                <div style={{ padding: '20px 24px', background: '#f59e0b10', borderBottom: '1px dashed #f59e0b30', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ background: '#f59e0b', color: 'white', padding: '8px', borderRadius: '12px', display: 'flex' }}>
                         <Heart size={20} />
                    </div>
                    <div>
                        <h2 style={{ fontSize: '16px', fontWeight: '900', color: 'var(--text-main)', margin: 0 }}>Dépense Personnelle</h2>
                        <div style={{ fontSize: '10px', fontWeight: '700', color: '#f59e0b', textTransform: 'uppercase', marginTop: '2px' }}>Mode Vie Privée</div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <label style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Date</label>
                            <input type="date" required value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} style={{ padding: '10px', borderRadius: '12px', border: '1px solid var(--border-color)', fontSize: '13px', fontWeight: '600' }} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <label style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Catégorie</label>
                            <select value={formData.persoCategory} onChange={e => setFormData({ ...formData, persoCategory: e.target.value })} style={{ padding: '10px', borderRadius: '12px', border: '1px solid var(--border-color)', fontSize: '13px', fontWeight: '600' }}>
                                {PERSO_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                            </select>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Désignation</label>
                        <input type="text" required placeholder="Loyer maison, Courses, Shopping..." value={formData.desc} onChange={e => setFormData({ ...formData, desc: e.target.value })} style={{ padding: '10px', borderRadius: '12px', border: '1px solid var(--border-color)', fontSize: '13px', fontWeight: '600' }} />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '12px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <label style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Banque</label>
                            <select value={formData.bank} onChange={e => setFormData({ ...formData, bank: e.target.value })} style={{ padding: '10px', borderRadius: '12px', border: '1px solid var(--border-color)', fontSize: '13px', fontWeight: '800' }}>
                                <option value="QNB">QNB (Perso)</option>
                                <option value="BIAT">BIAT (Société)</option>
                                <option value="Espèces">Espèces</option>
                                <option value="Capital Personnel">Capital Personnel</option>
                            </select>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <label style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Montant (TND)</label>
                            <input type="number" step="0.001" required value={formData.amount || ''} onChange={e => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })} style={{ padding: '10px', borderRadius: '12px', border: '2px solid #f59e0b40', fontSize: '16px', fontWeight: '900', textAlign: 'right' }} />
                        </div>
                    </div>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: '700', color: 'var(--text-main)', padding: '4px' }}>
                        <input type="checkbox" checked={formData.isRecurrent} onChange={e => setFormData({ ...formData, isRecurrent: e.target.checked })} style={{ width: '18px', height: '18px', accentColor: '#f59e0b' }} />
                        Enregistrer comme dépense récurrente
                    </label>

                    <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                        <button type="button" onClick={onClose} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'transparent', fontWeight: '800', cursor: 'pointer' }}>Annuler</button>
                        <button type="submit" style={{ flex: 1.5, padding: '12px', borderRadius: '12px', border: 'none', background: '#f59e0b', color: 'white', fontWeight: '900', cursor: 'pointer' }}>Sauvegarder</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ViePersoPage;
