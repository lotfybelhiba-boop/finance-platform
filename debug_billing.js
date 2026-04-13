
const { calculatePendingInvoices } = require('./src/utils/billingUtils');
const fs = require('fs');

// Mock storage or read from a dump if possible, but let's try to simulate with reasonable data
const mockClients = [
    { id: '1', enseigne: 'Global', etatClient: 'Actif', regime: 'Abonnement', modeCycle: 'Mois civil', montantMensuel: 1000, dateDebut: '2025-01-01' }
];

const mockFactures = [
    // No invoice for March 2026
];

const now = new Date(2026, 3, 8); // April 8th
const result = calculatePendingInvoices(mockClients, mockFactures, [], now);

console.log("Diagnostic Results (April 8th 2026):");
console.log("Count:", result.count);
console.log("Missing Clients:", JSON.stringify(result.missingClients, null, 2));

// Check March specifically
const marchEnd = new Date(2026, 3, 0); // March 31
const diffTime = marchEnd.getTime() - now.getTime();
const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
console.log("DiffDays for March 31 vs April 8:", diffDays);
