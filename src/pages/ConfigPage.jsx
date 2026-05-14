import React, { useState, useEffect, useMemo, useRef } from 'react';
import Header from '../components/Header';
import { Settings, Briefcase, Tag, Users, Plus, Trash2, Edit2, Calendar, HardDrive, Download, Upload, CreditCard, CheckCircle2, AlertCircle, Check, Building2 } from 'lucide-react';
import { initialSecteurs, initialServices, initialRh, loadConfig, saveConfig } from '../data/defaultConfig';
import RHFormModal from '../components/RHFormModal';
import { getClients, getStorage, setStorage } from '../services/storageService';

// --- SUB-COMPONENTS: BANQUES ---

const BankManagerTab = ({ companyBanks, setCompanyBanks }) => {
    const [newBank, setNewBank] = useState({ bank_name: '', swift_bic: '', account_number: '', currency: 'TND', isDefault: false, actif: true });
    const [errors, setErrors] = useState({});

    const validate = () => {
        let errs = {};
        if (!newBank.bank_name) errs.bank_name = 'Obligatoire';
        if (!newBank.swift_bic) errs.swift_bic = 'Obligatoire';
        else if (!/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(newBank.swift_bic)) errs.swift_bic = 'Format SWIFT invalide';
        
        if (!newBank.account_number) errs.account_number = 'Obligatoire';
        else if (newBank.account_number.length < 10) errs.account_number = 'Trop court';
        
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleAdd = () => {
        if (!validate()) return;
        
        const newBankWithId = { ...newBank, id: Date.now().toString(), actif: true };
        let updated = [...companyBanks, newBankWithId];
        
        // If it's the first one or set as default, ensure only one is default
        if (newBank.isDefault || companyBanks.length === 0) {
            updated = updated.map(b => ({
                ...b,
                isDefault: b.id === newBankWithId.id
            }));
        }
        
        setCompanyBanks(updated);
        setNewBank({ bank_name: '', swift_bic: '', account_number: '', currency: 'TND', isDefault: false });
        setErrors({});
    };

    const handleDelete = (id) => {
        if (window.confirm("Supprimer cette banque ?")) {
            setCompanyBanks(companyBanks.filter(b => b.id !== id));
        }
    };

    const toggleDefault = (id) => {
        setCompanyBanks(companyBanks.map(b => ({
            ...b,
            isDefault: b.id === id,
            actif: b.id === id ? true : b.actif // If set as default, must be active
        })));
    };

    const toggleActif = (id) => {
        setCompanyBanks(companyBanks.map(b => {
            if (b.id === id) {
                // Cannot deactivate default bank
                if (b.isDefault) {
                    alert("Impossible de désactiver la banque par défaut.");
                    return b;
                }
                return { ...b, actif: !b.actif };
            }
            return b;
        }));
    };

    return (
        <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
            <div style={{ marginBottom: '24px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-main)', margin: 0 }}>Comptes Bancaires de l'Entreprise</h2>
                <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>Configurez vos RIB pour l'émission des factures et le suivi bancaire.</p>
            </div>

            {/* FORM ROW */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 2fr 1fr 1fr 0.5fr', gap: '12px', marginBottom: '32px', background: 'var(--bg-main)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border-color)', alignItems: 'end' }}>
                <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase' }}>Nom de la Banque</label>
                    <input 
                        type="text" 
                        placeholder="Ex: BIAT, QNB..." 
                        value={newBank.bank_name} 
                        onChange={e => setNewBank({...newBank, bank_name: e.target.value})}
                        style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: errors.bank_name ? '1px solid #ef4444' : '1px solid var(--border-color)', background: 'white', fontSize: '13px', outline: 'none' }}
                    />
                </div>
                <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase' }}>SWIFT / BIC</label>
                    <input 
                        type="text" 
                        placeholder="Ex: BIATTNTN" 
                        value={newBank.swift_bic} 
                        onChange={e => setNewBank({...newBank, swift_bic: e.target.value.toUpperCase()})}
                        style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: errors.swift_bic ? '1px solid #ef4444' : '1px solid var(--border-color)', background: 'white', fontSize: '13px', outline: 'none' }}
                    />
                </div>
                <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase' }}>Numéro de Compte (RIB)</label>
                    <input 
                        type="text" 
                        placeholder="20 chiffres..." 
                        value={newBank.account_number} 
                        onChange={e => setNewBank({...newBank, account_number: e.target.value})}
                        style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: errors.account_number ? '1px solid #ef4444' : '1px solid var(--border-color)', background: 'white', fontSize: '13px', outline: 'none' }}
                    />
                </div>
                <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase' }}>Devise</label>
                    <select 
                        value={newBank.currency} 
                        onChange={e => setNewBank({...newBank, currency: e.target.value})}
                        style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'white', fontSize: '13px', outline: 'none' }}
                    >
                        <option value="TND">TND</option>
                        <option value="EUR">EUR</option>
                        <option value="USD">USD</option>
                    </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase' }}>Défaut</label>
                    <button 
                        onClick={() => setNewBank({...newBank, isDefault: !newBank.isDefault})}
                        style={{ padding: '8px', borderRadius: '10px', border: 'none', background: newBank.isDefault ? '#10b981' : 'var(--bg-main)', color: newBank.isDefault ? 'white' : 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                        {newBank.isDefault ? <Check size={16} /> : <div style={{width: 16, height: 16}} />}
                    </button>
                </div>
                <button 
                    onClick={handleAdd}
                    style={{ padding: '10px', borderRadius: '10px', border: 'none', background: 'var(--text-main)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                    <Plus size={20} />
                </button>
            </div>

            {/* LIST TABLE */}
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                    <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                        <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Banque</th>
                        <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>SWIFT / BIC</th>
                        <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Numéro de Compte</th>
                        <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', textAlign: 'center' }}>Devise</th>
                        <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', textAlign: 'center' }}>Statut</th>
                        <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', textAlign: 'center' }}>Défaut</th>
                        <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', textAlign: 'right', width: '80px' }}>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {companyBanks.map((bank) => (
                        <tr key={bank.id} style={{ borderBottom: '1px solid var(--border-color)', background: bank.isDefault ? 'rgba(255, 193, 5, 0.03)' : 'transparent' }}>
                            <td style={{ padding: '16px', fontWeight: '700', color: 'var(--text-main)', fontSize: '14px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Building2 size={16} />
                                    </div>
                                    {bank.bank_name}
                                </div>
                            </td>
                            <td style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '13px', fontFamily: 'monospace' }}>{bank.swift_bic}</td>
                            <td style={{ padding: '16px', color: 'var(--text-main)', fontWeight: '600', fontSize: '14px', letterSpacing: '0.5px' }}>{bank.account_number}</td>
                            <td style={{ padding: '16px', textAlign: 'center' }}>
                                <span style={{ padding: '4px 8px', borderRadius: '6px', background: 'var(--bg-main)', border: '1px solid var(--border-color)', fontSize: '11px', fontWeight: '800' }}>{bank.currency}</span>
                            </td>
                            <td style={{ padding: '16px', textAlign: 'center' }}>
                                <button 
                                    onClick={() => toggleActif(bank.id)}
                                    style={{ 
                                        padding: '4px 12px', 
                                        borderRadius: '100px', 
                                        border: 'none', 
                                        fontSize: '10px', 
                                        fontWeight: '800', 
                                        cursor: 'pointer',
                                        background: bank.actif ? 'rgba(16, 185, 129, 0.1)' : 'rgba(0,0,0,0.05)',
                                        color: bank.actif ? '#10b981' : 'var(--text-muted)'
                                    }}
                                >
                                    {bank.actif ? 'ACTIF' : 'INACTIF'}
                                </button>
                            </td>
                            <td style={{ padding: '16px', textAlign: 'center' }}>
                                <button 
                                    onClick={() => toggleDefault(bank.id)}
                                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: bank.isDefault ? '#10b981' : 'var(--text-muted)' }}
                                >
                                    {bank.isDefault ? <CheckCircle2 size={20} /> : <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid var(--border-color)' }} />}
                                </button>
                            </td>
                            <td style={{ padding: '16px', textAlign: 'right' }}>
                                <button onClick={() => handleDelete(bank.id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#EF4444' }}><Trash2 size={16} /></button>
                            </td>
                        </tr>
                    ))}
                    {companyBanks.length === 0 && (
                        <tr>
                            <td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
                                <AlertCircle size={32} style={{ marginBottom: '12px', opacity: 0.3 }} />
                                <div style={{ fontWeight: '600' }}>Aucune banque configurée</div>
                                <div style={{ fontSize: '12px' }}>Ajoutez votre premier RIB ci-dessus.</div>
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};

const ConfigPage = () => {
    const [activeTab, setActiveTab] = useState('secteurs');

    // Modal state
    const [isSecteurModalOpen, setIsSecteurModalOpen] = useState(false);

    // File input ref for importing backup
    const fileInputRef = useRef(null);

    // DATA FOR SERVICES & PRIX
    const [services, setServices] = useState(() => {
        const loaded = loadConfig('services', initialServices);
        return loaded.length > 0 ? loaded : initialServices;
    });

    const [secteurs, setSecteurs] = useState(() => {
        const loaded = loadConfig('secteurs', initialSecteurs);
        return loaded.length > 0 ? loaded : initialSecteurs;
    });

    const [companyBanks, setCompanyBanks] = useState(() => {
        return getStorage('mynds_company_banks', [
            { id: '1', bank_name: 'BIAT', swift_bic: 'BIATTNTN', account_number: '08000000000000000000', currency: 'TND', isDefault: true, actif: true },
            { id: '2', bank_name: 'QNB', swift_bic: 'QNBTNTN', account_number: '12000000000000000000', currency: 'TND', isDefault: false, actif: true }
        ]);
    });

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
    useEffect(() => { setStorage('mynds_company_banks', companyBanks); }, [companyBanks]);

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
                        onClick={() => setActiveTab('banques')}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '12px', border: 'none', background: activeTab === 'banques' ? 'var(--text-main)' : 'transparent', color: activeTab === 'banques' ? 'white' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: '600', transition: 'all 0.2s', marginBottom: '8px', textAlign: 'left' }}
                    >
                        <CreditCard size={18} /> Banques Entreprise
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


                    {/* TAB: BANQUES ENTREPRISE */}
                    {activeTab === 'banques' && (
                        <BankManagerTab 
                            companyBanks={companyBanks} 
                            setCompanyBanks={setCompanyBanks} 
                        />
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


        </div>
    );
};

export default ConfigPage;
