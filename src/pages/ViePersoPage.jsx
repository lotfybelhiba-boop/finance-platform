import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import { Search, Plus, Trash2, Filter, ArrowUpRight, CreditCard, Heart, MoreHorizontal, EyeOff, LayoutGrid } from 'lucide-react';
import { getBankTransactions, saveBankTransactions, getStorage, setStorage } from '../services/storageService';
import { generatePendingPersoCharges, PERSO_CATEGORIES } from '../utils/persoUtils';
import PremiumImportModal from '../components/PremiumImportModal';
import { useData } from '../context/DataContext';

const ViePersoPage = () => {
    const { 
        bankTransactions: transactions, 
        addBankTransaction, 
        updateBankTransaction, 
        deleteBankTransaction,
        loading 
    } = useData();
    
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState(null);
    const [ignoredTxs, setIgnoredTxs] = useState(() => getStorage('mynds_ignored_transactions', []));
    const [showHistory, setShowHistory] = useState(false);
    const [expandedYears, setExpandedYears] = useState({ [new Date().getFullYear()]: true });
    const [expandedMonths, setExpandedMonths] = useState({});

    const toggleYear = (year) => {
        setExpandedYears(prev => ({ ...prev, [year]: !prev[year] }));
    };

    const toggleMonth = (year, month) => {
        const key = `${year}-${month}`;
        setExpandedMonths(prev => ({ ...prev, [key]: !prev[key] }));
    };

    // Initial load and sync
    useEffect(() => {
        // NOTE: generatePendingPersoCharges() is currently disabled/legacy
        // In a full PG architecture, this logic should move to the backend or DataContext
    }, []);

    useEffect(() => {
        setStorage('mynds_ignored_transactions', ignoredTxs);
    }, [ignoredTxs]);

    const formatMoney = (amount) => {
        if (amount === undefined || amount === null) return '0 DT';
        const formatted = new Intl.NumberFormat('fr-FR', {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1
        }).format(amount);
        return `${formatted} DT`;
    };

    const handleQuickBankChange = async (t) => {
        const banks = ['QNB', 'BIAT', 'UBCI', 'Espèces', 'Capital Personnel'];
        const currentIndex = banks.indexOf(t.bank || 'QNB');
        const nextIndex = (currentIndex + 1) % banks.length;
        const nextBank = banks[nextIndex];

        await updateBankTransaction(t.id, { ...t, bank: nextBank });
    };

    const handleSave = async (t) => {
        try {
            if (editingTransaction && editingTransaction.id !== undefined) {
                await updateBankTransaction(editingTransaction.id, t);
            } else {
                await addBankTransaction({ ...t, category: 'Perso' });
            }
            
            setIsModalOpen(false);
            setEditingTransaction(null);

            // Auto-save recurrent config if needed
            if (t.isRecurrent) {
                const configs = getStorage('mynds_perso_config', []);
                if (!configs.some(c => c.name === (t.desc || t.description) && c.category === t.persoCategory)) {
                    const newConfig = {
                        id: Date.now(),
                        name: t.desc || t.description,
                        amount: t.amount,
                        category: t.persoCategory,
                        day: new Date(t.date).getDate(),
                        bank: t.bank,
                        active: true
                    };
                    setStorage('mynds_perso_config', [...configs, newConfig]);
                }
            }
        } catch (err) {
            alert('Erreur lors de la sauvegarde : ' + err.message);
        }
    };

    const handleImportSave = async (imported) => {
        try {
            for (const item of imported) {
                await addBankTransaction({ ...item, category: 'Perso' });
            }
            setIsImportModalOpen(false);
        } catch (err) {
            alert('Erreur lors de l\'import : ' + err.message);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("Supprimer définitivement ?")) {
            try {
                await deleteBankTransaction(id);
            } catch (err) {
                alert('Erreur lors de la suppression : ' + err.message);
            }
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

    // Grouping by year and then month
    const groupedData = persoTransactions.reduce((acc, t) => {
        const date = new Date(t.date);
        const year = date.getFullYear() || 'Sans Date';
        const month = date.getMonth(); // 0-11
        
        if (!acc[year]) acc[year] = {};
        if (!acc[year][month]) acc[year][month] = [];
        
        acc[year][month].push(t);
        return acc;
    }, {});

    const sortedYears = Object.keys(groupedData).sort((a, b) => b - a);

    const getMonthName = (monthIdx) => {
        return new Intl.DateTimeFormat('fr-FR', { month: 'long' }).format(new Date(2000, monthIdx, 1));
    };

    const totalStats = PERSO_CATEGORIES.map(cat => ({
        name: cat,
        total: persoTransactions.filter(t => t.persoCategory === cat).reduce((acc, t) => acc + (parseFloat(t.amount) || 0), 0)
    })).filter(s => s.total > 0).sort((a,b) => b.total - a.total);

    const totalPersoMonth = persoTransactions.reduce((acc, t) => acc + (parseFloat(t.amount) || 0), 0);


    return (
        <div style={{ padding: '0 24px' }}>
            <Header showMonthSelector={false} title="Vie Personnelle" subtitle="Gestion des dépenses privées" />

            {/* Resume Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px', marginBottom: '32px' }}>
                <div style={{ 
                    background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', 
                    padding: '32px', 
                    borderRadius: '28px', 
                    color: 'white', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    justifyContent: 'center',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '150px', height: '150px', background: 'rgba(255,255,255,0.03)', borderRadius: '50%' }}></div>
                    <div style={{ fontSize: '11px', fontWeight: '800', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>Total Dépenses Privées</div>
                    <div style={{ fontSize: '42px', fontWeight: '900', letterSpacing: '-1px' }}>{formatMoney(totalPersoMonth)}</div>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
                         <div style={{ fontSize: '10px', background: 'rgba(255,255,255,0.08)', padding: '6px 14px', borderRadius: '10px', fontWeight: '800', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(4px)' }}>Compte QNB Principal</div>
                         <div style={{ fontSize: '10px', background: 'rgba(245,158,11,0.15)', padding: '6px 14px', borderRadius: '10px', fontWeight: '800', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.2)' }}>Dashboard Privé</div>
                    </div>
                </div>

                <div style={{ 
                    background: 'white', 
                    padding: '24px', 
                    borderRadius: '28px', 
                    border: '1px solid var(--border-color)', 
                    display: 'flex', 
                    flexDirection: 'column',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.02)'
                }}>
                     <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <LayoutGrid size={18} />
                            </div>
                            <h3 style={{ fontSize: '15px', fontWeight: '900', color: 'var(--text-main)', margin: 0 }}>Par Catégorie</h3>
                        </div>
                        <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)' }}>Top 5</div>
                     </div>
                     <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', maxHeight: '140px', paddingRight: '4px' }}>
                        {totalStats.length > 0 ? totalStats.slice(0, 5).map((s, idx) => (
                            <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: ['#8b5cf6', '#f59e0b', '#3b82f6', '#10b981', '#ef4444'][idx % 5] }}></div>
                                <div style={{ flex: 1, fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>{s.name}</div>
                                <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-main)' }}>{formatMoney(s.total)}</div>
                            </div>
                        )) : <div style={{ textAlign: 'center', padding: '20px', fontSize: '12px', color: '#cbd5e1', fontStyle: 'italic' }}>Aucune donnée</div>}
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
                    <table className="clean-table" style={{ borderCollapse: 'separate', borderSpacing: '0 4px' }}>
                        <thead>
                            <tr style={{ background: 'transparent' }}>
                                <th style={{ padding: '8px 24px', fontSize: '10px' }}>Date</th>
                                <th style={{ padding: '8px 24px', fontSize: '10px' }}>Désignation</th>
                                <th style={{ padding: '8px 24px', fontSize: '10px' }}>Catégorie</th>
                                <th style={{ padding: '8px 24px', fontSize: '10px' }}>Banque</th>
                                <th className="text-right" style={{ padding: '8px 24px', fontSize: '10px' }}>Montant</th>
                                <th className="text-center" style={{ padding: '8px 24px', fontSize: '10px' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedYears.length === 0 ? (
                                <tr><td colSpan="6" className="text-center" style={{ padding: '40px', color: 'var(--text-muted)' }}>Aucune dépense personnelle trouvée.</td></tr>
                            ) : (
                                sortedYears.map(year => (
                                    <React.Fragment key={year}>
                                        <tr 
                                            onClick={() => toggleYear(year)}
                                            style={{ 
                                                background: 'rgba(15, 23, 42, 0.05)', 
                                                cursor: 'pointer',
                                                userSelect: 'none'
                                            }}
                                        >
                                            <td colSpan="6" style={{ padding: '2px 24px', fontSize: '9px', fontWeight: '900', color: 'var(--text-main)', borderRadius: '4px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span style={{ 
                                                        display: 'inline-block', 
                                                        transform: expandedYears[year] ? 'rotate(90deg)' : 'rotate(0deg)',
                                                        transition: 'transform 0.2s',
                                                        fontSize: '7px'
                                                    }}>▶</span>
                                                    ANNÉE {year}
                                                </div>
                                            </td>
                                        </tr>
                                        {expandedYears[year] && Object.keys(groupedData[year]).sort((a,b) => b-a).map(month => (
                                            <React.Fragment key={`${year}-${month}`}>
                                                <tr 
                                                    onClick={(e) => { e.stopPropagation(); toggleMonth(year, month); }}
                                                    style={{ 
                                                        background: 'rgba(15, 23, 42, 0.02)', 
                                                        cursor: 'pointer',
                                                        userSelect: 'none'
                                                    }}
                                                >
                                                    <td colSpan="6" style={{ padding: '2px 32px', fontSize: '9px', fontWeight: '800', color: 'var(--text-muted)' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                            <span style={{ 
                                                                display: 'inline-block', 
                                                                transform: expandedMonths[`${year}-${month}`] ? 'rotate(90deg)' : 'rotate(0deg)',
                                                                transition: 'transform 0.2s',
                                                                fontSize: '6px'
                                                            }}>▶</span>
                                                            {getMonthName(month).toUpperCase()}
                                                            <span style={{ fontSize: '8px', opacity: 0.5 }}>({groupedData[year][month].length})</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                                {expandedMonths[`${year}-${month}`] && groupedData[year][month].map((t) => (
                                                    <tr key={t.id} style={{ transition: 'all 0.2s', borderBottom: '1px solid rgba(0,0,0,0.01)' }}>
                                                        <td style={{ padding: '4px 24px' }}>
                                                            <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)' }}>{new Date(t.date).toLocaleDateString('fr-FR', { day: '2-digit' })}</div>
                                                        </td>
                                                        <td style={{ padding: '4px 24px' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-main)' }}>{t.desc}</div>
                                                                {t.isAuto && <span style={{ fontSize: '6px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '0 2px', borderRadius: '2px', fontWeight: '900' }}>R</span>}
                                                            </div>
                                                        </td>
                                                        <td style={{ padding: '4px 24px' }}>
                                                            <span style={{ 
                                                                background: 'rgba(139, 92, 246, 0.03)', 
                                                                color: '#8b5cf6', 
                                                                padding: '1px 5px', 
                                                                borderRadius: '4px', 
                                                                fontSize: '8px', 
                                                                fontWeight: '800'
                                                            }}>
                                                                {t.persoCategory || 'Autre'}
                                                            </span>
                                                        </td>
                                                        <td style={{ padding: '4px 24px' }}>
                                                            <select 
                                                                value={t.bank || 'QNB'} 
                                                                onChange={async (e) => {
                                                                    const nextBank = e.target.value;
                                                                    await updateBankTransaction(t.id, { ...t, bank: nextBank });
                                                                }}
                                                                style={{ 
                                                                    background: 'rgba(59, 130, 246, 0.04)', 
                                                                    color: '#3b82f6', 
                                                                    padding: '0 4px', 
                                                                    borderRadius: '4px', 
                                                                    fontSize: '9px', 
                                                                    fontWeight: '900',
                                                                    border: 'none',
                                                                    cursor: 'pointer',
                                                                    outline: 'none'
                                                                }}
                                                            >
                                                                <option value="QNB">QNB</option>
                                                                <option value="BIAT">BIAT</option>
                                                                <option value="UBCI">UBCI</option>
                                                                <option value="Espèces">Cash</option>
                                                                <option value="Capital Personnel">Dotation</option>
                                                            </select>
                                                        </td>
                                                        <td className="text-right" style={{ padding: '4px 24px', fontSize: '12px', fontWeight: '900', color: 'var(--text-main)' }}>
                                                            {formatMoney(t.amount)}
                                                        </td>
                                                        <td className="text-center" style={{ padding: '4px 24px' }}>
                                                            <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                                                                <button 
                                                                    onClick={() => { setEditingTransaction(t); setIsModalOpen(true); }} 
                                                                    style={{ width: '20px', height: '20px', borderRadius: '4px', background: 'rgba(0,0,0,0.02)', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                                >
                                                                    <MoreHorizontal size={10} />
                                                                </button>
                                                                <button 
                                                                    onClick={() => toggleIgnore(t)} 
                                                                    style={{ width: '20px', height: '20px', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.02)', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                                >
                                                                    <Trash2 size={10} />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </React.Fragment>
                                        ))}
                                    </React.Fragment>
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
                <PremiumImportModal
                    isOpen={isImportModalOpen}
                    onClose={() => setIsImportModalOpen(false)}
                    onSave={handleImportSave}
                    existingTransactions={transactions}
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
            <div className="card" style={{ width: '100%', maxWidth: '440px', padding: 0, position: 'relative', background: 'white', borderRadius: '32px', overflow: 'hidden', boxShadow: '0 30px 60px rgba(15, 23, 42, 0.2)' }} onClick={e => e.stopPropagation()}>
                <div style={{ padding: '24px 32px', background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)', borderBottom: '1px solid rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ background: 'rgba(255,255,255,0.2)', color: 'white', padding: '10px', borderRadius: '14px', display: 'flex', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.3)' }}>
                             <Heart size={22} fill="white" />
                        </div>
                        <div>
                            <h2 style={{ fontSize: '18px', fontWeight: '900', color: 'white', margin: 0, letterSpacing: '-0.5px' }}>{transaction ? 'Modifier la dépense' : 'Nouvelle dépense'}</h2>
                            <div style={{ fontSize: '11px', fontWeight: '800', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Gestion Vie Privée</div>
                        </div>
                    </div>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'white', animation: 'pulse 2s infinite' }}></div>
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

                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Compte Bancaire</label>
                            <select value={formData.bank} onChange={e => setFormData({ ...formData, bank: e.target.value })} style={{ padding: '12px 16px', borderRadius: '14px', border: '1px solid var(--border-color)', fontSize: '14px', fontWeight: '800', background: 'var(--bg-main)', outline: 'none', cursor: 'pointer' }}>
                                <option value="QNB">QNB (Principal)</option>
                                <option value="BIAT">BIAT (Société)</option>
                                <option value="UBCI">UBCI</option>
                                <option value="Espèces">Espèces</option>
                                <option value="Capital Personnel">Dotation</option>
                            </select>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Montant</label>
                            <div style={{ position: 'relative' }}>
                                <input 
                                    type="number" 
                                    step="0.001" 
                                    required 
                                    value={formData.amount || ''} 
                                    onChange={e => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })} 
                                    style={{ width: '100%', padding: '12px 16px', borderRadius: '14px', border: '2px solid #f59e0b30', fontSize: '18px', fontWeight: '900', color: '#f59e0b', textAlign: 'right', outline: 'none', background: 'rgba(245,158,11,0.02)' }} 
                                />
                                <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', fontWeight: '900', color: '#f59e0b' }}>DT</span>
                            </div>
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
