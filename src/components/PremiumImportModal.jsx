import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Upload, X, CheckCircle2, AlertCircle, Search, Edit2, Check, ArrowRight, FileSpreadsheet, ShieldCheck, Database, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';

// Utility for inline editing cell
const EditableCell = ({ value, type = "text", onSave, isValid, isEdited }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [val, setVal] = useState(value);
    
    useEffect(() => { setVal(value); }, [value]);

    const handleBlur = () => {
        setIsEditing(false);
        if (val !== value) onSave(val);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') handleBlur();
        if (e.key === 'Escape') { setVal(value); setIsEditing(false); }
    };

    if (isEditing) {
        return (
            <input 
                autoFocus
                type={type}
                value={val}
                onChange={e => setVal(e.target.value)}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                style={{
                    width: '100%',
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid #d4af37',
                    color: 'white',
                    padding: '6px 8px',
                    borderRadius: '6px',
                    fontSize: '13px',
                    outline: 'none',
                    boxShadow: '0 0 0 2px rgba(212, 175, 55, 0.2)'
                }}
            />
        );
    }

    return (
        <div 
            onClick={() => setIsEditing(true)}
            style={{ 
                padding: '6px 8px', 
                cursor: 'pointer', 
                borderRadius: '6px',
                border: '1px solid transparent',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                color: isValid ? 'white' : '#ef4444',
                background: isEdited ? 'rgba(212, 175, 55, 0.1)' : 'transparent'
            }}
            onMouseEnter={e => e.currentTarget.style.border = '1px dashed rgba(255,255,255,0.2)'}
            onMouseLeave={e => e.currentTarget.style.border = '1px solid transparent'}
        >
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {type === 'number' && value ? `${parseFloat(value).toFixed(3)} DT` : (value || '-')}
            </span>
            <Edit2 size={12} color="rgba(255,255,255,0.2)" />
        </div>
    );
};

const PremiumImportModal = ({ isOpen, onClose, onSave, existingTransactions = [] }) => {
    const [step, setStep] = useState('UPLOAD'); // UPLOAD, MAPPING, PREVIEW, SUCCESS
    const [dragActive, setDragActive] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    
    const [fileDetails, setFileDetails] = useState(null);
    const [headers, setHeaders] = useState([]);
    const [rawRows, setRawRows] = useState([]);
    
    const [mapping, setMapping] = useState({ date: '', desc: '', amount: '' });
    const [defaultBank, setDefaultBank] = useState('QNB');
    
    const [previewData, setPreviewData] = useState([]);
    
    const inputRef = useRef(null);

    if (!isOpen) return null;

    // --- PARSING HELPERS ---
    const parseDateValue = (val) => {
        if (!val) return '';
        if (typeof val === 'number') {
            const unixDate = new Date((val - (25567 + 2)) * 86400 * 1000);
            return unixDate.toISOString().split('T')[0];
        }
        const str = String(val).trim();
        if (str.includes('/')) {
            const parts = str.split('/');
            if (parts[0].length === 2 && parts[2]?.length >= 4) {
                return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            }
        }
        const parsed = new Date(str);
        if (!isNaN(parsed.getTime())) return parsed.toISOString().split('T')[0];
        return str;
    };

    const detectMapping = (foundHeaders) => {
        const lowerHeaders = foundHeaders.map(h => String(h).toLowerCase().trim());
        let autoMap = { date: '', desc: '', amount: '' };

        const dateIndex = lowerHeaders.findIndex(h => h.includes('date') || h === 'jour');
        if (dateIndex !== -1) autoMap.date = foundHeaders[dateIndex];

        const descIndex = lowerHeaders.findIndex(h => h.includes('libellé') || h.includes('libelle') || h.includes('désignation') || h.includes('description') || h.includes('opération') || h.includes('motif'));
        if (descIndex !== -1) autoMap.desc = foundHeaders[descIndex];

        const maxIndex = lowerHeaders.findIndex(h => h.includes('montant') || h.includes('débit') || h.includes('debit') || h.includes('valeur') || h.includes('prix'));
        if (maxIndex !== -1) autoMap.amount = foundHeaders[maxIndex];

        return autoMap;
    };

    // --- UPLOAD HANDLERS ---
    const handleDrag = (e) => {
        e.preventDefault(); e.stopPropagation();
        setDragActive(e.type === "dragenter" || e.type === "dragover");
    };

    const processFile = async (file) => {
        if (!file) return;
        setIsProcessing(true);
        setFileDetails({ name: file.name, size: (file.size / 1024).toFixed(1) + ' KB' });

        const reader = new FileReader();
        reader.onload = (e) => {
            setTimeout(() => {
                try {
                    const workbook = XLSX.read(e.target.result, { type: 'binary' });
                    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                    const rawJson = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                    
                    if (rawJson.length < 2) throw new Error("Fichier vide ou invalide.");
                    
                    const extractedHeaders = rawJson[0];
                    setHeaders(extractedHeaders);
                    setMapping(detectMapping(extractedHeaders));
                    setRawRows(rawJson.slice(1).filter(r => r.length > 0));
                    setStep('MAPPING');
                } catch (err) {
                    alert("Erreur: " + err.message);
                    setFileDetails(null);
                } finally {
                    setIsProcessing(false);
                }
            }, 600); // Artificial delay for premium feel
        };
        reader.readAsBinaryString(file);
    };

    // --- MAPPING -> PREVIEW ---
    const generatePreview = () => {
        setIsProcessing(true);
        setTimeout(() => {
            const data = rawRows.map((row, idx) => {
                let obj = {};
                headers.forEach((h, i) => obj[h] = row[i]);
                
                const dateVal = parseDateValue(obj[mapping.date]);
                const descVal = String(obj[mapping.desc] || '').trim();
                
                let rawAmount = obj[mapping.amount];
                let amountVal = 0;
                if (rawAmount !== undefined && rawAmount !== null) {
                    if (typeof rawAmount === 'string') rawAmount = rawAmount.replace(/[^\d.,-]/g, '').replace(',', '.');
                    amountVal = Math.abs(parseFloat(rawAmount)) || 0;
                }

                return {
                    id: `temp-${idx}`,
                    _rawObj: obj,
                    date: dateVal,
                    desc: descVal,
                    amount: amountVal,
                    bank: defaultBank,
                    isEdited: false
                };
            });
            setPreviewData(data);
            setStep('PREVIEW');
            setIsProcessing(false);
        }, 500);
    };

    // --- PREVIEW LOGIC ---
    const processedLines = useMemo(() => {
        return previewData.map(line => {
            let isValid = true;
            let isDuplicate = false;
            let errors = [];

            if (!line.date || line.date.length < 8) { isValid = false; errors.push("Date"); }
            if (!line.desc || line.desc === 'undefined') { isValid = false; errors.push("Désignation"); }
            if (!line.amount || line.amount <= 0) { isValid = false; errors.push("Montant"); }

            if (isValid) {
                const exists = existingTransactions.some(t => 
                    t.date === line.date && 
                    Math.abs(parseFloat(t.amount)) === line.amount &&
                    (t.desc || '').toLowerCase().trim() === line.desc.toLowerCase()
                );
                if (exists) {
                    isDuplicate = true;
                    isValid = false;
                    errors.push("Doublon");
                }
            }

            return { ...line, isValid, isDuplicate, errors };
        });
    }, [previewData, existingTransactions]);

    const validCount = processedLines.filter(l => l.isValid).length;

    const updateCell = (id, field, value) => {
        setPreviewData(prev => prev.map(item => {
            if (item.id === id) {
                return { ...item, [field]: value, isEdited: true };
            }
            return item;
        }));
    };

    // --- CONFIRMATION ---
    const handleConfirm = () => {
        const linesToImport = processedLines.filter(l => l.isValid);
        if (linesToImport.length === 0) return;

        setIsProcessing(true);
        setTimeout(() => {
            const newTransactions = linesToImport.map((line, idx) => ({
                id: `IM-PERSO-${Date.now()}-${idx}`,
                date: line.date,
                desc: line.desc,
                bank: line.bank,
                type: 'Debit',
                amount: line.amount,
                category: 'Perso',
                persoCategory: 'Autre',
                isAuto: false
            }));
            
            onSave(newTransactions);
            setStep('SUCCESS');
            setIsProcessing(false);
            
            setTimeout(() => {
                onClose();
            }, 2000);
        }, 800);
    };

    // --- UI STYLES ---
    const theme = {
        bg: '#0f1115',
        cardBg: '#1a1d24',
        border: 'rgba(255, 255, 255, 0.08)',
        textMain: '#ffffff',
        textMuted: '#94a3b8',
        gold: '#d4af37',
        goldLight: 'rgba(212, 175, 55, 0.1)',
        green: '#10b981',
        red: '#ef4444'
    };

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)', fontFamily: "'Inter', sans-serif" }}>
            <div style={{ 
                background: theme.cardBg, 
                width: '900px', 
                height: '80vh', 
                maxHeight: '800px', 
                borderRadius: '24px', 
                display: 'flex', 
                flexDirection: 'column', 
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.05)', 
                overflow: 'hidden',
                color: theme.textMain
            }}>
                
                {/* HEADER */}
                <div style={{ padding: '24px 32px', borderBottom: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ background: theme.goldLight, padding: '10px', borderRadius: '12px', border: `1px solid rgba(212, 175, 55, 0.2)` }}>
                            <FileSpreadsheet size={24} color={theme.gold} />
                        </div>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '800', letterSpacing: '-0.02em' }}>Intelligence d'Import</h2>
                            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: theme.textMuted }}>Importation structurée pour Vie Personnelle</p>
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${theme.border}`, width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: theme.textMuted, transition: 'all 0.2s' }} onMouseEnter={e => {e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'white';}} onMouseLeave={e => {e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = theme.textMuted;}}>
                        <X size={18} />
                    </button>
                </div>

                {/* PROGRESS BAR */}
                <div style={{ display: 'flex', borderBottom: `1px solid ${theme.border}`, background: 'rgba(0,0,0,0.1)' }}>
                    {['UPLOAD', 'MAPPING', 'PREVIEW', 'CONFIRM'].map((s, i) => {
                        const states = ['UPLOAD', 'MAPPING', 'PREVIEW', 'CONFIRM'];
                        const currentIndex = states.indexOf(step);
                        const isPast = i < currentIndex;
                        const isCurrent = s === step;
                        return (
                            <div key={s} style={{ flex: 1, padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '11px', fontWeight: '700', color: isCurrent ? theme.gold : (isPast ? 'white' : theme.textMuted), borderBottom: isCurrent ? `2px solid ${theme.gold}` : '2px solid transparent', transition: 'all 0.3s' }}>
                                <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: isCurrent ? theme.gold : (isPast ? 'rgba(255,255,255,0.1)' : 'transparent'), border: `1px solid ${isCurrent ? theme.gold : theme.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: isCurrent ? 'black' : 'inherit' }}>
                                    {isPast ? <Check size={10} /> : (i + 1)}
                                </div>
                                {s}
                            </div>
                        );
                    })}
                </div>

                {/* BODY CONTENT */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '32px', position: 'relative' }}>
                    
                    {step === 'UPLOAD' && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '24px' }}>
                            <div 
                                onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={(e) => { handleDrag(e); if (e.dataTransfer.files && e.dataTransfer.files[0]) processFile(e.dataTransfer.files[0]); }}
                                onClick={() => !isProcessing && inputRef.current.click()}
                                style={{
                                    border: `2px dashed ${dragActive ? theme.gold : theme.border}`,
                                    background: dragActive ? theme.goldLight : 'rgba(0,0,0,0.2)',
                                    borderRadius: '24px', width: '100%', maxWidth: '500px', padding: '60px 40px', textAlign: 'center', cursor: isProcessing ? 'default' : 'pointer', transition: 'all 0.3s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px',
                                    boxShadow: dragActive ? `0 0 40px ${theme.goldLight}` : 'none'
                                }}
                            >
                                <input ref={inputRef} type="file" accept=".xlsx, .csv" onChange={e => { if (e.target.files && e.target.files[0]) processFile(e.target.files[0]); }} style={{ display: 'none' }} />
                                
                                {isProcessing ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                                        <Loader2 size={40} color={theme.gold} style={{ animation: 'spin 1s linear infinite' }} />
                                        <div style={{ color: theme.gold, fontWeight: '700', fontSize: '14px' }}>Analyse quantique en cours...</div>
                                    </div>
                                ) : (
                                    <>
                                        <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,255,255,0.03)', border: `1px solid ${theme.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Database size={32} color={theme.gold} />
                                        </div>
                                        <div>
                                            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '800' }}>Déposez votre fichier Excel ou CSV</h3>
                                            <p style={{ margin: 0, fontSize: '14px', color: theme.textMuted, lineHeight: '1.5' }}>Notre moteur intelligent structurera automatiquement vos dépenses privées.</p>
                                        </div>
                                        <div style={{ marginTop: '8px', padding: '8px 16px', background: 'rgba(255,255,255,0.05)', borderRadius: '20px', fontSize: '11px', fontWeight: '700', color: theme.textMuted, letterSpacing: '0.05em' }}>BROWSE FILES</div>
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {step === 'MAPPING' && (
                        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', animation: 'fadeIn 0.3s ease-out' }}>
                            <div style={{ marginBottom: '32px' }}>
                                <h3 style={{ fontSize: '24px', fontWeight: '800', margin: '0 0 8px 0' }}>Configuration des données</h3>
                                <p style={{ color: theme.textMuted, fontSize: '14px', margin: 0 }}>Vérifiez l'association automatique des colonnes détectée par notre système.</p>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '40px' }}>
                                {[
                                    { key: 'date', label: 'Date d\'opération', icon: <Search size={16}/> },
                                    { key: 'desc', label: 'Désignation', icon: <Edit2 size={16}/> },
                                    { key: 'amount', label: 'Montant (TND)', icon: <Database size={16}/> }
                                ].map(col => (
                                    <div key={col.key} style={{ background: 'rgba(255,255,255,0.02)', padding: '24px', borderRadius: '16px', border: `1px solid ${theme.border}`, position: 'relative', overflow: 'hidden' }}>
                                        <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: mapping[col.key] ? theme.gold : theme.border }} />
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: theme.gold }}>
                                            {col.icon}
                                            <span style={{ fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', color: 'white' }}>{col.label}</span>
                                        </div>
                                        <select 
                                            value={mapping[col.key]} 
                                            onChange={e => setMapping({...mapping, [col.key]: e.target.value})} 
                                            style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', background: 'rgba(0,0,0,0.4)', border: `1px solid ${mapping[col.key] ? theme.gold : theme.border}`, color: 'white', fontSize: '14px', outline: 'none', appearance: 'none', cursor: 'pointer' }}
                                        >
                                            <option value="">-- Ignorer --</option>
                                            {headers.map(h => <option key={h} value={h}>{h}</option>)}
                                        </select>
                                    </div>
                                ))}
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'auto' }}>
                                <button 
                                    onClick={generatePreview}
                                    disabled={!mapping.date || !mapping.amount || isProcessing}
                                    style={{ background: theme.gold, color: '#000', border: 'none', padding: '16px 32px', borderRadius: '12px', fontSize: '14px', fontWeight: '800', cursor: (!mapping.date || !mapping.amount || isProcessing) ? 'not-allowed' : 'pointer', opacity: (!mapping.date || !mapping.amount) ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s', boxShadow: '0 4px 20px rgba(212, 175, 55, 0.3)' }}
                                >
                                    {isProcessing ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <>Générer l'aperçu <ArrowRight size={18} /></>}
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 'PREVIEW' && (
                        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', animation: 'fadeIn 0.3s ease-out' }}>
                            
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px' }}>
                                <div>
                                    <h3 style={{ fontSize: '24px', fontWeight: '800', margin: '0 0 8px 0' }}>Révision Intelligente</h3>
                                    <div style={{ display: 'flex', gap: '16px', fontSize: '13px' }}>
                                        <span style={{ color: theme.green, display: 'flex', alignItems: 'center', gap: '4px' }}><CheckCircle2 size={14}/> {validCount} Lignes prêtes</span>
                                        <span style={{ color: theme.textMuted }}>|</span>
                                        <span style={{ color: theme.textMuted }}>{processedLines.length} Total trouvées</span>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <span style={{ fontSize: '11px', fontWeight: '800', color: theme.textMuted, textTransform: 'uppercase' }}>Compte Cible</span>
                                    <select 
                                        value={defaultBank} 
                                        onChange={e => {
                                            const val = e.target.value;
                                            setDefaultBank(val);
                                            setPreviewData(prev => prev.map(item => ({ ...item, bank: val })));
                                        }} 
                                        style={{ padding: '10px 16px', borderRadius: '10px', background: 'rgba(0,0,0,0.4)', border: `1px solid ${theme.border}`, color: 'white', fontSize: '13px', fontWeight: '700', outline: 'none' }}
                                    >
                                        <option value="QNB">QNB</option>
                                        <option value="BIAT">BIAT</option>
                                        <option value="Espèces">Espèces</option>
                                    </select>
                                </div>
                            </div>

                            <div style={{ flex: 1, border: `1px solid ${theme.border}`, borderRadius: '16px', overflow: 'hidden', background: 'rgba(0,0,0,0.2)' }}>
                                <div style={{ overflowY: 'auto', maxHeight: '420px' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                        <thead style={{ position: 'sticky', top: 0, background: theme.cardBg, zIndex: 1, boxShadow: `0 1px 0 ${theme.border}` }}>
                                            <tr>
                                                <th style={{ padding: '16px', fontSize: '10px', fontWeight: '800', color: theme.textMuted, textTransform: 'uppercase', width: '120px' }}>État</th>
                                                <th style={{ padding: '16px', fontSize: '10px', fontWeight: '800', color: theme.textMuted, textTransform: 'uppercase', width: '150px' }}>Date</th>
                                                <th style={{ padding: '16px', fontSize: '10px', fontWeight: '800', color: theme.textMuted, textTransform: 'uppercase' }}>Désignation</th>
                                                <th style={{ padding: '16px', fontSize: '10px', fontWeight: '800', color: theme.textMuted, textTransform: 'uppercase', width: '120px' }}>Banque</th>
                                                <th style={{ padding: '16px', fontSize: '10px', fontWeight: '800', color: theme.textMuted, textTransform: 'uppercase', textAlign: 'right', width: '150px' }}>Montant</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {processedLines.map((line, i) => (
                                                <tr key={line.id} style={{ borderBottom: `1px solid ${theme.border}`, background: line.isValid ? 'transparent' : 'rgba(239, 68, 68, 0.05)', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'} onMouseLeave={e => e.currentTarget.style.background = line.isValid ? 'transparent' : 'rgba(239, 68, 68, 0.05)'}>
                                                    <td style={{ padding: '12px 16px' }}>
                                                        {line.isValid ? (
                                                            <div style={{ display: 'inline-flex', padding: '4px 8px', borderRadius: '20px', background: 'rgba(16, 185, 129, 0.1)', color: theme.green, fontSize: '10px', fontWeight: '800', alignItems: 'center', gap: '4px' }}><CheckCircle2 size={12}/> VALIDE</div>
                                                        ) : line.isDuplicate ? (
                                                            <div style={{ display: 'inline-flex', padding: '4px 8px', borderRadius: '20px', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', fontSize: '10px', fontWeight: '800', alignItems: 'center', gap: '4px' }} title="Transaction déjà existante"><AlertCircle size={12}/> DOUBLON</div>
                                                        ) : (
                                                            <div style={{ display: 'inline-flex', padding: '4px 8px', borderRadius: '20px', background: 'rgba(239, 68, 68, 0.1)', color: theme.red, fontSize: '10px', fontWeight: '800', alignItems: 'center', gap: '4px' }} title={line.errors.join(', ')}><AlertCircle size={12}/> ERREUR</div>
                                                        )}
                                                    </td>
                                                    <td style={{ padding: '12px 16px' }}>
                                                        <EditableCell value={line.date} type="date" onSave={(v) => updateCell(line.id, 'date', v)} isValid={!line.errors.includes('Date')} isEdited={line.isEdited} />
                                                    </td>
                                                    <td style={{ padding: '12px 16px' }}>
                                                        <EditableCell value={line.desc} type="text" onSave={(v) => updateCell(line.id, 'desc', v)} isValid={!line.errors.includes('Désignation')} isEdited={line.isEdited} />
                                                    </td>
                                                    <td style={{ padding: '12px 16px' }}>
                                                        <select
                                                            value={line.bank || defaultBank}
                                                            onChange={e => updateCell(line.id, 'bank', e.target.value)}
                                                            style={{
                                                                width: '100%',
                                                                background: 'rgba(0,0,0,0.3)',
                                                                border: '1px solid transparent',
                                                                color: 'white',
                                                                padding: '6px 8px',
                                                                borderRadius: '6px',
                                                                fontSize: '12px',
                                                                outline: 'none',
                                                                cursor: 'pointer'
                                                            }}
                                                        >
                                                            <option value="QNB" style={{ background: '#1a1d24', color: 'white' }}>QNB</option>
                                                            <option value="BIAT" style={{ background: '#1a1d24', color: 'white' }}>BIAT</option>
                                                            <option value="Espèces" style={{ background: '#1a1d24', color: 'white' }}>Espèces</option>
                                                        </select>
                                                    </td>
                                                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                                        <EditableCell value={line.amount} type="number" onSave={(v) => updateCell(line.id, 'amount', parseFloat(v) || 0)} isValid={!line.errors.includes('Montant')} isEdited={line.isEdited} />
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px' }}>
                                <button onClick={() => setStep('MAPPING')} style={{ background: 'transparent', border: 'none', color: theme.textMuted, fontSize: '13px', fontWeight: '700', cursor: 'pointer', padding: '8px' }}>← Revoir le mapping</button>
                                
                                <button 
                                    onClick={handleConfirm}
                                    disabled={validCount === 0 || isProcessing}
                                    style={{ background: validCount > 0 ? theme.gold : 'rgba(255,255,255,0.05)', color: validCount > 0 ? '#000' : theme.textMuted, border: 'none', padding: '16px 32px', borderRadius: '12px', fontSize: '14px', fontWeight: '800', cursor: (validCount === 0 || isProcessing) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s', boxShadow: validCount > 0 ? '0 4px 20px rgba(212, 175, 55, 0.3)' : 'none' }}
                                >
                                    {isProcessing ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <>Confirmer l'importation <ShieldCheck size={18} /></>}
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 'SUCCESS' && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', animation: 'fadeIn 0.5s ease-out' }}>
                            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px', border: `1px solid rgba(16, 185, 129, 0.2)` }}>
                                <CheckCircle2 size={40} color={theme.green} />
                            </div>
                            <h2 style={{ margin: '0 0 8px 0', fontSize: '28px', fontWeight: '900', letterSpacing: '-0.02em' }}>Succès de l'importation</h2>
                            <p style={{ color: theme.textMuted, fontSize: '15px' }}>Vos transactions ont été intégrées avec succès au tableau de bord.</p>
                        </div>
                    )}

                </div>
            </div>
            <style>{`
                @keyframes spin { 100% { transform: rotate(360deg); } }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    );
};

export default PremiumImportModal;
