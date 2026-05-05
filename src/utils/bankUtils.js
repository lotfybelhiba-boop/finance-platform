/**
 * Intelligent Matching Algorithm for Bank Reconciliation
 */

export const INVOICE_STATUSES = {
    PENDING: 'Pending',             // Créée, pas encore envoyée
    SENT: 'Sent',                   // Envoyée au client
    PARTIAL: 'Partially Paid',      // Partiellement payée
    PAID_UNRECONCILED: 'Paid (Unreconciled)', // Payée selon utilisateur, mais pas trouvée en banque
    PAID_RECONCILED: 'Paid (Reconciled)',     // Matchée avec un mouvement bancaire
    LATE: 'Late'                    // En retard de paiement
};

/**
 * Tries to find a match for a bank transaction among a list of invoices
 * @param {Object} transaction - Bank transaction from extract
 * @param {Array} factures - List of invoices
 * @returns {Object|null} - Match result with score and status
 */
export const findIntelligentMatch = (transaction, factures) => {
    if (!transaction || !factures) return null;

    const desc = (transaction.desc || '').toLowerCase();
    const amount = Math.abs(parseFloat(transaction.amount));
    const txDate = new Date(transaction.date);

    // Filter potential invoices: not already reconciled and not too far in the past/future
    const potentialInvoices = factures.filter(f => 
        f.statut !== INVOICE_STATUSES.PAID_RECONCILED &&
        f.statut !== 'Archived'
    );

    let bestMatch = null;
    let maxScore = 0;

    potentialInvoices.forEach(f => {
        let score = 0;
        const fAmount = parseFloat(f.totalTTC || f.montant);

        // Rule 1: Exact ID match in description (highest priority)
        if (f.id && desc.includes(f.id.toLowerCase())) {
            score += 100;
        }

        // Rule 2: Amount match
        // Use a small epsilon for float comparison
        if (Math.abs(fAmount - amount) < 0.01) {
            score += 50;
        }

        // Rule 3: Client name match
        const clientName = (f.client || '').toLowerCase();
        if (clientName && desc.includes(clientName)) {
            score += 30;
        }

        // Rule 4: Date proximity (Bonus)
        const fDate = new Date(f.dateEmi);
        const diffDays = Math.abs(txDate - fDate) / (1000 * 60 * 60 * 24);
        if (diffDays <= 45) { // Within 1.5 months
            score += 10;
        } else if (diffDays <= 90) { // Within 3 months
            score += 5;
        }

        if (score > maxScore) {
            maxScore = score;
            bestMatch = { facture: f, score };
        }
    });

    // Threshold for a "match"
    if (maxScore >= 50) {
        return {
            status: maxScore >= 130 ? 'Match (ok)' : 'À vérifier (écart/multiple)',
            facture: bestMatch.facture,
            score: maxScore
        };
    }

    return {
        status: 'Aucun match (à traiter)',
        facture: null,
        score: 0
    };
};
