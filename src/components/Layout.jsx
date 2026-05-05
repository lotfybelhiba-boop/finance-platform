import React from 'react';
import Sidebar from './Sidebar';
import NotesWidget from './NotesWidget';
import MigrationSync from './MigrationSync';
import { User, LogOut } from 'lucide-react';

const Layout = ({ children }) => {
    return (
        <div className="app-container">
            {/* Decorative Background Elements for Glassmorphism */}
            <div className="bg-blob blob-1"></div>
            <div className="bg-blob blob-2"></div>
            <div className="bg-blob blob-3"></div>

            <div className="dashboard-content" style={{ display: 'flex', height: '100%' }}>
                <Sidebar />
                <main className="main-content" style={{ flex: 1, overflowY: 'auto', paddingBottom: '32px' }}>
                    <div style={{ padding: '12px 40px', background: 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            {localStorage.getItem('mynds_user') && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'white', padding: '4px 12px', borderRadius: '10px', border: '1px solid var(--border-color)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                                    <div style={{ width: '24px', height: '24px', background: 'var(--accent-gold)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                                        <User size={14} />
                                    </div>
                                    <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-main)' }}>
                                        {JSON.parse(localStorage.getItem('mynds_user')).name}
                                    </span>
                                    <button 
                                        onClick={() => { localStorage.removeItem('mynds_user'); window.location.reload(); }}
                                        style={{ marginLeft: '8px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', hover: { color: 'var(--danger)' } }}
                                        title="Déconnexion"
                                    >
                                        <LogOut size={14} />
                                    </button>
                                </div>
                            )}
                        </div>
                        <MigrationSync />
                    </div>
                    {children}
                </main>
            </div>
            
            {/* Widget Pense-bêtes global */}
            <NotesWidget />
        </div>
    );
};

export default Layout;
