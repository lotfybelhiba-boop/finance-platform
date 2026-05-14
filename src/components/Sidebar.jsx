import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FileText, Receipt, CreditCard, Users, Briefcase, BarChart3, Settings, Target, Calculator, PieChart, History, Landmark, AlertCircle, Menu, ChevronLeft, LogOut, Heart, Shield } from 'lucide-react';
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

    const user = JSON.parse(localStorage.getItem('mynds_user') || '{"role":"ADMIN", "permissions": ["dashboard", "finance", "banque", "rh", "clients", "factures", "users", "config", "vie-perso", "devis", "calcul", "historique"]}');

    const navItems = [
        { to: "/", label: "Centrale", icon: LayoutDashboard, permission: "dashboard" },
        { to: "/banque", label: "Banque", icon: Landmark, permission: "banque" },
        { to: "/clients", label: "Portfolio Clients", icon: Briefcase, permission: "clients", hasAlert: hasIncompleteClients },
        { to: "/rh", label: "RH", icon: Users, permission: "rh" },
        { to: "/factures", label: "Factures", icon: FileText, permission: "factures" },
        { to: "/sponsoring", label: "Sponsoring", icon: Target, permission: "dashboard" },
        { to: "/finance", label: "Finance", icon: PieChart, permission: "finance" },
        { to: "/rapports", label: "Rapport", icon: BarChart3, permission: "finance" },
        { to: "/vie-perso", label: "Vie Privée", icon: Heart, permission: "vie-perso" },
        { to: "/devis", label: "Devis", icon: Receipt, permission: "factures" },
        { to: "/calcul", label: "Simulateur", icon: Calculator, permission: "calcul" },
        { to: "/historique", label: "Historique", icon: History, permission: "historique" },
        { to: "/users", label: "Utilisateurs", icon: Shield, permission: "users" },
        { to: "/configuration", label: "Paramètres", icon: Settings, permission: "config" },
    ];

    const filteredNav = navItems.filter(item => 
        (user.role?.toUpperCase() === 'ADMIN') || 
        (user.permissions?.includes(item.permission))
    );

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

            <nav className="sidebar-nav" style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
                {filteredNav.map((item) => (
                    <NavLink 
                        key={item.to}
                        to={item.to} 
                        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} 
                        style={({ isActive }) => ({ 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: isCollapsed ? 'center' : 'flex-start', 
                            gap: '12px', 
                            padding: '8px 16px', 
                            borderRadius: '12px', 
                            textDecoration: 'none', 
                            color: isActive ? 'var(--text-main)' : 'var(--text-muted)', 
                            fontWeight: isActive ? '700' : '600', 
                            fontSize: '13px', 
                            background: isActive ? 'rgba(255, 193, 5, 0.12)' : 'transparent', 
                            borderLeft: isActive ? '4px solid var(--accent-gold)' : '4px solid transparent', 
                            transition: 'all 0.2s', 
                            overflow: 'hidden', 
                            whiteSpace: 'nowrap' 
                        })} 
                        title={isCollapsed ? item.label : ""}
                    >
                        {({ isActive }) => (
                            <>
                                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                    <item.icon size={18} color={isActive ? 'var(--accent-gold)' : 'currentColor'} style={{ minWidth: '18px' }} />
                                    {item.hasAlert && (
                                        <div style={{ position: 'absolute', top: '-2px', right: '-4px', width: '8px', height: '8px', background: 'var(--danger)', borderRadius: '50%', border: '2px solid var(--card-bg)' }} />
                                    )}
                                </div>
                                {!isCollapsed && item.label}
                            </>
                        )}
                    </NavLink>
                ))}

                <div style={{ marginTop: 'auto', paddingTop: '20px' }}>
                    <button 
                        onClick={() => {
                            window.confirm("Voulez-vous vraiment vous déconnecter ?") && (
                                localStorage.removeItem('mynds_auth_token'),
                                localStorage.removeItem('mynds_user'),
                                window.location.reload()
                            );
                        }}
                        style={{ 
                            width: '100%',
                            display: 'flex', alignItems: 'center', justifyContent: isCollapsed ? 'center' : 'flex-start', gap: '12px', 
                            padding: '10px 16px', borderRadius: '12px', border: 'none',
                            background: 'transparent', color: 'var(--danger)', 
                            fontWeight: '700', fontSize: '14px', cursor: 'pointer',
                            transition: 'all 0.2s', overflow: 'hidden', whiteSpace: 'nowrap'
                        }} 
                        onMouseOver={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                        onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                        title={isCollapsed ? "Se déconnecter" : ""}
                    >
                        <LogOut size={20} style={{ minWidth: '20px' }} /> {!isCollapsed && "Se déconnecter"}
                    </button>
                </div>
            </nav>
        </aside>
    );
};

export default Sidebar;
