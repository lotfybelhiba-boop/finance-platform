import React, { useState, useMemo } from 'react';
import { X, AlertTriangle, ShieldCheck, FileSearch, HelpCircle, CheckCircle } from 'lucide-react';
import { getFactures, getClients } from '../services/storageService';

const InvoiceAuditModal = ({ isOpen, onClose }) => {
    const factures = useMemo(() => isOpen ? getFactures() || [] : [], [isOpen]);
    const clients = useMemo(() => isOpen ? getClients() || [] : [], [isOpen]);

    const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());
    const [filterMonth, setFilterMonth] = useState('');

    const auditResults = useMemo(() => {
        const results = {
            monthlyGaps: [],
            globalNumbering: [],
            clientNumbering: []
        };

        if (factures.length === 0 || clients.length === 0) return results;

        // --- 1. Mensualités Oubliées (Abonnements Actifs) ---
        const activeSubscribers = clients.filter(c => c.etatClient === 'Actif' && c.regime === 'Abonnement');
        const today = new Date();
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth(); // 0-indexed

        activeSubscribers.forEach(client => {
            if (!client.dateDebut) return;
            const startStr = client.dateDebut; // formats like "2025-01-15"
            // Safari/Firefox safe parsing:
            const parts = startStr.split('-');
            if (parts.length < 3) return;
            const startDate = new Date(parts[0], parts[1] - 1, parts[2]);

            // If start is in the future, ignore
            if (startDate > today) return;

            // Generate expected months: from start Month/Year to Current Month/Year
            let expectedMonths = [];
            let cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
            const endMonthDate = new Date(currentYear, currentMonth, 1);

            while (cursor <= endMonthDate) {
                expectedMonths.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`);
                cursor.setMonth(cursor.getMonth() + 1);
            }

            // Find invoices for this client
            const clientInvoices = factures.filter(f => f.clientId === client.id || f.client === client.enseigne);
            
            // Build set of billed months
            const billedMonths = new Set();
            clientInvoices.forEach(f => {
                if (f.statut === 'Draft') return; // on ignore les brouillons, il faut qu'elle soit finalisée/envoyée/payée
                
                // On se base sur la période de facturation si elle existe, sinon la date d'émission
                if (f.periodeDebut) {
                    const pParts = f.periodeDebut.split('-');
                    if(pParts.length >= 2) billedMonths.add(`${pParts[0]}-${pParts[1]}`);
                } else if (f.dateEmi) {
                    const eParts = f.dateEmi.split('-');
                    if(eParts.length >= 2) billedMonths.add(`${eParts[0]}-${eParts[1]}`);
                }
            });

            // Compare expected vs billed
            expectedMonths.forEach(ym => {
                const [y, m] = ym.split('-');
                if (filterYear !== 'All' && y !== filterYear) return;
                if (filterMonth && m !== String(filterMonth).padStart(2, '0')) return;

                if (!billedMonths.has(ym)) {
                    results.monthlyGaps.push({ client: client.enseigne, month: ym });
                }
            });
        });

        // --- 2 & 3. Trous de Numérotation Globale et Client ---
        const globalSequences = {}; // { '2026': [1, 2, 4] }
        const clientSequences = {}; // { 'ClientName': [1, 2, 3] }

        factures.forEach(f => {
            if (!f.id) return;
            if (f.id.startsWith('ND-') || f.id === 'non déclarée') return;
            if (f.statut === 'Draft') return; // Ne compte pas les brouillons dans la chaîne finale

            // Recherche du format standard NXX-YYYY-ZZZ 
            const match = f.id.match(/^N(\d{2,3})-(\d{4})-(\d{3})$/);
            if (match) {
                const globalNum = parseInt(match[1], 10);
                const year = match[2];
                const clientNum = parseInt(match[3], 10);

                if (!globalSequences[year]) globalSequences[year] = [];
                globalSequences[year].push({ num: globalNum, factureId: f.id });

                const clientKey = f.client || 'Inconnu';
                if (!clientSequences[clientKey]) clientSequences[clientKey] = [];
                clientSequences[clientKey].push({ num: clientNum, factureId: f.id });
            }
        });

        // Trouver les trous globaux par année
        Object.entries(globalSequences).forEach(([year, items]) => {
            if (filterYear !== 'All' && year !== filterYear) return;

            // Trier par le numéro global
            items.sort((a, b) => a.num - b.num);
            for (let i = 0; i < items.length - 1; i++) {
                const diff = items[i+1].num - items[i].num;
                if (diff > 1) {
                    for (let j = 1; j < diff; j++) {
                        results.globalNumbering.push(`La facture globale N°${String(items[i].num + j).padStart(2, '0')} de l'année ${year} est introuvable.`);
                    }
                }
            }
        });

        // Trouver les trous clients
        Object.entries(clientSequences).forEach(([clientKey, items]) => {
            items.sort((a, b) => a.num - b.num);
            for (let i = 0; i < items.length - 1; i++) {
                const diff = items[i+1].num - items[i].num;
                if (diff > 1) {
                    for (let j = 1; j < diff; j++) {
                        results.clientNumbering.push(`La facture N°${String(items[i].num + j).padStart(3, '0')} spécifique au client '${clientKey}' est introuvable.`);
                    }
                }
            }
        });

        return results;
    }, [factures, clients, filterYear, filterMonth]);

    if (!isOpen) return null;

    const formatMonth = (ym) => {
        const parts = ym.split('-');
        if(parts.length !== 2) return ym;
        const monthNames = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
        return `${monthNames[parseInt(parts[1], 10) - 1]} ${parts[0]}`;
    };

    const hasNoIssues = auditResults.monthlyGaps.length === 0 && auditResults.globalNumbering.length === 0 && auditResults.clientNumbering.length === 0;

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <div style={{ width: '100%', maxWidth: '800px', background: 'var(--card-bg)', borderRadius: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
                
                {/* HEADER */}
                <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-main)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(255, 193, 5, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-gold)' }}>
                            <FileSearch size={24} />
                        </div>
                        <div>
                            <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>Fiabilité & Diagnostic Factures</h2>
                            <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <ShieldCheck size={14} color="#10B981" /> 
                                Analyse Read-Only. Aucune facture n'est modifiée ou altérée.
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '8px', borderRadius: '50%', transition: 'all 0.2s', ':hover': { background: 'rgba(0,0,0,0.05)' } }}>
                        <X size={24} />
                    </button>
                </div>

                {/* FILTRES */}
                <div style={{ padding: '16px 32px', borderBottom: '1px solid var(--border-color)', background: 'var(--card-bg)', display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-muted)' }}>Filtrer l'audit :</span>
                    
                    <select value={filterYear} onChange={e => setFilterYear(e.target.value)} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)', outline: 'none' }}>
                        <option value="All">Toutes les années</option>
                        <option value="2024">2024</option>
                        <option value="2025">2025</option>
                        <option value="2026">2026</option>
                        <option value="2027">2027</option>
                    </select>

                    <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)', outline: 'none' }}>
                        <option value="">Tous les mois</option>
                        {Array.from({length: 12}, (_, i) => i + 1).map(m => {
                            const monthName = new Date(2000, m - 1).toLocaleString('fr-FR', { month: 'long' });
                            return <option key={m} value={m}>{monthName.charAt(0).toUpperCase() + monthName.slice(1)}</option>;
                        })}
                    </select>
                </div>

                {/* BODY */}
                <div style={{ padding: '32px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '32px' }}>
                    
                    {hasNoIssues ? (
                        <div style={{ textAlign: 'center', padding: '60px 20px', background: 'rgba(16, 185, 129, 0.05)', borderRadius: '16px', border: '1px dashed rgba(16, 185, 129, 0.3)' }}>
                            <CheckCircle size={48} color="#10B981" style={{ margin: '0 auto 16px auto' }} />
                            <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-main)', margin: '0 0 8px 0' }}>Aucune anomalie détectée !</h3>
                            <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: 0, maxWidth: '400px', display: 'inline-block' }}>Toutes les périodes d'abonnement sont facturées et la numérotation suit une séquence parfaite.</p>
                        </div>
                    ) : (
                        <>
                            {/* SECTION 1: MENSUALITÉS OUBLIÉES */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '2px solid var(--border-color)', paddingBottom: '12px' }}>
                                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#EF4444' }}>
                                        <AlertTriangle size={18} />
                                    </div>
                                    <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-main)', margin: 0 }}>Oublis de Facturation (Abonnements)</h3>
                                    <span style={{ fontSize: '12px', fontWeight: '800', background: 'var(--danger)', color: 'white', padding: '2px 8px', borderRadius: '100px', marginLeft: 'auto' }}>
                                        {auditResults.monthlyGaps.length}
                                    </span>
                                </div>
                                {auditResults.monthlyGaps.length > 0 ? (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px' }}>
                                        {auditResults.monthlyGaps.map((gap, idx) => (
                                            <div key={idx} style={{ background: 'var(--bg-main)', border: '1px solid rgba(239, 68, 68, 0.2)', borderLeft: '3px solid #EF4444', borderRadius: '8px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-main)' }}>{gap.client}</span>
                                                <span style={{ fontSize: '12px', fontWeight: '600', color: '#EF4444', background: 'white', padding: '4px 8px', borderRadius: '6px' }}>{formatMonth(gap.month)}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div style={{ fontSize: '13px', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600' }}><CheckCircle size={16} /> Aucune mensualité oubliée détectée.</div>
                                )}
                            </div>

                            {/* SECTION 2: NUMÉROTATION GLOBALE */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '2px solid var(--border-color)', paddingBottom: '12px' }}>
                                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F59E0B' }}>
                                        <AlertTriangle size={18} />
                                    </div>
                                    <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-main)', margin: 0 }}>Sauts de Numérotation Globale</h3>
                                    <span style={{ fontSize: '12px', fontWeight: '800', background: auditResults.globalNumbering.length > 0 ? '#F59E0B' : 'var(--text-muted)', color: 'white', padding: '2px 8px', borderRadius: '100px', marginLeft: 'auto' }}>
                                        {auditResults.globalNumbering.length}
                                    </span>
                                </div>
                                {auditResults.globalNumbering.length > 0 ? (
                                    <ul style={{ margin: 0, padding: '0 0 0 24px', color: 'var(--text-secondary)', fontSize: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {auditResults.globalNumbering.map((issue, idx) => (
                                            <li key={idx}><strong>{issue}</strong> (Brouillon supprimé ou numéro modifié)</li>
                                        ))}
                                    </ul>
                                ) : (
                                    <div style={{ fontSize: '13px', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600' }}><CheckCircle size={16} /> Séquence globale complète.</div>
                                )}
                            </div>

                            {/* SECTION 3: NUMÉROTATION CLIENT */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '2px solid var(--border-color)', paddingBottom: '12px' }}>
                                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3B82F6' }}>
                                        <AlertTriangle size={18} />
                                    </div>
                                    <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-main)', margin: 0 }}>Sauts de Numérotation Client</h3>
                                    <span style={{ fontSize: '12px', fontWeight: '800', background: auditResults.clientNumbering.length > 0 ? '#3B82F6' : 'var(--text-muted)', color: 'white', padding: '2px 8px', borderRadius: '100px', marginLeft: 'auto' }}>
                                        {auditResults.clientNumbering.length}
                                    </span>
                                </div>
                                {auditResults.clientNumbering.length > 0 ? (
                                    <ul style={{ margin: 0, padding: '0 0 0 24px', color: 'var(--text-secondary)', fontSize: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {auditResults.clientNumbering.map((issue, idx) => (
                                            <li key={idx}><strong>{issue}</strong></li>
                                        ))}
                                    </ul>
                                ) : (
                                    <div style={{ fontSize: '13px', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600' }}><CheckCircle size={16} /> Séquence client complète.</div>
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* FOOTER */}
                <div style={{ padding: '24px 32px', borderTop: '1px solid var(--border-color)', background: 'var(--bg-main)', display: 'flex', justifyContent: 'flex-end' }}>
                    <button onClick={onClose} style={{ padding: '12px 24px', borderRadius: '12px', border: 'none', background: 'var(--text-main)', color: 'white', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s' }}>
                        Fermer le diagnostic
                    </button>
                </div>
            </div>
        </div>
    );
};

export default InvoiceAuditModal;
