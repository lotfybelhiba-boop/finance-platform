import { api } from './api';

// Services de stockage centralisés pour l'application Mynds Finance
// NOTE: Le stockage LocalStorage pour les données métiers est DÉSACTIVÉ.
// Tout passe désormais par PostgreSQL via le DataContext.

export const getStorage = (key, defaultValue = []) => {
    // On ne garde LocalStorage que pour les préférences UI non critiques
    if (key.includes('config') || key.includes('pref') || key.includes('user')) {
        try {
            const stored = localStorage.getItem(key);
            return stored ? JSON.parse(stored) : defaultValue;
        } catch (e) {
            return defaultValue;
        }
    }
    return defaultValue;
};

export const setStorage = (key, value) => {
    // On ne garde LocalStorage que pour les préférences UI non critiques
    if (key.includes('config') || key.includes('pref') || key.includes('user')) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            console.error('Error writing storage', key, e);
        }
    }
};

// Ces fonctions sont conservées pour la compatibilité mais ne doivent plus être utilisées 
// pour la persistence. Le DataContext prend le relais.
export const getClients = () => [];
export const saveClients = () => {};
export const getFactures = () => [];
export const saveFactures = () => {};
export const getBankTransactions = () => [];
export const saveBankTransactions = () => {};

export const generateId = () => 'id-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);

export const generateSequentialClientId = (clients = []) => {
    const maxId = clients.reduce((max, c) => {
        const match = (c.id || '').match(/^CLT(\d+)$/);
        return match ? Math.max(max, parseInt(match[1], 10)) : max;
    }, 0);
    return `CLT${String(maxId + 1).padStart(3, '0')}`;
};

export const migrateDataStructureIfNeeded = () => {};
export const syncAllFromDB = async () => {};
