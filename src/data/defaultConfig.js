import { getStorage, setStorage } from '../services/storageService';

export const initialSecteurs = [
    {
        id: 'SEC_TOURISME',
        nom: 'Tourisme & Hôtellerie',
        projets: ['Agences de voyage', 'Hôtels', 'Maisons d’hôtes', 'Transport touristique', 'Guides touristiques', 'Centres de villégiature', 'Campings', 'Tourisme médical', 'Événements touristiques']
    },
    {
        id: 'SEC_TECH',
        nom: 'Technologie & Informatique',
        projets: ['Développement d’applications', 'Création de sites web', 'Maintenance informatique', 'Cybersécurité', 'Agence de communication', 'Formation en informatique', 'Analyse de données', 'Intégration ERP']
    },
    {
        id: 'SEC_CONSTRUCTION',
        nom: 'Construction & Immobilier',
        projets: ['Promotion immobilière', 'Construction de bâtiments', 'Rénovation et décoration', 'Architecture', 'Gestion de projets immobiliers', "Vente ou location d'immobilier", 'Ingénierie civile']
    },
    {
        id: 'SEC_COMMERCE',
        nom: 'Commerce & Distribution',
        projets: ['E-commerce', 'Vente au détail', 'Boutiques spécialisées', 'Grossistes', 'Import/export', 'Chaînes de supermarchés', 'Logistique et entreposage']
    },
    {
        id: 'SEC_EDUCATION',
        nom: 'Éducation & Formation',
        projets: ['Écoles privées', 'Cours en ligne (E-learning)', 'Centres de formation professionnelle', 'Université privé', "Agences d'études à l'étranger", 'Formation en Design', 'Ateliers éducatifs', 'Conservatoire']
    },
    {
        id: 'SEC_SANTE',
        nom: 'Santé & Bien-être',
        projets: ['Cliniques médicales', 'Cabinets dentaires', 'Pharmacies', 'Centres de bien-être', 'Spa et massages', 'Médecines alternatives', 'Produits cosmétiques', 'Nutrition et diététique']
    },
    {
        id: 'SEC_ART',
        nom: 'Art & Divertissement',
        projets: ['Production audiovisuelle', "Galeries d'art", 'Spectacles vivants', 'Festivals', 'Édition musicale', 'Cinéma et séries', 'Activités culturelles', 'Ateliers artistiques']
    },
    {
        id: 'SEC_AGRI',
        nom: 'Agriculture & Agroalimentaire',
        projets: ['Exploitations agricoles', 'Transformation alimentaire', 'Distribution de produits agricoles', 'Élevage', 'Import/export de produits agricoles', 'Coopératives agricoles', 'Cultures biologiques']
    },
    {
        id: 'SEC_FINANCE',
        nom: 'Finance & Assurance',
        projets: ['Banques', 'Cabinets comptables', 'Sociétés de microfinance', 'Assurances', 'Conseil en investissement', 'Gestion de patrimoine', 'FinTech']
    },
    {
        id: 'SEC_ENERGIE',
        nom: 'Énergie & Environnement',
        projets: ['Énergies renouvelables (solaire, éolien)', 'Gestion des déchets', 'Fourniture d’électricité', 'Projets de reforestation', 'Équipements énergétiques', 'Gestion de l’eau', 'Consulting écologique']
    },
    {
        id: 'SEC_INDUSTRIE',
        nom: 'Industrie & Fabrication',
        projets: ['Usines de production', 'Fabrication de produits sur mesure', 'Emballage et conditionnement', 'Fabrication d’équipements industriels', 'Production de textiles', 'Exportation industrielle']
    },
    {
        id: 'SEC_TRANSPORT',
        nom: 'Transport & Logistique',
        projets: ['Entreprises de transport', 'Livraison à domicile', 'Transport international', 'Gestion de flotte', 'Services de transit', 'Location de véhicules']
    },
    {
        id: 'SEC_COM',
        nom: 'Communication & Marketing',
        projets: ['-', 'Gestion des réseaux sociaux', 'Stratégies CRM', 'Création de contenu (vidéo, rédaction)', 'Boite de développement', 'Conception graphique']
    },
    {
        id: 'SEC_MODE',
        nom: 'Mode & Design',
        projets: ['Stylisme', 'Création de vêtements', 'Accessoires', 'Bijouterie', 'Design d’intérieur', 'Fabrication artisanale']
    },
    {
        id: 'SEC_DROIT',
        nom: 'Droit & Conseil juridique',
        projets: ['Cabinets d’avocats', 'Notaires', 'Médiation et arbitrage', 'Conseil en propriété intellectuelle', 'Conseil juridique pour entreprises']
    },
    {
        id: 'SEC_SPORT',
        nom: 'Sport & Loisirs',
        projets: ['Clubs de sport', 'Gymnases', 'Organisations de tournois sportifs', 'Parcs d’attraction', 'Activités outdoor (randonnée, escalade)']
    },
    {
        id: 'SEC_SERVICES',
        nom: 'Services aux entreprises',
        projets: ['Coworking', 'Gestion administrative', 'Recrutement', 'Centres d’appel', 'Formation continue', 'Consulting']
    },
    {
        id: 'SEC_CULTURE',
        nom: 'Culture & Patrimoine',
        projets: ['Musées', 'Bibliothèques', 'Réhabilitation de sites historiques', 'Projets culturels', 'Association']
    },
    {
        id: 'SEC_MEDIA',
        nom: 'Média & Communication',
        projets: ['Télévision', 'Radio', 'Presse écrite', 'Production vidéo', 'Publications digitales', 'Relations publiques']
    }
];

export const initialServices = [
    // 1️⃣ Stratégie & Conseil
    { id: 'S_STRAT_1', categorie: 'Stratégie & Conseil', nom: 'Audit marketing global (positionnement, canaux, cohérence)', prix: 0 },
    { id: 'S_STRAT_2', categorie: 'Stratégie & Conseil', nom: 'Audit digital (site, SEO, réseaux sociaux, tracking)', prix: 0 },
    { id: 'S_STRAT_3', categorie: 'Stratégie & Conseil', nom: 'Audit branding (identité, cohérence visuelle, différenciation)', prix: 0 },
    { id: 'S_STRAT_4', categorie: 'Stratégie & Conseil', nom: 'Audit concurrentiel (benchmark local & international)', prix: 0 },
    { id: 'S_STRAT_5', categorie: 'Stratégie & Conseil', nom: 'Audit communication interne / externe', prix: 0 },
    { id: 'S_STRAT_6', categorie: 'Stratégie & Conseil', nom: 'Audit IT & cybersécurité (si applicable)', prix: 0 },
    { id: 'S_STRAT_7', categorie: 'Stratégie & Conseil', nom: 'Élaboration de stratégie marketing annuelle', prix: 0 },
    { id: 'S_STRAT_8', categorie: 'Stratégie & Conseil', nom: 'Plan de communication 360°', prix: 0 },
    { id: 'S_STRAT_9', categorie: 'Stratégie & Conseil', nom: 'Go-to-market strategy', prix: 0 },
    { id: 'S_STRAT_10', categorie: 'Stratégie & Conseil', nom: 'Stratégie de lancement produit', prix: 0 },
    { id: 'S_STRAT_11', categorie: 'Stratégie & Conseil', nom: 'Stratégie de sponsoring & partenariats', prix: 0 },
    { id: 'S_STRAT_12', categorie: 'Stratégie & Conseil', nom: 'Positionnement de marque', prix: 0 },
    { id: 'S_STRAT_13', categorie: 'Stratégie & Conseil', nom: 'Structuration d’offre', prix: 0 },
    { id: 'S_STRAT_14', categorie: 'Stratégie & Conseil', nom: 'Pricing strategy', prix: 0 },
    { id: 'S_STRAT_15', categorie: 'Stratégie & Conseil', nom: 'Funnel de conversion', prix: 0 },
    { id: 'S_STRAT_16', categorie: 'Stratégie & Conseil', nom: 'Stratégie d’acquisition B2B / B2C', prix: 0 },
    { id: 'S_STRAT_17', categorie: 'Stratégie & Conseil', nom: 'Stratégie d’expansion internationale', prix: 0 },

    // 2️⃣ Branding & Identité
    { id: 'S_BRAND_1', categorie: 'Branding & Identité', nom: 'Création d’Identité Visuelle (Logo AI, SVG, PNG, déclinaisons)', prix: 0 },
    { id: 'S_BRAND_2', categorie: 'Branding & Identité', nom: 'Charte graphique complète', prix: 0 },
    { id: 'S_BRAND_3', categorie: 'Branding & Identité', nom: 'Typographies & palette couleurs', prix: 0 },
    { id: 'S_BRAND_4', categorie: 'Branding & Identité', nom: 'Iconographie & éléments visuels', prix: 0 },
    { id: 'S_BRAND_5', categorie: 'Branding & Identité', nom: 'Plateforme de Marque (Slogan)', prix: 0 },
    { id: 'S_BRAND_6', categorie: 'Branding & Identité', nom: 'Mission / Vision / Valeurs', prix: 0 },
    { id: 'S_BRAND_7', categorie: 'Branding & Identité', nom: 'Ton de communication', prix: 0 },
    { id: 'S_BRAND_8', categorie: 'Branding & Identité', nom: 'Storytelling', prix: 0 },
    { id: 'S_BRAND_9', categorie: 'Branding & Identité', nom: 'Manifeste de marque', prix: 0 },
    { id: 'S_BRAND_10', categorie: 'Branding & Identité', nom: 'Supports Institutionnels (Carte de visite)', prix: 0 },
    { id: 'S_BRAND_11', categorie: 'Branding & Identité', nom: 'Papier en-tête', prix: 0 },
    { id: 'S_BRAND_12', categorie: 'Branding & Identité', nom: 'Signature email', prix: 0 },
    { id: 'S_BRAND_13', categorie: 'Branding & Identité', nom: 'Brochure / Catalogue', prix: 0 },
    { id: 'S_BRAND_14', categorie: 'Branding & Identité', nom: 'Présentation commerciale (PDF / PPT)', prix: 0 },
    { id: 'S_BRAND_15', categorie: 'Branding & Identité', nom: 'Portfolio', prix: 0 },

    // 3️⃣ Digital & Web
    { id: 'S_WEB_1', categorie: 'Digital & Web', nom: 'Sites Web (Site vitrine)', prix: 0 },
    { id: 'S_WEB_2', categorie: 'Digital & Web', nom: 'Site institutionnel', prix: 0 },
    { id: 'S_WEB_3', categorie: 'Digital & Web', nom: 'Landing page', prix: 0 },
    { id: 'S_WEB_4', categorie: 'Digital & Web', nom: 'Site e-commerce', prix: 0 },
    { id: 'S_WEB_5', categorie: 'Digital & Web', nom: 'Arborescence & UX', prix: 0 },
    { id: 'S_WEB_6', categorie: 'Digital & Web', nom: 'Maquettes UI', prix: 0 },
    { id: 'S_WEB_7', categorie: 'Digital & Web', nom: 'Optimisation (SEO technique & éditorial)', prix: 0 },
    { id: 'S_WEB_8', categorie: 'Digital & Web', nom: 'Optimisation Google Business', prix: 0 },
    { id: 'S_WEB_9', categorie: 'Digital & Web', nom: 'UX audit', prix: 0 },
    { id: 'S_WEB_10', categorie: 'Digital & Web', nom: 'Optimisation taux de conversion (CRO)', prix: 0 },
    { id: 'S_WEB_11', categorie: 'Digital & Web', nom: 'Maintenance & Support (Mise à jour contenu)', prix: 0 },
    { id: 'S_WEB_12', categorie: 'Digital & Web', nom: 'Sécurité & sauvegardes', prix: 0 },
    { id: 'S_WEB_13', categorie: 'Digital & Web', nom: 'Hébergement & gestion domaine', prix: 0 },

    // 4️⃣ Packs Mynds
    { id: 'S_PACK_SM_1', categorie: 'Packs Mynds', nom: 'Pack Social Media - 5 posts / mois (Création, publication FB/Insta, design, hashtags, rapport)', prix: 500 },
    { id: 'S_PACK_SM_2', categorie: 'Packs Mynds', nom: 'Pack Visibility - 12 posts FB/Insta, 8 LinkedIn, 3 Reels (Stratégie, optimisation, rapport détaillé)', prix: 800 },

    // 5️⃣ Social Media & Content
    { id: 'S_SOCIAL_1', categorie: 'Social Media & Content', nom: 'Gestion Réseaux Sociaux (Stratégie éditoriale)', prix: 0 },
    { id: 'S_SOCIAL_2', categorie: 'Social Media & Content', nom: 'Calendrier mensuel', prix: 0 },
    { id: 'S_SOCIAL_3', categorie: 'Social Media & Content', nom: 'Création de posts', prix: 0 },
    { id: 'S_SOCIAL_4', categorie: 'Social Media & Content', nom: 'Community management', prix: 0 },
    { id: 'S_SOCIAL_5', categorie: 'Social Media & Content', nom: 'Reporting mensuel', prix: 0 },
    { id: 'S_SOCIAL_6', categorie: 'Social Media & Content', nom: 'Production de Contenu (Shooting photo)', prix: 0 },
    { id: 'S_SOCIAL_7', categorie: 'Social Media & Content', nom: 'Vidéo corporate', prix: 0 },
    { id: 'S_SOCIAL_8', categorie: 'Social Media & Content', nom: 'Reels / TikTok', prix: 0 },
    { id: 'S_SOCIAL_9', categorie: 'Social Media & Content', nom: 'Motion design', prix: 0 },
    { id: 'S_SOCIAL_10', categorie: 'Social Media & Content', nom: 'Copywriting', prix: 0 },
    { id: 'S_SOCIAL_11', categorie: 'Social Media & Content', nom: 'Paid Media (Facebook & Instagram Ads)', prix: 0 },
    { id: 'S_SOCIAL_12', categorie: 'Social Media & Content', nom: 'LinkedIn Ads', prix: 0 },
    { id: 'S_SOCIAL_13', categorie: 'Social Media & Content', nom: 'Google Ads', prix: 0 },
    { id: 'S_SOCIAL_14', categorie: 'Social Media & Content', nom: 'Retargeting', prix: 0 },
    { id: 'S_SOCIAL_15', categorie: 'Social Media & Content', nom: 'Optimisation ROI', prix: 0 },

    // 5️⃣ Communication & Relations Presse
    { id: 'S_RP_1', categorie: 'Communication & Relations Presse', nom: 'Relations Médias (Rédaction communiqué de presse)', prix: 0 },
    { id: 'S_RP_2', categorie: 'Communication & Relations Presse', nom: 'Base de données journalistes', prix: 0 },
    { id: 'S_RP_3', categorie: 'Communication & Relations Presse', nom: 'Organisation interviews', prix: 0 },
    { id: 'S_RP_4', categorie: 'Communication & Relations Presse', nom: 'Couverture médiatique', prix: 0 },
    { id: 'S_RP_5', categorie: 'Communication & Relations Presse', nom: 'Communication Institutionnelle (Communication de crise)', prix: 0 },
    { id: 'S_RP_6', categorie: 'Communication & Relations Presse', nom: 'Discours & éléments de langage', prix: 0 },
    { id: 'S_RP_7', categorie: 'Communication & Relations Presse', nom: 'Stratégie de réputation', prix: 0 },

    // 6️⃣ Automation & Performance
    { id: 'S_PERF_1', categorie: 'Automation & Performance', nom: 'Marketing Automation (Email marketing)', prix: 0 },
    { id: 'S_PERF_2', categorie: 'Automation & Performance', nom: 'Séquences automatisées', prix: 0 },
    { id: 'S_PERF_3', categorie: 'Automation & Performance', nom: 'CRM structuration', prix: 0 },
    { id: 'S_PERF_4', categorie: 'Automation & Performance', nom: 'Segmentation clients', prix: 0 },
    { id: 'S_PERF_5', categorie: 'Automation & Performance', nom: 'Data & Reporting (Mise en place KPIs)', prix: 0 },
    { id: 'S_PERF_6', categorie: 'Automation & Performance', nom: 'Dashboard Google Sheets', prix: 0 },
    { id: 'S_PERF_7', categorie: 'Automation & Performance', nom: 'Reporting mensuel stratégique', prix: 0 },
    { id: 'S_PERF_8', categorie: 'Automation & Performance', nom: 'Analyse performance campagnes', prix: 0 }
];

export const loadConfig = (key, defaultData) => {
    try {
        const saved = getStorage(`mynds_config_${key}`);
        if (saved) {
            let parsed = saved;
            if (Array.isArray(parsed) && Array.isArray(defaultData)) {
                // Force remove old versions of these packages that had the wrong category
                parsed = parsed.filter(p => !['S_PACK_SM_1', 'S_PACK_SM_2'].includes(p.id));

                // To ensure new configurations get added without wiping user changes
                const missing = defaultData.filter(d => !parsed.some(p => p.id === d.id));

                if (missing.length > 0) {
                    const merged = [...parsed, ...missing];
                    setStorage(`mynds_config_${key}`, merged);
                    return merged;
                }
            }
            return parsed;
        }
        return defaultData;
    } catch (e) {
        return defaultData;
    }
};

export const saveConfig = (key, data) => {
    try {
        setStorage(`mynds_config_${key}`, data);
    } catch (e) {
        console.error('Erreur sauvegarde config', e);
    }
};
