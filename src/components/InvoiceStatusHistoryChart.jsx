import React, { useState, useEffect } from 'react';
import { getFactures, getClients } from '../services/storageService';

const InvoiceStatusHistoryChart = ({ missingClients = [] }) => {
    const [matrix, setMatrix] = useState({});
    const [clientList, setClientList] = useState([]);
    const [year, setYear] = useState(new Date().getFullYear());

    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

    useEffect(() => {
        const calculateHistory = () => {
            const facturesList = getFactures() || [];
            const allClients = getClients() || [];
            
            const matrixData = {};
            const clientNamesSet = new Set();

            const now = new Date();
            const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());

            // 1. Fill actual invoices
            facturesList.forEach(f => {
                const dateRef = f.dateEmi ? new Date(f.dateEmi) : null;
                if (!dateRef || isNaN(dateRef.getTime())) return;
                if (dateRef.getFullYear() !== year) return;

                const monthIdx = dateRef.getMonth();
                const montant = parseFloat(f.montant) || 0;
                
                let statutActuel = f.statut; 
                let finalEch = null;

                if (statutActuel === 'Sent' || statutActuel === 'Late') {
                    let isLate = false;
                    if (f.echeance && f.echeance !== 'N/A') {
                        finalEch = new Date(f.echeance);
                    } else if (f.clientId && f.dateEmi) {
                        const cObj = allClients.find(c => c.id === f.clientId);
                        if (cObj && cObj.delaiPaiement) {
                            finalEch = new Date(f.dateEmi);
                            finalEch.setDate(finalEch.getDate() + parseInt(cObj.delaiPaiement, 10));
                        }
                    }

                    if (finalEch) {
                        const echMidnight = new Date(finalEch.getFullYear(), finalEch.getMonth(), finalEch.getDate());
                        isLate = todayMidnight > echMidnight;
                    } else {
                        const diffHours = (now - dateRef) / (1000 * 60 * 60);
                        isLate = diffHours > 48;
                    }

                    statutActuel = isLate ? 'En Retard' : 'Envoyées';
                } else if (statutActuel === 'Paid') {
                    statutActuel = 'Payées';
                } else if (statutActuel === 'Draft') {
                    statutActuel = 'Brouillons';
                } else if (statutActuel === 'Archived') {
                    statutActuel = 'Archivées';
                }

                const clientName = f.client || 'Inconnu';
                clientNamesSet.add(clientName);

                if (!matrixData[clientName]) matrixData[clientName] = {};
                if (!matrixData[clientName][monthIdx]) matrixData[clientName][monthIdx] = [];
                
                matrixData[clientName][monthIdx].push({
                    montant,
                    statut: statutActuel,
                    id: f.id,
                    echeance: (f.statut === 'Sent' || f.statut === 'Late') ? finalEch : null
                });
            });

            // 2. Fill "À faire" missing invoices
            if (missingClients && missingClients.length > 0) {
                missingClients.forEach(mc => {
                    if (mc.targetYear === year) {
                        const clientName = mc.enseigne;
                        clientNamesSet.add(clientName);
                        
                        if (!matrixData[clientName]) matrixData[clientName] = {};
                        if (!matrixData[clientName][mc.targetMonth]) matrixData[clientName][mc.targetMonth] = [];
                        
                        matrixData[clientName][mc.targetMonth].push({
                            montant: mc.montantMensuel || 0,
                            statut: 'À faire',
                            alertStatus: mc.alertStatus
                        });
                    }
                });
            }

            setMatrix(matrixData);
            setClientList(Array.from(clientNamesSet).sort((a,b) => a.localeCompare(b)));
        };

        calculateHistory();
        window.addEventListener('storage', calculateHistory);
        return () => window.removeEventListener('storage', calculateHistory);
    }, [year, missingClients]);

    const formatMoney = (val) => new Intl.NumberFormat('fr-TN', { maximumFractionDigits: 0 }).format(val);

    const getStatusStyle = (statut, alertStatus) => {
        switch(statut) {
            case 'Payées': 
                return { background: 'rgba(16, 185, 129, 0.15)', color: '#059669', border: '1px solid rgba(16, 185, 129, 0.4)' };
            case 'Envoyées': 
                return { background: 'rgba(234, 179, 8, 0.15)', color: '#ca8a04', border: '1px solid rgba(234, 179, 8, 0.4)' };
            case 'En Retard': 
                return { background: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid rgba(239, 68, 68, 0.4)' };
            case 'Brouillons': 
                return { background: 'rgba(100, 116, 139, 0.1)', color: 'var(--text-muted)', border: '1px dashed rgba(100, 116, 139, 0.4)' };
            case 'Archivées': 
                return { background: 'rgba(71, 85, 105, 0.05)', color: '#64748b', border: '1px solid rgba(71, 85, 105, 0.2)' };
            case 'À faire':
                if (alertStatus === 'urgent') return { background: 'var(--danger-bg)', color: 'var(--danger)', border: '1px dashed var(--danger)' };
                return { background: 'rgba(245, 158, 11, 0.05)', color: '#d97706', border: '1px dashed rgba(245, 158, 11, 0.6)' };
            default: 
                return { background: 'transparent', color: 'var(--text-main)', border: '1px solid var(--border-color)' };
        }
    };

    return (
        <div style={{ background: 'var(--card-bg)', padding: '24px', borderRadius: '24px', border: '1px solid var(--border-color)', boxShadow: '0 4px 24px rgba(0,0,0,0.02)', margin: '24px 0', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                <div>
                    <h2 style={{ fontSize: '16px', fontWeight: '800', margin: '0 0 4px 0', color: 'var(--text-main)', letterSpacing: '-0.3px' }}>Historique des États de Facturation</h2>
                    <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>Matrice annuelle de facturation par client et par mois</p>
                </div>
                
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '8px', marginRight: '16px', fontSize: '9px', fontWeight: '700', textTransform: 'uppercase' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{width:'8px',height:'8px',background:'var(--danger)',borderRadius:'2px'}}></div> En Retard</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{width:'8px',height:'8px',background:'#ca8a04',borderRadius:'2px'}}></div> En Attente</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{width:'8px',height:'8px',background:'#059669',borderRadius:'2px'}}></div> Payé</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{width:'8px',height:'8px',border:'1px dashed #d97706',borderRadius:'2px'}}></div> À Faire</span>
                    </div>

                    <select 
                        value={year} 
                        onChange={(e) => setYear(parseInt(e.target.value))}
                        style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-main)', fontWeight: '700', outline: 'none', cursor: 'pointer', fontSize: '12px' }}
                    >
                        {[...Array(5)].map((_, i) => {
                            const y = new Date().getFullYear() - 2 + i;
                            return <option key={y} value={y}>{y}</option>;
                        }).reverse()}
                    </select>
                </div>
            </div>

            <div style={{ width: '100%', overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
                <table style={{ width: '100%', minWidth: '900px', borderCollapse: 'collapse', textAlign: 'left', background: 'var(--primary-bg)' }}>
                    <thead>
                        <tr>
                            <th style={{ padding: '10px 16px', borderBottom: '1px solid var(--border-color)', borderRight: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.02)', fontWeight: '800', color: 'var(--text-main)', fontSize: '11px', textTransform: 'uppercase', minWidth: '150px' }}>
                                Client
                            </th>
                            {months.map(m => (
                                <th key={m} style={{ padding: '8px 4px', borderBottom: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.02)', fontWeight: '700', color: 'var(--text-muted)', fontSize: '11px', textAlign: 'center', width: '7%' }}>
                                    {m}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {clientList.length > 0 ? clientList.map((client, idx) => (
                            <tr key={client} style={{ background: idx % 2 === 0 ? 'var(--card-bg)' : 'transparent' }}>
                                <td style={{ padding: '8px 16px', borderRight: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)', fontWeight: '700', color: 'var(--text-main)', fontSize: '11px', whiteSpace: 'nowrap' }}>
                                    {client}
                                </td>
                                {months.map((m, mIdx) => {
                                    const invoices = matrix[client]?.[mIdx] || [];
                                    return (
                                        <td key={mIdx} style={{ padding: '4px', borderBottom: '1px solid var(--border-color)', textAlign: 'center', verticalAlign: 'middle' }}>
                                            {invoices.length > 0 ? (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', alignItems: 'center' }}>
                                                    {invoices.map((inv, i) => (
                                                        <div 
                                                            key={i} 
                                                            title={`${inv.statut} : ${formatMoney(inv.montant)} TND`}
                                                            style={{ 
                                                                ...getStatusStyle(inv.statut, inv.alertStatus), 
                                                                padding: '3px 4px', 
                                                                borderRadius: '4px', 
                                                                fontSize: '9px', 
                                                                fontWeight: '800',
                                                                width: '100%',
                                                                boxSizing: 'border-box',
                                                                cursor: 'default',
                                                                whiteSpace: 'nowrap',
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis'
                                                            }}
                                                        >
                                                            {formatMoney(inv.montant)}
                                                            {(inv.statut === 'Envoyées' || inv.statut === 'En Retard') && inv.echeance && (
                                                                <div style={{ fontSize: '8px', opacity: 0.85, fontWeight: '700', borderTop: '1px solid currentColor', paddingTop: '2px', marginTop: '2px' }}>
                                                                    Éch: {inv.echeance.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span style={{ color: 'var(--text-muted)', opacity: 0.2, fontSize: '12px' }}>-</span>
                                            )}
                                        </td>
                                    );
                                })}
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={13} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                                    Aucune donnée pour l'année sélectionnée
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default InvoiceStatusHistoryChart;
