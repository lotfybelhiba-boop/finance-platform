import React, { useState, useMemo } from 'react';
import { X, AlertTriangle, ShieldCheck, FileSearch, HelpCircle, CheckCircle } from 'lucide-react';
import { getFactures, getClients } from '../services/storageService';

const InvoiceAuditModal = ({ isOpen, onClose, onRestoreAlert }) => {
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

        // --- 4. Alertes Ignorées (Traçabilité) ---
        const ignoredData = [];
        try {
            // Tentative de récupération via la clé brute ou préfixée
            const raw = localStorage.getItem('mynds_storage_mynds_ignored_alerts') || localStorage.getItem('mynds_ignored_alerts');
            let storedIgnored = [];
            if (raw) {
                const parsed = JSON.parse(raw);
                storedIgnored = parsed.data || (Array.isArray(parsed) ? parsed : []);
            }

            storedIgnored.forEach(item => {
                const key = typeof item === 'string' ? item : item.key;
                if (key) {
                    const parts = key.split('-');
                    const y = parts[parts.length - 1];
                    const m = parts[parts.length - 2];
                    
                    if (filterYear !== 'All' && y !== filterYear) return;
                    if (filterMonth && (parseInt(m) + 1) !== parseInt(filterMonth)) return;
                    
                    ignoredData.push(typeof item === 'string' ? { key: item, reason: 'Ignoré (Ancienne version)', date: null, client: parts[0], period: `${m}/${y}` } : item);
                }
            });
        } catch (e) {
            console.error("Audit error reading ignored alerts:", e);
        }
        results.ignoredAlerts = ignoredData;

        return results;
    }, [factures, clients, filterYear, filterMonth]);

    if (!isOpen) return null;

    const formatMonth = (ym) => {
        const parts = ym.split('-');
        if(parts.length !== 2) return ym;
        const monthNames = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
        return `${monthNames[parseInt(parts[1], 10) - 1]} ${parts[0]}`;
    };

    const hasNoIssues = auditResults.monthlyGaps.length === 0 && 
                       auditResults.globalNumbering.length === 0 && 
                       auditResults.clientNumbering.length === 0 &&
                       auditResults.ignoredAlerts.length === 0;

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(2, 6, 23, 0.85)', backdropFilter: 'blur(16px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <div style={{ 
                width: '100%', maxWidth: '900px', 
                background: 'rgba(30, 41, 59, 0.4)', 
                borderRadius: '32px', 
                border: '1px solid rgba(255, 193, 5, 0.2)',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', 
                overflow: 'hidden', 
                display: 'flex', flexDirection: 'column', 
                maxHeight: '92vh',
                color: '#F8FAFC'
            }}>
                
                {/* HEADER */}
                <div style={{ 
                    padding: '32px 40px', 
                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)', 
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                    background: 'rgba(15, 23, 42, 0.4)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <div style={{ 
                            width: '56px', height: '56px', borderRadius: '16px', 
                            background: 'linear-gradient(135deg, var(--accent-gold), #B45309)', 
                            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000',
                            boxShadow: '0 8px 20px rgba(255, 193, 5, 0.2)'
                        }}>
                            <FileSearch size={28} />
                        </div>
                        <div>
                            <h2 style={{ fontSize: '24px', fontWeight: '900', color: '#FFFFFF', margin: 0, letterSpacing: '-0.5px' }}>Diagnostic Haute Fidélité</h2>
                            <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.5)', margin: '4px 0 0 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <ShieldCheck size={14} color="var(--accent-gold)" /> 
                                Analyse temps réel des flux de facturation & intégrité
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        style={{ 
                            background: 'rgba(255, 255, 255, 0.05)', border: 'none', color: '#FFF', 
                            cursor: 'pointer', width: '40px', height: '40px', borderRadius: '12px', 
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all 0.2s'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                        onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* FILTRES LUXE */}
                <div style={{ padding: '20px 40px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', background: 'rgba(15, 23, 42, 0.2)', display: 'flex', gap: '24px', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '11px', fontWeight: '800', color: 'rgba(255, 255, 255, 0.4)', textTransform: 'uppercase', letterSpacing: '1px' }}>Période d'audit :</span>
                        <select 
                            value={filterYear} 
                            onChange={e => setFilterYear(e.target.value)} 
                            style={{ padding: '10px 16px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.1)', background: '#0F172A', fontSize: '13px', fontWeight: '700', color: '#FFF', outline: 'none', cursor: 'pointer' }}
                        >
                            <option value="All">Toutes les années</option>
                            <option value="2024">2024</option>
                            <option value="2025">2025</option>
                            <option value="2026">2026</option>
                        </select>
                        <select 
                            value={filterMonth} 
                            onChange={e => setFilterMonth(e.target.value)} 
                            style={{ padding: '10px 16px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.1)', background: '#0F172A', fontSize: '13px', fontWeight: '700', color: '#FFF', outline: 'none', cursor: 'pointer' }}
                        >
                            <option value="">Tous les mois</option>
                            {Array.from({length: 12}, (_, i) => i + 1).map(m => {
                                const monthName = new Date(2000, m - 1).toLocaleString('fr-FR', { month: 'long' });
                                return <option key={m} value={m}>{monthName.charAt(0).toUpperCase() + monthName.slice(1)}</option>;
                            })}
                        </select>
                    </div>
                </div>

                {/* BODY */}
                <div style={{ padding: '40px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '40px' }}>
                    
                    {hasNoIssues ? (
                        <div style={{ textAlign: 'center', padding: '80px 40px', background: 'rgba(255, 193, 5, 0.02)', borderRadius: '32px', border: '1px dashed rgba(255, 193, 5, 0.15)' }}>
                            <div style={{ 
                                width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255, 193, 5, 0.1)', 
                                display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-gold)',
                                margin: '0 auto 24px auto'
                            }}>
                                <ShieldCheck size={40} />
                            </div>
                            <h3 style={{ fontSize: '24px', fontWeight: '900', color: '#FFF', margin: '0 0 12px 0' }}>Gestion Impeccable</h3>
                            <p style={{ fontSize: '15px', color: 'rgba(255, 255, 255, 0.5)', margin: 0, maxWidth: '450px', display: 'inline-block', lineHeight: '1.6' }}>
                                Aucune anomalie détectée sur la période sélectionnée. Votre structure de facturation est saine.
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* SECTION 1: MENSUALITÉS OUBLIÉES */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                    <div style={{ width: '3px', height: '24px', background: '#EF4444', borderRadius: '4px' }}></div>
                                    <h3 style={{ fontSize: '14px', fontWeight: '800', color: '#FFF', margin: 0, textTransform: 'uppercase', letterSpacing: '1px' }}>Oublis de Facturation</h3>
                                    <span style={{ fontSize: '11px', fontWeight: '900', background: '#EF4444', color: 'white', padding: '4px 12px', borderRadius: '100px', marginLeft: 'auto' }}>
                                        {auditResults.monthlyGaps.length} ALERTE{auditResults.monthlyGaps.length > 1 ? 'S' : ''}
                                    </span>
                                </div>
                                {auditResults.monthlyGaps.length > 0 ? (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
                                        {auditResults.monthlyGaps.map((gap, idx) => (
                                            <div key={idx} style={{ 
                                                background: 'rgba(255, 255, 255, 0.03)', 
                                                border: '1px solid rgba(255, 255, 255, 0.05)', 
                                                borderRadius: '20px', padding: '20px',
                                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                                            }}>
                                                <div style={{ fontSize: '14px', fontWeight: '800', color: '#FFF', marginBottom: '12px' }}>{gap.client}</div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <AlertTriangle size={14} color="#EF4444" />
                                                    <span style={{ fontSize: '12px', fontWeight: '600', color: '#EF4444' }}>{formatMonth(gap.month)}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div style={{ fontSize: '13px', color: '#10B981', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '600', background: 'rgba(16, 185, 129, 0.05)', padding: '12px 20px', borderRadius: '16px', border: '1px solid rgba(16, 185, 129, 0.1)' }}>
                                        <CheckCircle size={16} /> Aucune mensualité oubliée sur cette période.
                                    </div>
                                )}
                            </div>

                            {/* SECTION 4: ALERTES IGNORÉES */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                    <div style={{ width: '3px', height: '24px', background: 'var(--accent-gold)', borderRadius: '4px' }}></div>
                                    <h3 style={{ fontSize: '14px', fontWeight: '800', color: '#FFF', margin: 0, textTransform: 'uppercase', letterSpacing: '1px' }}>Flux Ignorés (Traçabilité)</h3>
                                    <span style={{ fontSize: '11px', fontWeight: '900', background: 'rgba(255, 255, 255, 0.1)', color: 'rgba(255, 255, 255, 0.6)', padding: '4px 12px', borderRadius: '100px', marginLeft: 'auto' }}>
                                        {auditResults.ignoredAlerts.length} RÉTABLISSEMENT POSSIBLE
                                    </span>
                                </div>
                                {auditResults.ignoredAlerts.length > 0 ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {auditResults.ignoredAlerts.map((item, idx) => (
                                            <div key={idx} style={{ 
                                                background: 'rgba(255, 255, 255, 0.03)', 
                                                border: '1px solid rgba(255, 255, 255, 0.05)', 
                                                borderRadius: '24px', padding: '20px 24px',
                                                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                            }}>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                                                        <span style={{ fontSize: '15px', fontWeight: '800', color: '#FFF' }}>{item.client}</span>
                                                        <span style={{ fontSize: '11px', color: 'var(--accent-gold)', fontWeight: '700', background: 'rgba(255,193,5,0.1)', padding: '2px 8px', borderRadius: '6px' }}>{item.period}</span>
                                                    </div>
                                                    <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.4)', fontStyle: 'italic' }}>
                                                       " {item.reason} "
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                                                    <button 
                                                        onClick={() => onRestoreAlert && onRestoreAlert(item.key)}
                                                        style={{ 
                                                            padding: '8px 16px', borderRadius: '12px', 
                                                            border: 'none', background: 'var(--accent-gold)', color: '#000', 
                                                            fontSize: '11px', fontWeight: '800', cursor: 'pointer',
                                                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                                            boxShadow: '0 4px 12px rgba(255, 193, 5, 0.1)'
                                                        }}
                                                        onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(255, 193, 5, 0.2)'; }}
                                                        onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 193, 5, 0.1)'; }}
                                                    >
                                                        Rétablir le rappel
                                                    </button>
                                                    <span style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.3)' }}>{item.date ? `Ignoré le ${new Date(item.date).toLocaleDateString('fr-FR')}` : 'Action passée'}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.3)', display: 'flex', alignItems: 'center', gap: '10px', padding: '20px', borderRadius: '24px', background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.05)' }}>
                                        <HelpCircle size={16} /> Aucun historique d'omission ignorée sur cette période.
                                    </div>
                                )}
                            </div>

                            {/* SECTION 2 & 3: NUMÉROTATION (Condensée) */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <h3 style={{ fontSize: '12px', fontWeight: '800', color: 'rgba(255, 255, 255, 0.5)', textTransform: 'uppercase', letterSpacing: '1px' }}>Numérotation Globale</h3>
                                    {auditResults.globalNumbering.length > 0 ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            {auditResults.globalNumbering.map((issue, idx) => (
                                                <div key={idx} style={{ fontSize: '12px', color: '#F59E0B', background: 'rgba(245, 158, 11, 0.05)', padding: '10px 14px', borderRadius: '12px', border: '1px solid rgba(245, 158, 11, 0.1)' }}>{issue}</div>
                                            ))}
                                        </div>
                                    ) : <div style={{ fontSize: '12px', color: '#10B981', fontWeight: '600' }}>✓ Séquence parfaite</div>}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <h3 style={{ fontSize: '12px', fontWeight: '800', color: 'rgba(255, 255, 255, 0.5)', textTransform: 'uppercase', letterSpacing: '1px' }}>Numérotation Client</h3>
                                    {auditResults.clientNumbering.length > 0 ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            {auditResults.clientNumbering.map((issue, idx) => (
                                                <div key={idx} style={{ fontSize: '12px', color: '#3B82F6', background: 'rgba(59, 130, 246, 0.05)', padding: '10px 14px', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.1)' }}>{issue}</div>
                                            ))}
                                        </div>
                                    ) : <div style={{ fontSize: '12px', color: '#10B981', fontWeight: '600' }}>✓ Séquence parfaite</div>}
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* FOOTER */}
                <div style={{ padding: '32px 40px', borderTop: '1px solid rgba(255, 255, 255, 0.05)', background: 'rgba(15, 23, 42, 0.4)', display: 'flex', justifyContent: 'flex-end', gap: '16px' }}>
                    <button 
                        onClick={onClose} 
                        style={{ 
                            padding: '12px 32px', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.1)', 
                            background: 'transparent', color: '#FFF', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s' 
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                        onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                        Quitter l'espace Audit
                    </button>
                    <button 
                        onClick={onClose} 
                        style={{ 
                            padding: '12px 32px', borderRadius: '16px', border: 'none', 
                            background: 'var(--accent-gold)', color: '#000', fontWeight: '800', cursor: 'pointer', transition: 'all 0.2s',
                            boxShadow: '0 8px 20px rgba(255, 193, 5, 0.2)'
                        }}
                    >
                        Terminer
                    </button>
                </div>
            </div>
        </div>
    );
};

export default InvoiceAuditModal;
