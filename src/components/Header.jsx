import React from 'react';

const Header = ({ title = "MYNDS Team", subtitle = "Dashboard Financier Mensuel", showMonthSelector = false, rightContent = null }) => {
    return (
        <div className="dashboard-header">
            <div className="header-left">
                {!showMonthSelector && !rightContent && (
                    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'none' }}>
                        {/* the global layout already has the logo in the sidebar, so we can hide or change this per page */}
                    </svg>
                )}
                <div className="header-title">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: title ? '12px' : '0' }}>
                        <div style={{ padding: '4px 10px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderRadius: '100px', fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                            Aujourd'hui
                        </div>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                            {new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())}
                        </div>
                    </div>
                    {title && <h1 style={{ margin: 0, fontSize: '32px', letterSpacing: '-1px', lineHeight: '1' }}>{title}</h1>}
                    {subtitle && <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: '15px', fontWeight: '500' }}>{subtitle}</p>}
                </div>
            </div>

            {rightContent ? (
                rightContent
            ) : showMonthSelector ? (
                <div className="month-selector">
                    <select defaultValue="09-2026">
                        <option value="07-2026">Juillet 2026</option>
                        <option value="08-2026">Août 2026</option>
                        <option value="09-2026">Septembre 2026</option>
                    </select>
                </div>
            ) : null}
        </div>
    );
};

export default Header;
