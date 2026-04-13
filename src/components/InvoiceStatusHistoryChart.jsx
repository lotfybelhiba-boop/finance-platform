import React, { useState, useEffect, useMemo } from 'react';

const InvoiceStatusHistoryChart = ({ missingClients = [], clientsList = [], ignoredAlerts = [], facturesList = [] }) => {
    const [year, setYear] = useState(new Date().getFullYear());
    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

    const matrix = useMemo(() => {
        const data = {};
        const now = new Date();
        const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        // Process each client
        clientsList.forEach(client => {
            if (client.etatClient !== 'Actif' && client.regime !== 'Projet') {
                // Keep proyek for history if they have invoices this year
                const hasInvoicesThisYear = facturesList.some(f => 
                  f.clientId === client.id && f.dateEmi && new Date(f.dateEmi).getFullYear() === year
                );
                if (!hasInvoicesThisYear) return;
            }

            const clientName = client.enseigne;
            if (!clientName) return;
            data[clientName] = Array(12).fill(null).map(() => []);

            // 1. Process existing invoices for this client
            const clientFactures = (facturesList || []).filter(f => 
                f.clientId === client.id || 
                (f.client && f.client.toLowerCase().includes(clientName.toLowerCase()))
            );

            clientFactures.forEach(f => {
                const dateRef = f.dateEmi ? new Date(f.dateEmi) : null;
                // Priority to periodeDebut for matching the intended month
                const targetDate = f.periodeDebut ? new Date(f.periodeDebut) : dateRef;

                if (!targetDate || isNaN(targetDate.getTime())) return;
                if (targetDate.getFullYear() !== year) return;

                const monthIdx = targetDate.getMonth();
                
                let finalStatus = f.statut;
                if (finalStatus === 'Sent' || finalStatus === 'Late') {
                    // Re-calculate lateness
                    let isLate = false;
                    let finalEch = null;
                    if (f.echeance && f.echeance !== 'N/A') finalEch = new Date(f.echeance);
                    else if (f.dateEmi) {
                        finalEch = new Date(f.dateEmi);
                        finalEch.setDate(finalEch.getDate() + (client.delaiPaiement || 0));
                    }

                    if (finalEch) {
                        isLate = todayMidnight > new Date(finalEch.getFullYear(), finalEch.getMonth(), finalEch.getDate());
                    }
                    finalStatus = isLate ? 'En Retard' : 'Envoyé';
                } else if (finalStatus === 'Paid') finalStatus = 'Payé';
                else if (finalStatus === 'Draft') finalStatus = 'Brouillon';
                else if (finalStatus === 'Archived') finalStatus = 'Archivé';

                data[clientName][monthIdx].push({
                    id: f.id,
                    montant: parseFloat(f.montant) || 0,
                    statut: finalStatus,
                    type: 'invoice'
                });
            });

            // 2. Identify missing / ignored months (Subscription only)
            if (client.regime === 'Abonnement') {
                for (let m = 0; m < 12; m++) {
                    // Only check past and present months
                    if (year > now.getFullYear()) continue;
                    if (year === now.getFullYear() && m > now.getMonth()) continue;

                    // If we already have an invoice (non-draft, non-archived) for this month, skip
                    const existingCount = data[clientName][m].filter(inv => inv.statut !== 'Brouillon' && inv.statut !== 'Archivé').length;
                    if (existingCount > 0) continue;

                    // Check if ignored
                    const alertKey = `${client.id}-${m}-${year}`;
                    const ignoredEntry = ignoredAlerts.find(a => (typeof a === 'string' ? a === alertKey : a.key === alertKey));
                    
                    if (ignoredEntry) {
                        data[clientName][m].push({
                            statut: 'Ignoré',
                            reason: typeof ignoredEntry === 'string' ? '' : ignoredEntry.reason,
                            type: 'ignored'
                        });
                        continue;
                    }

                    // Check if contract started yet or ended
                    let isOutOfContract = false;
                    if (client.dateDebut) {
                        const dD = new Date(client.dateDebut);
                        if (dD.getFullYear() > year || (dD.getFullYear() === year && dD.getMonth() > m)) isOutOfContract = true;
                    }
                    if (client.dateFin) {
                        const dF = new Date(client.dateFin);
                        if (dF.getFullYear() < year || (dF.getFullYear() === year && dF.getMonth() < m)) isOutOfContract = true;
                    }

                    if (isOutOfContract) {
                        data[clientName][m].push({
                            statut: 'Hors-contrat',
                            type: 'out'
                        });
                        continue;
                    }

                    // Define if it's "Urgent" or "Soon" (Should be billed)
                    const isCurrentMonth = year === now.getFullYear() && m === now.getMonth();
                    const isOverdue = year < now.getFullYear() || (year === now.getFullYear() && m < now.getMonth());
                    
                    if (isOverdue) {
                        // On calcule le décalage pour ne pas afficher de rappels trop vieux (> 45 jours)
                        const cycleEndDate = (client.cycleDay === 1)
                            ? new Date(year, m + 1, 0)
                            : new Date(year, m + 1, (client.cycleDay || 1) - 1);
                        
                        const diffDays = Math.ceil((cycleEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                        
                        if (diffDays >= -45) {
                            data[clientName][m].push({
                                statut: 'À faire',
                                montant: client.montantMensuel || 0,
                                isUrgent: true,
                                type: 'todo'
                            });
                        }
                    } else if (isCurrentMonth) {
                        // For the current month, only show 'À faire' if it's in missingClients (Anticipation Window)
                        const isMissing = missingClients.some(mc => mc.id === client.id && mc.targetMonth === m && mc.targetYear === year);
                        if (isMissing) {
                            data[clientName][m].push({
                                statut: 'À faire',
                                montant: client.montantMensuel || 0,
                                isUrgent: false,
                                type: 'todo'
                            });
                        }
                    }
                }
            }
        });

        return data;
    }, [facturesList, clientsList, ignoredAlerts, year]);

    const clientListSorted = useMemo(() => {
        return Object.keys(matrix).sort((a,b) => a.localeCompare(b));
    }, [matrix]);

    const getStatusStyle = (statut, isUrgent) => {
        switch(statut) {
            case 'Payé': return { bg: 'rgba(16, 185, 129, 0.1)', color: '#059669', border: '1px solid rgba(16, 185, 129, 0.3)', label: 'PAYÉ' };
            case 'Envoyé': return { bg: 'rgba(234, 179, 8, 0.1)', color: '#ca8a04', border: '1px solid rgba(234, 179, 8, 0.3)', label: 'ENVOYÉ' };
            case 'En Retard': return { bg: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', label: 'RETARD' };
            case 'Brouillon': return { bg: 'rgba(100, 116, 139, 0.1)', color: '#64748b', border: '1px dashed #cbd5e1', label: 'DRAFT' };
            case 'Archivé': return { bg: 'rgba(0,0,0,0.03)', color: '#94a3b8', border: '1px solid #e2e8f0', label: 'ARCHIVE' };
            case 'Ignoré': return { bg: 'rgba(0,0,0,0.02)', color: '#94a3b8', border: '1px dotted #ccc', label: 'IGNORÉ', fontStyle: 'italic' };
            case 'Hors-contrat': return { bg: 'rgba(0,0,0,0.015)', color: '#cbd5e1', border: 'none', label: 'N/A', opacity: 0.5 };
            case 'À faire': return { 
                bg: isUrgent ? 'rgba(239, 68, 68, 0.05)' : 'rgba(245, 158, 11, 0.05)', 
                color: isUrgent ? '#ef4444' : '#d97706', 
                border: `1px dashed ${isUrgent ? '#ef4444' : '#d97706'}`,
                label: 'À FAIRE' 
            };
            default: return { bg: 'transparent', color: '#ccc', border: 'none', label: '-' };
        }
    };

    const formatMoney = (val) => new Intl.NumberFormat('fr-TN', { maximumFractionDigits: 0 }).format(val);

    return (
        <div style={{ background: 'var(--card-bg)', padding: '24px', borderRadius: '24px', border: '1px solid var(--border-color)', boxShadow: '0 4px 24px rgba(0,0,0,0.02)', margin: '24px 0', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                <div>
                    <h2 style={{ fontSize: '16px', fontWeight: '800', margin: '0 0 4px 0', color: 'var(--text-main)', letterSpacing: '-0.3px' }}>📋 Historique des États</h2>
                    <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>Matrice annuelle de facturation par client</p>
                </div>
                
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '8px', marginRight: '16px', fontSize: '9px', fontWeight: '700', textTransform: 'uppercase' }}>
                        {['Payé', 'Envoyé', 'En Retard', 'À faire', 'Ignoré'].map(s => {
                            const style = getStatusStyle(s, s === 'En Retard');
                            return (
                                <span key={s} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <div style={{width:'8px',height:'8px',background:style.bg, border: style.border, borderRadius:'2px'}}></div> {s}
                                </span>
                            );
                        })}
                    </div>

                    <select 
                        value={year} 
                        onChange={(e) => setYear(parseInt(e.target.value))}
                        style={{ padding: '6px 12px', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-main)', fontWeight: '700', outline: 'none', cursor: 'pointer', fontSize: '12px' }}
                    >
                        {[...Array(5)].map((_, i) => {
                            const y = new Date().getFullYear() - 2 + i;
                            return <option key={y} value={y}>{y}</option>;
                        }).reverse()}
                    </select>
                </div>
            </div>

            <div style={{ width: '100%', overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: '16px' }}>
                <table style={{ width: '100%', minWidth: '1000px', borderCollapse: 'collapse', textAlign: 'left', tableLayout: 'fixed' }}>
                    <thead>
                        <tr style={{ background: 'rgba(0,0,0,0.015)' }}>
                            <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', borderRight: '1px solid var(--border-color)', fontWeight: '800', color: 'var(--text-main)', fontSize: '11px', textTransform: 'uppercase', width: '180px' }}>
                                Client
                            </th>
                            {months.map(m => (
                                <th key={m} style={{ padding: '12px 4px', borderBottom: '1px solid var(--border-color)', fontWeight: '700', color: 'var(--text-muted)', fontSize: '11px', textAlign: 'center' }}>
                                    {m}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {clientListSorted.length > 0 ? clientListSorted.map((client, idx) => (
                            <tr key={client} style={{ background: idx % 2 === 0 ? 'rgba(0,0,0,0.01)' : 'transparent', transition: 'background 0.2s' }}>
                                <td style={{ padding: '10px 16px', borderRight: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)', fontWeight: '700', color: 'var(--text-main)', fontSize: '11px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {client}
                                </td>
                                {months.map((m, mIdx) => {
                                    const items = matrix[client]?.[mIdx] || [];
                                    return (
                                        <td key={mIdx} style={{ padding: '4px', borderBottom: '1px solid var(--border-color)', textAlign: 'center', verticalAlign: 'middle' }}>
                                            {items.length > 0 ? (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'center' }}>
                                                    {items.map((it, i) => {
                                                        const style = getStatusStyle(it.statut, it.isUrgent);
                                                        return (
                                                            <div 
                                                                key={i} 
                                                                title={it.statut === 'Ignoré' ? `Raison: ${it.reason || 'N/A'}` : `${it.statut} : ${formatMoney(it.montant)} TND`}
                                                                style={{ 
                                                                    background: style.bg,
                                                                    color: style.color,
                                                                    border: style.border,
                                                                    fontStyle: style.fontStyle || 'normal',
                                                                    opacity: style.opacity || 1,
                                                                    padding: '2px 4px', 
                                                                    borderRadius: '4px', 
                                                                    fontSize: '8px', 
                                                                    fontWeight: style.statut === 'Hors-contrat' ? '400' : '800',
                                                                    width: '100%',
                                                                    boxSizing: 'border-box',
                                                                    whiteSpace: 'nowrap',
                                                                    overflow: 'hidden',
                                                                    textOverflow: 'ellipsis'
                                                                }}
                                                            >
                                                                {style.label}
                                                                {(it.statut !== 'Ignoré' && it.statut !== 'Archivé' && it.montant > 0) && (
                                                                    <div style={{ fontSize: '7px', opacity: 0.8, marginTop: '1px', borderTop: '0.5px solid currentColor' }}>
                                                                        {formatMoney(it.montant)}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <span style={{ color: '#ccc', opacity: 0.2, fontSize: '10px' }}>-</span>
                                            )}
                                        </td>
                                    );
                                })}
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={13} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                                    Aucune donnée à afficher pour cette année.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            
            <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(0,0,0,0.015)', borderRadius: '12px', display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                    <span style={{ fontWeight: '700', color: 'var(--text-main)' }}>💡 Guide de la Matrice :</span> Les factures sont indexées par leur **période de début**. "À faire" indique un mois sans facture valide (hors brouillons/archivées).
                </div>
            </div>
        </div>
    );
};

export default InvoiceStatusHistoryChart;
