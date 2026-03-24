import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FileText, Receipt, CreditCard, Users, BarChart3, Settings, Target, Calculator, PieChart, History, Landmark, AlertCircle, Menu, ChevronLeft, LogOut } from 'lucide-react';
import { getClients } from '../services/storageService';

const Sidebar = () => {
    const [hasIncompleteClients, setHasIncompleteClients] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);

    useEffect(() => {
        const checkClients = () => {
            const clients = getClients() || [];
            const hasMissing = clients.some(c => {
                if (c.etatClient !== 'Actif') return false;
                
                const requiredFields = ['enseigne', 'secteur', 'mail', 'telephone', 'projet', 'employeAssocie', 'charge', 'adresse', 'dateDebut', 'regime'];
                const hasMissingText = requiredFields.some(field => !c[field] || String(c[field]).trim() === '');
                const hasValidCost = c.projectCosts && c.projectCosts.some(cost => cost.nom && cost.montant);
                
                return hasMissingText || !hasValidCost;
            });
            setHasIncompleteClients(hasMissing);
        };
        
        checkClients();
        window.addEventListener('storage', checkClients);
        const interval = setInterval(checkClients, 2000);
        
        return () => {
            window.removeEventListener('storage', checkClients);
            clearInterval(interval);
        };
    }, []);

    return (
        <aside className="sidebar card" style={{
            width: isCollapsed ? '88px' : '260px',
            height: 'calc(100vh - 48px)',
            position: 'sticky',
            top: '24px',
            display: 'flex',
            flexDirection: 'column',
            marginRight: '32px',
            padding: isCollapsed ? '32px 16px' : '32px 24px',
            background: 'var(--card-bg)',
            backdropFilter: 'var(--glass-blur)',
            border: '1px solid var(--border-color)',
            zIndex: 10,
            transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1), padding 0.3s'
        }}>
            <div className="sidebar-header" style={{ marginBottom: '40px', display: 'flex', alignItems: 'center', justifyContent: isCollapsed ? 'center' : 'space-between' }}>
                {!isCollapsed && (
                    <div className="logo" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <svg width="40" height="40" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M 42 38 V 6 H 6 V 42 H 38" stroke="currentColor" strokeWidth="6" fill="none" strokeLinecap="square" />
                            <rect x="38" y="38" width="6" height="6" fill="#FFC105" />
                            <path d="M 14 36 L 18 12 H 22 L 24 22 L 26 12 H 30 L 34 36 H 29 L 27 20 L 24 26 L 21 20 L 19 36 Z" fill="#FFC105" stroke="#FFC105" strokeWidth="1" strokeLinejoin="round" />
                        </svg>
                        <div>
                            <div style={{ fontSize: '20px', fontWeight: '800', letterSpacing: '-0.5px', color: 'var(--text-main)', lineHeight: '1.2' }}>MYNDS</div>
                            <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--accent-gold)', letterSpacing: '1px' }}>FINANCE B2B</div>
                        </div>
                    </div>
                )}
                
                <button 
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    style={{
                        background: isCollapsed ? 'var(--text-main)' : 'transparent',
                        color: isCollapsed ? 'white' : 'var(--text-muted)',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '8px',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s'
                    }}
                    title={isCollapsed ? "Déployer le menu" : "Réduire le menu"}
                >
                    {isCollapsed ? <Menu size={20} /> : <ChevronLeft size={20} />}
                </button>
            </div>

            <nav className="sidebar-nav" style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} style={({ isActive }) => ({ display: 'flex', alignItems: 'center', justifyContent: isCollapsed ? 'center' : 'flex-start', gap: '12px', padding: '10px 16px', borderRadius: '12px', textDecoration: 'none', color: isActive ? 'var(--text-main)' : 'var(--text-muted)', fontWeight: isActive ? '700' : '600', fontSize: '14px', background: isActive ? 'rgba(255, 193, 5, 0.15)' : 'transparent', borderLeft: isActive ? '4px solid var(--accent-gold)' : '4px solid transparent', transition: 'all 0.2s', overflow: 'hidden', whiteSpace: 'nowrap' })} title={isCollapsed ? "Centrale" : ""}>
                    {({ isActive }) => (
                        <>
                            <LayoutDashboard size={20} color={isActive ? 'var(--accent-gold)' : 'currentColor'} style={{ minWidth: '20px' }} /> {!isCollapsed && "Centrale"}
                        </>
                    )}
                </NavLink>
                <NavLink to="/banque" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} style={({ isActive }) => ({ display: 'flex', alignItems: 'center', justifyContent: isCollapsed ? 'center' : 'flex-start', gap: '12px', padding: '10px 16px', borderRadius: '12px', textDecoration: 'none', color: isActive ? 'var(--text-main)' : 'var(--text-muted)', fontWeight: isActive ? '700' : '600', fontSize: '14px', background: isActive ? 'rgba(255, 193, 5, 0.15)' : 'transparent', borderLeft: isActive ? '4px solid var(--accent-gold)' : '4px solid transparent', transition: 'all 0.2s', overflow: 'hidden', whiteSpace: 'nowrap' })} title={isCollapsed ? "Banque" : ""}>
                    {({ isActive }) => (
                        <>
                            <Landmark size={20} color={isActive ? 'var(--accent-gold)' : 'currentColor'} style={{ minWidth: '20px' }} /> {!isCollapsed && "Banque"}
                        </>
                    )}
                </NavLink>
                <NavLink to="/clients" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} style={({ isActive }) => ({ display: 'flex', alignItems: 'center', justifyContent: isCollapsed ? 'center' : 'flex-start', gap: '12px', padding: '10px 16px', borderRadius: '12px', textDecoration: 'none', color: isActive ? 'var(--text-main)' : 'var(--text-muted)', fontWeight: isActive ? '700' : '600', fontSize: '14px', background: isActive ? 'rgba(255, 193, 5, 0.15)' : 'transparent', borderLeft: isActive ? '4px solid var(--accent-gold)' : '4px solid transparent', transition: 'all 0.2s', overflow: 'hidden', whiteSpace: 'nowrap' })} title={isCollapsed ? "Clients" : ""}>
                    {({ isActive }) => (
                        <>
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                <Users size={20} color={isActive ? 'var(--accent-gold)' : 'currentColor'} style={{ minWidth: '20px' }} />
                                {hasIncompleteClients && (
                                    <div style={{ position: 'absolute', top: '-2px', right: '-4px', width: '10px', height: '10px', background: 'var(--danger)', borderRadius: '50%', border: '2px solid var(--card-bg)' }} title="Des fiches clients sont incomplètes" />
                                )}
                            </div>
                            {!isCollapsed && "Clients"}
                        </>
                    )}
                </NavLink>
                <NavLink to="/factures" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} style={({ isActive }) => ({ display: 'flex', alignItems: 'center', justifyContent: isCollapsed ? 'center' : 'flex-start', gap: '12px', padding: '10px 16px', borderRadius: '12px', textDecoration: 'none', color: isActive ? 'var(--text-main)' : 'var(--text-muted)', fontWeight: isActive ? '700' : '600', fontSize: '14px', background: isActive ? 'rgba(255, 193, 5, 0.15)' : 'transparent', borderLeft: isActive ? '4px solid var(--accent-gold)' : '4px solid transparent', transition: 'all 0.2s', overflow: 'hidden', whiteSpace: 'nowrap' })} title={isCollapsed ? "Factures" : ""}>
                    {({ isActive }) => (
                        <>
                            <FileText size={20} color={isActive ? 'var(--accent-gold)' : 'currentColor'} style={{ minWidth: '20px' }} /> {!isCollapsed && "Factures"}
                        </>
                    )}
                </NavLink>
                <NavLink to="/sponsoring" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} style={({ isActive }) => ({ display: 'flex', alignItems: 'center', justifyContent: isCollapsed ? 'center' : 'flex-start', gap: '12px', padding: '10px 16px', borderRadius: '12px', textDecoration: 'none', color: isActive ? 'var(--text-main)' : 'var(--text-muted)', fontWeight: isActive ? '700' : '600', fontSize: '14px', background: isActive ? 'rgba(255, 193, 5, 0.15)' : 'transparent', borderLeft: isActive ? '4px solid var(--accent-gold)' : '4px solid transparent', transition: 'all 0.2s', overflow: 'hidden', whiteSpace: 'nowrap' })} title={isCollapsed ? "Sponsoring" : ""}>
                    {({ isActive }) => (
                        <>
                            <Target size={20} color={isActive ? 'var(--accent-gold)' : 'currentColor'} style={{ minWidth: '20px' }} /> {!isCollapsed && "Sponsoring"}
                        </>
                    )}
                </NavLink>
                <NavLink to="/finance" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} style={({ isActive }) => ({ display: 'flex', alignItems: 'center', justifyContent: isCollapsed ? 'center' : 'flex-start', gap: '12px', padding: '10px 16px', borderRadius: '12px', textDecoration: 'none', color: isActive ? 'var(--text-main)' : 'var(--text-muted)', fontWeight: isActive ? '700' : '600', fontSize: '14px', background: isActive ? 'rgba(255, 193, 5, 0.15)' : 'transparent', borderLeft: isActive ? '4px solid var(--accent-gold)' : '4px solid transparent', transition: 'all 0.2s', overflow: 'hidden', whiteSpace: 'nowrap' })} title={isCollapsed ? "Finance" : ""}>
                    {({ isActive }) => (
                        <>
                            <PieChart size={20} color={isActive ? 'var(--accent-gold)' : 'currentColor'} style={{ minWidth: '20px' }} /> {!isCollapsed && "Finance"}
                        </>
                    )}
                </NavLink>
                <NavLink to="/rapports" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} style={({ isActive }) => ({ display: 'flex', alignItems: 'center', justifyContent: isCollapsed ? 'center' : 'flex-start', gap: '12px', padding: '10px 16px', borderRadius: '12px', textDecoration: 'none', color: isActive ? 'var(--text-main)' : 'var(--text-muted)', fontWeight: isActive ? '700' : '600', fontSize: '14px', background: isActive ? 'rgba(255, 193, 5, 0.15)' : 'transparent', borderLeft: isActive ? '4px solid var(--accent-gold)' : '4px solid transparent', transition: 'all 0.2s', overflow: 'hidden', whiteSpace: 'nowrap' })} title={isCollapsed ? "Rapport" : ""}>
                    {({ isActive }) => (
                        <>
                            <BarChart3 size={20} color={isActive ? 'var(--accent-gold)' : 'currentColor'} style={{ minWidth: '20px' }} /> {!isCollapsed && "Rapport"}
                        </>
                    )}
                </NavLink>

                {!isCollapsed && <div style={{ marginTop: 'auto' }}></div>}
                {isCollapsed && <div style={{ marginTop: 'auto' }}></div>} {/* Ensure spacing remains but doesn't break flex */}

                <NavLink to="/devis" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} style={({ isActive }) => ({ display: 'flex', alignItems: 'center', justifyContent: isCollapsed ? 'center' : 'flex-start', gap: '12px', padding: '10px 16px', borderRadius: '12px', textDecoration: 'none', color: isActive ? 'var(--text-main)' : 'var(--text-muted)', fontWeight: isActive ? '700' : '600', fontSize: '14px', background: isActive ? 'rgba(255, 193, 5, 0.15)' : 'transparent', borderLeft: isActive ? '4px solid var(--accent-gold)' : '4px solid transparent', transition: 'all 0.2s', overflow: 'hidden', whiteSpace: 'nowrap' })} title={isCollapsed ? "Devis" : ""}>
                    {({ isActive }) => (
                        <>
                            <Receipt size={20} color={isActive ? 'var(--accent-gold)' : 'currentColor'} style={{ minWidth: '20px' }} /> {!isCollapsed && "Devis"}
                        </>
                    )}
                </NavLink>
                <NavLink to="/calcul" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} style={({ isActive }) => ({ display: 'flex', alignItems: 'center', justifyContent: isCollapsed ? 'center' : 'flex-start', gap: '12px', padding: '10px 16px', borderRadius: '12px', textDecoration: 'none', color: isActive ? 'var(--text-main)' : 'var(--text-muted)', fontWeight: isActive ? '700' : '600', fontSize: '14px', background: isActive ? 'rgba(255, 193, 5, 0.15)' : 'transparent', borderLeft: isActive ? '4px solid var(--accent-gold)' : '4px solid transparent', transition: 'all 0.2s', overflow: 'hidden', whiteSpace: 'nowrap' })} title={isCollapsed ? "Simulateur" : ""}>
                    {({ isActive }) => (
                        <>
                            <Calculator size={20} color={isActive ? 'var(--accent-gold)' : 'currentColor'} style={{ minWidth: '20px' }} /> {!isCollapsed && "Simulateur"}
                        </>
                    )}
                </NavLink>
                <NavLink to="/historique" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} style={({ isActive }) => ({ display: 'flex', alignItems: 'center', justifyContent: isCollapsed ? 'center' : 'flex-start', gap: '12px', padding: '10px 16px', borderRadius: '12px', textDecoration: 'none', color: isActive ? 'var(--text-main)' : 'var(--text-muted)', fontWeight: isActive ? '700' : '600', fontSize: '14px', background: isActive ? 'rgba(255, 193, 5, 0.15)' : 'transparent', borderLeft: isActive ? '4px solid var(--accent-gold)' : '4px solid transparent', transition: 'all 0.2s', overflow: 'hidden', whiteSpace: 'nowrap' })} title={isCollapsed ? "Historique" : ""}>
                    {({ isActive }) => (
                        <>
                            <History size={20} color={isActive ? 'var(--accent-gold)' : 'currentColor'} style={{ minWidth: '20px' }} /> {!isCollapsed && "Historique"}
                        </>
                    )}
                </NavLink>
                <NavLink to="/configuration" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} style={({ isActive }) => ({ display: 'flex', alignItems: 'center', justifyContent: isCollapsed ? 'center' : 'flex-start', gap: '12px', padding: '10px 16px', borderRadius: '12px', textDecoration: 'none', color: isActive ? 'var(--text-main)' : 'var(--text-muted)', fontWeight: isActive ? '700' : '600', fontSize: '14px', background: isActive ? 'rgba(255, 193, 5, 0.15)' : 'transparent', borderLeft: isActive ? '4px solid var(--accent-gold)' : '4px solid transparent', transition: 'all 0.2s', overflow: 'hidden', whiteSpace: 'nowrap', marginBottom: '16px' })} title={isCollapsed ? "Configuration" : ""}>
                    {({ isActive }) => (
                        <>
                            <Settings size={20} color={isActive ? 'var(--accent-gold)' : 'currentColor'} style={{ minWidth: '20px' }} /> {!isCollapsed && "Configuration"}
                        </>
                    )}
                </NavLink>

                {/* LOGOUT BUTTON */}
                <button 
                    onClick={() => {
                        window.confirm("Voulez-vous vraiment vous déconnecter ?") && (
                            localStorage.removeItem('mynds_auth_token'),
                            window.location.reload()
                        );
                    }}
                    style={{ 
                        display: 'flex', alignItems: 'center', justifyContent: isCollapsed ? 'center' : 'flex-start', gap: '12px', 
                        padding: '10px 16px', borderRadius: '12px', border: 'none',
                        background: 'transparent', color: 'var(--danger)', 
                        fontWeight: '700', fontSize: '14px', cursor: 'pointer',
                        transition: 'all 0.2s', overflow: 'hidden', whiteSpace: 'nowrap',
                        marginTop: 'auto'
                    }} 
                    onMouseOver={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                    onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                    title={isCollapsed ? "Se déconnecter" : ""}
                >
                    <LogOut size={20} style={{ minWidth: '20px' }} /> {!isCollapsed && "Se déconnecter"}
                </button>
            </nav>
        </aside>
    );
};

export default Sidebar;
