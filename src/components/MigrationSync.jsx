import React, { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle, AlertTriangle, Database } from 'lucide-react';
import { api } from '../services/api';

const MigrationSync = () => {
    const [status, setStatus] = useState('idle'); // 'idle', 'migrating', 'success', 'error'
    const [message, setMessage] = useState('');
    const [lastSync, setLastSync] = useState(localStorage.getItem('mynds_last_sync') || '');

    const startMigration = async () => {
        setStatus('migrating');
        setMessage('Préparation des données...');

        try {
            // 1. Collect all data from localStorage
            const payload = {
                clients: JSON.parse(localStorage.getItem('mynds_clients') || '[]'),
                factures: JSON.parse(localStorage.getItem('mynds_factures') || '[]'),
                bankTransactions: JSON.parse(localStorage.getItem('mynds_bank_transactions') || '[]'),
                rhStates: JSON.parse(localStorage.getItem('mynds_rh_states') || '[]'),
                auditHistory: JSON.parse(localStorage.getItem('mynds_audit_history') || '{}'),
                quotes: JSON.parse(localStorage.getItem('mynds_devis') || '[]'),
                notes: JSON.parse(localStorage.getItem('mynds_notes') || '[]')
            };

            setMessage(`Migration de ${payload.clients.length} clients et ${payload.factures.length} factures vers PostgreSQL...`);

            // 2. Send to backend
            await api.post('/migration/import', payload);

            setStatus('success');
            setMessage('Migration réussie ! Vos données sont maintenant sécurisées dans PostgreSQL.');
            
            // Mark as migrated to avoid annoying prompts
            localStorage.setItem('mynds_migrated_to_pg', 'true');

        } catch (error) {
            console.error(error);
            setStatus('error');
            const errorMsg = error.data?.error || error.message;
            setMessage(`Erreur: ${errorMsg}`);
        }
    };

    if (localStorage.getItem('mynds_migrated_to_pg') === 'true' && status === 'idle') {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', fontSize: '11px', fontWeight: '700' }}>
                        <Database size={14} /> PostgreSQL CONNECTÉ
                    </div>
                    <button 
                        onClick={() => {
                            if (window.confirm("Voulez-vous forcer une nouvelle migration complète de vos données locales vers PostgreSQL ?")) {
                                startMigration();
                            }
                        }}
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '10px', fontWeight: '600', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}
                    >
                        Re-migrer tout
                    </button>
                </div>
                {lastSync && (
                    <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.5)', fontWeight: '500' }}>
                        Dernière sync: {lastSync}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {status === 'idle' && (
                <button 
                    onClick={startMigration}
                    style={{ 
                        padding: '12px 24px', borderRadius: '14px', background: '#F59E0B', 
                        color: '#000', fontWeight: '900', fontSize: '13px', border: 'none', 
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px',
                        boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)'
                    }}
                >
                    <RefreshCw size={18} /> CLIQUE ICI POUR MIGRER VERS POSTGRESQL
                </button>
            )}

            {status === 'migrating' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-gold)', fontSize: '11px', fontWeight: '700' }}>
                    <RefreshCw size={14} className="animate-spin" /> {message}
                </div>
            )}

            {status === 'success' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', fontSize: '11px', fontWeight: '700' }}>
                    <CheckCircle size={14} /> {message}
                </div>
            )}

            {status === 'error' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--danger)', fontSize: '11px', fontWeight: '700' }}>
                    <AlertTriangle size={14} /> {message}
                    <button onClick={() => setStatus('idle')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', textDecoration: 'underline', cursor: 'pointer' }}>Réessayer</button>
                </div>
            )}
        </div>
    );
};

export default MigrationSync;
