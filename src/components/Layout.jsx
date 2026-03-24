import React from 'react';
import Sidebar from './Sidebar';

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
                    {children}
                </main>
            </div>
        </div>
    );
};

export default Layout;
