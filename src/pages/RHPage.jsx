import React, { useState, useEffect, useMemo } from 'react';
import { 
    Users, 
    DollarSign, 
    TrendingUp, 
    UserCheck, 
    Search, 
    Plus, 
    Calendar, 
    Edit, 
    Trash2, 
    CheckCircle2, 
    AlertCircle, 
    Clock, 
    ArrowUpRight,
    ArrowDownRight,
    Building2,
    Activity,
    RotateCcw
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { getStorage, setStorage } from '../services/storageService';
import { initialRh, loadConfig, saveConfig } from '../data/defaultConfig';
import RHFormModal from '../components/RHFormModal';

// --- SUB-COMPONENTS (DEFINED OUTSIDE TO PREVENT RE-RENDERS) ---

const StatCard = ({ title, value, subValue, icon: Icon, color, variation }) => (
    <div style={{ 
        background: 'var(--card-bg)', 
        padding: '16px 20px', 
        borderRadius: '20px', 
        border: '1px solid var(--border-color)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: '6px',
        position: 'relative',
        overflow: 'hidden',
        flex: 1
    }}>
        <div style={{ position: 'absolute', top: '-10px', right: '-10px', width: '60px', height: '60px', background: `${color}05`, borderRadius: '50%' }}></div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: `${color}10`, color: color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={24} />
                </div>
                <div>
                    <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{title}</div>
                    <div style={{ fontSize: '20px', fontWeight: '900', color: 'var(--text-main)', letterSpacing: '-0.5px' }}>{value}</div>
                </div>
            </div>
            {variation !== undefined && (
                <div style={{ 
                    fontSize: '11px', 
                    fontWeight: '800', 
                    padding: '4px 8px', 
                    borderRadius: '8px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '4px',
                    color: variation >= 0 ? '#10b981' : '#ef4444',
                    background: variation >= 0 ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)'
                }}>
                    {variation >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                    {Math.abs(variation).toFixed(1)}%
                </div>
            )}
        </div>
        {subValue && <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>{subValue}</div>}
    </div>
);

const EquipeTab = ({ rhList, searchQuery, setSearchQuery, toggleStatus, setEditingRH, setIsRHModalOpen, handleDeleteRH, clients }) => {
    const filteredRH = rhList.filter(emp => 
        emp.nom.toLowerCase().includes(searchQuery.toLowerCase()) || 
        emp.poste.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                    <Search size={16} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input 
                        type="text" 
                        placeholder="Rechercher un collaborateur ou un poste..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '12px 16px 12px 44px',
                            borderRadius: '16px',
                            border: '1px solid var(--border-color)',
                            background: 'var(--card-bg)',
                            color: 'var(--text-main)',
                            fontSize: '14px',
                            fontWeight: '600',
                            outline: 'none',
                            transition: 'all 0.2s'
                        }}
                        onFocus={e => e.target.style.borderColor = 'var(--accent-gold)'}
                        onBlur={e => e.target.style.borderColor = 'var(--border-color)'}
                    />
                </div>
            </div>

            <div style={{
                background: 'var(--card-bg)',
                borderRadius: '24px',
                border: '1px solid var(--border-color)',
                overflow: 'hidden',
                boxShadow: '0 4px 20px rgba(0,0,0,0.02)'
            }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ background: 'var(--bg-main)', borderBottom: '1px solid var(--border-color)' }}>
                            <th style={{ padding: '16px 24px', fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Collaborateur</th>
                            <th style={{ padding: '16px 24px', fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Poste & Missions</th>
                            <th style={{ padding: '16px 24px', fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Date Début</th>
                            <th style={{ padding: '16px 24px', fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>État</th>
                            <th style={{ padding: '16px 24px', fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredRH.map((emp) => (
                            <tr key={emp.id} className="table-row-hover" style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s' }}>
                                <td style={{ padding: '16px 24px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ 
                                            width: '40px', 
                                            height: '40px', 
                                            borderRadius: '12px', 
                                            background: emp.actif ? 'rgba(59, 130, 246, 0.1)' : 'rgba(100, 116, 139, 0.1)', 
                                            color: emp.actif ? '#3b82f6' : '#64748b',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '16px',
                                            fontWeight: '900'
                                        }}>
                                            {emp.nom.charAt(0)}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: '800', color: 'var(--text-main)', fontSize: '14px' }}>{emp.nom}</div>
                                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>ID: {emp.id}</div>
                                        </div>
                                    </div>
                                </td>
                                <td style={{ padding: '16px 24px' }}>
                                    <div style={{ fontWeight: '700', color: 'var(--text-main)', fontSize: '13px' }}>{emp.poste}</div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '500' }}>{emp.taches}</div>
                                </td>
                                <td style={{ padding: '16px 24px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontWeight: '700', fontSize: '13px' }}>
                                        <Calendar size={14} style={{ opacity: 0.6 }} />
                                        {emp.dateDebut ? new Date(emp.dateDebut).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }) : '--'}
                                    </div>
                                </td>
                                <td style={{ padding: '16px 24px' }}>
                                    <div 
                                        onClick={() => toggleStatus(emp.id)}
                                        style={{ 
                                            cursor: 'pointer',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            padding: '4px 10px',
                                            borderRadius: '8px',
                                            fontSize: '10px',
                                            fontWeight: '900',
                                            background: emp.actif ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                                            color: emp.actif ? '#10b981' : '#ef4444',
                                            border: emp.actif ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)'
                                        }}
                                    >
                                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: emp.actif ? '#10b981' : '#ef4444' }}></div>
                                        {emp.actif ? 'ACTIF' : 'INACTIF'}
                                    </div>
                                </td>
                                <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                        <button 
                                            onClick={() => { setEditingRH(emp); setIsRHModalOpen(true); }}
                                            style={{ padding: '8px', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'white', color: 'var(--text-muted)', cursor: 'pointer', transition: 'all 0.2s' }}
                                            onMouseOver={e => { e.currentTarget.style.color = '#3b82f6'; e.currentTarget.style.borderColor = '#3b82f6'; }}
                                            onMouseOut={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}
                                        >
                                            <Edit size={14} />
                                        </button>
                                        <button 
                                            onClick={() => handleDeleteRH(emp.id)}
                                            style={{ padding: '8px', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'white', color: 'var(--text-muted)', cursor: 'pointer', transition: 'all 0.2s' }}
                                            onMouseOver={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.borderColor = '#ef4444'; }}
                                            onMouseOut={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const PaieTab = ({ rhList, transactions, clients, selectedYear, selectedMonth, setSelectedYear, setSelectedMonth, formatMoney, formatNumber, isMonthInContract, onResetPayment, onValidateSalary }) => {
    const serviceMonth = selectedMonth === 1 ? 12 : selectedMonth - 1;
    const serviceYear = selectedMonth === 1 ? selectedYear - 1 : selectedYear;
    const serviceMonthKey = `${serviceYear}-${String(serviceMonth).padStart(2, '0')}`;

    const proposals = [];
    clients.filter(c => c.etatClient === 'Actif' && isMonthInContract(c, serviceMonth - 1, serviceYear)).forEach(client => {
        client.projectCosts?.forEach(cost => {
            const amount = parseFloat(cost.montant) || 0;
            if (amount <= 0) return;

            const targetStart = `${serviceYear}-${String(serviceMonth).padStart(2, '0')}-01`;
            const lastDay = new Date(serviceYear, serviceMonth, 0).getDate();
            const targetEnd = `${serviceYear}-${String(serviceMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
            const cStart = (cost.dateDebut || '1970-01-01').split('T')[0];
            const cEnd = (cost.dateFin || '2099-12-31').split('T')[0];
            
            // Logic check: Recurrence
            if (cost.recurrence === 'Ponctuel') {
                const startMonthKey = cStart.substring(0, 7); 
                if (startMonthKey !== serviceMonthKey) return;
            } else {
                if (!(cStart <= targetEnd && cEnd >= targetStart)) return;
            }

            const staffName = cost.nom?.trim();
            if (!staffName) return;

            const rhProfile = rhList.find(r => r.nom === staffName);
            const isInactive = rhProfile && rhProfile.actif === false;
            
            // Check if employee has left BEFORE this service month
            let hasLeft = false;
            if (rhProfile && rhProfile.dateFin) {
                const endDate = new Date(rhProfile.dateFin);
                const endMonthRef = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
                const currentServiceRef = new Date(serviceYear, serviceMonth - 1, 1);
                if (currentServiceRef > endMonthRef) hasLeft = true;
            }

            if (isInactive || hasLeft) return;

            let existing = proposals.find(p => p.name === staffName);
            if (existing) {
                existing.amount += amount;
                existing.details.push({ client: client.enseigne, amount, regime: client.regime });
            } else {
                proposals.push({
                    name: staffName,
                    profileExists: !!rhProfile,
                    amount: amount,
                    details: [{ client: client.enseigne, amount, regime: client.regime }]
                });
            }
        });
    });

    return (
        <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
            <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                marginBottom: '16px',
                background: 'var(--card-bg)',
                padding: '12px 20px',
                borderRadius: '16px',
                border: '1px solid var(--border-color)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', padding: '8px', borderRadius: '10px' }}>
                        <Clock size={20} />
                    </div>
                    <div>
                        <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Période de service</div>
                        <div style={{ fontSize: '15px', fontWeight: '900', color: 'var(--text-main)' }}>
                            {new Date(serviceYear, serviceMonth - 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                    <select value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))} style={{ padding: '8px 16px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-main)', fontSize: '13px', fontWeight: '700', outline: 'none' }}>
                        {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleDateString('fr-FR', { month: 'long' })}</option>)}
                    </select>
                    <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} style={{ padding: '8px 16px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-main)', fontSize: '13px', fontWeight: '700', outline: 'none' }}>
                        {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
            </div>

            <div style={{ background: 'var(--card-bg)', borderRadius: '24px', border: '1px solid var(--border-color)', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ background: 'var(--bg-main)', borderBottom: '1px solid var(--border-color)' }}>
                            <th style={{ padding: '12px 20px', fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Collaborateur / Logic RH</th>
                            <th style={{ padding: '12px 20px', fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Mois Servi</th>
                            <th style={{ padding: '12px 20px', fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Montant Logic TTC</th>
                            <th style={{ padding: '12px 20px', fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>État Paiement</th>
                            <th style={{ padding: '12px 20px', fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Breakdown Fiches Clients</th>
                            <th style={{ padding: '12px 20px', fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', textAlign: 'right' }}>Action Logique</th>
                        </tr>
                    </thead>
                    <tbody>
                        {proposals.map((p, idx) => {
                            const staffNameLower = p.name.toLowerCase().trim();
                            
                            // MORE ROBUST MATCHING: Search for RH transactions with same name and service month
                            const matches = transactions.filter(t => {
                                const descLower = (t.desc || '').toLowerCase();
                                const isRH = t.chargeType === 'RH' || t.category === 'RH' || t.category === 'Mynds Salaire' || descLower.includes('salaire');
                                if (!isRH) return false;
                                
                                // Strict name check: ensure name is a distinct word or preceded by "salaire"
                                const nameRegex = new RegExp(`(^|\\s|\\(|\\-)${staffNameLower}(\\s|\\)|\\-|$)`, 'i');
                                const matchesName = nameRegex.test(descLower);
                                if (!matchesName) return false;

                                // Check explicit service month metadata (Primary)
                                if (t.serviceMonth === serviceMonthKey) return true;

                                // FALLBACK: Try to parse service month from description (for legacy or manual transactions)
                                const monthNames = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
                                const monthAbbrs = ['janv', 'févr', 'mars', 'avril', 'mai', 'juin', 'juil', 'août', 'sept', 'oct', 'nov', 'déc'];
                                
                                const monthName = monthNames[serviceMonth - 1];
                                const monthAbbr = monthAbbrs[serviceMonth - 1];
                                const yearStr = String(serviceYear);
                                
                                if ((descLower.includes(monthName) || descLower.includes(monthAbbr)) && descLower.includes(yearStr)) return true;

                                return false;
                            });

                            const totalPaid = matches.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);
                            const isPaid = totalPaid >= p.amount * 0.99;
                            const isPartial = totalPaid > 0 && !isPaid;

                            return (
                                <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s' }}>
                                    <td style={{ padding: '10px 20px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ fontWeight: '800', color: 'var(--text-main)', fontSize: '13px' }}>{p.name}</div>
                                            {!p.profileExists && <span title="Collaborateur non trouvé dans la liste RH" style={{ fontSize: '8px', background: '#f59e0b', color: 'white', padding: '2px 4px', borderRadius: '4px' }}>HORS-LISTE</span>}
                                        </div>
                                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '600' }}>Calculé via {p.details.length} fiches clients</div>
                                    </td>
                                    <td style={{ padding: '10px 20px' }}>
                                        <div style={{ 
                                            display: 'inline-flex', 
                                            padding: '4px 10px', 
                                            borderRadius: '8px', 
                                            background: 'rgba(59, 130, 246, 0.05)', 
                                            color: '#3b82f6', 
                                            fontSize: '11px', 
                                            fontWeight: '800', 
                                            textTransform: 'capitalize',
                                            border: '1px solid rgba(59, 130, 246, 0.1)'
                                        }}>
                                            {new Date(serviceYear, serviceMonth - 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                                        </div>
                                    </td>
                                    <td style={{ padding: '10px 20px' }}>
                                        <div style={{ fontSize: '14px', fontWeight: '900', color: 'var(--text-main)' }}>{formatMoney(p.amount)}</div>
                                    </td>
                                    <td style={{ padding: '10px 20px' }}>
                                        {isPaid ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981', background: 'rgba(16, 185, 129, 0.08)', padding: '4px 10px', borderRadius: '8px', fontSize: '10px', fontWeight: '900', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                                                    <CheckCircle2 size={12} /> PAYÉ
                                                </div>
                                                <button 
                                                    onClick={() => onResetPayment(matches[0])}
                                                    style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', opacity: 0.6, padding: '4px' }}
                                                    title="Réinitialiser le paiement (Supprimer la transaction)"
                                                >
                                                    <RotateCcw size={14} />
                                                </button>
                                            </div>
                                        ) : isPartial ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#f59e0b', background: 'rgba(245, 158, 11, 0.08)', padding: '4px 10px', borderRadius: '8px', width: 'fit-content', fontSize: '10px', fontWeight: '900', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                                                <AlertCircle size={12} /> PARTIEL
                                            </div>
                                        ) : (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', background: 'rgba(100, 116, 139, 0.05)', padding: '4px 10px', borderRadius: '8px', width: 'fit-content', fontSize: '10px', fontWeight: '900', border: '1px solid rgba(100, 116, 139, 0.1)' }}>
                                                <Clock size={12} /> ATTENTE
                                            </div>
                                        )}
                                    </td>
                                    <td style={{ padding: '10px 20px' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                            {p.details.map((d, dIdx) => (
                                                <div key={dIdx} style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                                                    <span style={{ fontWeight: '600' }}>• {d.client}</span>
                                                    <span style={{ fontWeight: '800', color: 'var(--text-muted)' }}>{formatNumber(d.amount)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </td>
                                    <td style={{ padding: '10px 20px', textAlign: 'right' }}>
                                        {isPaid ? (
                                            <button 
                                                disabled 
                                                style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #10b981', background: 'rgba(16, 185, 129, 0.05)', color: '#10b981', fontSize: '11px', fontWeight: '800', cursor: 'default', opacity: 0.8 }}
                                            >
                                                Pris en charge
                                            </button>
                                        ) : (
                                            <button 
                                                onClick={() => onValidateSalary(p)}
                                                style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--accent-gold)', background: 'var(--accent-gold)', color: 'white', fontSize: '11px', fontWeight: '800', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 6px rgba(255, 193, 5, 0.2)' }}
                                                onMouseOver={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                                                onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
                                            >
                                                Valider Paiement
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                <div style={{ padding: '16px 20px', background: 'var(--bg-main)', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)' }}>
                        TOTAL DU MOIS ({proposals.length} collaborateurs)
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: '900', color: 'var(--text-main)' }}>
                        {formatMoney(proposals.reduce((acc, p) => acc + p.amount, 0))}
                    </div>
                </div>
            </div>
        </div>
    );
};

const AnalytiqueTab = ({ clients, selectedYear, isMonthInContract, formatNumber, formatMoney }) => {
    const activeClientsList = clients.filter(c => c.etatClient === 'Actif');
    const allStaffNames = Array.from(new Set(activeClientsList.flatMap(c => c.projectCosts?.map(pc => pc.nom) || []))).filter(Boolean).sort();
    const monthsNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

    return (
        <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
            <div style={{ background: 'var(--card-bg)', borderRadius: '24px', border: '1px solid var(--border-color)', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
                <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-main)' }}>
                    <div style={{ fontSize: '14px', fontWeight: '900', color: 'var(--text-main)' }}>Matrice Analytique des Coûts RH</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>Répartition mensuelle par collaborateur basée sur les fiches clients ({selectedYear})</div>
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center' }}>
                        <thead>
                            <tr style={{ background: 'var(--bg-main)', borderBottom: '1px solid var(--border-color)' }}>
                                <th style={{ padding: '12px 24px', fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'left', minWidth: '180px', position: 'sticky', left: 0, background: 'var(--bg-main)', zIndex: 5 }}>Collaborateur</th>
                                {monthsNames.map(m => <th key={m} style={{ padding: '12px 8px', fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{m}</th>)}
                                <th style={{ padding: '12px 24px', fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', background: 'rgba(139, 92, 246, 0.05)' }}>Total Annuel</th>
                            </tr>
                        </thead>
                        <tbody>
                            {allStaffNames.map(staffName => {
                                let staffYearTotal = 0;
                                return (
                                    <tr key={staffName} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                        <td style={{ padding: '12px 24px', textAlign: 'left', fontWeight: '800', color: 'var(--text-main)', fontSize: '13px', position: 'sticky', left: 0, background: 'var(--card-bg)', zIndex: 5, borderRight: '1px solid var(--border-color)' }}>{staffName}</td>
                                        {monthsNames.map((_, idx) => {
                                            let staffMonthTotal = 0;
                                            activeClientsList.forEach(client => {
                                                if (isMonthInContract(client, idx, selectedYear)) {
                                                    client.projectCosts?.forEach(cost => {
                                                        if (cost.nom === staffName) {
                                                            const amount = parseFloat(cost.montant) || 0;
                                                            const targetMonthKey = `${selectedYear}-${String(idx + 1).padStart(2, '0')}`;
                                                            const targetStart = `${targetMonthKey}-01`;
                                                            const lastDay = new Date(selectedYear, idx + 1, 0).getDate();
                                                            const targetEnd = `${targetMonthKey}-${String(lastDay).padStart(2, '0')}`;
                                                            
                                                            const cStart = (cost.dateDebut || '1970-01-01').split('T')[0];
                                                            const cEnd = (cost.dateFin || '2099-12-31').split('T')[0];
                                                            
                                                            if (cost.recurrence === 'Ponctuel') {
                                                                if (cStart.substring(0, 7) === targetMonthKey) staffMonthTotal += amount;
                                                            } else {
                                                                if (cStart <= targetEnd && cEnd >= targetStart) staffMonthTotal += amount;
                                                            }
                                                        }
                                                    });
                                                }
                                            });
                                            staffYearTotal += staffMonthTotal;
                                            return (
                                                <td key={idx} style={{ padding: '8px' }}>
                                                    {staffMonthTotal > 0 ? (
                                                        <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-main)', background: 'rgba(139, 92, 246, 0.05)', padding: '4px 8px', borderRadius: '6px', display: 'inline-block', minWidth: '50px', border: '1px solid rgba(139, 92, 246, 0.1)' }}>{formatNumber(staffMonthTotal)}</div>
                                                    ) : <span style={{ color: 'rgba(0,0,0,0.03)', fontSize: '9px' }}>-</span>}
                                                </td>
                                            );
                                        })}
                                        <td style={{ padding: '8px 16px', textAlign: 'right', background: 'rgba(139, 92, 246, 0.03)' }}>
                                            <div style={{ fontSize: '12px', fontWeight: '900', color: '#8b5cf6' }}>{formatMoney(staffYearTotal)}</div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

// --- MAIN PAGE COMPONENT ---

const RHPage = () => {
    const { 
        employees: rhList, 
        clients, 
        bankTransactions: transactions, 
        addEmployee, 
        updateEmployee, 
        deleteEmployee,
        addBankTransaction,
        deleteBankTransaction,
        loading 
    } = useData();

    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [activeTab, setActiveTab] = useState('Équipe'); // 'Équipe', 'Paie', 'Analytique'
    const [searchQuery, setSearchQuery] = useState('');
    const [isRHModalOpen, setIsRHModalOpen] = useState(false);
    const [editingRH, setEditingRH] = useState(null);

    // KPIS Logic
    const stats = useMemo(() => {
        const activeCount = rhList.filter(r => r.actif).length;
        let totalMonthlyCost = 0;
        clients.forEach(c => {
            if (c.etatClient === 'Actif') {
                c.projectCosts?.forEach(pc => {
                    if (pc.recurrence !== 'Ponctuel') {
                        totalMonthlyCost += parseFloat(pc.montant) || 0;
                    }
                });
            }
        });

        return {
            totalHeadcount: rhList.length,
            activeCount,
            totalMonthlyCost,
            avgSalary: activeCount > 0 ? totalMonthlyCost / activeCount : 0
        };
    }, [rhList, clients]);

    // HANDLERS
    const handleSaveRH = async (rhData) => {
        const nameExists = rhList.some(r => 
            r.nom.toLowerCase().trim() === rhData.nom.toLowerCase().trim() && 
            r.id !== rhData.id
        );

        if (nameExists) {
            alert(`⚠️ Une personne nommée "${rhData.nom}" existe déjà.`);
            return;
        }

        try {
            if (editingRH) {
                await updateEmployee(rhData.id, rhData);
            } else {
                await addEmployee(rhData);
            }
            setIsRHModalOpen(false);
        } catch (err) {
            alert('Erreur lors de la sauvegarde : ' + err.message);
        }
    };

    const handleDeleteRH = async (id) => {
        if (window.confirm("Supprimer ce collaborateur ?")) {
            try {
                await deleteEmployee(id);
            } catch (err) {
                alert('Erreur lors de la suppression : ' + err.message);
            }
        }
    };

    const toggleStatus = async (id) => {
        const emp = rhList.find(r => r.id === id);
        if (emp) {
            await updateEmployee(id, { ...emp, actif: !emp.actif });
        }
    };

    const handleResetPayment = async (transaction) => {
        if (!transaction || !transaction.id) return;
        if (!window.confirm("Voulez-vous annuler ce paiement et supprimer la transaction bancaire associée ?")) return;

        try {
            await deleteBankTransaction(transaction.id);
            alert("Paiement réinitialisé.");
        } catch (err) {
            alert('Erreur lors de la réinitialisation : ' + err.message);
        }
    };

    const handleValidateSalary = async (proposal) => {
        const serviceMonth = selectedMonth === 1 ? 12 : selectedMonth - 1;
        const serviceYear = selectedMonth === 1 ? selectedYear - 1 : selectedYear;
        const serviceMonthName = new Date(serviceYear, serviceMonth - 1).toLocaleDateString('fr-FR', { month: 'long' });
        const serviceMonthKey = `${serviceYear}-${String(serviceMonth).padStart(2, '0')}`;

        const getExactPaymentDate = (monthStr) => {
            const [y, m] = monthStr.split('-').map(Number);
            let d = new Date(y, m, 5); // Payment on the 5th of the NEXT month
            if (d.getDay() === 0) d.setDate(6); 
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        };

        const paymentDate = getExactPaymentDate(serviceMonthKey);
        const companyBanks = getStorage('mynds_company_banks', []);
        const defaultBank = companyBanks.find(b => b.isDefault)?.bank_name || 'BIAT';

        const newTx = {
            date: paymentDate,
            desc: `Salaire ${proposal.name} (${proposal.details[0]?.client || 'Multiple'}) - ${serviceMonthName} ${serviceYear}`,
            bank: defaultBank,
            type: 'Debit',
            amount: proposal.amount,
            category: 'Charges',
            chargeType: 'RH',
            chargeNature: 'Fixes',
            serviceMonth: serviceMonthKey,
            paymentDate: paymentDate,
            isAuto: false
        };

        try {
            await addBankTransaction(newTx);
            alert(`Paiement de ${formatMoney(proposal.amount)} validé pour ${proposal.name}.`);
        } catch (err) {
            alert('Erreur lors de la validation : ' + err.message);
        }
    };

    const formatMoney = (amount) => {
        if (amount === undefined || amount === null) return '0 DT';
        const formatted = new Intl.NumberFormat('fr-FR', {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1
        }).format(amount);
        return `${formatted} DT`;
    };

    const formatNumber = (amount) => {
        return new Intl.NumberFormat('fr-FR', {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1
        }).format(amount);
    };

    const isMonthInContract = (client, monthIndex, year) => {
        if (!client) return false;
        const target = new Date(year, monthIndex, 1);
        const start = client.dateDebut && client.dateDebut !== '-' ? new Date(client.dateDebut) : new Date(2000, 0, 1);
        
        let end;
        if (client.dateFin) {
            end = new Date(client.dateFin);
        } else if (client.regime === 'Projet' && client.dureeMois) {
            end = new Date(start.getFullYear(), start.getMonth() + parseInt(client.dureeMois) - 1, start.getDate());
        } else {
            end = new Date(year, 11, 31);
        }
        
        const startMonth = new Date(start.getFullYear(), start.getMonth(), 1);
        const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);
        
        return target >= startMonth && target <= endMonth;
    };

    // --- MAIN RENDER ---
    return (
        <div className="page" style={{ paddingBottom: '60px' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '14px', background: 'var(--text-main)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Users size={24} />
                        </div>
                        <h1 style={{ fontSize: '28px', fontWeight: '900', color: 'var(--text-main)', margin: 0, letterSpacing: '-1px' }}>Ressources Humaines</h1>
                    </div>
                    <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '14px', fontWeight: '600' }}>Gestion globale de l'équipe, des paies et de la performance financière</p>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                    <button 
                        onClick={() => { setEditingRH(null); setIsRHModalOpen(true); }}
                        style={{
                            padding: '12px 24px',
                            borderRadius: '16px',
                            background: 'var(--accent-gold)',
                            color: 'white',
                            border: 'none',
                            fontWeight: '800',
                            fontSize: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            cursor: 'pointer',
                            boxShadow: '0 8px 20px rgba(255, 193, 5, 0.2)',
                            transition: 'all 0.2s'
                        }}
                    >
                        <Plus size={16} /> Ajouter un collaborateur
                    </button>
                </div>
            </div>

            {/* Stats Overview */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
                <StatCard title="Effectif Actif" value={stats.activeCount} subValue={`${stats.totalHeadcount} au total`} icon={Users} color="#3b82f6" />
                <StatCard title="Charge RH Totale" value={formatMoney(stats.totalMonthlyCost)} subValue="Coût mensuel consolidé" icon={DollarSign} color="#ef4444" />
                <StatCard title="Ratio Moyen" value={formatMoney(stats.avgSalary)} subValue="Par collaborateur" icon={UserCheck} color="#10b981" />
                <StatCard title="Masse Salariale" value={formatMoney(stats.totalMonthlyCost * 12)} subValue="Projection annuelle" icon={TrendingUp} color="#8b5cf6" variation={+12} />
            </div>

            {/* Navigation Tabs */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', background: 'rgba(0,0,0,0.02)', padding: '6px', borderRadius: '18px', width: 'fit-content' }}>
                {['Équipe', 'Paie', 'Analytique'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        style={{
                            padding: '10px 24px',
                            borderRadius: '14px',
                            border: 'none',
                            background: activeTab === tab ? 'white' : 'transparent',
                            color: activeTab === tab ? 'var(--text-main)' : 'var(--text-muted)',
                            fontSize: '13px',
                            fontWeight: '800',
                            cursor: 'pointer',
                            boxShadow: activeTab === tab ? '0 4px 12px rgba(0,0,0,0.05)' : 'none',
                            transition: 'all 0.2s'
                        }}
                    >
                        {tab === 'Équipe' && <Users size={14} style={{ marginRight: '8px', verticalAlign: 'middle' }} />}
                        {tab === 'Paie' && <DollarSign size={14} style={{ marginRight: '8px', verticalAlign: 'middle' }} />}
                        {tab === 'Analytique' && <Activity size={14} style={{ marginRight: '8px', verticalAlign: 'middle' }} />}
                        {tab}
                    </button>
                ))}
            </div>

            {/* TAB CONTENT */}
            {activeTab === 'Équipe' && (
                <EquipeTab 
                    rhList={rhList} 
                    searchQuery={searchQuery} 
                    setSearchQuery={setSearchQuery}
                    toggleStatus={toggleStatus} 
                    setEditingRH={setEditingRH} 
                    setIsRHModalOpen={setIsRHModalOpen} 
                    handleDeleteRH={handleDeleteRH}
                    clients={clients}
                />
            )}
            
            {activeTab === 'Paie' && (
                <PaieTab 
                    rhList={rhList}
                    transactions={transactions} 
                    clients={clients} 
                    selectedYear={selectedYear} 
                    selectedMonth={selectedMonth} 
                    setSelectedYear={setSelectedYear} 
                    setSelectedMonth={setSelectedMonth} 
                    formatMoney={formatMoney} 
                    formatNumber={formatNumber} 
                    isMonthInContract={isMonthInContract}
                    onResetPayment={handleResetPayment}
                    onValidateSalary={handleValidateSalary}
                />
            )}

            {activeTab === 'Analytique' && (
                <AnalytiqueTab 
                    clients={clients} 
                    selectedYear={selectedYear} 
                    isMonthInContract={isMonthInContract} 
                    formatNumber={formatNumber} 
                    formatMoney={formatMoney}
                />
            )}

            {/* MODAL */}
            {isRHModalOpen && (
                <RHFormModal 
                    isOpen={isRHModalOpen} 
                    onClose={() => setIsRHModalOpen(false)} 
                    onSave={handleSaveRH} 
                    initialData={editingRH} 
                />
            )}

            <style>{`
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .table-row-hover:hover { background: rgba(0,0,0,0.01) !important; }
            `}</style>
        </div>
    );
};

export default RHPage;
