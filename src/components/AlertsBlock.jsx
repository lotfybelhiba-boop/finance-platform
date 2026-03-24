import React, { useState, useEffect } from 'react';
import { Bell, CalendarOff, FileEdit, Send, PieChart, ChevronDown, ChevronUp } from 'lucide-react';
import { getFactures, getClients } from '../services/storageService';
import { calculatePendingInvoices } from '../utils/billingUtils';

const AlertsBlock = ({ targetMonth, targetYear }) => {
    const [factures, setFactures] = useState([]);
    const [clients, setClients] = useState([]);
    const [expandedTab, setExpandedTab] = useState(null);

    useEffect(() => {
        const loadData = () => {
            setFactures(getFactures() || []);
            setClients(getClients() || []);
        };
        
        loadData();
        window.addEventListener('storage', loadData);
        return () => window.removeEventListener('storage', loadData);
    }, []);

    const selectedM = targetMonth !== undefined ? targetMonth : new Date().getMonth();
    const selectedY = targetYear !== undefined ? targetYear : new Date().getFullYear();
    
    // Create a proxy 'today' to simulate the end of the historical month for accurate alerts
    const realToday = new Date();
    let today = new Date();
    
    if (selectedM !== 'all' && selectedY !== 'all') {
        const isHistorical = selectedY < realToday.getFullYear() || (selectedY === realToday.getFullYear() && selectedM < realToday.getMonth());
        today = new Date(selectedY, selectedM, isHistorical ? 28 : realToday.getDate());
    }
    
    today.setHours(0, 0, 0, 0);

    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    // 1. Rappelle des dates fin de nos clients (Dans les 30 prochains jours)
    const nextMonth = new Date(today);
    nextMonth.setDate(today.getDate() + 30);
    
    let expiringClients = [];
    clients.forEach(c => {
        if (c.etatClient === 'Actif' && c.dateFin) {
            const endDate = new Date(c.dateFin);
            if (endDate >= today && endDate <= nextMonth) {
                expiringClients.push({ name: c.enseigne, date: endDate.toLocaleDateString('fr-TN') });
            }
        }
    });

    // 2. Factures à faire (Abonnements actifs sans facture basé sur leur cycle)
    const pendingStats = calculatePendingInvoices(clients, factures, [], today);
    let facturesAFaire = pendingStats.missingClients.map(c => ({ name: c.enseigne }));

    // 3. Factures non envoyés (Statut Draft)
    const draftsList = factures.filter(f => f.statut === 'Draft').map(f => ({ name: f.client, montant: f.montant }));

    // 4. Rapports à faire
    const isReportTime = today.getDate() >= 25;
    const rapportsText = ["Générer les synthèses mensuelles KPI", "Vérifier la classification des charges"];

    const AlertItem = ({ id, icon, color, title, value, highlight, items, expanded, onToggle }) => (
        <div style={{ background: 'var(--bg-main)', borderRadius: '12px', border: `1px solid ${highlight ? color : 'var(--border-color)'}`, overflow: 'hidden', transition: 'all 0.2s', cursor: highlight ? 'pointer' : 'default' }}
             onClick={() => { if (highlight) onToggle(id); }}>
            
            {/* Header / Ticket */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', transition: 'background 0.2s' }}
                 onMouseOver={e => { if (highlight && !expanded) e.currentTarget.style.background = 'rgba(0,0,0,0.02)' }}
                 onMouseOut={e => { if (highlight && !expanded) e.currentTarget.style.background = 'transparent' }}>
                 
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ color: color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {icon}
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)' }}>{title}</div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ fontSize: '12px', fontWeight: '800', color: highlight ? color : 'var(--text-muted)', background: highlight ? `${color}15` : 'transparent', padding: highlight ? '4px 8px' : '0', borderRadius: '6px' }}>
                        {value}
                    </div>
                    {highlight && (
                        <div style={{ color: 'var(--text-muted)' }}>
                            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </div>
                    )}
                </div>
            </div>

            {/* Expanded List Items */}
            {expanded && items && items.length > 0 && (
                <div style={{ padding: '0 16px 12px 16px', background: 'var(--bg-main)', borderTop: `1px solid var(--border-color)` }}>
                    <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {items.map((item, idx) => (
                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '6px 8px', background: 'var(--card-bg)', borderRadius: '6px', color: 'var(--text-muted)' }}>
                                <span style={{ fontWeight: '600', color: 'var(--text-main)' }}>{item.name || item}</span>
                                {item.date && <span>Échéance: {item.date}</span>}
                                {item.montant && <span>{item.montant} TND</span>}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );

    const toggleTab = (id) => {
        setExpandedTab(expandedTab === id ? null : id);
    };

    return (
        <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '14px', margin: 0, fontWeight: '800', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Bell size={16} color="var(--accent-gold)" />
                À Surveiller
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <AlertItem 
                    id="contrats"
                    icon={<CalendarOff size={16} />} 
                    color="#f59e0b" // warning orange
                    title="Fins de contrats" 
                    value={expiringClients.length > 0 ? `${expiringClients.length} client(s)` : 'Aucun'} 
                    highlight={expiringClients.length > 0} 
                    items={expiringClients}
                    expanded={expandedTab === 'contrats'}
                    onToggle={toggleTab}
                />
                
                <AlertItem 
                    id="afaire"
                    icon={<FileEdit size={16} />} 
                    color="#3b82f6" // info blue
                    title="Factures à faire" 
                    value={facturesAFaire.length > 0 ? `${facturesAFaire.length} a faire` : 'À jour'} 
                    highlight={facturesAFaire.length > 0} 
                    items={facturesAFaire}
                    expanded={expandedTab === 'afaire'}
                    onToggle={toggleTab}
                />

                <AlertItem 
                    id="brouillons"
                    icon={<Send size={16} />} 
                    color="#ef4444" // danger red
                    title="Non envoyées" 
                    value={draftsList.length > 0 ? `${draftsList.length} brouillon(s)` : '0 brouillon'} 
                    highlight={draftsList.length > 0} 
                    items={draftsList}
                    expanded={expandedTab === 'brouillons'}
                    onToggle={toggleTab}
                />

                <AlertItem 
                    id="rapports"
                    icon={<PieChart size={16} />} 
                    color="#10b981" // success green
                    title="Rapports mensuels" 
                    value={isReportTime ? 'Urgents' : 'À faire'} 
                    highlight={isReportTime} 
                    items={rapportsText}
                    expanded={expandedTab === 'rapports'}
                    onToggle={toggleTab}
                />
            </div>
        </div>
    );
};

export default AlertsBlock;
