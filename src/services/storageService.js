import { api } from './api';

// Services de stockage centralisés pour l'application Mynds Finance

export const getStorage = (key, defaultValue = []) => {
    try {
        const stored = localStorage.getItem(key);
        return stored ? JSON.parse(stored) : defaultValue;
    } catch (e) {
        console.error('Error reading storage', key, e);
        return defaultValue;
    }
};

export const setStorage = (key, value) => {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        
        // Background sync to API if migrated
        if (localStorage.getItem('mynds_migrated_to_pg') === 'true') {
             // We use a debounce-like approach or just direct for now
             triggerBackgroundSync();
        }
    } catch (e) {
        console.error('Error writing storage', key, e);
    }
};

export const syncAllFromDB = async () => {
    try {
        if (localStorage.getItem('mynds_migrated_to_pg') !== 'true') return;
        
        console.log("🔄 Synchronisation depuis PostgreSQL...");
        const [clients, factures, transactions, rhStates, audit] = await Promise.all([
            api.get('/clients'),
            api.get('/invoices'),
            api.get('/bank/transactions'),
            api.get('/rh-states'),
            api.get('/audit-history')
        ]);
        
        if (clients) localStorage.setItem('mynds_clients', JSON.stringify(clients));
        if (factures) localStorage.setItem('mynds_factures', JSON.stringify(factures));
        if (transactions) localStorage.setItem('mynds_bank_transactions', JSON.stringify(transactions));
        if (rhStates) localStorage.setItem('mynds_rh_states', JSON.stringify(rhStates));
        if (audit) localStorage.setItem('mynds_audit_history', JSON.stringify(audit));
        
        console.log("✅ Synchronisation terminée.");
    } catch (e) {
        console.error("Erreur de synchronisation:", e);
    }
};

let syncTimeout = null;
const triggerBackgroundSync = () => {
    if (syncTimeout) clearTimeout(syncTimeout);
    syncTimeout = setTimeout(async () => {
        try {
            console.log("📤 Syncing to PostgreSQL...");
            await api.post('/migration/import', {
                clients: getClients(),
                factures: getFactures(),
                bankTransactions: getBankTransactions(),
                rhStates: getRHStates(),
                auditHistory: getAuditHistory(),
                quotes: getStorage('mynds_devis', []),
                notes: getStorage('mynds_notes', [])
            });
            const now = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
            localStorage.setItem('mynds_last_sync', now);
            console.log("✨ Data synced at " + now);
        } catch (e) {
            console.error("Sync failed:", e);
        }
    }, 2000); // Debounce 2s
};

export const getClients = () => getStorage('mynds_clients', []);
export const saveClients = (clients) => {
    setStorage('mynds_clients', clients);
    if (localStorage.getItem('mynds_migrated_to_pg') === 'true') {
        // Here we could call individual API points if we had them, 
        // or just re-import everything. For this demo, let's assume 
        // the user manages data through the UI which handles its own saves.
    }
};

export const getFactures = () => getStorage('mynds_factures', []);
export const saveFactures = (factures) => {
    setStorage('mynds_factures', factures);
};

export const getAuditHistory = () => getStorage('mynds_audit_history', {});
export const saveAuditHistory = (history) => setStorage('mynds_audit_history', history);

export const getBankTransactions = () => getStorage('mynds_bank_transactions', []);
export const saveBankTransactions = (txs) => setStorage('mynds_bank_transactions', txs);

export const getRHStates = () => getStorage('mynds_rh_states', []);
export const saveRHStates = (states) => setStorage('mynds_rh_states', states);

export const generateId = () => 'id-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);

export const generateSequentialClientId = () => {
    const clients = getClients();
    const maxId = clients.reduce((max, c) => {
        const match = (c.id || '').match(/^CLT(\d+)$/);
        return match ? Math.max(max, parseInt(match[1], 10)) : max;
    }, 0);
    return `CLT${String(maxId + 1).padStart(3, '0')}`;
};

export const migrateDataStructureIfNeeded = () => {
    // Migration stub - prevents crash on import
    // Original migration logic was for old data format upgrades
    try {
        const version = localStorage.getItem('mynds_data_version');
        if (!version) {
            localStorage.setItem('mynds_data_version', '3');
        }
    } catch (e) {
        console.warn('Migration check skipped:', e);
    }
};

