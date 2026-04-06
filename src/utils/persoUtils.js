import { getStorage, setStorage } from '../services/storageService';

/**
 * Automate pour générer les charges personnelles récurrentes.
 * Contrairement aux salaires M+1, ces charges sont généralement payées le mois même.
 */
export const generatePendingPersoCharges = () => {
    const persoConfig = getStorage('mynds_perso_config', []);
    let bankTransactions = getStorage('mynds_bank_transactions', []);
    let isModified = false;

    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    persoConfig.forEach(config => {
        if (config.active === false) return;

        // Signature unique pour éviter les doublons : PERSO_id_mois_annee
        const signature = `PERSO_${config.id}_${currentMonth}_${currentYear}`;
        const existingTx = bankTransactions.find(t => t.persoSignature === signature);

        if (!existingTx) {
            // Créer le brouillon pour le mois en cours
            const day = parseInt(config.day) || 1;
            const paymentDate = new Date(currentYear, currentMonth, day);
            
            // Si la date est déjà passée, on la met à aujourd'hui pour le brouillon si c'est le mois en cours
            // Ou on garde la date théorique. Gardons la date théorique.

            const newTx = {
                id: `TX_PERSO_${Date.now()}_${Math.floor(Math.random()*10000)}`,
                date: paymentDate.toISOString().split('T')[0],
                amount: parseFloat(config.amount) || 0,
                type: 'Debit',
                category: 'Perso', // Toujours category Perso pour isolation
                persoCategory: config.category || 'Autre', // Sous-catégorie spécifique
                bank: config.bank || 'QNB', // Par défaut sur le compte Perso
                description: `[RÉCURRENT] ${config.name}`,
                statut: 'En attente',
                isDraft: true,
                persoSignature: signature,
                isRecurrent: true
            };

            bankTransactions.push(newTx);
            isModified = true;
        }
    });

    if (isModified) {
        setStorage('mynds_bank_transactions', bankTransactions);
        console.log("💎 [Perso] Brouillons de charges personnelles récurrentes injectés.");
    }
};

export const PERSO_CATEGORIES = [
    'Loyer/Logement',
    'Alimentation',
    'Loisirs/Sorties',
    'Transport/Auto',
    'Santé',
    'Famille/Enfants',
    'Abonnements',
    'Impôts/Taxes',
    'Habillement',
    'Epargne',
    'Autre'
];
