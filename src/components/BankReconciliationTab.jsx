import React, { useState, useMemo } from 'react';
import { Upload, FileText, CheckCircle, AlertTriangle, XCircle, Search, ArrowRight, ShieldCheck, Zap, MoreHorizontal } from 'lucide-react';
import * as XLSX from 'xlsx';
import { findIntelligentMatch, INVOICE_STATUSES } from '../utils/bankUtils';
import { saveFactures, saveBankTransactions } from '../services/storageService';

const BankReconciliationTab = ({ factures, manualTransactions, onRefresh }) => {
    const [extractData, setExtractData] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [headers, setHeaders] = useState([]);
    const [mapping, setMapping] = useState({ date: '', desc: '', amount: '' });
    const [matches, setMatches] = useState([]);

    const formatMoney = (val) => new Intl.NumberFormat('fr-TN', { style: 'currency', currency: 'TND', minimumFractionDigits: 1 }).format(val);

    const detectMapping = (foundHeaders) => {
        const lowerHeaders = foundHeaders.map(h => String(h).toLowerCase().trim());
        let autoMap = { date: '', desc: '', amount: '' };
        const dateIndex = lowerHeaders.findIndex(h => h.includes('date') || h === 'jour');
        if (dateIndex !== -1) autoMap.date = foundHeaders[dateIndex];
        const descIndex = lowerHeaders.findIndex(h => h.includes('libellé') || h.includes('libelle') || h.includes('désignation') || h.includes('description') || h.includes('opération') || h.includes('motif'));
        if (descIndex !== -1) autoMap.desc = foundHeaders[descIndex];
        const maxIndex = lowerHeaders.findIndex(h => h.includes('montant') || h.includes('débit') || h.includes('debit') || h.includes('crédit') || h.includes('credit') || h.includes('valeur'));
        if (maxIndex !== -1) autoMap.amount = foundHeaders[maxIndex];
        return autoMap;
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsProcessing(true);
        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const workbook = XLSX.read(evt.target.result, { type: 'binary' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const rawJson = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
                
                if (rawJson.length < 2) {
                    alert("Fichier vide");
                    setIsProcessing(false);
                    return;
                }

                const extractedHeaders = rawJson[0];
                setHeaders(extractedHeaders);
                setMapping(detectMapping(extractedHeaders));
                
                const rows = rawJson.slice(1).filter(r => r.length > 0).map((row, idx) => {
                    const obj = { _id: `ext-${Date.now()}-${idx}` };
                    extractedHeaders.forEach((h, i) => { obj[h] = row[i]; });
                    return obj;
                });

                setExtractData(rows);
            } catch (err) {
                alert("Erreur de lecture");
            }
            setIsProcessing(false);
        };
        reader.readAsBinaryString(file);
    };

    const runAutoMatch = () => {
        if (!mapping.date || !mapping.desc || !mapping.amount) {
            alert("Veuillez configurer le mapping des colonnes.");
            return;
        }

        const newMatches = extractData.map(row => {
            const amountRaw = row[mapping.amount];
            let amount = 0;
            if (typeof amountRaw === 'string') amount = parseFloat(amountRaw.replace(/[^\d.,-]/g, '').replace(',', '.')) || 0;
            else amount = parseFloat(amountRaw) || 0;

            // Reconciliation typically cares about Credits (money in) for invoices
            if (amount <= 0) return null; 

            const tx = {
                date: row[mapping.date],
                desc: String(row[mapping.desc] || ''),
                amount: amount
            };

            const matchResult = findIntelligentMatch(tx, factures);
            return {
                id: row._id,
                tx,
                ...matchResult
            };
        }).filter(Boolean);

        setMatches(newMatches);
    };

    const handleConfirmReconciliation = (match) => {
        // 1. Update Invoice Status
        const updatedFactures = factures.map(f => {
            if (f.id === match.facture.id) {
                return {
                    ...f,
                    statut: INVOICE_STATUSES.PAID_RECONCILED,
                    reconciliationDetails: {
                        date: new Date().toISOString(),
                        txDesc: match.tx.desc,
                        txAmount: match.tx.amount,
                        matchScore: match.score
                    }
                };
            }
            return f;
        });

        // 2. Add as Manual Transaction if not already there (to reflected in bank balance)
        const newTransaction = {
            id: `rec-${Date.now()}`,
            date: match.tx.date,
            desc: `[Rapproché] ${match.tx.desc}`,
            bank: 'BIAT', // Default to BIAT for reconciliation extracts generally
            type: 'Credit',
            amount: match.tx.amount,
            category: 'Facture',
            originalId: match.facture.id,
            reconciled: true
        };

        saveFactures(updatedFactures);
        saveBankTransactions([...manualTransactions, newTransaction]);
        
        // Remove from current matches view
        setMatches(prev => prev.filter(m => m.id !== match.id));
        onRefresh();
    };

    const stats = useMemo(() => {
        return {
            total: matches.length,
            ok: matches.filter(m => m.status === 'Match (ok)').length,
            verify: matches.filter(m => m.status === 'À vérifier (écart/multiple)').length,
            none: matches.filter(m => m.status === 'Aucun match (à traiter)').length
        };
    }, [matches]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Upload Area */}
            {extractData.length === 0 ? (
                <div style={{ 
                    padding: '60px', border: '2px dashed var(--border-color)', borderRadius: '24px', 
                    textAlign: 'center', background: 'var(--bg-main)', cursor: 'pointer' 
                }} onClick={() => document.getElementById('extract-upload').click()}>
                    <input type="file" id="extract-upload" hidden onChange={handleFileUpload} accept=".xlsx,.csv" />
                    <Upload size={48} color="var(--text-muted)" style={{ marginBottom: '16px' }} />
                    <h3 style={{ margin: 0, fontWeight: '800' }}>Importer un Extrait Bancaire</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Uploadez votre fichier BIAT ou QNB pour commencer le rapprochement.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* Header with tools */}
                    <div className="card" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', gap: '24px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '4px' }}>Date</label>
                                <select value={mapping.date} onChange={e => setMapping({...mapping, date: e.target.value})} style={{ padding: '8px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '12px' }}>
                                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '4px' }}>Libellé</label>
                                <select value={mapping.desc} onChange={e => setMapping({...mapping, desc: e.target.value})} style={{ padding: '8px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '12px' }}>
                                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '4px' }}>Crédit</label>
                                <select value={mapping.amount} onChange={e => setMapping({...mapping, amount: e.target.value})} style={{ padding: '8px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '12px' }}>
                                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                                </select>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button onClick={() => setExtractData([])} className="btn-secondary" style={{ padding: '10px 20px' }}>Annuler</button>
                            <button onClick={runAutoMatch} className="btn-primary" style={{ padding: '10px 24px', background: 'var(--text-main)', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Zap size={16} /> Lancer le matching
                            </button>
                        </div>
                    </div>

                    {/* Stats bar */}
                    {matches.length > 0 && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                            <div className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ background: 'var(--bg-main)', padding: '10px', borderRadius: '12px' }}><MoreHorizontal size={20} /></div>
                                <div><div style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)' }}>MOUVEMENTS</div><div style={{ fontSize: '18px', fontWeight: '900' }}>{stats.total}</div></div>
                            </div>
                            <div className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px', borderLeft: '4px solid #10b981' }}>
                                <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '10px', borderRadius: '12px' }}><CheckCircle size={20} /></div>
                                <div><div style={{ fontSize: '10px', fontWeight: '800', color: '#10b981' }}>MATCH (OK)</div><div style={{ fontSize: '18px', fontWeight: '900' }}>{stats.ok}</div></div>
                            </div>
                            <div className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px', borderLeft: '4px solid #f59e0b' }}>
                                <div style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', padding: '10px', borderRadius: '12px' }}><AlertTriangle size={20} /></div>
                                <div><div style={{ fontSize: '10px', fontWeight: '800', color: '#f59e0b' }}>À VÉRIFIER</div><div style={{ fontSize: '18px', fontWeight: '900' }}>{stats.verify}</div></div>
                            </div>
                            <div className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px', borderLeft: '4px solid #ef4444' }}>
                                <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '10px', borderRadius: '12px' }}><XCircle size={20} /></div>
                                <div><div style={{ fontSize: '10px', fontWeight: '800', color: '#ef4444' }}>AUCUN MATCH</div><div style={{ fontSize: '18px', fontWeight: '900' }}>{stats.none}</div></div>
                            </div>
                        </div>
                    )}

                    {/* Matching Table */}
                    <div className="card" style={{ overflow: 'hidden' }}>
                        <table className="clean-table" style={{ width: '100%' }}>
                            <thead>
                                <tr>
                                    <th>Flux Bancaire</th>
                                    <th className="text-center">Lien</th>
                                    <th>Facture Détectée</th>
                                    <th>Statut Matching</th>
                                    <th className="text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {matches.length === 0 ? (
                                    <tr><td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Lancez le matching pour voir les propositions.</td></tr>
                                ) : (
                                    matches.map((m, idx) => (
                                        <tr key={idx} style={{ background: m.status === 'Match (ok)' ? 'rgba(16, 185, 129, 0.02)' : 'transparent' }}>
                                            <td style={{ width: '280px' }}>
                                                <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-main)' }}>{m.tx.desc}</div>
                                                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{m.tx.date} • {formatMoney(m.tx.amount)}</div>
                                            </td>
                                            <td className="text-center"><ArrowRight size={16} color="#cbd5e1" /></td>
                                            <td>
                                                {m.facture ? (
                                                    <div>
                                                        <div style={{ fontSize: '12px', fontWeight: '900', color: 'var(--text-main)' }}>{m.facture.client}</div>
                                                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{m.facture.id} • {formatMoney(m.facture.totalTTC || m.facture.montant)}</div>
                                                    </div>
                                                ) : (
                                                    <span style={{ fontSize: '11px', color: '#ef4444', fontStyle: 'italic' }}>Non identifiée</span>
                                                )}
                                            </td>
                                            <td>
                                                <div style={{ 
                                                    fontSize: '10px', fontWeight: '800', padding: '4px 10px', borderRadius: '8px', width: 'fit-content',
                                                    background: m.status === 'Match (ok)' ? 'rgba(16, 185, 129, 0.1)' : m.status === 'À vérifier (écart/multiple)' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                                    color: m.status === 'Match (ok)' ? '#10b981' : m.status === 'À vérifier (écart/multiple)' ? '#f59e0b' : '#ef4444'
                                                }}>
                                                    {m.status}
                                                </div>
                                            </td>
                                            <td className="text-right">
                                                {m.facture && (
                                                    <button 
                                                        onClick={() => handleConfirmReconciliation(m)}
                                                        className="btn-primary" 
                                                        style={{ padding: '6px 14px', fontSize: '10px', background: '#10b981', color: 'white', display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto' }}
                                                    >
                                                        <ShieldCheck size={14} /> Valider
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BankReconciliationTab;
