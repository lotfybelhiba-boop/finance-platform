import React, { useState, useEffect, useMemo, useRef } from 'react';
import Header from '../components/Header';
import { Settings, Briefcase, Tag, Users, Plus, Trash2, Edit2, Calendar, HardDrive, Download, Upload } from 'lucide-react';
import { initialSecteurs, initialServices, loadConfig, saveConfig } from '../data/defaultConfig';
import RHFormModal from '../components/RHFormModal';
import { getClients } from '../services/storageService';

const ConfigPage = () => {
    const [activeTab, setActiveTab] = useState('secteurs');

    // Modal state for RH
    const [isRHModalOpen, setIsRHModalOpen] = useState(false);
    const [editingRH, setEditingRH] = useState(null);

    // File input ref for importing backup
    const fileInputRef = useRef(null);

    // DATA FOR SECTEURS & PROJETS
    const [secteurs, setSecteurs] = useState(() => loadConfig('secteurs', initialSecteurs));

    // DATA FOR SERVICES & PRIX
    const [services, setServices] = useState(() => {
        const loaded = loadConfig('services', initialServices);
        return loaded.length > 0 ? loaded : initialServices;
    });

    const [rhList, setRhList] = useState(() => loadConfig('rh', []));

    // STORAGE CALCULATION
    const [storageInfo, setStorageInfo] = useState({ used: 0, mbUsed: 0, max: 5, percentage: 0 });

    useEffect(() => {
        const calculateStorage = () => {
            let total = 0;
            for (let x in localStorage) {
                if (localStorage.hasOwnProperty(x)) {
                    total += (localStorage[x].length + x.length) * 2;
                }
            }
            const mbUsed = total / (1024 * 1024);
            const percentage = Math.min((total / (5 * 1024 * 1024)) * 100, 100);
            setStorageInfo({ used: total, mbUsed: mbUsed.toFixed(2), max: 5, percentage: Math.round(percentage) });
        };
        calculateStorage();
        const interval = setInterval(calculateStorage, 10000);
        return () => clearInterval(interval);
    }, [activeTab]);

    // Auto-save when config changes
    useEffect(() => { saveConfig('secteurs', secteurs); }, [secteurs]);
    useEffect(() => { saveConfig('services', services); }, [services]);
    useEffect(() => { saveConfig('rh', rhList); }, [rhList]);

    // HANDLERS SECTEURS
    const handleAddSecteur = () => {
        const nom = window.prompt("Nom du nouveau secteur d'activité :");
        if (nom) setSecteurs([...secteurs, { id: `SEC_${Date.now()}`, nom, projets: [] }]);
    };
    const handleDeleteSecteur = (id) => {
        if (window.confirm("Supprimer ce secteur et tous ses projets ?")) {
            setSecteurs(secteurs.filter(s => s.id !== id));
        }
    };
    const handleAddProjet = (secteurId) => {
        const nom = window.prompt("Nom du nouveau projet associé :");
        if (nom) setSecteurs(secteurs.map(s => s.id === secteurId ? { ...s, projets: [...s.projets, nom] } : s));
    };

    // HANDLERS SERVICES
    const handleAddService = () => {
        const nom = window.prompt("Nom du nouveau service/prestation :");
        if (!nom) return;
        const categorie = window.prompt("Catégorie stratégique (ex: Web, Ads, Branding) :");
        const prixStr = window.prompt("Prix standard en TND (ex: 1500) :");
        const prix = parseFloat(prixStr) || 0;
        setServices([...services, { id: `SRV_${Date.now()}`, nom, categorie: categorie || 'Autre', prix }]);
    };
    const handleDeleteService = (id) => {
        if (window.confirm("Supprimer ce service du catalogue ?")) {
            setServices(services.filter(s => s.id !== id));
        }
    };

    // Derived State for Client dropdown
    const allProjets = useMemo(() => {
        try {
            const parsed = getClients();
            return parsed.map(c => c.enseigne + (c.projet ? ` - ${c.projet}` : ''));
        } catch (e) {
            console.error("Erreur lecture clients", e);
        }
        return ['Acme Corp - Refonte Site E-commerce', 'TechSolutions Inc - Campagne Ads Q3'];
    }, []);

    // Get current clients to compute dynamic assignments per RH
    const clientsData = useMemo(() => {
        try {
            return getClients();
        } catch (e) {
            console.error("Erreur lecture clients pour RH", e);
        }
        return [];
    }, []);

    // HANDLERS RH
    const handleAddRH = () => {
        setEditingRH(null);
        setIsRHModalOpen(true);
    };

    const handleEditRH = (rh) => {
        setEditingRH(rh);
        setIsRHModalOpen(true);
    };

    const handleSaveRH = (rhData) => {
        if (editingRH) {
            setRhList(rhList.map(r => r.id === rhData.id ? rhData : r));
        } else {
            setRhList([...rhList, rhData]);
        }
    };

    const handleDeleteRH = (id) => {
        if (window.confirm("Êtes-vous sûr de vouloir supprimer cette personne ?")) {
            setRhList(rhList.filter(r => r.id !== id));
        }
    };

    // HANDLERS BACKUP & RESTORE
    const handleExportData = () => {
        try {
            const dataToExport = {};
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key.startsWith('mynds_')) {
                    dataToExport[key] = localStorage.getItem(key);
                }
            }
            
            const dataStr = JSON.stringify(dataToExport, null, 2);
            const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
            
            const exportFileDefaultName = `Mynds_Backup_${new Date().toISOString().split('T')[0]}.json`;
            
            const linkElement = document.createElement('a');
            linkElement.setAttribute('href', dataUri);
            linkElement.setAttribute('download', exportFileDefaultName);
            linkElement.click();
        } catch (error) {
            console.error("Erreur lors de l'exportation:", error);
            alert("Une erreur est survenue lors de la création de la sauvegarde.");
        }
    };

    const handleImportData = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                
                if (window.confirm("ATTENTION : L'importation d'une sauvegarde va écraser VOS DONNÉES ACTUELLES. Voulez-vous vraiment continuer ?")) {
                    // Clear existing mynds_ keys to ensure clean restore
                    const keysToRemove = [];
                    for (let i = 0; i < localStorage.length; i++) {
                        const key = localStorage.key(i);
                        if (key && key.startsWith('mynds_')) {
                            keysToRemove.push(key);
                        }
                    }
                    keysToRemove.forEach(k => localStorage.removeItem(k));

                    // Restore full imported object
                    Object.keys(importedData).forEach(key => {
                        if (key.startsWith('mynds_')) {
                            localStorage.setItem(key, importedData[key]);
                        }
                    });

                    alert("🎉 Sauvegarde restaurée avec succès ! L'application va se recharger.");
                    window.location.reload();
                }
            } catch (error) {
                console.error("Erreur d'importation:", error);
                alert("Le fichier sélectionné est invalide ou corrompu.");
            }
            // Reset the input
            if (fileInputRef.current) fileInputRef.current.value = '';
        };
        reader.readAsText(file);
    };

    const formatMoney = (val) => new Intl.NumberFormat('fr-TN', { style: 'currency', currency: 'TND', minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(val);

    return (
        <div style={{ paddingBottom: '40px' }}>
            <Header title="Configuration" subtitle="Paramètres du catalogue, des secteurs et de l'équipe" />

            <div style={{ background: 'var(--card-bg)', borderRadius: '24px', border: '1px solid var(--border-color)', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.02)', display: 'flex', minHeight: '600px', marginTop: '24px' }}>

                {/* SIDEBAR TABS */}
                <div style={{ width: '250px', background: 'var(--bg-main)', borderRight: '1px solid var(--border-color)', padding: '24px' }}>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>Menu Configuration</div>

                    <button
                        onClick={() => setActiveTab('secteurs')}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '12px', border: 'none', background: activeTab === 'secteurs' ? 'var(--text-main)' : 'transparent', color: activeTab === 'secteurs' ? 'white' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: '600', transition: 'all 0.2s', marginBottom: '8px', textAlign: 'left' }}
                    >
                        <Briefcase size={18} /> Secteurs & Projets
                    </button>

                    <button
                        onClick={() => setActiveTab('services')}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '12px', border: 'none', background: activeTab === 'services' ? 'var(--text-main)' : 'transparent', color: activeTab === 'services' ? 'white' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: '600', transition: 'all 0.2s', marginBottom: '8px', textAlign: 'left' }}
                    >
                        <Tag size={18} /> Services & Prix
                    </button>

                    <button
                        onClick={() => setActiveTab('rh')}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '12px', border: 'none', background: activeTab === 'rh' ? 'var(--text-main)' : 'transparent', color: activeTab === 'rh' ? 'white' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: '600', transition: 'all 0.2s', marginBottom: '8px', textAlign: 'left' }}
                    >
                        <Users size={18} /> Liste RH
                    </button>

                    <button
                        onClick={() => setActiveTab('systeme')}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '12px', border: 'none', background: activeTab === 'systeme' ? 'var(--text-main)' : 'transparent', color: activeTab === 'systeme' ? 'white' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: '600', transition: 'all 0.2s', textAlign: 'left' }}
                    >
                        <HardDrive size={18} /> Système & Stockage
                    </button>
                </div>

                {/* CONTENT AREA */}
                <div style={{ flex: 1, padding: '32px', background: 'var(--card-bg)' }}>

                    {/* TAB: SECTEURS & PROJETS */}
                    {activeTab === 'secteurs' && (
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                <div>
                                    <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-main)', margin: 0 }}>Secteurs d'activité</h2>
                                    <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>Gérez les secteurs et les types de projets qui leur sont associés.</p>
                                </div>
                                <button onClick={handleAddSecteur} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '10px', border: 'none', background: 'var(--text-main)', color: 'white', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>
                                    <Plus size={16} /> Ajouter Secteur
                                </button>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {secteurs.map((secteur) => (
                                    <div key={secteur.id} style={{ border: '1px solid var(--border-color)', borderRadius: '16px', padding: '20px', background: 'var(--bg-main)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}><Briefcase size={16} color="var(--accent-gold)" /> {secteur.nom}</h3>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <button style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => window.alert('Édition à venir')}><Edit2 size={16} /></button>
                                                <button onClick={() => handleDeleteSecteur(secteur.id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#EF4444' }}><Trash2 size={16} /></button>
                                            </div>
                                        </div>
                                        <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '16px' }}>
                                            <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>Projets Associés :</div>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                                {secteur.projets.map((p, i) => (
                                                    <span key={i} style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', padding: '6px 12px', borderRadius: '100px', fontSize: '13px', color: 'var(--text-main)' }}>{p}</span>
                                                ))}
                                                <button onClick={() => handleAddProjet(secteur.id)} style={{ background: 'transparent', border: '1px dashed var(--text-muted)', padding: '6px 12px', borderRadius: '100px', fontSize: '13px', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <Plus size={14} /> Ajouter Projet
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* TAB: SERVICES & PRIX */}
                    {activeTab === 'services' && (
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                <div>
                                    <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-main)', margin: 0 }}>Catalogue de Services</h2>
                                    <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>Définissez vos prestations avec leurs prix standards en TND.</p>
                                </div>
                                <button onClick={handleAddService} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '10px', border: 'none', background: 'var(--text-main)', color: 'white', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>
                                    <Plus size={16} /> Nouveau Service
                                </button>
                            </div>

                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                                        <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Catégorie</th>
                                        <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Nom du Service / Prestation</th>
                                        <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', textAlign: 'right' }}>Prix Standard (TND)</th>
                                        <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', textAlign: 'right', width: '80px' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {services.map((serv) => (
                                        <tr key={serv.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s' }}>
                                            <td style={{ padding: '16px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                                                <span style={{ background: 'rgba(255, 193, 5, 0.1)', color: '#B45309', padding: '4px 8px', borderRadius: '6px', fontWeight: '600' }}>
                                                    {serv.categorie}
                                                </span>
                                            </td>
                                            <td style={{ padding: '16px', color: 'var(--text-main)', fontWeight: '500', fontSize: '14px' }}>{serv.nom}</td>
                                            <td style={{ padding: '16px', color: 'var(--text-main)', fontWeight: '700', fontSize: '14px', textAlign: 'right' }}>{formatMoney(serv.prix)}</td>
                                            <td style={{ padding: '16px', textAlign: 'right' }}>
                                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                                    <button style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => window.alert('Édition à venir')}><Edit2 size={16} /></button>
                                                    <button onClick={() => handleDeleteService(serv.id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#EF4444' }}><Trash2 size={16} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* TAB: LISTE RH */}
                    {activeTab === 'rh' && (
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                <div>
                                    <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-main)', margin: 0 }}>Ressources Humaines (RH)</h2>
                                    <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>Gérez la liste de vos employés et collaborateurs.</p>
                                </div>
                                <button onClick={handleAddRH} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '10px', border: 'none', background: 'var(--text-main)', color: 'white', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>
                                    <Plus size={16} /> Ajouter Employé
                                </button>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
                                {rhList.map(emp => {
                                    // Dynamically calculate assigned projects and total cost
                                    let assignedProjects = [];
                                    let dynamicTotalCost = 0;

                                    clientsData.forEach(client => {
                                        if (client.etatClient !== 'Inactif' && client.projectCosts && Array.isArray(client.projectCosts)) {
                                            client.projectCosts.forEach(cost => {
                                                if (cost.nom === emp.nom) {
                                                    assignedProjects.push(client.enseigne);
                                                    dynamicTotalCost += (parseFloat(cost.montant) || 0);
                                                }
                                            });
                                        }
                                    });
                                    // Remove duplicates if assigned multiple times on same client
                                    assignedProjects = [...new Set(assignedProjects)];

                                    return (
                                        <div key={emp.id} style={{
                                            border: '1px solid var(--border-color)', borderRadius: '16px',
                                            background: 'var(--bg-main)', display: 'flex', flexDirection: 'column',
                                            overflow: 'hidden', transition: 'transform 0.2s, box-shadow 0.2s',
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
                                        }}
                                            onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.05)'; }}
                                            onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.02)'; }}
                                        >
                                            <div style={{ padding: '20px', display: 'flex', gap: '16px', alignItems: 'center', borderBottom: '1px solid var(--border-color)' }}>
                                                <div style={{
                                                    width: '48px', height: '48px', borderRadius: '50%',
                                                    background: 'rgba(255, 193, 5, 0.1)', color: 'var(--accent-gold)',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontWeight: '800', fontSize: '18px', border: '1px solid rgba(255,193,5,0.2)'
                                                }}>
                                                    {emp.nom.charAt(0).toUpperCase()}
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontWeight: '800', color: 'var(--text-main)', fontSize: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            {emp.nom}
                                                            {emp.actif === false && <span style={{ fontSize: '10px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Inactif</span>}
                                                        </div>
                                                        <div style={{ display: 'flex', gap: '4px' }}>
                                                            <button onClick={() => handleEditRH(emp)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px', borderRadius: '6px' }} onMouseOver={e => e.currentTarget.style.background = 'rgba(0,0,0,0.05)'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                                                                <Edit2 size={14} />
                                                            </button>
                                                            <button onClick={() => handleDeleteRH(emp.id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: '4px', borderRadius: '6px' }} onMouseOver={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', marginTop: '2px' }}>{emp.poste}</div>
                                                </div>
                                            </div>

                                            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
                                                
                                                {assignedProjects.length > 0 && (
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                                        {assignedProjects.map((p, i) => (
                                                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--card-bg)', padding: '6px 10px', borderRadius: '8px', border: '1px dashed var(--border-color)' }}>
                                                                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-gold)' }} />
                                                                <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-main)' }}>{p}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                        <span style={{ color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.5px' }}>Charge RH (Coût total)</span>
                                                        <span style={{ fontWeight: '700', color: 'var(--danger)' }}>{dynamicTotalCost > 0 ? formatMoney(dynamicTotalCost) : '--'}</span>
                                                    </div>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }}>
                                                        <span style={{ color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.5px' }}>Date de début</span>
                                                        <span style={{ fontWeight: '600', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                            {emp.dateDebut ? (
                                                                <>
                                                                    <Calendar size={12} style={{ color: 'var(--accent-gold)' }} />
                                                                    {new Date(emp.dateDebut).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                                </>
                                                            ) : '--'}
                                                        </span>
                                                    </div>
                                                </div>

                                                {emp.taches && (
                                                    <div style={{ marginTop: 'auto', background: 'rgba(15,23,42,0.02)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(15,23,42,0.05)' }}>
                                                        <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tâches associées :</div>
                                                        <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5', whiteSpace: 'pre-wrap', display: '-webkit-box', WebkitLineClamp: '3', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                                            {emp.taches}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* TAB: SYSTEME & STOCKAGE */}
                    {activeTab === 'systeme' && (
                        <div>
                            <div style={{ marginBottom: '24px' }}>
                                <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-main)', margin: 0 }}>Système & Stockage</h2>
                                <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>Surveillez l'état de la mémoire locale de votre navigateur (Limite : ~5 Mo).</p>
                            </div>

                            <div style={{ border: '1px solid var(--border-color)', borderRadius: '16px', padding: '24px', background: 'var(--card-bg)', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                    <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <HardDrive size={18} color="var(--accent-gold)" /> Espace LocalStorage
                                    </h3>
                                    <span style={{ fontSize: '14px', fontWeight: '800', color: storageInfo.percentage > 80 ? 'var(--danger)' : 'var(--success)' }}>
                                        {storageInfo.mbUsed} Mo / {storageInfo.max} Mo
                                    </span>
                                </div>
                                
                                <div style={{ width: '100%', height: '12px', background: 'var(--bg-main)', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                                    <div style={{
                                        height: '100%',
                                        width: `${storageInfo.percentage}%`,
                                        background: storageInfo.percentage > 85 ? 'var(--danger)' : storageInfo.percentage > 60 ? 'var(--warning)' : 'var(--success)',
                                        transition: 'width 0.5s ease-in-out'
                                    }}></div>
                                </div>

                                <div style={{ marginTop: '16px', fontSize: '12px', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                                    <span>0% (Vide)</span>
                                    <span>{storageInfo.percentage}% Utilisé</span>
                                    <span>100% (~5Mo)</span>
                                </div>

                                {storageInfo.percentage > 80 && (
                                    <div style={{ marginTop: '20px', padding: '16px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '12px', color: 'var(--danger)', fontSize: '13px', fontWeight: '600' }}>
                                        ⚠️ Attention : Vous approchez de la limite de stockage local du navigateur. Pensez à exporter vos données ou à migrer vers une base de données distante prochainement pour éviter toute perte de données.
                                    </div>
                                )}
                            </div>

                            <div style={{ marginTop: '32px', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '16px', padding: '24px', background: 'rgba(16, 185, 129, 0.05)', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                                <div style={{ marginBottom: '24px' }}>
                                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#10b981', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        Sauvegarde et Sécurité
                                    </h3>
                                    <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: '8px 0 0 0', lineHeight: '1.5' }}>
                                        Votre PC est faible ou instable ? Protégez votre travail en téléchargeant régulièrement une sauvegarde de toutes vos données (Clients, Factures, Banque, Historique). Vous pourrez la restaurer en cas de problème.
                                    </p>
                                </div>

                                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                                    <button 
                                        onClick={handleExportData}
                                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', borderRadius: '12px', border: 'none', background: '#10b981', color: 'white', cursor: 'pointer', fontWeight: '800', fontSize: '14px', letterSpacing: '0.5px', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)', transition: 'transform 0.1s' }}
                                        onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                                        onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
                                    >
                                        <Download size={18} /> Télécharger une sauvegarde (.json)
                                    </button>

                                    <button 
                                        onClick={() => fileInputRef.current.click()}
                                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', borderRadius: '12px', border: '2px solid rgba(16, 185, 129, 0.5)', background: 'transparent', color: '#10b981', cursor: 'pointer', fontWeight: '800', fontSize: '14px', letterSpacing: '0.5px', transition: 'background 0.2s', transform: 'translateY(0)' }}
                                        onMouseOver={e => { e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                                        onMouseOut={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.transform = 'translateY(0)'; }}
                                    >
                                        <Upload size={18} /> Restaurer depuis un fichier
                                    </button>
                                    
                                    <input 
                                        type="file" 
                                        accept=".json" 
                                        style={{ display: 'none' }} 
                                        ref={fileInputRef} 
                                        onChange={handleImportData} 
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </div>

            {/* MODALS */}
            <RHFormModal
                isOpen={isRHModalOpen}
                onClose={() => { setIsRHModalOpen(false); setEditingRH(null); }}
                onSave={handleSaveRH}
                initialData={editingRH}
                projetsDisponibles={allProjets}
            />
        </div>
    );
};

export default ConfigPage;
