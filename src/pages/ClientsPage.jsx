import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import ClientModal from '../components/ClientModal';
import { Search, Plus, MoreHorizontal, LayoutGrid, List, Edit2, Trash2, Archive, Upload, Users, RefreshCw, Briefcase, ShieldAlert } from 'lucide-react';
import Papa from 'papaparse';
import { getClients, saveClients, getStorage, getFactures } from '../services/storageService';
import { calculatePendingInvoices } from '../utils/billingUtils';


const defaultDummyClients = [
    {
        id: 'CLI-KINDY-001',
        enseigne: 'Elkindy',
        projet: 'Conservatoire',
        secteur: 'Éducation & Formation',
        etatClient: 'Actif',
        charge: 'Lotfi Erraies',
        dateDebut: '2024-03-01',
        mf: '0797113J',
        mail: 'conservatoireelkindy@gmail.com',
        telephone: '20669545',
        adresse: 'Villa N°24, Rue Manzel Mabrouk City olympique 1003 Tunis, Tunisie',
        web: 'elkindy.dal.com.tn',
        regime: 'Abonnement',
        montantMensuel: 800,
        jourPaiement: 5,
        servicesRecurrents: [],
        projectCosts: [],
        totalCosts: 0,
        netMargin: 800
    },
    {
        id: 'CLI-BOSCH-001',
        enseigne: 'Robert Bosch Tunisie',
        projet: 'Fabrication d’équipements industriels',
        secteur: 'Industrie & Fabrication',
        etatClient: 'Actif',
        charge: 'Aymen Meddeb',
        dateDebut: '2025-05-15',
        mf: '1432014Q',
        mail: 'Aymen.Meddeb@bosch.com',
        telephone: '58521422',
        adresse: '12 rue Lac Toba, Les Berges du Lac, 1053 Tunis',
        web: 'https://www.bosch-homecomfort.com/tn/fr/residentiel/accueil/',
        regime: 'Abonnement',
        montantMensuel: 1200,
        jourPaiement: 5,
        servicesRecurrents: [],
        projectCosts: [],
        totalCosts: 0,
        netMargin: 1200
    },
    {
        id: 'CLI-001',
        enseigne: 'Acme Corp',
        projet: 'Refonte Site E-commerce',
        secteur: 'Retail',
        etatClient: 'Actif',
        charge: 'Sarah Connor',
        dateDebut: '2024-01-15',
        mf: '1234567/A/A/M/000',
        mail: 'contact@acme.com',
        adresse: 'Les Berges du Lac, Tunis',
        regime: 'Abonnement',
        montantMensuel: 1500,
        jourPaiement: 5,
        servicesRecurrents: [
            { id: 1, desc: 'Community Management Premium' },
            { id: 2, desc: 'Audit SEO Mensuel' }
        ],
        projectCosts: [
            { id: 1, nom: 'Marketeur', montant: 500 },
            { id: 2, nom: 'Designer', montant: 200 }
        ],
        totalCosts: 700,
        netMargin: 800
    },
    {
        id: 'CLI-002',
        enseigne: 'TechCorp SA',
        projet: 'Maintenance IT',
        secteur: 'IT',
        etatClient: 'Actif',
        charge: 'Ahmed Ben Ali',
        dateDebut: '2024-02-01',
        mf: '9876543/B/B/N/111',
        mail: 'ahmed@techcorp.tn',
        telephone: '28 123 456',
        adresse: 'Centre Urbain Nord, Tunis',
        regime: 'Abonnement',
        montantMensuel: 2000,
        jourPaiement: 1, // Start of month, will trigger black dot if no invoice
        servicesRecurrents: [],
        projectCosts: [],
        totalCosts: 0,
        netMargin: 2000
    },
    {
        id: 'CLI-003',
        enseigne: 'Global Mkt',
        projet: 'Campagne Ads Q3',
        secteur: 'Marketing',
        etatClient: 'Actif',
        charge: 'Sarah Mansour',
        dateDebut: '2024-03-01',
        regime: 'Projet',
        dureeMois: 3,
        montantTotal: 4500,
        datePaiement: '2024-06-30',
        projectCosts: [
            { id: 1, nom: 'Achat Media', montant: 1500 }
        ],
        totalCosts: 1500,
        netMargin: 3000
    },
    {
        id: 'CLI-004',
        enseigne: 'Studio Design',
        projet: 'Branding 2024',
        secteur: 'Design',
        etatClient: 'Actif',
        charge: 'Karim Tounsi',
        dateDebut: '2024-01-10',
        regime: 'Abonnement',
        montantMensuel: 800,
        jourPaiement: 10,
        servicesRecurrents: [],
        projectCosts: [],
        totalCosts: 0,
        netMargin: 800
    },
    {
        id: 'CLI-005',
        enseigne: 'Retail Plus',
        projet: 'Ouverture Boutique',
        secteur: 'Commerce',
        etatClient: 'Inactif',
        charge: 'Sami Trabelsi',
        dateDebut: '2023-11-01',
        regime: 'Projet',
        dureeMois: 1,
        montantTotal: 1200,
        projectCosts: [],
        totalCosts: 0,
        netMargin: 1200
    }
];

const ClientsPage = () => {
    const [isClientModalOpen, setIsClientModalOpen] = useState(false);

    const [clients, setClients] = useState(() => {
        let parsed = getClients();
        if (parsed && parsed.length > 0) {
            // Ensure mandatory clients by ID
            if (!parsed.some(c => c.id === 'CLI-KINDY-001')) {
                const elkindy = defaultDummyClients.find(c => c.id === 'CLI-KINDY-001');
                if (elkindy) parsed.push(elkindy);
            }
            if (!parsed.some(c => c.id === 'CLI-BOSCH-001')) {
                const bosch = defaultDummyClients.find(c => c.id === 'CLI-BOSCH-001');
                if (bosch) parsed.push(bosch);
            }
            return parsed;
        }
        return defaultDummyClients;
    });

    const [rhList, setRhList] = useState(() => getStorage('mynds_rh', []));

    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('Actif'); // Default to Active only

    // Écouteur pour la synchronisation multi-onglets
    useEffect(() => {
        const syncData = () => {
            const parsed = getClients();
            if (parsed && parsed.length > 0) {
                setClients(parsed);
            }
            setRhList(getStorage('mynds_rh', []));
        };
        window.addEventListener('storage', syncData);
        return () => window.removeEventListener('storage', syncData);
    }, []);

    const factures = getFactures() || [];
    const pendingStats = React.useMemo(() => {
        return calculatePendingInvoices(clients, factures);
    }, [clients, factures]);

    const getBillingStatus = (clientId) => {
        const clientPending = pendingStats.missingClients.filter(c => c.id === clientId);
        if (clientPending.length > 0) {
            const isUrgent = clientPending.some(c => c.alertStatus === 'urgent');
            return {
                num: clientPending.length,
                label: `${clientPending.length} manquante${clientPending.length > 1 ? 's' : ''}`,
                color: isUrgent ? 'var(--danger)' : '#f59e0b',
                bg: isUrgent ? 'var(--danger-bg)' : 'rgba(245, 158, 11, 0.1)',
                icon: true
            };
        }
        return { num: 0, label: 'À jour', color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)', icon: false };
    };

    // Sauvegarde automatique
    useEffect(() => {
        saveClients(clients);
    }, [clients]);

    const [viewMode, setViewMode] = useState('cards'); // 'cards' ou 'table'
    const [editingClient, setEditingClient] = useState(null);
    const fileInputRef = React.useRef(null);

    const formatMoney = (val) => new Intl.NumberFormat('fr-TN', { style: 'currency', currency: 'TND', minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(val);

    const calculateDuration = (startDate) => {
        if (!startDate) return 'N/A';
        const start = new Date(startDate);
        const now = new Date();

        let years = now.getFullYear() - start.getFullYear();
        let months = now.getMonth() - start.getMonth();
        let days = now.getDate() - start.getDate();

        if (days < 0) {
            months--;
            const prevMonthLastDay = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
            days += prevMonthLastDay;
        }
        if (months < 0) {
            years--;
            months += 12;
        }

        const parts = [];
        if (years > 0) parts.push(`${years} an${years > 1 ? 's' : ''}`);
        if (months > 0) parts.push(`${months} m`);
        if (days > 0) parts.push(`${days} j`);

        return parts.length > 0 ? parts.join(' ') : '0 j';
    };

    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const importedClients = results.data.map((row, index) => {
                    // Nettoyage et mapping basique des colonnes
                    const isAbonnement = row['Regime']?.toLowerCase() === 'abonnement';
                    const montantMensuel = isAbonnement ? parseFloat(row['Montant Mensuel']) || 0 : null;
                    const montantTotal = !isAbonnement ? parseFloat(row['Montant Total']) || 0 : null;

                    return {
                        id: `CLI-IMP-${Date.now()}-${index}`,
                        enseigne: row['Enseigne'] || 'Client Importé',
                        projet: row['Projet'] || '',
                        secteur: row['Secteur'] || '',
                        etatClient: row['Statut'] || 'Actif',
                        charge: row['Responsable'] || '',
                        dateDebut: new Date().toISOString().split('T')[0],
                        regime: isAbonnement ? 'Abonnement' : 'One-Shot',
                        montantMensuel: montantMensuel,
                        montantTotal: montantTotal,
                        jourPaiement: isAbonnement ? 5 : null,
                        dureeMois: !isAbonnement ? 1 : null,
                        servicesRecurrents: [],
                        projectCosts: [],
                        totalCosts: 0,
                        netMargin: isAbonnement ? montantMensuel : montantTotal
                    };
                });

                if (importedClients.length > 0) {
                    setClients([...importedClients, ...clients]);
                    alert(`${importedClients.length} clients importés avec succès !`);
                } else {
                    alert("Aucune donnée valide trouvée dans le fichier CSV.");
                }

                // Reset input
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
            },
            error: (error) => {
                console.error("Erreur lors de l'import CSV :", error);
                alert("Erreur lors de la lecture du fichier CSV.");
            }
        });
    };

    const handleSaveClient = (newClient) => {
        if (editingClient) {
            setClients(clients.map(c => c.id === newClient.id ? newClient : c));
            setEditingClient(null);
        } else {
            setClients([newClient, ...clients]);
        }
    };

    const handleEditClient = (client) => {
        setEditingClient(client);
        setIsClientModalOpen(true);
    };

    const handleDeleteClient = (id) => {
        let allFactures = [];
        try {
            allFactures = getFactures();
        } catch (e) {
            console.error("Erreur lecture factures:", e);
        }

        const hasFactures = allFactures.some(f => f.clientId === id || f.client === clients.find(c => c.id === id)?.enseigne);

        if (hasFactures) {
            alert("❗ Opération refusée.\nCe client possède des factures liées. Veuillez plutôt l'archiver ou le passer en statut 'Inactif' pour ne pas corrompre l'intégrité de vos historiques financiers et Dashboard.");
            return;
        }

        if (window.confirm('Voulez-vous vraiment supprimer définitivement ce client ?')) {
            setClients(clients.filter(c => c.id !== id));
        }
    };

    const handleArchiveClient = (id) => {
        setClients(clients.map(c => c.id === id ? { ...c, etatClient: 'Inactif' } : c));
    };

    const getStatusStyle = (status) => {
        switch (status) {
            case 'Actif': return { bg: 'rgba(34, 197, 94, 0.1)', color: '#16A34A' };
            case 'Pause': return { bg: 'rgba(245, 158, 11, 0.1)', color: '#D97706' };
            case 'Inactif': return { bg: 'rgba(239, 68, 68, 0.1)', color: '#DC2626' };
            case 'Prospect': return { bg: 'rgba(59, 130, 246, 0.1)', color: '#2563EB' };
            default: return { bg: 'var(--bg-main)', color: 'var(--text-secondary)' };
        }
    };

    // KPI Calculations based on ALL clients (not just filtered)
    const totalClients = clients.length;
    const activeContracts = clients.filter(c => c.etatClient === 'Actif').length;
    const totalAbo = clients.filter(c => c.regime === 'Abonnement').length;
    const totalOneShot = clients.filter(c => c.regime === 'One-Shot').length;

    // Filter Clients for Display
    const displayedClients = clients.filter(c => {
        const matchSearch = c.enseigne.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (c.projet && c.projet.toLowerCase().includes(searchTerm.toLowerCase()));

        if (filterStatus === 'Sans Management') {
            const hasNoManagement = c.etatClient === 'Actif' && !(c.projectCosts && c.projectCosts.some(cost => 
                cost.specialite === 'Mng' || (cost.nom && cost.nom.toLowerCase().includes('management'))
            ));
            return matchSearch && hasNoManagement;
        }
        if (filterStatus === 'Abonnement') return matchSearch && c.regime === 'Abonnement';
        if (filterStatus === 'One-Shot') return matchSearch && c.regime === 'One-Shot';
        if (filterStatus === 'Tous') return matchSearch;
        return matchSearch && c.etatClient === filterStatus;
    });

    const missingManagementCount = clients.filter(c => 
        c.etatClient === 'Actif' && !(c.projectCosts && c.projectCosts.some(cost => 
            cost.specialite === 'Mng' || (cost.nom && cost.nom.toLowerCase().includes('management'))
        ))
    ).length;

    return (
        <div style={{ paddingBottom: '40px' }}>
            <Header title="Clients & Portefeuille" subtitle="Gestion de vos contrats et régime de facturation" />

            {/* KPI SUMMARY BLOCK */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
                
                {/* Main KPIs Group (3-in-1 Block) */}
                <div style={{ display: 'flex', background: 'var(--card-bg)', borderRadius: '20px', border: '1px solid var(--border-color)', boxShadow: '0 4px 12px rgba(0,0,0,0.02)', overflow: 'hidden', flex: 1, minWidth: '320px' }}>
                    
                    {/* Total Clients */}
                    <div onClick={() => setFilterStatus('Tous')} style={{ flex: 1, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', background: filterStatus === 'Tous' ? 'rgba(59, 130, 246, 0.05)' : 'transparent', borderBottom: filterStatus === 'Tous' ? '2px solid #3B82F6' : '2px solid transparent', transition: 'all 0.2s' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.1)', color: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Users size={20} strokeWidth={2.5} />
                        </div>
                        <div>
                            <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Clients</div>
                            <div style={{ fontSize: '24px', fontWeight: '800', color: filterStatus === 'Tous' ? '#3B82F6' : 'var(--text-main)', lineHeight: '1' }}>{totalClients}</div>
                        </div>
                    </div>

                    <div style={{ width: '1px', background: 'var(--border-color)', opacity: 0.5 }}></div> {/* Divider */}

                    {/* Abonnements */}
                    <div onClick={() => setFilterStatus('Abonnement')} style={{ flex: 1, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', background: filterStatus === 'Abonnement' ? 'rgba(255, 193, 5, 0.05)' : 'transparent', borderBottom: filterStatus === 'Abonnement' ? '2px solid var(--accent-gold)' : '2px solid transparent', transition: 'all 0.2s' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(255, 193, 5, 0.1)', color: 'var(--accent-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <RefreshCw size={20} strokeWidth={2.5} />
                        </div>
                        <div>
                            <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Abonnements</div>
                            <div style={{ fontSize: '24px', fontWeight: '800', color: filterStatus === 'Abonnement' ? 'var(--accent-gold)' : 'var(--text-main)', lineHeight: '1' }}>{totalAbo}</div>
                        </div>
                    </div>

                    <div style={{ width: '1px', background: 'var(--border-color)', opacity: 0.5 }}></div> {/* Divider */}

                    {/* One-Shot */}
                    <div onClick={() => setFilterStatus('One-Shot')} style={{ flex: 1, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', background: filterStatus === 'One-Shot' ? 'rgba(168, 85, 247, 0.05)' : 'transparent', borderBottom: filterStatus === 'One-Shot' ? '2px solid #A855F7' : '2px solid transparent', transition: 'all 0.2s' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(168, 85, 247, 0.1)', color: '#A855F7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Briefcase size={20} strokeWidth={2.5} />
                        </div>
                        <div>
                            <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>One-Shot</div>
                            <div style={{ fontSize: '24px', fontWeight: '800', color: filterStatus === 'One-Shot' ? '#A855F7' : 'var(--text-main)', lineHeight: '1' }}>{totalOneShot}</div>
                        </div>
                    </div>
                </div>

                {/* Missing Management Charge Warning */}
                <div onClick={() => setFilterStatus('Sans Management')} style={{ background: filterStatus === 'Sans Management' ? 'rgba(239, 68, 68, 0.05)' : 'var(--card-bg)', borderRadius: '20px', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: '16px', border: filterStatus === 'Sans Management' ? '1px solid var(--danger)' : '1px solid rgba(239, 68, 68, 0.3)', cursor: 'pointer', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.05)', transition: 'all 0.2s' }} title="Cliquer pour filtrer ces clients">
                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ShieldAlert size={20} strokeWidth={2.5} />
                    </div>
                    <div>
                        <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--danger)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Sans Charge Mngt</div>
                        <div style={{ fontSize: '24px', fontWeight: '900', color: 'var(--danger)', lineHeight: '1' }}>{missingManagementCount}</div>
                    </div>
                </div>
            </div>

            {/* ACTION BAR */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                <div style={{ display: 'flex', gap: '12px', flex: 1, minWidth: '300px' }}>
                    <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
                        <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                            type="text"
                            placeholder="Rechercher une enseigne, un projet..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ width: '100%', padding: '12px 16px 12px 42px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-main)', fontSize: '14px', outline: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}
                        />
                    </div>

                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        style={{ padding: '0 16px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-main)', fontSize: '14px', outline: 'none', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}
                    >
                        <option value="Actif">Clients Actifs</option>
                        <option value="Abonnement">Abonnements</option>
                        <option value="One-Shot">Projets One-Shot</option>
                        <option value="Sans Management">Sans Charge Management</option>
                        <option value="Inactif">Clients Archivés (Inactifs)</option>
                        <option value="Pause">Clients En Pause</option>
                        <option value="Prospect">Prospects</option>
                        <option value="Tous">Tous les clients</option>
                    </select>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                    <div style={{ display: 'flex', background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '4px' }}>
                        <button onClick={() => setViewMode('cards')} style={{ padding: '8px 12px', borderRadius: '8px', border: 'none', background: viewMode === 'cards' ? 'var(--bg-main)' : 'transparent', color: viewMode === 'cards' ? 'var(--text-main)' : 'var(--text-muted)', cursor: 'pointer', transition: 'all 0.2s' }}>
                            <LayoutGrid size={18} />
                        </button>
                        <button onClick={() => setViewMode('table')} style={{ padding: '8px 12px', borderRadius: '8px', border: 'none', background: viewMode === 'table' ? 'var(--bg-main)' : 'transparent', color: viewMode === 'table' ? 'var(--text-main)' : 'var(--text-muted)', cursor: 'pointer', transition: 'all 0.2s' }}>
                            <List size={18} />
                        </button>
                    </div>

                    <button onClick={() => { setEditingClient(null); setIsClientModalOpen(true); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', borderRadius: '12px', border: 'none', background: 'var(--text-main)', color: 'white', cursor: 'pointer', fontWeight: '600', fontSize: '14px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', transition: 'transform 0.2s', ':hover': { transform: 'translateY(-2px)' } }}>
                        <Plus size={18} /> Nouveau Client
                    </button>

                    <input
                        type="file"
                        accept=".csv"
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        onChange={handleFileUpload}
                    />
                    <button onClick={() => fileInputRef.current?.click()} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-main)', cursor: 'pointer', fontWeight: '600', fontSize: '14px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', transition: 'transform 0.2s', ':hover': { transform: 'translateY(-2px)' } }}>
                        <Upload size={18} /> Importer CSV
                    </button>
                </div>
            </div>

            {/* CLIENTS VIEW */}
            {viewMode === 'cards' ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '24px' }}>
                    {displayedClients.map((client) => {
                        const statusStyle = getStatusStyle(client.etatClient);
                        const isAbonnement = client.regime === 'Abonnement';
                        const revenue = client.regime === 'Abonnement'
                            ? parseFloat(client.montantMensuel || 0)
                            : parseFloat(client.montantTotal || 0);

                        // 1. Get client identifier to match RH projects
                        const clientIdentifier = client.enseigne + (client.projet ? ` - ${client.projet}` : '');

                        // 2. Find synced RH costs
                        const syncedRhCosts = rhList
                            .filter(rh => rh.projet === clientIdentifier)
                            .map(rh => {
                                // Extract numeric value from "300 TND" or "300"
                                const costNum = parseFloat(String(rh.part).replace(/[^0-9.]/g, '')) || 0;
                                return {
                                    id: `rh-${rh.id}`,
                                    nom: `${rh.nom} (${rh.poste})`,
                                    montant: costNum,
                                    isAutoSynced: true
                                };
                            });

                        // 3. Combine with manual costs
                        const allCosts = [...(client.projectCosts || []), ...syncedRhCosts].filter(c => c.nom && c.montant);
                        const combinedTotalCosts = allCosts.reduce((sum, c) => sum + (parseFloat(c.montant) || 0), 0);
                        const dynamicNetMargin = revenue - combinedTotalCosts;

                        return (
                            <div key={client.id} style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '10px', position: 'relative', display: 'flex', flexDirection: 'column', gap: '6px', transition: 'all 0.2s ease', boxShadow: '0 2px 6px rgba(0,0,0,0.01)', textAlign: 'left' }}>

                                {/* TOP ROW: Logo + Identity */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        <div style={{ width: '32px', height: '32px', borderRadius: '6px', background: 'var(--bg-main)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0, position: 'relative' }}>
                                            {client.logo ? <img src={client.logo} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)' }}>{client.enseigne.substring(0, 2).toUpperCase()}</span>}
                                            {client.etatClient === 'Actif' && (
                                                ['enseigne', 'secteur', 'mail', 'telephone', 'projet', 'employeAssocie', 'charge', 'adresse', 'dateDebut', 'regime'].some(f => !client[f] || String(client[f]).trim() === '') || 
                                                !(client.projectCosts && client.projectCosts.some(cost => cost.nom && cost.montant))
                                            ) && (
                                                <div style={{ position: 'absolute', top: '-4px', right: '-4px', width: '12px', height: '12px', background: 'var(--danger)', borderRadius: '50%', border: '2px solid var(--card-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '8px', fontWeight: 'bold' }} title="Fiche incomplète (Champs obligatoires ou structure de coûts manquants)">i</div>
                                            )}
                                        </div>
                                        <div style={{ minWidth: 0 }}>
                                            <h3 style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>{client.enseigne}</h3>
                                            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                                <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: '600' }}>{client.secteur}</span>
                                                {client.sousTVA && <span style={{ fontSize: '8px', fontWeight: '800', color: '#16A34A', background: 'rgba(34, 197, 94, 0.1)', padding: '0px 3px', borderRadius: '3px' }}>TVA</span>}
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                                        <span style={{ fontSize: '8px', fontWeight: '800', padding: '1px 5px', borderRadius: '10px', background: client.etatClient === 'Actif' ? 'var(--success-bg)' : 'var(--danger-bg)', color: client.etatClient === 'Actif' ? 'var(--success)' : 'var(--danger)', textTransform: 'uppercase' }}>
                                            {client.etatClient}
                                        </span>
                                        {client.etatClient === 'Actif' && (() => {
                                            const status = getBillingStatus(client.id);
                                            return (
                                                <span style={{ fontSize: '8px', fontWeight: '800', padding: '1px 5px', borderRadius: '4px', background: status.bg, color: status.color, border: `1px solid ${status.color}30`, display: 'flex', alignItems: 'center', gap: '2px' }}>
                                                    {status.icon && <div style={{ width: '4px', height: '4px', background: status.color, borderRadius: '50%' }}></div>}
                                                    {status.label}
                                                </span>
                                            );
                                        })()}
                                    </div>
                                </div>

                                {/* PROJECT & CHARGE (PERSON) */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingLeft: '4px', borderLeft: '2px solid var(--accent-gold)' }}>
                                    <div style={{ fontSize: '11px', color: 'var(--text-main)', fontWeight: '700' }}>{client.projet || 'Sans projet'}</div>
                                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Charge: <b style={{ color: 'var(--text-secondary)' }}>{client.charge || 'N/A'}</b></div>
                                </div>

                                {/* GRID INFO: Dates & Duration (Minimalist) */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', paddingTop: '8px', borderTop: '1px dashed var(--border-color)', marginTop: '4px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: '600' }}>Début</span>
                                        <span style={{ fontSize: '11px', color: 'var(--text-main)', fontWeight: '500' }}>{client.dateDebut || 'N/A'}</span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: '600' }}>Durée</span>
                                        <span style={{ fontSize: '11px', color: 'var(--text-main)', fontWeight: '500' }}>{client.regime === 'Abonnement' ? (client.dureeService || '∞') : (`${client.dureeMois} Mo`)}</span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: '600' }}>Paiement</span>
                                        <span style={{ fontSize: '11px', color: 'var(--text-main)', fontWeight: '500' }}>{client.jourPaiement ? `Le ${client.jourPaiement}` : 'N/A'}</span>
                                    </div>
                                </div>

                                {/* INTERNAL ASSIGNEE */}
                                <div style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'flex', gap: '4px' }}>
                                    MYNDS: <b style={{ color: 'var(--text-secondary)' }}>{client.employeAssocie || 'N/A'}</b>
                                </div>

                                {/* CHARGES ORGANISÉES (COMPACT) */}
                                {allCosts.length > 0 && (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
                                        {allCosts.slice(0, 2).map((cost, idx) => (
                                            <div key={idx} style={{ fontSize: '9px', background: 'rgba(0,0,0,0.03)', padding: '1px 5px', borderRadius: '4px', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                                                {cost.nom.substring(0, 10)}: <b style={{ color: 'var(--danger)' }}>{formatMoney(cost.montant)}</b>
                                            </div>
                                        ))}
                                        {allCosts.length > 2 && <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>+{allCosts.length - 2}</span>}
                                    </div>
                                )}

                                {/* FINANCIAL FOOTER */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '6px', borderTop: '1px solid var(--border-color)' }}>
                                    <div>
                                        <span style={{ fontSize: '8px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Net MYNDS</span>
                                        <div style={{ fontSize: '14px', fontWeight: '800', color: dynamicNetMargin >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                                            {formatMoney(dynamicNetMargin)}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '3px' }}>
                                        <button onClick={() => handleEditClient(client)} style={{ p: '4px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'white', cursor: 'pointer', color: 'var(--text-muted)', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Edit2 size={10} />
                                        </button>
                                        <button onClick={() => handleDeleteClient(client.id)} style={{ p: '4px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'white', cursor: 'pointer', color: 'var(--danger)', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Trash2 size={10} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div >
            ) : (
                <div style={{ background: 'var(--card-bg)', borderRadius: '24px', border: '1px solid var(--border-color)', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
                                    <th style={{ padding: '8px 16px', fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Enseigne</th>
                                    <th style={{ padding: '8px 16px', fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Projet / Secteur</th>
                                    <th style={{ padding: '8px 16px', fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Statut</th>
                                    <th style={{ padding: '8px 16px', fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Régime</th>
                                    <th style={{ padding: '8px 16px', fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Facturation</th>
                                    <th style={{ padding: '8px 16px', fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ancienneté</th>
                                    <th style={{ padding: '8px 16px', fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>CA / Marge</th>
                                    <th style={{ padding: '8px 16px', fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {displayedClients.map((client) => {
                                    const statusStyle = getStatusStyle(client.etatClient);
                                    const isAbonnement = client.regime === 'Abonnement';
                                    const revenue = isAbonnement ? client.montantMensuel : client.montantTotal;

                                    return (
                                        <tr key={client.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s', ':hover': { background: 'var(--bg-main)' }, fontSize: '12px' }}>
                                            <td style={{ padding: '8px 16px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    {client.logo ? (
                                                        <div style={{ position: 'relative' }}>
                                                            <img src={client.logo} alt="Logo" style={{ width: '28px', height: '28px', borderRadius: '4px', objectFit: 'contain', background: 'white', border: '1px solid var(--border-color)' }} />
                                                            {client.etatClient === 'Actif' && (
                                                                ['enseigne', 'secteur', 'mail', 'telephone', 'projet', 'employeAssocie', 'charge', 'adresse', 'dateDebut', 'regime'].some(f => !client[f] || String(client[f]).trim() === '') || 
                                                                !(client.projectCosts && client.projectCosts.some(cost => cost.nom && cost.montant))
                                                            ) && (
                                                                <div style={{ position: 'absolute', top: '-4px', right: '-4px', width: '10px', height: '10px', background: 'var(--danger)', borderRadius: '50%', border: '2px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '8px', fontWeight: 'bold' }} title="Fiche incomplète (Champs obligatoires ou structure de coûts manquants)">i</div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div style={{ width: '28px', height: '28px', borderRadius: '4px', background: 'var(--bg-main)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', position: 'relative' }}>
                                                            {client.enseigne.substring(0, 2).toUpperCase()}
                                                            {client.etatClient === 'Actif' && (
                                                                ['enseigne', 'secteur', 'mail', 'telephone', 'projet', 'employeAssocie', 'charge', 'adresse', 'dateDebut', 'regime'].some(f => !client[f] || String(client[f]).trim() === '') || 
                                                                !(client.projectCosts && client.projectCosts.some(cost => cost.nom && cost.montant))
                                                            ) && (
                                                                <div style={{ position: 'absolute', top: '-4px', right: '-4px', width: '10px', height: '10px', background: 'var(--danger)', borderRadius: '50%', border: '2px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '8px', fontWeight: 'bold' }} title="Fiche incomplète (Champs obligatoires ou structure de coûts manquants)">i</div>
                                                            )}
                                                        </div>
                                                    )}
                                                    <div>
                                                        <div style={{ fontWeight: '600', color: 'var(--text-main)', fontSize: '13px' }}>{client.enseigne}</div>
                                                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{client.id}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ padding: '8px 16px' }}>
                                                {client.projet && (
                                                    <div style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-main)', marginBottom: '2px' }}>{client.projet}</div>
                                                )}
                                                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{client.secteur || 'Secteur NC'}</div>
                                            </td>
                                            <td style={{ padding: '8px 16px' }}>
                                                <span style={{ padding: '3px 8px', borderRadius: '100px', fontSize: '10px', fontWeight: '600', background: statusStyle.bg, color: statusStyle.color }}>
                                                    {client.etatClient}
                                                </span>
                                            </td>
                                            <td style={{ padding: '8px 16px' }}>
                                                <span style={{ fontSize: '11px', fontWeight: '600', color: isAbonnement ? 'var(--accent-gold)' : 'var(--text-secondary)', background: isAbonnement ? 'rgba(255,193,5,0.1)' : 'rgba(15,23,42,0.05)', padding: '3px 6px', borderRadius: '4px' }}>
                                                    {client.regime}
                                                </span>
                                            </td>
                                            <td style={{ padding: '8px 16px' }}>
                                                {client.etatClient === 'Actif' ? (() => {
                                                    const status = getBillingStatus(client.id);
                                                    return (
                                                        <span style={{ fontSize: '10px', fontWeight: '800', color: status.color, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                            <div style={{ width: '6px', height: '6px', background: status.color, borderRadius: '50%' }}></div>
                                                            {status.label}
                                                        </span>
                                                    );
                                                })() : <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>-</span>}
                                            </td>
                                            <td style={{ padding: '8px 16px' }}>
                                                <div style={{ fontSize: '11px', fontWeight: '500', color: 'var(--text-main)' }}>{calculateDuration(client.dateDebut)}</div>
                                            </td>
                                            <td style={{ padding: '8px 16px' }}>
                                                <div style={{ fontWeight: '600', color: 'var(--text-main)', fontSize: '12px' }}>{revenue ? formatMoney(revenue) : '--'}</div>
                                                {client.netMargin !== undefined && (
                                                    <div style={{ fontSize: '11px', fontWeight: '600', color: client.netMargin >= 0 ? 'var(--success)' : 'var(--danger)', marginTop: '2px' }}>
                                                        {client.netMargin > 0 ? '+' : ''}{formatMoney(client.netMargin)} Marge
                                                    </div>
                                                )}
                                            </td>
                                            <td style={{ padding: '8px 16px', textAlign: 'right' }}>
                                                <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                                                    <button onClick={() => handleEditClient(client)} style={{ background: 'transparent', border: 'none', borderRadius: '4px', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)' }} title="Modifier">
                                                        <Edit2 size={14} />
                                                    </button>
                                                    <button onClick={() => handleArchiveClient(client.id)} style={{ background: 'transparent', border: 'none', borderRadius: '4px', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--warning)' }} title="Archiver">
                                                        <Archive size={14} />
                                                    </button>
                                                    <button onClick={() => handleDeleteClient(client.id)} style={{ background: 'transparent', border: 'none', borderRadius: '4px', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--danger)' }} title="Supprimer">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {
                displayedClients.length === 0 && (
                    <div style={{ padding: '60px 24px', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--card-bg)', borderRadius: '24px', border: '1px dashed var(--border-color)' }}>
                        <p style={{ fontSize: '16px', fontWeight: '500' }}>Aucun client trouvé pour ce filtre.</p>
                    </div>
                )
            }

            {/* MODAL */}
            {isClientModalOpen && (
                <ClientModal
                    key={editingClient?.id || 'new'}
                    isOpen={isClientModalOpen}
                    onClose={() => { setIsClientModalOpen(false); setEditingClient(null); }}
                    onSave={handleSaveClient}
                    initialData={editingClient}
                />
            )}
        </div >
    );
};

export default ClientsPage;
