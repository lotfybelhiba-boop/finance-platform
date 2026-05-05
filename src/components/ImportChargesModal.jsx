import React, { useState, useRef } from 'react';
import { Upload, X, CheckCircle, XCircle, AlertTriangle, FileSpreadsheet, Table } from 'lucide-react';
import * as XLSX from 'xlsx';

const ImportChargesModal = ({ isOpen, onClose, onSave, existingTransactions, importCategory = 'Charges' }) => {
    const [dragActive, setDragActive] = useState(false);
    const [fileDetails, setFileDetails] = useState(null);
    const [previewData, setPreviewData] = useState([]);
    const [headers, setHeaders] = useState([]);
    
    // Mapping state (user can change auto-detected mapping)
    const [mapping, setMapping] = useState({ date: '', desc: '', amount: '' });
    
    // Default values for imported charges
    const [defaultBank, setDefaultBank] = useState('BIAT');
    
    const inputRef = useRef(null);

    if (!isOpen) return null;

    // Helper: auto-detect column names
    const detectMapping = (foundHeaders) => {
        const lowerHeaders = foundHeaders.map(h => h.toLowerCase().trim());
        let autoMap = { date: '', desc: '', amount: '' };

        // Date
        const dateIndex = lowerHeaders.findIndex(h => h.includes('date') || h === 'jour');
        if (dateIndex !== -1) autoMap.date = foundHeaders[dateIndex];

        // Description / Libellé
        const descIndex = lowerHeaders.findIndex(h => h.includes('libellé') || h.includes('libelle') || h.includes('désignation') || h.includes('description') || h.includes('opération') || h.includes('motif'));
        if (descIndex !== -1) autoMap.desc = foundHeaders[descIndex];

        // Amount / Montant
        const maxIndex = lowerHeaders.findIndex(h => h.includes('montant') || h.includes('débit') || h.includes('debit') || h.includes('valeur') || h.includes('prix'));
        if (maxIndex !== -1) autoMap.amount = foundHeaders[maxIndex];

        return autoMap;
    };

    // Helper: Parse Date properly if it's Excel format
    const parseDateValue = (val) => {
        if (!val) return '';
        if (typeof val === 'number') {
            const unixDate = new Date((val - (25567 + 2)) * 86400 * 1000);
            return unixDate.toISOString().split('T')[0];
        }
        
        const str = String(val).trim();
        if (str.includes('/')) {
            const parts = str.split('/');
            if (parts[0].length === 2 && parts[2].length >= 4) {
                return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            }
        }
        
        const parsed = new Date(str);
        if (!isNaN(parsed.getTime())) {
            return parsed.toISOString().split('T')[0];
        }

        return str;
    };

    const processFile = (file) => {
        if (!file) return;
        setFileDetails({ name: file.name, size: (file.size / 1024).toFixed(1) + ' KB' });

        const reader = new FileReader();
        reader.onload = (e) => {
            const data = e.target.result;
            try {
                const workbook = XLSX.read(data, { type: 'binary' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                
                const rawJson = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                if (rawJson.length < 2) {
                    alert("Le fichier semble vide ou n'a pas de données.");
                    return;
                }

                const extractedHeaders = rawJson[0];
                setHeaders(extractedHeaders);
                
                const autoMap = detectMapping(extractedHeaders);
                setMapping(autoMap);

                const rows = rawJson.slice(1).filter(r => r.length > 0);
                const objData = rows.map((row, rIdx) => {
                    const obj = { _rawRowIndex: rIdx };
                    extractedHeaders.forEach((h, i) => {
                        obj[h] = row[i];
                    });
                    return obj;
                });
                
                setPreviewData(objData);

            } catch (err) {
                console.error("Erreur parsing:", err);
                alert("Erreur lors de la lecture du fichier. Assurez-vous qu'il s'agit d'un Excel (.xlsx) ou CSV valide.");
            }
        };
        reader.readAsBinaryString(file);
    };

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            processFile(e.dataTransfer.files[0]);
        }
    };

    const processedLines = previewData.map(rawObj => {
        let isValid = true;
        let isDuplicate = false;
        let errors = [];

        const dateVal = parseDateValue(rawObj[mapping.date]);
        const descVal = String(rawObj[mapping.desc] || '').trim();
        let rawAmount = rawObj[mapping.amount];
        
        let amountVal = 0;
        if (rawAmount !== undefined && rawAmount !== null) {
            if (typeof rawAmount === 'string') {
                rawAmount = rawAmount.replace(/[^\d.,-]/g, '').replace(',', '.');
            }
            amountVal = Math.abs(parseFloat(rawAmount)) || 0;
        }

        if (!dateVal || dateVal === 'undefined') { isValid = false; errors.push("Date invalide"); }
        if (!descVal || descVal === 'undefined') { isValid = false; errors.push("Désignation invalide"); }
        if (amountVal <= 0) { isValid = false; errors.push("Montant invalide"); }

        if (isValid) {
            const exists = existingTransactions.some(t => 
                t.date === dateVal && 
                Math.abs(parseFloat(t.amount)) === amountVal &&
                t.desc.toLowerCase().trim() === descVal.toLowerCase()
            );
            if (exists) {
                isDuplicate = true;
                isValid = false;
                errors.push("Doublon détecté");
            }
        }

        return {
            _rawObj: rawObj,
            date: dateVal,
            desc: descVal,
            amount: amountVal,
            isValid,
            isDuplicate,
            errors
        };
    });

    const validCount = processedLines.filter(l => l.isValid).length;

    const handleConfirm = () => {
        const linesToImport = processedLines.filter(l => l.isValid);
        if (linesToImport.length === 0) {
            alert("Aucune ligne valide à importer.");
            return;
        }

        const newTransactions = linesToImport.map((line, idx) => ({
            id: `IM-${Date.now()}-${idx}`,
            date: line.date,
            desc: line.desc,
            bank: defaultBank,
            type: 'Debit',
            amount: line.amount,
            category: importCategory, // Utilisation de la prop dynamique !
            chargeType: importCategory === 'Perso' ? 'Divers' : 'Exploitations',
            chargeNature: 'Variables',
            serviceMonth: line.date.substring(0, 7)
        }));

        onSave(newTransactions);
    };

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(4px)' }}>
            <div style={{ background: 'var(--card-bg)', width: '800px', maxHeight: '90vh', borderRadius: '24px', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                
                {/* HEAD */}
                <div style={{ padding: '24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-main)' }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <FileSpreadsheet size={20} color={importCategory === 'Perso' ? '#f59e0b' : '#ca8a04'} /> 
                            Importer des Charges ({importCategory})
                        </h2>
                        <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>Associez vos colonnes et intégrez vos charges automatiquement dans Mynds.</p>
                    </div>
                    <button onClick={onClose} style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)' }}>
                        <X size={16} />
                    </button>
                </div>

                {/* BODY */}
                <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    
                    {!fileDetails ? (
                        <div 
                            onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
                            onClick={() => inputRef.current.click()}
                            style={{
                                border: `2px dashed ${dragActive ? '#ca8a04' : 'var(--border-color)'}`,
                                background: dragActive ? 'rgba(202, 138, 4, 0.02)' : 'var(--bg-main)',
                                borderRadius: '16px', padding: '40px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px'
                            }}
                        >
                            <input ref={inputRef} type="file" accept=".xlsx, .xls, .csv" onChange={e => { if (e.target.files && e.target.files[0]) processFile(e.target.files[0]); }} style={{ display: 'none' }} />
                            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'white', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                                <Upload size={28} color="var(--text-muted)" />
                            </div>
                            <div>
                                <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: '700', color: 'var(--text-main)' }}>Cliquez ou glissez votre fichier ici</h3>
                                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>Formats supportés : .xlsx, .csv</p>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Tools Area */}
                            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                                <div style={{ flex: 1, padding: '16px', background: 'var(--bg-main)', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                                    <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '12px' }}>Vérification des Colonnes (Mapping)</div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '4px' }}>Date</label>
                                            <select value={mapping.date} onChange={e => setMapping({...mapping, date: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none' }}>
                                                <option value="">-- Sélectionner --</option>
                                                {headers.map(h => <option key={h} value={h}>{h}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '4px' }}>Désignation / Libellé</label>
                                            <select value={mapping.desc} onChange={e => setMapping({...mapping, desc: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none' }}>
                                                <option value="">-- Sélectionner --</option>
                                                {headers.map(h => <option key={h} value={h}>{h}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '4px' }}>Montant</label>
                                            <select value={mapping.amount} onChange={e => setMapping({...mapping, amount: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none' }}>
                                                <option value="">-- Sélectionner --</option>
                                                {headers.map(h => <option key={h} value={h}>{h}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                <div style={{ width: '200px', padding: '16px', background: 'var(--bg-main)', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                                    <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '12px' }}>Paramètres d'import</div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '4px' }}>Compte Cible</label>
                                        <select value={defaultBank} onChange={e => setDefaultBank(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none' }}>
                                            <option value="BIAT">BIAT</option>
                                            <option value="QNB">QNB</option>
                                            <option value="Main">Espèces</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Preview Table */}
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '12px' }}>
                                    <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-main)' }}>Aperçu des données ({previewData.length} lignes trouvées)</div>
                                    <div style={{ fontSize: '12px', fontWeight: '700', color: validCount > 0 ? '#10b981' : 'var(--text-muted)' }}>
                                        {validCount} ligne(s) prête(s) à être importée(s)
                                    </div>
                                </div>

                                <div style={{ border: '1px solid var(--border-color)', borderRadius: '16px', overflow: 'auto', maxHeight: '350px' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                        <thead style={{ position: 'sticky', top: 0, background: 'white', zIndex: 1, boxShadow: '0 1px 0 var(--border-color)' }}>
                                            <tr>
                                                <th style={{ padding: '10px 16px', fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Statut</th>
                                                <th style={{ padding: '10px 16px', fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Date reconnue</th>
                                                <th style={{ padding: '10px 16px', fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Désignation reconnue</th>
                                                <th style={{ padding: '10px 16px', fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'right' }}>Montant</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {processedLines.map((line, i) => (
                                                <tr key={i} style={{ borderBottom: '1px solid var(--border-color)', background: line.isValid ? 'transparent' : 'rgba(239, 68, 68, 0.02)' }}>
                                                    <td style={{ padding: '10px 16px' }}>
                                                        {line.isValid ? (
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981', fontSize: '11px', fontWeight: '800' }}>
                                                                <CheckCircle size={14} /> OK
                                                            </div>
                                                        ) : line.isDuplicate ? (
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#f59e0b', fontSize: '11px', fontWeight: '800' }} title="Ce montant et libellé existent déjà à cette date">
                                                                <AlertTriangle size={14} /> Doublon
                                                            </div>
                                                        ) : (
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ef4444', fontSize: '11px', fontWeight: '800' }} title={line.errors.join(', ')}>
                                                                <XCircle size={14} /> Invalide
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td style={{ padding: '10px 16px', color: line.date ? 'var(--text-main)' : 'var(--text-muted)', fontSize: '13px' }}>{line.date || '-'}</td>
                                                    <td style={{ padding: '10px 16px', color: line.desc ? 'var(--text-main)' : 'var(--text-muted)', fontSize: '13px' }}>{line.desc || '-'}</td>
                                                    <td style={{ padding: '10px 16px', color: line.amount ? 'var(--text-main)' : 'var(--text-muted)', fontSize: '13px', fontWeight: '700', textAlign: 'right' }}>{line.amount ? `${line.amount} DT` : '-'}</td>
                                                </tr>
                                            ))}
                                            {processedLines.length === 0 && (
                                                <tr>
                                                    <td colSpan={4} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                                                        Ajustez le mapping des colonnes pour voir l'aperçu.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* FOOTER */}
                <div style={{ padding: '24px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: '12px', background: 'var(--bg-main)' }}>
                    <button 
                        onClick={() => {
                            if (fileDetails) { setFileDetails(null); setPreviewData([]); }
                            else { onClose(); }
                        }} 
                        style={{ padding: '10px 20px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'white', color: 'var(--text-main)', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}
                    >
                        {fileDetails ? 'Annuler le fichier' : 'Fermer'}
                    </button>
                    {fileDetails && (
                        <button 
                            onClick={handleConfirm}
                            disabled={validCount === 0}
                            style={{ padding: '10px 24px', borderRadius: '12px', border: 'none', background: validCount > 0 ? '#10b981' : 'var(--border-color)', color: 'white', fontSize: '13px', fontWeight: '800', cursor: validCount > 0 ? 'pointer' : 'not-allowed', boxShadow: validCount > 0 ? '0 4px 12px rgba(16, 185, 129, 0.2)' : 'none' }}
                        >
                            Confirmer l'import ({validCount})
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ImportChargesModal;
