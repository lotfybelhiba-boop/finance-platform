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

export const generateSequentialClientId = (enseigne, dateDebut) => {
    const clients = getClients();
    const year = dateDebut ? new Date(dateDebut).getFullYear() : new Date().getFullYear();
    const prefix = `CL-${year}`;
    
    // Find highest sequence for this year
    const yearClients = clients.filter(c => c.id && c.id.startsWith(prefix));
    let nextSeq = 1;
    if (yearClients.length > 0) {
        const seqs = yearClients.map(c => {
            const parts = c.id.split('-');
            return parts.length >= 3 ? parseInt(parts[2], 10) : 0;
        }).filter(n => !isNaN(n));
        if (seqs.length > 0) {
            nextSeq = Math.max(...seqs) + 1;
        }
    }

    const seqStr = nextSeq.toString().padStart(3, '0');
    const slug = (enseigne || 'CLIENT')
        .toUpperCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove accents
        .replace(/[^A-Z0-9]/g, '') // Only alphanumeric
        .substring(0, 15);

    return `${prefix}-${seqStr}-${slug}`;
};

export const migrateDataStructureIfNeeded = () => {
    const migrationKey = 'mynds_migration_v3_sequential_ids';
    if (localStorage.getItem(migrationKey)) {
        return; // Already migrated
    }

    console.log("Running strategic data migration (v3 - Sequential IDs)...");
    
    // 1. Map old IDs to new sequential IDs
    let clients = getClients();
    const idMap = {}; // { oldId: newId }
    
    // Sort clients by dateDebut to ensure consistent 001, 002...
    const sortedClients = [...clients].sort((a, b) => {
        const d1 = a.dateDebut || '2000-01-01';
        const d2 = b.dateDebut || '2000-01-01';
        return d1.localeCompare(d2);
    });

    const newClients = sortedClients.map(c => {
        const oldId = c.id;
        // Temporarily clear current client from search to avoid self-counting in generateSequentialClientId
        // But wait, generateSequentialClientId uses getClients().
        // Let's implement local sequence tracking during migration.
        return c; 
    });

    // Re-implementing generation loop for migration to avoid getClients() dependency mid-loop
    const finalClients = [];
    const yearCounters = {}; // { year: count }

    sortedClients.forEach(c => {
        const year = c.dateDebut ? new Date(c.dateDebut).getFullYear() : 2024;
        yearCounters[year] = (yearCounters[year] || 0) + 1;
        
        const seqStr = yearCounters[year].toString().padStart(3, '0');
        const slug = (c.enseigne || 'CLIENT')
            .toUpperCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .replace(/[^A-Z0-9]/g, '')
            .substring(0, 15);
            
        const newId = `CL-${year}-${seqStr}-${slug}`;
        idMap[c.id] = newId;
        finalClients.push({ ...c, id: newId });
    });

    saveClients(finalClients);

    // 2. Update Factures
    let factures = getFactures();
    let facturesModified = false;
    factures = factures.map(f => {
        if (f.clientId && idMap[f.clientId]) {
            f.clientId = idMap[f.clientId];
            facturesModified = true;
        }
        return f;
    });
    if (facturesModified) saveFactures(factures);

    // 3. Update bank transactions
    let transactions = getBankTransactions();
    let txModified = false;
    transactions = transactions.map(t => {
        if (t.clientId && idMap[t.clientId]) {
            t.clientId = idMap[t.clientId];
            txModified = true;
        }
        return t;
    });
    if (txModified) saveBankTransactions(transactions);

    // Mark migration as done
    localStorage.setItem(migrationKey, 'true');
    console.log("Migration v3 completed.");
};
