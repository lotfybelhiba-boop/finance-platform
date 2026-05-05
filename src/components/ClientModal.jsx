import React, { useState, useEffect, useMemo } from 'react';
import { X, Plus, Trash2, Check } from 'lucide-react';
import { loadConfig, initialSecteurs, initialServices } from '../data/defaultConfig';
import { generateId, getClients, generateSequentialClientId } from '../services/storageService';

const ClientModal = ({ isOpen, onClose, onSave, initialData }) => {
    // Les 10 champs demandés pour la fiche client
    const [enseigne, setEnseigne] = useState(initialData?.enseigne || '');
    const [logo, setLogo] = useState(initialData?.logo || '');
    const [projet, setProjet] = useState(initialData?.projet || '');
    const [secteur, setSecteur] = useState(initialData?.secteur || '');
    const [etatClient, setEtatClient] = useState(initialData?.etatClient || 'Actif');
    const [charge, setCharge] = useState(initialData?.charge || '');
    const [nomFinancier, setNomFinancier] = useState(initialData?.nomFinancier || '');
    const [emailFinancier, setEmailFinancier] = useState(initialData?.emailFinancier || '');
    const [dateDebut, setDateDebut] = useState(initialData?.dateDebut || '');
    const [mf, setMf] = useState(initialData?.mf || '');
    const [mail, setMail] = useState(initialData?.mail || '');
    const [telephone, setTelephone] = useState(initialData?.telephone || '');
    const [adresse, setAdresse] = useState(initialData?.adresse || '');
    const [dateFin, setDateFin] = useState(initialData?.dateFin || '');
    const [bonCommande, setBonCommande] = useState(initialData?.bonCommande || '');
    const [option15Jours, setOption15Jours] = useState(initialData?.option15Jours || ''); // '' | 'espece' | 'cadeau'

    // Champs Régime & Facturation
    const [regime, setRegime] = useState(initialData?.regime || 'Abonnement');
    const [montantMensuel, setMontantMensuel] = useState(initialData?.montantMensuel || '');
    const [jourPaiement, setJourPaiement] = useState(initialData?.jourPaiement || '');
    const [delaiPaiement, setDelaiPaiement] = useState(initialData?.delaiPaiement || '');
    const [modeCycle, setModeCycle] = useState(() => {
        if (!initialData) return 'Mois civil (1er au 31)';
        return initialData.modeCycle === "Date d'entrée" ? "Date de début" : (initialData.modeCycle || 'Mois civil (1er au 31)');
    });
    const [jourCycle, setJourCycle] = useState(initialData?.jourCycle || '');
    const [dureeMois, setDureeMois] = useState(initialData?.dureeMois || '');
    const [montantTotal, setMontantTotal] = useState(initialData?.montantTotal || '');
    const [datePaiementOneShot, setDatePaiementOneShot] = useState(initialData?.datePaiement || '');
    const [servicesRecurrents, setServicesRecurrents] = useState(() => {
        if (initialData?.servicesRecurrents && initialData.servicesRecurrents.length > 0) return initialData.servicesRecurrents;
        return [{ id: 1, desc: '', prix: '' }];
    });
    const [projectCosts, setProjectCosts] = useState(() => {
        if (initialData?.projectCosts && initialData.projectCosts.length > 0) return initialData.projectCosts;
        return [{ id: 1, nom: '', specialite: '', montant: '', dateDebut: initialData?.dateDebut || '', dateFin: '' }];
    });

    const [dureeService, setDureeService] = useState(initialData?.dureeService || '');
    const [sousTVA, setSousTVA] = useState(initialData?.sousTVA || false);
    const [employeAssocie, setEmployeAssocie] = useState(initialData?.employeAssocie || '');

    // Load config once or when isOpen changes
    const secteursList = useMemo(() => isOpen ? loadConfig('secteurs', initialSecteurs) : [], [isOpen]);
    const servicesList = useMemo(() => isOpen ? loadConfig('services', initialServices) : [], [isOpen]);
    const rhList = useMemo(() => isOpen ? loadConfig('rh', []) : [], [isOpen]);

    const activeSecteurRecord = secteursList.find(s => s.nom === secteur);

    const handleAddService = () => setServicesRecurrents([...servicesRecurrents, { id: Date.now(), desc: '', prix: '' }]);
    const handleRemoveService = (id) => servicesRecurrents.length > 1 && setServicesRecurrents(servicesRecurrents.filter(s => s.id !== id));
    const updateService = (id, field, value) => {
        setServicesRecurrents(servicesRecurrents.map(s => {
            if (s.id === id) { return { ...s, [field]: value }; }
            return s;
        }));
    };

    const handleAddCost = () => setProjectCosts([...projectCosts, { 
        id: Date.now(), 
        nom: '', 
        specialite: '', 
        montant: '', 
        dateDebut: dateDebut || new Date().toISOString().split('T')[0],
        dateFin: '' 
    }]);
    
    // Auto-migration for legacy entries without dates
    useEffect(() => {
        if (isOpen && projectCosts.length > 0 && !projectCosts[0].dateDebut) {
            setProjectCosts(projectCosts.map(c => ({
                ...c,
                dateDebut: c.dateDebut || dateDebut || new Date().toISOString().split('T')[0]
            })));
        }
    }, [isOpen]);
    const handleRemoveCost = (id) => projectCosts.length > 1 && setProjectCosts(projectCosts.filter(c => c.id !== id));
    const updateCost = (id, field, value) => {
        setProjectCosts(projectCosts.map(c => {
            if (c.id === id) { return { ...c, [field]: value }; }
            return c;
        }));
    };

    const handleLogoUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) { // 2MB limit for base64
                alert("L'image est trop volumineuse (max 2MB)");
                e.target.value = ''; // Reset
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setLogo(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    // Calculate Real-time Margin
    const totalCosts = projectCosts.reduce((sum, cost) => sum + (parseFloat(cost.montant) || 0), 0);
    const revenue = regime === 'Abonnement' ? (parseFloat(montantMensuel) || 0) : (parseFloat(montantTotal) || 0);
    const netMargin = revenue - totalCosts;

    const handleSubmit = (e) => {
        e.preventDefault();

        // Validation simple
        const cleanEnseigne = enseigne.trim();
        if (!cleanEnseigne) {
            alert("L'enseigne (Nom) est obligatoire.");
            return;
        }

        const existingClients = getClients();
        const isDuplicate = existingClients.some(c => 
            c.enseigne.toLowerCase() === cleanEnseigne.toLowerCase() && 
            (!initialData || c.id !== initialData.id)
        );

        if (isDuplicate) {
            alert("Un client avec cette enseigne existe déjà !");
            return;
        }

        const newClient = {
            id: initialData ? initialData.id : generateSequentialClientId(cleanEnseigne, dateDebut),
            enseigne: cleanEnseigne,
            logo,
            projet,
            secteur,
            etatClient,
            charge,
            nomFinancier,
            emailFinancier,
            dateDebut,
            mf,
            mail,
            telephone,
            adresse,
            dateFin,
            bonCommande,
            regime,
            montantMensuel: regime === 'Abonnement' ? montantMensuel : null,
            jourPaiement: regime === 'Abonnement' ? jourPaiement : null,
            delaiPaiement,
            modeCycle: regime === 'Abonnement' ? modeCycle : null,
            jourCycle: regime === 'Abonnement' ? (modeCycle === 'Personnalisé' ? jourCycle : (modeCycle === 'Du 15 au 14' ? 15 : ((modeCycle === "Date de début" || modeCycle === "Date d'entrée") && dateDebut ? parseInt(dateDebut.split('-')[2], 10) : 1))) : null,
            dureeMois: regime === 'One-Shot' ? dureeMois : null,
            montantTotal: regime === 'One-Shot' ? montantTotal : null,
            datePaiement: regime === 'One-Shot' ? datePaiementOneShot : null,
            // Nettoyer les listes vides avant de sauvegarder
            servicesRecurrents: regime === 'Abonnement'
                ? servicesRecurrents.filter(s => s.desc.trim() !== '')
                : servicesRecurrents.filter(s => s.desc.trim() !== ''),
            projectCosts: projectCosts.filter(c => c.nom.trim() !== '' && c.montant !== ''),
            totalCosts,
            netMargin,
            dureeService,
            sousTVA,
            employeAssocie,
            option15Jours: (modeCycle === 'Mois civil (1er au 31)' && dateDebut && dateDebut.endsWith('-15')) ? option15Jours : ''
        };

        onSave(newClient);

        // Reset state after save
        setEnseigne('');
        setLogo('');
        setProjet('');
        setSecteur('');
        setEtatClient('Actif');
        setCharge('');
        setNomFinancier('');
        setEmailFinancier('');
        setDateDebut('');
        setMf('');
        setMail('');
        setTelephone('');
        setAdresse('');
        setDateFin('');
        setBonCommande('');
        setRegime('Abonnement');
        setMontantMensuel('');
        setJourPaiement('');
        setDelaiPaiement('');
        setModeCycle('Mois civil (1er au 31)');
        setJourCycle('');
        setDureeMois('');
        setMontantTotal('');
        setDatePaiementOneShot('');
        setServicesRecurrents([{ id: 1, desc: '' }]);
        setProjectCosts([{ id: 1, nom: '', specialite: '', montant: '', recurrence: 'Mensuel' }]);
        setDureeService('');
        setSousTVA(false);
        setEmployeAssocie('');
        setOption15Jours('');

        onClose();
    };

    if (!isOpen) return null;

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '24px', width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>

                {/* HEADER */}
                <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'var(--card-bg)', backdropFilter: 'var(--glass-blur)', zIndex: 10, borderTopLeftRadius: '24px', borderTopRightRadius: '24px' }}>
                    <div>
                        <h2 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>{initialData ? 'Modifier le Client' : 'Nouveau Client'}</h2>
                    </div>
                    <button onClick={onClose} style={{ background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)' }}>
                        <X size={16} />
                    </button>
                </div>

                {/* BODY / FORM */}
                <div style={{ padding: '24px', flex: 1 }}>
                    <form id="client-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) minmax(300px, 1fr)', gap: '16px' }}>
                            {/* Section 1: Identité & Contact (Left Tile) */}
                            <div style={{ background: 'var(--bg-main)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(15,23,42,0.05)' }}>
                                <h3 style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>🏢 Identité Client</h3>

                                <div style={{ display: 'flex', gap: '16px' }}>
                                    {/* Logo Upload Area */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <div style={{ width: '80px', height: '80px', borderRadius: '12px', background: 'rgba(15,23,42,0.03)', position: 'relative', overflow: 'hidden', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }} onMouseOver={e => e.currentTarget.style.background = 'rgba(15,23,42,0.06)'} onMouseOut={e => e.currentTarget.style.background = 'rgba(15,23,42,0.03)'}>
                                            {logo ? (
                                                <img src={logo} alt="Logo preview" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '6px' }} />
                                            ) : (
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'var(--text-muted)' }}>
                                                    <Plus size={20} />
                                                    <span style={{ fontSize: '10px', marginTop: '2px', fontWeight: '600' }}>Logo</span>
                                                </div>
                                            )}
                                            <input type="file" accept="image/*" onChange={handleLogoUpload} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
                                        </div>
                                        {logo && (
                                            <button type="button" onClick={() => setLogo('')} style={{ background: 'transparent', border: 'none', color: 'var(--danger)', fontSize: '10px', fontWeight: '700', cursor: 'pointer', padding: 0 }}>Retirer</button>
                                        )}
                                    </div>

                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <label style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Enseigne (Nom) <span style={{ color: 'red' }}>*</span></label>
                                            <input type="text" value={enseigne} onChange={e => setEnseigne(e.target.value)} placeholder="Ex: MYNDS Agency" required style={{ padding: '8px 12px', borderRadius: '8px', border: 'none', background: 'var(--card-bg)', color: 'var(--text-main)', fontSize: '13px', fontWeight: '600', width: '100%', boxSizing: 'border-box' }} />
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <label style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Matricule Fiscal (MF)</label>
                                            <input type="text" value={mf} onChange={e => setMf(e.target.value)} placeholder="0000000/X/X/X/000" style={{ padding: '8px 12px', borderRadius: '8px', border: 'none', background: 'var(--card-bg)', color: 'var(--text-main)', fontSize: '13px', fontWeight: '500', width: '100%', boxSizing: 'border-box' }} />
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', gridColumn: 'span 2' }}>
                                        <label style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Secteur d'activité</label>
                                        <select value={secteur} onChange={e => { setSecteur(e.target.value); setProjet(''); }} style={{ padding: '8px 12px', borderRadius: '8px', border: 'none', background: 'var(--card-bg)', color: 'var(--text-main)', fontSize: '13px', fontWeight: '500', width: '100%', boxSizing: 'border-box', cursor: 'pointer' }}>
                                            <option value="">Sélectionner un secteur</option>
                                            {secteursList.map(s => <option key={s.id} value={s.nom}>{s.nom}</option>)}
                                        </select>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <label style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>E-mail central</label>
                                        <input type="email" value={mail} onChange={e => setMail(e.target.value)} placeholder="contact@..." style={{ padding: '8px 12px', borderRadius: '8px', border: 'none', background: 'var(--card-bg)', color: 'var(--text-main)', fontSize: '13px', fontWeight: '500', width: '100%', boxSizing: 'border-box' }} />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <label style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Téléphone</label>
                                        <input type="tel" value={telephone} onChange={e => setTelephone(e.target.value)} placeholder="+216 ..." style={{ padding: '8px 12px', borderRadius: '8px', border: 'none', background: 'var(--card-bg)', color: 'var(--text-main)', fontSize: '13px', fontWeight: '500', width: '100%', boxSizing: 'border-box' }} />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', gridColumn: 'span 2' }}>
                                        <label style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Sous TVA</label>
                                        <div style={{ display: 'flex', gap: '16px', background: 'var(--card-bg)', padding: '8px 12px', borderRadius: '8px' }}>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>
                                                <input type="radio" checked={sousTVA === true} onChange={() => setSousTVA(true)} style={{ accentColor: 'var(--success)' }} /> Oui
                                            </label>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>
                                                <input type="radio" checked={sousTVA === false} onChange={() => setSousTVA(false)} style={{ accentColor: 'var(--danger)' }} /> Non
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Section 2: Détails & Suivi (Right Tile) */}
                            <div style={{ background: 'var(--bg-main)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(15,23,42,0.05)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                    <h3 style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-main)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>📋 Suivi & Opérations</h3>
                                    <select value={etatClient} onChange={e => setEtatClient(e.target.value)} style={{ padding: '4px 8px', borderRadius: '6px', border: 'none', background: etatClient === 'Actif' ? 'var(--success-bg)' : etatClient === 'Inactif' ? 'var(--danger-bg)' : 'rgba(15,23,42,0.05)', color: etatClient === 'Actif' ? 'var(--success)' : etatClient === 'Inactif' ? 'var(--danger)' : 'var(--text-main)', fontSize: '11px', fontWeight: '800', cursor: 'pointer', outline: 'none' }}>
                                        <option value="Actif">✅ Actif</option>
                                        <option value="Prospect">🔵 Prospect</option>
                                        <option value="Pause">⏸️ En Pause</option>
                                        <option value="Inactif">⭕ Inactif</option>
                                    </select>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', gridColumn: 'span 2' }}>
                                        <label style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Projet associé</label>
                                        <select value={projet} onChange={e => setProjet(e.target.value)} disabled={!secteur} style={{ padding: '8px 12px', borderRadius: '8px', border: 'none', background: 'var(--card-bg)', color: 'var(--text-main)', fontSize: '13px', fontWeight: '600', width: '100%', boxSizing: 'border-box', opacity: secteur ? 1 : 0.6 }}>
                                            <option value="">Sélectionner</option>
                                            {activeSecteurRecord?.projets.map((p, i) => (
                                                <option key={i} value={p}>{p}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <label style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Employé Associé (RH principal)</label>
                                        <select value={employeAssocie} onChange={e => setEmployeAssocie(e.target.value)} style={{ padding: '8px 12px', borderRadius: '8px', border: 'none', background: 'var(--card-bg)', color: 'var(--text-main)', fontSize: '13px', fontWeight: '500', width: '100%', boxSizing: 'border-box' }}>
                                            <option value="">Non assigné</option>
                                            {rhList.map(r => <option key={r.id} value={r.nom}>{r.nom}</option>)}
                                        </select>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <label style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }} title="Utilisé pour l'envoi si aucun financier n'est défini">Contact Principal (Vis à vis)</label>
                                        <input type="text" value={charge} onChange={e => setCharge(e.target.value)} placeholder="Nom du contact" style={{ padding: '8px 12px', borderRadius: '8px', border: 'none', background: 'var(--card-bg)', color: 'var(--text-main)', fontSize: '13px', fontWeight: '500', width: '100%', boxSizing: 'border-box' }} />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <label style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Nom du Financier</label>
                                        <input type="text" value={nomFinancier} onChange={e => setNomFinancier(e.target.value)} placeholder="Responsable financier" style={{ padding: '8px 12px', borderRadius: '8px', border: 'none', background: 'var(--card-bg)', color: 'var(--text-main)', fontSize: '13px', fontWeight: '500', width: '100%', boxSizing: 'border-box' }} />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <label style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Email du Financier</label>
                                        <input type="email" value={emailFinancier} onChange={e => setEmailFinancier(e.target.value)} placeholder="Destinataire factures" style={{ padding: '8px 12px', borderRadius: '8px', border: 'none', background: 'var(--card-bg)', color: 'var(--text-main)', fontSize: '13px', fontWeight: '500', width: '100%', boxSizing: 'border-box' }} />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <label style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Bon de Commande</label>
                                        <input type="text" value={bonCommande} onChange={e => setBonCommande(e.target.value)} placeholder="BC N°..." style={{ padding: '8px 12px', borderRadius: '8px', border: 'none', background: 'var(--card-bg)', color: 'var(--text-main)', fontSize: '13px', fontWeight: '500', width: '100%', boxSizing: 'border-box' }} />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <label style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Adresse</label>
                                        <input type="text" value={adresse} onChange={e => setAdresse(e.target.value)} placeholder="Localisation" style={{ padding: '8px 12px', borderRadius: '8px', border: 'none', background: 'var(--card-bg)', color: 'var(--text-main)', fontSize: '13px', fontWeight: '500', width: '100%', boxSizing: 'border-box' }} />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <label style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Date de Début</label>
                                        <input type="date" value={dateDebut} onChange={e => setDateDebut(e.target.value)} style={{ padding: '8px 12px', borderRadius: '8px', border: 'none', background: 'var(--card-bg)', color: 'var(--text-main)', fontSize: '13px', fontWeight: '600', width: '100%', boxSizing: 'border-box' }} />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <label style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Date Fin (Optionnel)</label>
                                        <input type="date" value={dateFin} onChange={e => setDateFin(e.target.value)} style={{ padding: '8px 12px', borderRadius: '8px', border: 'none', background: 'var(--card-bg)', color: 'var(--text-main)', fontSize: '13px', fontWeight: '600', width: '100%', boxSizing: 'border-box' }} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Section 3: Régime de Facturation & Factures (Bottom Tile) */}
                        <div style={{ background: 'var(--bg-main)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(15,23,42,0.05)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <h3 style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-main)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>💲 Régime de Facturation</h3>
                                <div style={{ display: 'flex', gap: '4px', background: 'var(--card-bg)', padding: '4px', borderRadius: '10px' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', padding: '6px 12px', borderRadius: '8px', background: regime === 'Abonnement' ? 'white' : 'transparent', boxShadow: regime === 'Abonnement' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none', transition: 'all 0.2s' }}>
                                        <input type="radio" name="regime" value="Abonnement" checked={regime === 'Abonnement'} onChange={() => setRegime('Abonnement')} style={{ display: 'none' }} />
                                        <span style={{ fontWeight: '700', color: regime === 'Abonnement' ? 'var(--accent-gold)' : 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>Abonnement</span>
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', padding: '6px 12px', borderRadius: '8px', background: regime === 'One-Shot' ? 'white' : 'transparent', boxShadow: regime === 'One-Shot' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none', transition: 'all 0.2s' }}>
                                        <input type="radio" name="regime" value="One-Shot" checked={regime === 'One-Shot'} onChange={() => setRegime('One-Shot')} style={{ display: 'none' }} />
                                        <span style={{ fontWeight: '700', color: regime === 'One-Shot' ? 'var(--text-main)' : 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>One-Shot</span>
                                    </label>
                                </div>
                            </div>

                            {regime === 'Abonnement' ? (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <label style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Montant Mensuel (HT)</label>
                                        <input type="number" step="0.001" value={montantMensuel} onChange={e => setMontantMensuel(e.target.value)} placeholder="0.000" required={regime === 'Abonnement'} style={{ padding: '8px 12px', borderRadius: '8px', border: 'none', background: 'var(--card-bg)', color: 'var(--text-main)', fontSize: '14px', fontWeight: '700', width: '100%', boxSizing: 'border-box' }} />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <label style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Cycle de Facturation (Période)</label>
                                        <select value={modeCycle} onChange={e => setModeCycle(e.target.value)} style={{ padding: '8px 12px', borderRadius: '8px', border: 'none', background: 'var(--card-bg)', color: 'var(--text-main)', fontSize: '12px', fontWeight: '600', width: '100%', boxSizing: 'border-box' }}>
                                            <option value="Mois civil (1er au 31)">Mois civil (du 1er à la fin)</option>
                                            <option value="Du 15 au 14">Mi-Mois (du 15 au 14)</option>
                                            <option value="Date de début">Date de début (chaque mois)</option>
                                            <option value="Personnalisé">Sur mesure (Personnalisé)</option>
                                        </select>
                                    </div>
                                    {modeCycle === 'Personnalisé' ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <label style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Jour de début (1-31)</label>
                                            <input type="number" min="1" max="31" value={jourCycle} onChange={e => setJourCycle(e.target.value)} placeholder="Ex: 5" required={modeCycle === 'Personnalisé'} style={{ padding: '8px 12px', borderRadius: '8px', border: 'none', background: 'var(--card-bg)', color: 'var(--text-main)', fontSize: '13px', fontWeight: '600', width: '100%', boxSizing: 'border-box' }} />
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <label style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Jour Paiement Échéance</label>
                                            <input type="number" min="1" max="31" value={jourPaiement} onChange={e => setJourPaiement(e.target.value)} placeholder="5" required={regime === 'Abonnement'} style={{ padding: '8px 12px', borderRadius: '8px', border: 'none', background: 'var(--card-bg)', color: 'var(--text-main)', fontSize: '13px', fontWeight: '600', width: '100%', boxSizing: 'border-box' }} />
                                        </div>
                                    )}

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', gridColumn: 'span 3', marginTop: '8px' }}>
                                        <label style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Délai de Paiement à Réception (Jours)</label>
                                        <input type="number" value={delaiPaiement} onChange={e => setDelaiPaiement(e.target.value)} placeholder="Ex: 30, 60, 90... (Vide = 48h)" style={{ padding: '8px 12px', borderRadius: '8px', border: 'none', background: 'var(--card-bg)', color: 'var(--text-main)', fontSize: '13px', fontWeight: '600', width: '100%', boxSizing: 'border-box' }} title="Ce délai calculera l'échéance par défaut de chaque facture générée" />
                                        <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>* Si laissé vide, la facture sera considérée en retard 48h après émission.</span>
                                    </div>

                                    {/* Cas spécifique : Début le 15 + Cycle Civil */}
                                    {modeCycle === 'Mois civil (1er au 31)' && dateDebut && dateDebut.endsWith('-15') && (
                                        <div style={{ gridColumn: 'span 3', padding: '12px', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.1)', marginTop: '8px' }}>
                                            <p style={{ fontSize: '11px', fontWeight: '700', color: 'var(--info)', marginBottom: '8px' }}>
                                                ℹ️ Début le 15 du mois détecté avec cycle civil. Comment traiter les 15 premiers jours ?
                                            </p>
                                            <div style={{ display: 'flex', gap: '16px' }}>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}>
                                                    <input type="radio" value="espece" checked={option15Jours === 'espece'} onChange={() => setOption15Jours('espece')} style={{ accentColor: 'var(--info)' }} /> 15js payés en espèces
                                                </label>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}>
                                                    <input type="radio" value="cadeau" checked={option15Jours === 'cadeau'} onChange={() => setOption15Jours('cadeau')} style={{ accentColor: 'var(--info)' }} /> 15js offerts (cadeau)
                                                </label>
                                            </div>
                                        </div>
                                    )}

                                    {/* Services in Abonnement */}
                                    <div style={{ gridColumn: 'span 3', borderTop: '1px dashed rgba(15,23,42,0.1)', paddingTop: '16px', marginTop: '4px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                            <h4 style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', margin: 0, textTransform: 'uppercase' }}>Prestations Automatisées (Facture)</h4>
                                            <button type="button" onClick={handleAddService} style={{ fontSize: '10px', padding: '4px 8px', border: 'none', color: '#B45309', background: 'rgba(255, 193, 5, 0.1)', borderRadius: '6px', cursor: 'pointer', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px', textTransform: 'uppercase' }}>
                                                <Plus size={12} /> Ajouter
                                            </button>
                                        </div>
                                        <datalist id="services-list-client">
                                            {servicesList.map(s => <option key={s.id} value={s.nom}></option>)}
                                        </datalist>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            {servicesRecurrents.map((service) => (
                                                <div key={service.id} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                    <div style={{ flex: 3 }}>
                                                        <input list="services-list-client" type="text" placeholder="Service prévu sur la facture..." value={service.desc} onChange={e => updateService(service.id, 'desc', e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: 'none', background: 'var(--card-bg)', fontSize: '12px', fontWeight: '500', boxSizing: 'border-box' }} />
                                                    </div>
                                                    <div style={{ flex: 1.5 }}>
                                                        <input type="number" step="0.001" placeholder="Prix HT" value={service.prix} onChange={e => updateService(service.id, 'prix', e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: 'none', background: 'var(--card-bg)', fontSize: '12px', fontWeight: '600', boxSizing: 'border-box' }} />
                                                    </div>
                                                    <button type="button" onClick={() => handleRemoveService(service.id)} style={{ background: 'transparent', border: 'none', color: 'var(--danger)', opacity: servicesRecurrents.length > 1 ? 1 : 0.3, cursor: servicesRecurrents.length > 1 ? 'pointer' : 'not-allowed', padding: '8px' }}>
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {/* Row 1: Durée + Dates */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <label style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Durée (Mois)</label>
                                            <input type="number" min="1" value={dureeMois} onChange={e => setDureeMois(e.target.value)} placeholder="3" style={{ padding: '8px 12px', borderRadius: '8px', border: 'none', background: 'var(--card-bg)', color: 'var(--text-main)', fontSize: '13px', fontWeight: '600', width: '100%', boxSizing: 'border-box' }} />
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <label style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Date Fin Projet</label>
                                            <input type="date" value={dateFin} onChange={e => setDateFin(e.target.value)} style={{ padding: '8px 12px', borderRadius: '8px', border: 'none', background: 'var(--card-bg)', color: 'var(--text-main)', fontSize: '13px', fontWeight: '600', width: '100%', boxSizing: 'border-box' }} />
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <label style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Date Cible Paiement</label>
                                            <input type="date" value={datePaiementOneShot} onChange={e => setDatePaiementOneShot(e.target.value)} style={{ padding: '8px 12px', borderRadius: '8px', border: 'none', background: 'var(--card-bg)', color: 'var(--text-main)', fontSize: '13px', fontWeight: '600', width: '100%', boxSizing: 'border-box' }} />
                                        </div>
                                    </div>

                                    {/* Row 2: Services list */}
                                    <div style={{ borderTop: '1px dashed rgba(15,23,42,0.1)', paddingTop: '12px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                            <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>📋 Livrables & Services</span>
                                            <button type="button" onClick={handleAddService} style={{ fontSize: '10px', padding: '3px 8px', border: 'none', color: '#B45309', background: 'rgba(255,193,5,0.1)', borderRadius: '6px', cursor: 'pointer', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <Plus size={11} /> Ajouter
                                            </button>
                                        </div>
                                        <datalist id="services-list-oneshot">
                                            {servicesList.map(s => <option key={s.id} value={s.nom}></option>)}
                                        </datalist>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            {servicesRecurrents.map((service) => (
                                                <div key={service.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '6px', alignItems: 'center' }}>
                                                    <input
                                                        list="services-list-oneshot"
                                                        type="text"
                                                        placeholder="Service ou livrable..."
                                                        value={service.desc}
                                                        onChange={e => {
                                                            const val = e.target.value;
                                                            const found = servicesList.find(s => s.nom === val);
                                                            updateService(service.id, 'desc', val);
                                                            if (found && !service.prix) updateService(service.id, 'prix', found.prix);
                                                        }}
                                                        style={{ padding: '6px 10px', borderRadius: '7px', border: 'none', background: 'var(--card-bg)', fontSize: '12px', fontWeight: '500', width: '100%', boxSizing: 'border-box' }}
                                                    />
                                                    <div style={{ position: 'relative', width: '90px' }}>
                                                        <input
                                                            type="number"
                                                            step="0.001"
                                                            placeholder="0.000"
                                                            value={service.prix}
                                                            onChange={e => updateService(service.id, 'prix', e.target.value)}
                                                            style={{ padding: '6px 28px 6px 8px', borderRadius: '7px', border: 'none', background: 'var(--card-bg)', fontSize: '12px', fontWeight: '700', width: '100%', boxSizing: 'border-box' }}
                                                        />
                                                        <span style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', fontSize: '9px', color: 'var(--text-muted)', fontWeight: '700', pointerEvents: 'none' }}>TND</span>
                                                    </div>
                                                    <button type="button" onClick={() => handleRemoveService(service.id)} style={{ background: 'transparent', border: 'none', color: 'var(--danger)', opacity: servicesRecurrents.length > 1 ? 1 : 0.3, cursor: servicesRecurrents.length > 1 ? 'pointer' : 'not-allowed', padding: '4px', display: 'flex', alignItems: 'center' }}>
                                                        <Trash2 size={13} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Auto-computed total */}
                                        {(() => {
                                            const servicesTotal = servicesRecurrents.reduce((s, r) => s + (parseFloat(r.prix) || 0), 0);
                                            return servicesTotal > 0 ? (
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', padding: '8px 12px', background: 'rgba(255,193,5,0.07)', borderRadius: '8px', border: '1px solid rgba(255,193,5,0.2)' }}>
                                                    <span style={{ fontSize: '10px', fontWeight: '700', color: '#B45309', textTransform: 'uppercase' }}>Total services</span>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <span style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-main)' }}>{servicesTotal.toFixed(3)} TND</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => setMontantTotal(servicesTotal.toFixed(3))}
                                                            style={{ fontSize: '9px', padding: '2px 8px', border: 'none', background: '#B45309', color: '#fff', borderRadius: '5px', cursor: 'pointer', fontWeight: '700', whiteSpace: 'nowrap' }}
                                                        >
                                                            Appliquer → Montant Total
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : null;
                                        })()}

                                        {/* Montant total override */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px' }}>
                                            <label style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Montant Total Facturé (override)</label>
                                            <input
                                                type="number"
                                                step="0.001"
                                                value={montantTotal}
                                                onChange={e => setMontantTotal(e.target.value)}
                                                placeholder="Auto-calculé depuis les services"
                                                required={regime === 'One-Shot'}
                                                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px dashed rgba(255,193,5,0.4)', background: 'var(--card-bg)', color: 'var(--text-main)', fontSize: '14px', fontWeight: '700', width: '100%', boxSizing: 'border-box' }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Section 4: Structure de Coûts & Marge */}
                        <div style={{ background: 'var(--bg-main)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(15,23,42,0.05)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <h3 style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-main)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>📊 Structure de Coûts (Salariés / Sous-Traitants)</h3>
                                <button type="button" onClick={handleAddCost} style={{ fontSize: '10px', padding: '4px 10px', background: 'white', border: '1px solid rgba(15,23,42,0.05)', borderRadius: '6px', cursor: 'pointer', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px', textTransform: 'uppercase', color: 'var(--text-main)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                                    <Plus size={12} /> Ajouter une charge
                                </button>
                            </div>

                            <div style={{ display: 'flex', gap: '8px', padding: '0 8px 4px 8px', fontSize: '9px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                <div style={{ flex: 1.2 }}>Ressource RH</div>
                                <div style={{ flex: 0.8 }}>Spécialité</div>
                                <div style={{ flex: 0.8 }}>Type</div>
                                <div style={{ flex: 1 }}>Validité (Du)</div>
                                <div style={{ flex: 1 }}>Au (Optionnel)</div>
                                <div style={{ flex: 0.8 }}>Coût (HT)</div>
                                <div style={{ width: '30px' }}></div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                                {projectCosts.map((cost) => (
                                    <div key={cost.id} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        <div style={{ flex: 1.2 }}>
                                            {rhList && rhList.length > 0 ? (
                                                <select value={cost.nom || ''} onChange={e => {
                                                    const val = e.target.value;
                                                    const selectedRh = rhList.find(r => r.nom === val);
                                                    setProjectCosts(projectCosts.map(c => {
                                                        if (c.id === cost.id) {
                                                            return { ...c, nom: val, specialite: (!c.specialite && selectedRh) ? selectedRh.poste : c.specialite };
                                                        }
                                                        return c;
                                                    }));
                                                }} style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', fontSize: '11px', fontWeight: '600', boxSizing: 'border-box', appearance: 'none', cursor: 'pointer' }}>
                                                    <option value="">-- Assigner --</option>
                                                    {rhList.map(r => (
                                                        <option key={r.id} value={r.nom}>{r.nom}</option>
                                                    ))}
                                                    <option value="Autre externe">Externe / Autre</option>
                                                </select>
                                            ) : (
                                                <input type="text" placeholder="RH" value={cost.nom || ''} onChange={e => updateCost(cost.id, 'nom', e.target.value)} style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', fontSize: '11px', fontWeight: '500', boxSizing: 'border-box' }} />
                                            )}
                                        </div>
                                        <div style={{ flex: 0.8 }}>
                                            <select value={cost.specialite || ''} onChange={e => updateCost(cost.id, 'specialite', e.target.value)} style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', fontSize: '11px', fontWeight: '500', boxSizing: 'border-box', appearance: 'none', cursor: 'pointer' }}>
                                                <option value="">Spéc.</option>
                                                <option value="CM">CM</option>
                                                <option value="Design">Design</option>
                                                <option value="Ads">Ads</option>
                                                <option value="Dev">Dev</option>
                                                <option value="Mng">Mng</option>
                                                <option value="Security">Security</option>
                                            </select>
                                        </div>
                                        <div style={{ flex: 0.8 }}>
                                            <select value={cost.recurrence || 'Mensuel'} onChange={e => updateCost(cost.id, 'recurrence', e.target.value)} style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', fontSize: '11px', fontWeight: '500', boxSizing: 'border-box', appearance: 'none', cursor: 'pointer' }}>
                                                <option value="Mensuel">Mensuel</option>
                                                <option value="Ponctuel">Ponctuel</option>
                                            </select>
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <input type="date" value={cost.dateDebut || ''} onChange={e => updateCost(cost.id, 'dateDebut', e.target.value)} style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', fontSize: '11px', boxSizing: 'border-box' }} />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <input type="date" value={cost.dateFin || ''} onChange={e => updateCost(cost.id, 'dateFin', e.target.value)} style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', fontSize: '11px', boxSizing: 'border-box' }} />
                                        </div>
                                        <div style={{ flex: 0.8 }}>
                                            <input type="number" step="0.001" placeholder="0.000" value={cost.montant || ''} onChange={e => updateCost(cost.id, 'montant', e.target.value)} style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', fontSize: '11px', fontWeight: '700', boxSizing: 'border-box' }} />
                                        </div>
                                        <button type="button" onClick={() => handleRemoveCost(cost.id)} style={{ background: 'transparent', border: 'none', color: 'var(--danger)', opacity: projectCosts.length > 1 ? 1 : 0.3, cursor: projectCosts.length > 1 ? 'pointer' : 'not-allowed', padding: '6px' }}>
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>


                            {/* P&L SUMMARY */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderRadius: '12px', background: 'var(--card-bg)', border: '1px solid rgba(15,23,42,0.05)' }}>
                                <div style={{ display: 'flex', gap: '32px' }}>
                                    <div>
                                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '2px', letterSpacing: '0.5px' }}>Revenu ({regime})</div>
                                        <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-main)' }}>{revenue.toFixed(3)} TND</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '2px', letterSpacing: '0.5px' }}>Charges Projet</div>
                                        <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--danger)' }}>- {totalCosts.toFixed(3)} TND</div>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.5px' }}>Marge Nette</div>
                                    <div style={{ fontSize: '16px', fontWeight: '800', color: netMargin >= 0 ? 'var(--success)' : 'var(--danger)', background: netMargin >= 0 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', padding: '6px 12px', borderRadius: '8px', display: 'inline-block' }}>
                                        {netMargin > 0 ? '+' : ''}{netMargin.toFixed(3)} TND
                                    </div>
                                </div>
                            </div>
                        </div>

                    </form>
                </div>

                {/* FOOTER */}
                <div style={{
                    padding: '20px 24px',
                    borderTop: '1px solid var(--border-color)',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '12px',
                    background: 'var(--card-bg)',
                    backdropFilter: 'var(--glass-blur)',
                    borderBottomLeftRadius: '24px',
                    borderBottomRightRadius: '24px',
                    position: 'sticky',
                    bottom: 0,
                    zIndex: 10
                }}>
                    <button type="button" onClick={onClose} style={{ padding: '12px 24px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'transparent', cursor: 'pointer', fontWeight: '600', color: 'var(--text-muted)' }}>Annuler</button>
                    <button type="submit" form="client-form" style={{
                        padding: '12px 32px',
                        borderRadius: '12px',
                        border: 'none',
                        background: 'var(--accent-gold)',
                        color: 'var(--text-main)',
                        cursor: 'pointer',
                        fontWeight: '800',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: '0 8px 24px rgba(255, 193, 5, 0.2)',
                        transition: 'all 0.2s'
                    }}>
                        <Check size={18} strokeWidth={3} /> Enregistrer la fiche
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ClientModal;
