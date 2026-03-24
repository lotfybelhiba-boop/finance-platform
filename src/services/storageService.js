export const generateId = (prefix = 'ID') => {
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substring(2, 7).toUpperCase();
    return `${prefix}-${timestamp}-${randomStr}`;
};

export const getStorage = (key, defaultVal = []) => {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : defaultVal;
    } catch (e) {
        console.error(`Error reading ${key} from storage:`, e);
        return defaultVal;
    }
};

export const setStorage = (key, val) => {
    try {
        localStorage.setItem(key, JSON.stringify(val));
    } catch (e) {
        console.error(`Error saving ${key} to storage:`, e);
    }
};

// Strongly typed getters for critical entities
export const getClients = () => getStorage('mynds_clients', []);
export const saveClients = (clients) => setStorage('mynds_clients', clients);

export const getFactures = () => getStorage('mynds_factures', []);
export const saveFactures = (factures) => setStorage('mynds_factures', factures);

export const getBankTransactions = () => getStorage('mynds_bank_transactions', []);
export const saveBankTransactions = (txs) => setStorage('mynds_bank_transactions', txs);

export const migrateDataStructureIfNeeded = () => {
    const migrationKey = 'mynds_migration_v2_client_ids';
    if (localStorage.getItem(migrationKey)) {
        return; // Already migrated
    }

    console.log("Running strategic data migration (v2 - Client IDs)...");
    
    // 1. Ensure all clients have a robust ID
    let clients = getClients();
    let clientsModified = false;
    clients = clients.map(c => {
        if (!c.id) {
            c.id = generateId('CLI');
            clientsModified = true;
        }
        return c;
    });
    if (clientsModified) saveClients(clients);

    // 2. Link Factures by clientId instead of client (enseigne)
    let factures = getFactures();
    let facturesModified = false;
    factures = factures.map(f => {
        if (!f.clientId && f.client) {
            const matchedClient = clients.find(c => c.enseigne === f.client);
            if (matchedClient) {
                f.clientId = matchedClient.id;
            } else {
                f.clientId = `ORPHAN-${f.client}`; 
            }
            facturesModified = true;
        }
        return f;
    });
    if (facturesModified) saveFactures(factures);

    // 3. Migrate bank transactions
    let transactions = getBankTransactions();
    let txModified = false;
    transactions = transactions.map(t => {
        if (t.type === 'entree' && t.client && !t.clientId) {
            const matchedClient = clients.find(c => c.enseigne === t.client);
            if (matchedClient) {
                t.clientId = matchedClient.id;
            } else {
                t.clientId = `ORPHAN-${t.client}`;
            }
            txModified = true;
        }
        return t;
    });
    if (txModified) saveBankTransactions(transactions);

    // Mark migration as done
    localStorage.setItem(migrationKey, 'true');
    console.log("Migration completed.");
};
