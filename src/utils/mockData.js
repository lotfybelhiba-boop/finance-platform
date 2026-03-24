export const MOCK_DATA = {
    currency: 'TND',
    tvaRate: 19,
    timbreFiscal: 1,

    // MONTHLY STATS (Current Month = September for example)
    month: 'Septembre 2026',

    // 1. Recettes du mois
    recettes: {
        totalEnCaisse: 28500, // TND HT
        enAttente: 4200,      // TND HT
        vsLastMonth: 12.5     // %
    },

    // 2. Charges du mois
    charges: {
        total: 8200,
        vsLastMonth: -2.4, // %
        breakdown: [
            { name: 'Loyer', value: 2500 },
            { name: 'Logiciels', value: 1200 },
            { name: 'Prestataires', value: 3100 },
            { name: 'Carte Techno', value: 900 },
            { name: 'Autres', value: 500 }
        ],
        tvaRecuperable: 1100 // TVA déductible manually calculated for realism
    },

    // 3. Salaires à payer
    salaires: {
        fixes: 9500,
        rhClients: 2100,
    },

    // 4. Alertes Actives
    alertes: {
        contrats: [
            { client: 'TechSolutions Inc', projet: 'Plateforme B2B', statut: 'Terminé' },
            { client: 'Global Retail', projet: 'Campagne Ads', statut: 'Presque terminé' },
            { client: 'Design Studio X', projet: 'Charte', statut: 'En attente signature' }
        ],
        impayes: [
            { client: 'Agence Alpha', montant: 1500, joursRetard: 35 },
            { client: 'Startup Z', montant: 2700, joursRetard: 12 }
        ],
        devis: [
            { client: 'Eco Build', reference: 'DEV-2026-045', joursEnvoi: 4 },
            { client: 'HealthApp', reference: 'DEV-2026-048', joursEnvoi: 5 }
        ],
        carteTechno: {
            soldeActuel: 2500,
            depensesMois: 1200,
            limiteMensuelle: 2000,
            derniereInjection: '01/09/2026'
        }
    },

    // Charts: 6 months history (HT)
    history: [
        { month: 'Avr', recettes: 22000, charges: 7500, salaires: 11000, tvaNette: 2400 },
        { month: 'Mai', recettes: 24500, charges: 8100, salaires: 11000, tvaNette: 2800 },
        { month: 'Juin', recettes: 21000, charges: 7900, salaires: 11000, tvaNette: 2100 },
        { month: 'Juil', recettes: 29000, charges: 8500, salaires: 11500, tvaNette: 3300 },
        { month: 'Août', recettes: 25300, charges: 8400, salaires: 11500, tvaNette: 2600 },
        { month: 'Sept', recettes: 28500, charges: 8200, salaires: 11600, tvaNette: 0 } // Computed in component
    ],

    // Clients activity table for current month
    clients: [
        { id: 1, nom: 'TechSolutions Inc', type: 'Abonnement', montantHT: 3500, statut: 'Non envoyée' },
        { id: 2, nom: 'Global Retail', type: 'Abonnement', montantHT: 2000, statut: 'Non envoyée' },
        { id: 3, nom: 'HealthApp', type: 'Projet', montantHT: 6500, statut: 'Payée' },
        { id: 4, nom: 'Eco Build', type: 'Projet', montantHT: 4200, statut: 'En attente' },
        { id: 5, nom: 'Design Studio X', type: 'Abonnement', montantHT: 1800, statut: 'Payée' },
        { id: 6, nom: 'Startup Z', type: 'Projet', montantHT: 2700, statut: 'En retard' },
    ],

    // Payment Matrix for the Client Payment Chart (1 = Paid, -1 = Unpaid, 0/null = No Activity)
    clientPaymentHistory: [
        { month: 'Jan', 'TechSolutions Inc': 1, 'Global Retail': 1, 'HealthApp': 1, 'Eco Build': null, 'Design Studio X': 1, 'Startup Z': null },
        { month: 'Fév', 'TechSolutions Inc': 1, 'Global Retail': 1, 'HealthApp': null, 'Eco Build': null, 'Design Studio X': 1, 'Startup Z': null },
        { month: 'Mar', 'TechSolutions Inc': 1, 'Global Retail': 1, 'HealthApp': 1, 'Eco Build': null, 'Design Studio X': 1, 'Startup Z': 1 },
        { month: 'Avr', 'TechSolutions Inc': 1, 'Global Retail': -1, 'HealthApp': null, 'Eco Build': null, 'Design Studio X': 1, 'Startup Z': 1 },
        { month: 'Mai', 'TechSolutions Inc': 1, 'Global Retail': 1, 'HealthApp': null, 'Eco Build': 1, 'Design Studio X': 1, 'Startup Z': -1 },
        { month: 'Juin', 'TechSolutions Inc': 1, 'Global Retail': 1, 'HealthApp': null, 'Eco Build': 1, 'Design Studio X': -1, 'Startup Z': null },
        { month: 'Juil', 'TechSolutions Inc': -1, 'Global Retail': 1, 'HealthApp': 1, 'Eco Build': 1, 'Design Studio X': 1, 'Startup Z': null },
        { month: 'Août', 'TechSolutions Inc': 1, 'Global Retail': 1, 'HealthApp': 1, 'Eco Build': null, 'Design Studio X': 1, 'Startup Z': 1 },
        { month: 'Sept', 'TechSolutions Inc': null, 'Global Retail': null, 'HealthApp': 1, 'Eco Build': -1, 'Design Studio X': 1, 'Startup Z': -1 },
        { month: 'Oct', 'TechSolutions Inc': null, 'Global Retail': null, 'HealthApp': null, 'Eco Build': null, 'Design Studio X': null, 'Startup Z': null },
        { month: 'Nov', 'TechSolutions Inc': null, 'Global Retail': null, 'HealthApp': null, 'Eco Build': null, 'Design Studio X': null, 'Startup Z': null },
        { month: 'Déc', 'TechSolutions Inc': null, 'Global Retail': null, 'HealthApp': null, 'Eco Build': null, 'Design Studio X': null, 'Startup Z': null },
    ]
};
