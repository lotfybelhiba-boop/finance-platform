import React, { useState, useEffect, useMemo } from 'react';
import { X, Plus, Trash2, FileDown, Wand2 } from 'lucide-react';
import { generateDocumentPDF } from '../utils/pdfGenerator.jsx';
import { loadConfig, initialServices } from '../data/defaultConfig';
import { getClients, getFactures } from '../services/storageService';

const FactureModal = ({ isOpen, onClose, onSave, factureToEdit, initialClientName, targetDate }) => {
    const servicesList = useMemo(() => loadConfig('services', initialServices), []);
    const clientsList = useMemo(() => getClients() || [], []);

    // Initial state derived from props
    const getInitialState = () => {
        const initialState = {
            client: '',
            dateEmi: new Date().toISOString().split('T')[0],
            echeance: '',
            periodeDebut: '',
            periodeFin: '',
            lignes: [],
            conditions: 'Standard',
            applyTva: true,
            applyTimbre: true,
            isExonore: false,
            notes: '',
            statut: 'Draft',
            isExtra: false,
            coutExtra: 0,
            ressourceExtra: '',
            selectedMonth: ''
        };

        if (factureToEdit) {
            return {
                ...initialState,
                client: factureToEdit.clientId || '',
                dateEmi: factureToEdit.dateEmi || initialState.dateEmi,
                echeance: factureToEdit.echeance !== 'N/A' ? factureToEdit.echeance : '',
                periodeDebut: factureToEdit.periodeDebut || '',
                periodeFin: factureToEdit.periodeFin || '',
                statut: factureToEdit.statut || 'Draft',
                lignes: factureToEdit.lignes || [],
                conditions: factureToEdit.conditions || 'Standard',
                applyTva: factureToEdit.tva > 0,
                applyTimbre: factureToEdit.timbre > 0,
                isExonore: factureToEdit.isExonore || false,
                notes: factureToEdit.notes || '',
                isExtra: factureToEdit.isExtra || false,
                coutExtra: factureToEdit.coutExtra || 0,
                ressourceExtra: factureToEdit.ressourceExtra || ''
            };
        }

        if (initialClientName) {
            const cObj = clientsList.find(c => c.id === initialClientName);
            initialState.client = initialClientName;

            if (cObj && cObj.regime === 'Abonnement') {
                const baseDate = targetDate
                    ? new Date(targetDate.year, targetDate.month, 1)
                    : new Date();

                let cycleDay = 1;
                if (targetDate && targetDate.cycleDay) {
                    cycleDay = targetDate.cycleDay;
                } else if (cObj) {
                    if (cObj.modeCycle?.includes('Mois civil')) cycleDay = 1;
                    else if (cObj.modeCycle === 'Du 15 au 14') cycleDay = 15;
                    else if ((cObj.modeCycle === "Date de début" || cObj.modeCycle === "Date d'entrée") && cObj.dateDebut) {
                        const d = new Date(cObj.dateDebut);
                        if (!isNaN(d.getTime())) cycleDay = d.getDate();
                    } else if (cObj.modeCycle === 'Personnalisé' && cObj.jourCycle) {
                        cycleDay = parseInt(cObj.jourCycle, 10);
                    } else {
                        if (cObj.jourFacturation) cycleDay = parseInt(cObj.jourFacturation, 10);
                        else if (cObj.dateDebut) {
                            const d = new Date(cObj.dateDebut);
                            if (!isNaN(d.getTime())) cycleDay = d.getDate();
                        } else if (cObj.jourPaiement) cycleDay = parseInt(cObj.jourPaiement, 10) || 1;
                    }
                }
                if (isNaN(cycleDay) || cycleDay < 1 || cycleDay > 31) cycleDay = 1;

                const pad = (n) => n.toString().padStart(2, '0');
                const firstD = (cycleDay === 1)
                    ? new Date(baseDate.getFullYear(), baseDate.getMonth(), 1)
                    : new Date(baseDate.getFullYear(), baseDate.getMonth() - 1, cycleDay);
                const lastD = (cycleDay === 1)
                    ? new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0)
                    : new Date(baseDate.getFullYear(), baseDate.getMonth(), cycleDay - 1);

                initialState.periodeDebut = `${firstD.getFullYear()}-${pad(firstD.getMonth() + 1)}-${pad(firstD.getDate())}`;
                initialState.periodeFin = `${lastD.getFullYear()}-${pad(lastD.getMonth() + 1)}-${pad(lastD.getDate())}`;
                initialState.dateEmi = initialState.periodeFin;

                let echDate;
                if (cObj && cObj.delaiPaiement) {
                    echDate = new Date(lastD);
                    echDate.setDate(echDate.getDate() + parseInt(cObj.delaiPaiement, 10));
                } else {
                    const jourP = cObj.jourPaiement || 5;
                    echDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + 2, jourP);
                }
                initialState.echeance = `${echDate.getFullYear()}-${pad(echDate.getMonth() + 1)}-${pad(echDate.getDate())}`;

                const monthLabel = baseDate.toLocaleDateString('fr-FR', { month: 'long' });
                const yearLabel = baseDate.getFullYear();

                let initialLignes = [];
                if (cObj.servicesRecurrents && cObj.servicesRecurrents.length > 0) {
                    // Si des services détaillés existent, on les utilise en priorité
                    initialLignes = cObj.servicesRecurrents.map((srv, idx) => ({
                        id: Date.now() + idx,
                        desc: srv.desc.includes(monthLabel) ? srv.desc : `${srv.desc} (${monthLabel} ${yearLabel})`,
                        qte: 1,
                        prix: parseFloat(srv.prix) || 0
                    }));
                } else if (cObj.montantMensuel) {
                    // Sinon on utilise le forfait de base
                    initialLignes = [{
                        id: Date.now(),
                        desc: `Abonnement ${monthLabel} ${yearLabel} - ${cObj.projet || 'Prestations'}`,
                        qte: 1,
                        prix: cObj.montantMensuel || 0
                    }];
                }

                initialState.lignes = initialLignes;
            }
        }

        return initialState;
    };

    const [init] = useState(getInitialState);

    const [client, setClient] = useState(init.client);
    const [dateEmi, setDateEmi] = useState(init.dateEmi);
    const [echeance, setEcheance] = useState(init.echeance);
    const [periodeDebut, setPeriodeDebut] = useState(init.periodeDebut);
    const [periodeFin, setPeriodeFin] = useState(init.periodeFin);
    const [lignes, setLignes] = useState(init.lignes);
    const [conditions, setConditions] = useState(init.conditions);
    const [applyTva, setApplyTva] = useState(init.applyTva);
    const [applyTimbre, setApplyTimbre] = useState(init.applyTimbre);
    const [isExonore, setIsExonore] = useState(init.isExonore);
    const [notes, setNotes] = useState(init.notes);
    const [statut, setStatut] = useState(init.statut);
    
    const [numeroGlobal, setNumeroGlobal] = useState('');
    const [numeroClient, setNumeroClient] = useState('');
    const [derniereFacture, setDerniereFacture] = useState('');
    const [isIdManual, setIsIdManual] = useState(false);

    const [isExtra, setIsExtra] = useState(init.isExtra);
    const [coutExtra, setCoutExtra] = useState(init.coutExtra);
    const [ressourceExtra, setRessourceExtra] = useState(init.ressourceExtra);

    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedServiceId, setSelectedServiceId] = useState('');
    const [selectedMonth, setSelectedMonth] = useState(init.selectedMonth);
    const [compteEncaissement, setCompteEncaissement] = useState(factureToEdit?.compteEncaissement || 'BIAT');
    const [datePaiement, setDatePaiement] = useState(factureToEdit?.datePaiement || new Date().toISOString().split('T')[0]);

    // NEW LOGIC: Auto-fill dates based on Client & Selected Month
    // NEW LOGIC: Auto-fill dates based on Selected Month (and Client if applicable)
    useEffect(() => {
        if (!isOpen || factureToEdit) return; // Only process for NEW invoices

        const now = new Date();
        let targetM = now.getMonth();
        let targetY = now.getFullYear();

        if (targetDate) {
            targetM = targetDate.month;
            targetY = targetDate.year;
        } else if (selectedMonth) {
            targetM = parseInt(selectedMonth, 10) - 1;
            // Handle cross-year logic
            if (targetM > now.getMonth() + 2) {
                targetY -= 1;
            }
        } else if (!client) {
            return; // Wait until they pick a client or a month
        }

        let cycleDay = 1;
        let jourPaiement = 5;

        if (client) {
            const currentClientObj = clientsList.find(c => c.id === client);
            if (currentClientObj) {
                if (targetDate && targetDate.cycleDay) {
                    cycleDay = targetDate.cycleDay;
                } else if (currentClientObj.modeCycle === 'Du 15 au 14') {
                    cycleDay = 15;
                } else if ((currentClientObj.modeCycle === "Date de début" || currentClientObj.modeCycle === "Date d'entrée") && currentClientObj.dateDebut) {
                    const d = new Date(currentClientObj.dateDebut);
                    if (!isNaN(d.getTime())) cycleDay = d.getDate();
                } else if (currentClientObj.modeCycle === 'Personnalisé' && currentClientObj.jourCycle) {
                    cycleDay = parseInt(currentClientObj.jourCycle, 10);
                } else {
                    if (currentClientObj.jourFacturation) cycleDay = parseInt(currentClientObj.jourFacturation, 10);
                    else if (currentClientObj.dateDebut) {
                        const d = new Date(currentClientObj.dateDebut);
                        if (!isNaN(d.getTime())) cycleDay = d.getDate();
                    } else if (currentClientObj.jourPaiement) cycleDay = parseInt(currentClientObj.jourPaiement, 10) || 1;
                }
                jourPaiement = currentClientObj.jourPaiement || 5;
            }
        }

        if (isNaN(cycleDay) || cycleDay < 1 || cycleDay > 31) cycleDay = 1;

        const pad = (n) => n.toString().padStart(2, '0');

        const firstDay = new Date(targetY, targetM, cycleDay);
        const lastDay = cycleDay === 1
            ? new Date(targetY, targetM + 1, 0)
            : new Date(targetY, targetM + 1, cycleDay - 1);

        const fDPad = `${firstDay.getFullYear()}-${pad(firstDay.getMonth() + 1)}-${pad(firstDay.getDate())}`;
        const lDPad = `${lastDay.getFullYear()}-${pad(lastDay.getMonth() + 1)}-${pad(lastDay.getDate())}`;

        setPeriodeDebut(fDPad);
        setPeriodeFin(lDPad);
        setDateEmi(lDPad); // La date d'émission correspond toujours à la date de fin
        
        // Calcul de l'échéance basé sur le Délai Paiement (nouveau) ou la logique d'Abonnement (ancien)
        let echeanceDate;
        if (client) {
            const currentClientObj = clientsList.find(c => c.id === client);
            if (currentClientObj && currentClientObj.delaiPaiement) {
                // Délai spécifique configuré sur la fiche client (ex: 30, 60 jours net)
                echeanceDate = new Date(lastDay);
                echeanceDate.setDate(echeanceDate.getDate() + parseInt(currentClientObj.delaiPaiement, 10));
            }
        }
        
        if (!echeanceDate) {
             // Logique par défaut pour Abonnement (Jour du mois *suivant*)
             echeanceDate = new Date(targetY, targetM + 1, jourPaiement);
        }

        setEcheance(`${echeanceDate.getFullYear()}-${pad(echeanceDate.getMonth() + 1)}-${pad(echeanceDate.getDate())}`);

    }, [client, selectedMonth, isOpen, factureToEdit, targetDate, clientsList]);

    // Calculate numbering when modal opens or client changes
    useEffect(() => {
        if (isOpen) {
            let allFactures = [];
            try {
                allFactures = getFactures();
            } catch {
                // Ignore parsing errors
            }

            const selectedClientObj = clientsList.find(c => c.id === client);
            const isSousTVA = selectedClientObj ? selectedClientObj.sousTVA : true;

            const clientFacturesList = allFactures.filter(f => f.id && !f.id.startsWith('ND-') && f.id !== 'non déclarée').sort((a, b) => new Date(b.dateEmi) - new Date(a.dateEmi));
            setDerniereFacture(clientFacturesList.length > 0 ? clientFacturesList[0].id : 'Aucune');

            if (factureToEdit) {
                setNumeroGlobal(factureToEdit.id);
                const clientFactures = allFactures.filter(f => f.clientId === factureToEdit.clientId).sort((a, b) => new Date(a.dateEmi) - new Date(b.dateEmi));
                const index = clientFactures.findIndex(f => f.id === factureToEdit.id);
                setNumeroClient(index >= 0 ? `Facture N°${index + 1} pour ${factureToEdit.client}` : `Facture pour ${factureToEdit.client}`);
                setApplyTva(factureToEdit.tva > 0);
            } else {
                if (!isIdManual) {
                    if (isSousTVA === false || isSousTVA === 'Non') {
                        // Non-VAT Facture -> Commence par ND-
                        const dateRef = new Date(periodeDebut || dateEmi || new Date());
                        const month = String(dateRef.getMonth() + 1).padStart(2, '0');
                        const year = dateRef.getFullYear();
                        const clientName = selectedClientObj ? selectedClientObj.enseigne.replace(/[^a-zA-Z0-9]/g, '') : 'Client';
                        const baseName = `ND-${year}${month}-${clientName}`;

                        // Check uniqueness
                        const existing = allFactures.filter(f => f.clientId === client && f.id && f.id.startsWith(baseName));
                        if (existing.length > 0) {
                            setNumeroGlobal(`${baseName}-${existing.length + 1}`);
                        } else {
                            setNumeroGlobal(baseName);
                        }
                        setApplyTva(false);
                        setApplyTimbre(false);
                        setCompteEncaissement('QNB'); // Default for non-declared
                    } else {
                        // VAT Factures - simulate what the backend (FacturesPage) will assign
                        setCompteEncaissement('BIAT'); // Default for declared
                        // Sorting by dateEmi then seniority
                        const vatFactures = allFactures.filter(f => f.tva > 0 || (f.id && /^N\d{2}-\d{4}-\d{3}$/.test(f.id)) || (f.id && f.id.startsWith('INV-')));
                        const currentYear = new Date(dateEmi || new Date()).getFullYear();

                        const yearVats = vatFactures.filter(f => new Date(f.dateEmi).getFullYear() === currentYear);

                        let maxGlobal = 0;
                        yearVats.forEach(f => {
                            if (f.id) {
                                const match = f.id.match(/^N(\d{2})-/);
                                if (match) {
                                    const num = parseInt(match[1], 10);
                                    if (num > maxGlobal) maxGlobal = num;
                                }
                            }
                        });
                        const globalCount = (currentYear === 2026 && maxGlobal === 0 && (client !== 'default-Globaleep' && client !== 'Globaleep')) ? 2 : maxGlobal + 1;

                        let maxClient = 0;
                        if (client) {
                            const clientFacturesAllTime = vatFactures.filter(f => f.client === client);
                            clientFacturesAllTime.forEach(f => {
                                if (f.id) {
                                    const match = f.id.match(/-(\d{3})$/);
                                    if (match) {
                                        const num = parseInt(match[1], 10);
                                        if (num > maxClient) maxClient = num;
                                    }
                                }
                            });
                        }
                        const clientCount = maxClient + 1;

                        setNumeroGlobal(`N${globalCount.toString().padStart(2, '0')}-${currentYear}-${clientCount.toString().padStart(3, '0')}`);
                        setApplyTva(true);
                    }
                }

                if (client) {
                    const clientFacturesAllTime = allFactures.filter(f => f.client === client && f.id && !f.id.startsWith('ND-') && f.id !== 'non déclarée');
                    setNumeroClient(`Facture N°${clientFacturesAllTime.length + 1} pour ${client}`);
                } else {
                    setNumeroClient('');
                }
            }
        }
    }, [isOpen, client, dateEmi, factureToEdit, clientsList, isIdManual, periodeDebut]);

    const selectedClientObj = clientsList.find(c => c.enseigne === client);
    const isAbonnement = selectedClientObj && selectedClientObj.regime === 'Abonnement';

    const handleAutomateLignes = () => {
        const clientObj = clientsList.find(c => c.id === client);
        if (!clientObj) return;

        const now = new Date();
        let targetM = now.getMonth();
        let targetY = now.getFullYear();
        if (selectedMonth) {
            targetM = parseInt(selectedMonth, 10) - 1;
        }

        const monthLabel = new Date(targetY, targetM, 1).toLocaleDateString('fr-FR', { month: 'long' });
        const newLignes = [];
        let timeId = Date.now();

        if (clientObj.servicesRecurrents && clientObj.servicesRecurrents.length > 0) {
            clientObj.servicesRecurrents.forEach(srv => {
                newLignes.push({
                    id: timeId++,
                    desc: srv.desc.includes(monthLabel) ? srv.desc : `${srv.desc} (${monthLabel} ${targetY})`,
                    qte: 1,
                    prix: parseFloat(srv.prix) || 0
                });
            });
        } else if (clientObj.montantMensuel) {
            newLignes.push({
                id: timeId++,
                desc: `Abonnement ${monthLabel} ${targetY} - ${clientObj.projet || 'Prestations'}`,
                qte: 1,
                prix: clientObj.montantMensuel || 0
            });
        }

        setLignes(newLignes);
        setConditions('Standard');
    };

    // Calculations
    const sousTotalHT = lignes.reduce((acc, ligne) => acc + (ligne.qte * ligne.prix), 0);
    const tva = applyTva ? sousTotalHT * 0.19 : 0;
    const timbre = applyTimbre ? 1 : 0; // 1 TND in Tunisia usually
    const totalTTC = sousTotalHT + tva + timbre;

    const formatMoney = (val) => new Intl.NumberFormat('fr-TN', { style: 'currency', currency: 'TND', minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(val);

    const handleAddLigne = () => {
        setLignes([...lignes, { id: Date.now(), desc: '', qte: 1, prix: 0 }]);
    };

    const handleRemoveLigne = (id) => {
        setLignes(lignes.filter(l => l.id !== id));
    };

    const updateLigne = (id, field, value) => {
        setLignes(lignes.map(l => {
            if (l.id === id) {
                // Auto-fill price if the new description matches a known service
                if (field === 'desc') {
                    const foundService = servicesList.find(s => s.nom === value);
                    if (foundService) {
                        return { ...l, desc: value, prix: foundService.prix };
                    }
                }
                return { ...l, [field]: value };
            }
            return l;
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        const currentClientObj = clientsList.find(c => c.id === client);
        const clientName = currentClientObj ? currentClientObj.enseigne : 'Client Inconnu';

        // 1. DUPLICATE PERIOD CHECK
        const allFactures = getFactures();
        const duplicatePeriod = allFactures.find(f => 
            f.clientId === client && 
            f.periodeDebut === periodeDebut && 
            f.periodeFin === periodeFin &&
            f.id !== factureToEdit?.id && // Exclude self if editing
            f.statut !== 'Archived' // Archived ones might be duplicates/corrections
        );

        if (duplicatePeriod) {
            const confirmDup = window.confirm(`⚠️ Attention : Une facture existe déjà pour ${clientName} sur la période du ${periodeDebut} au ${periodeFin} (${duplicatePeriod.id}).\n\nSouhaitez-vous vraiment créer un doublon pour cette période ?`);
            if (!confirmDup) return;
        }

        // 2. ID UNIQUENESS GUARD
        const existingWithId = allFactures.find(f => f.id === numeroGlobal && f.id !== factureToEdit?.id);
        if (existingWithId) {
            alert(`❗ Erreur Critique : Le numéro de facture "${numeroGlobal}" est déjà utilisé.\nL'enregistrement est bloqué pour éviter tout saut ou doublon de numérotation.`);
            return;
        }

        const nouvelleFacture = {
            ...(factureToEdit || {}), // Preserve historical data like 'paiements', 'datePaiement'
            id: numeroGlobal,
            clientId: client,
            client: clientName,
            montant: totalTTC,
            dateEmi,
            echeance: echeance || "N/A",
            periodeDebut,
            periodeFin,
            statut,
            lignes,
            sousTotalHT,
            tva,
            timbre,
            isExonore,
            notes,
            conditions,
            isExtra,
            coutExtra: isExtra ? coutExtra : 0,
            ressourceExtra: isExtra ? ressourceExtra : '',
            manualId: isIdManual,
            datePaiement: statut === 'Paid' ? datePaiement : null,
            compteEncaissement: compteEncaissement
        };
        onSave(nouvelleFacture);
        onClose();
    };

    const handleDownloadPDF = (e) => {
        e.preventDefault();
        const currentClientObj = clientsList.find(c => c.id === client);
        const clientName = currentClientObj ? currentClientObj.enseigne : 'Client Inconnu';

        const currentData = {
            id: numeroGlobal,
            clientId: client,
            client: clientName,
            clientObj: currentClientObj,
            bonCommande: currentClientObj?.bonCommande || '',
            montant: totalTTC,
            dateEmi,
            echeance: echeance || "N/A",
            statut,
            lignes,
            sousTotalHT,
            tva,
            timbre,
            isExonore,
            notes,
            conditions,
            isExtra,
            coutExtra: isExtra ? coutExtra : 0,
            ressourceExtra: isExtra ? ressourceExtra : ''
        };
        generateDocumentPDF(currentData, 'FACTURE');
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', justifyContent: 'center', padding: '12px', overflowY: 'auto' }} onClick={onClose}>
            <div className="modal-content card" style={{ width: '100%', maxWidth: '960px', margin: 'auto', background: 'var(--bg-color)', padding: 0, display: 'flex', flexDirection: 'column', maxHeight: '100%' }} onClick={e => e.stopPropagation()}>

                {/* HEADER */}
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--card-bg)', backdropFilter: 'var(--glass-blur)' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-main)' }}>{factureToEdit ? 'Modifier la Facture' : 'Nouvelle Facture'}</h2>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
                </div>

                {/* BODY */}
                <form onSubmit={handleSubmit} style={{ overflowY: 'visible', padding: '16px 20px', flex: 1 }}>

                    {/* INFOS GÉNÉRALES */}
                    <div className="card" style={{ marginBottom: '12px', padding: '12px 16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px', marginBottom: '12px' }}>
                            <div>
                                <h3 style={{ fontSize: '13px', fontWeight: '700', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    Informations Générales
                                    {numeroGlobal && <span style={{ fontSize: '11px', color: '#10B981', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '2px 6px', borderRadius: '4px' }}>{(numeroGlobal === 'non déclarée' || numeroGlobal.startsWith('ND-')) ? 'ND' : numeroGlobal}</span>}
                                </h3>
                                {numeroClient && <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px', fontStyle: 'italic' }}>{numeroClient}</div>}
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)' }}>Client *</label>
                                <select required value={client} onChange={e => setClient(e.target.value)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', fontSize: '12px' }}>
                                    <option value="">Sélectionner un client</option>
                                    {clientsList.map(c => (
                                        <option key={c.id} value={c.id}>
                                            {c.enseigne} {c.sousTVA === false ? '(ND)' : ''}
                                        </option>
                                    ))}
                                </select>
                                {selectedClientObj?.dateDebut && (
                                    <span style={{ fontSize: '9px', color: 'var(--info)', marginTop: '-2px', fontStyle: 'italic', fontWeight: '600' }}>
                                        Début : {new Date(selectedClientObj.dateDebut).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                                    </span>
                                )}
                            </div>
                            
                            {!factureToEdit && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--info)' }}>Mois visé</label>
                                    <select 
                                        value={selectedMonth} 
                                        onChange={e => setSelectedMonth(e.target.value)} 
                                        style={{ padding: '8px', borderRadius: '6px', border: '1px solid rgba(59, 130, 246, 0.3)', background: 'var(--card-bg)', fontSize: '12px', color: 'var(--info)', fontWeight: '600' }}
                                    >
                                        <option value="">-- Automatique --</option>
                                        <option value="1">Janvier</option>
                                        <option value="2">Février</option>
                                        <option value="3">Mars</option>
                                        <option value="4">Avril</option>
                                        <option value="5">Mai</option>
                                        <option value="6">Juin</option>
                                        <option value="7">Juillet</option>
                                        <option value="8">Août</option>
                                        <option value="9">Septembre</option>
                                        <option value="10">Octobre</option>
                                        <option value="11">Novembre</option>
                                        <option value="12">Décembre</option>
                                    </select>
                                </div>
                            )}

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)' }}>Émission *</label>
                                <input type="date" required value={dateEmi} onChange={e => setDateEmi(e.target.value)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', fontSize: '12px' }} />
                                {selectedClientObj?.jourFacturation && (
                                    <span style={{ fontSize: '9px', color: 'var(--info)', marginTop: '-2px', fontStyle: 'italic', fontWeight: '600' }}>
                                        Jour facturation : le {selectedClientObj.jourFacturation}
                                    </span>
                                )}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)' }}>N° Facture</label>
                                <input
                                    type="text"
                                    value={numeroGlobal}
                                    onChange={e => { setNumeroGlobal(e.target.value); setIsIdManual(true); }}
                                    style={{
                                        padding: '8px',
                                        borderRadius: '6px',
                                        border: '1px solid var(--border-color)',
                                        background: 'white',
                                        fontSize: '11px',
                                        color: 'var(--text-main)',
                                        fontWeight: '600'
                                    }}
                                />
                                <span style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '2px' }}>Dernière : {derniereFacture}</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)' }}>Période (Du)</label>
                                <input type="date" value={periodeDebut} onChange={e => setPeriodeDebut(e.target.value)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', fontSize: '12px' }} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)' }}>Période (Au)</label>
                                <input type="date" value={periodeFin} onChange={e => setPeriodeFin(e.target.value)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', fontSize: '12px' }} />
                            </div>
                        </div>
                    </div>

                    {/* MISSION EXTRA */}
                    {isAbonnement && (
                        <div className="card" style={{ marginBottom: '12px', padding: '12px 16px', background: isExtra ? 'rgba(16, 185, 129, 0.02)' : 'var(--card-bg)', border: isExtra ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid var(--border-color)', transition: 'all 0.3s' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={() => setIsExtra(!isExtra)}>
                                <input type="checkbox" checked={isExtra} onChange={e => setIsExtra(e.target.checked)} style={{ width: '16px', height: '16px', accentColor: '#10B981', cursor: 'pointer' }} onClick={e => e.stopPropagation()} />
                                <h3 style={{ fontSize: '13px', fontWeight: '700', margin: 0, color: isExtra ? '#059669' : 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    🌟 Mission Extra (Hors Forfait)
                                </h3>
                                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>- Cochez cette case si cette facture concerne une mission supplémentaire ponctuelle externe à l'abonnement.</span>
                            </div>

                            {isExtra && (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '12px', paddingTop: '12px', borderTop: '1px dashed rgba(16, 185, 129, 0.2)' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)' }}>Ressource Allouée (Nom)</label>
                                        <input type="text" placeholder="Ex: Ahmed (Développeur)" required={isExtra} value={ressourceExtra} onChange={e => setRessourceExtra(e.target.value)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid rgba(16, 185, 129, 0.3)', background: 'white', fontSize: '12px' }} />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)' }}>Coût de la mission (TND)</label>
                                        <input type="number" step="0.001" min="0" required={isExtra} value={coutExtra} onChange={e => setCoutExtra(parseFloat(e.target.value) || 0)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid rgba(16, 185, 129, 0.3)', background: 'white', fontSize: '12px', fontWeight: '600', color: '#059669' }} />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* PRESTATIONS */}
                    <div className="card" style={{ marginBottom: '12px', padding: '12px 16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px', marginBottom: '12px' }}>
                            <h3 style={{ fontSize: '13px', fontWeight: '700', margin: 0 }}>Détail des Prestations</h3>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                {client && (
                                    <button type="button" onClick={handleAutomateLignes} style={{ fontSize: '11px', padding: '4px 8px', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#10B981', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '6px', cursor: 'pointer', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px', transition: 'all 0.2s' }}>
                                        <Wand2 size={12} /> Auto-remplir selon client
                                    </button>
                                )}
                                <button type="button" onClick={handleAddLigne} style={{ fontSize: '11px', padding: '4px 8px', border: '1px dashed var(--accent-gold)', color: '#B45309', background: 'rgba(255, 193, 5, 0.1)', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Plus size={12} /> Ajouter une ligne
                                </button>
                            </div>
                        </div>

                        {/* SELECTEUR HIÉRARCHIQUE DE SERVICES */}
                        {(() => {
                            const uniqueCategories = [...new Set(servicesList.map(s => s.categorie))];
                            const filteredServices = servicesList.filter(s => s.categorie === selectedCategory);

                            return (
                                <div style={{ background: 'rgba(255, 193, 5, 0.05)', border: '1px solid rgba(255, 193, 5, 0.2)', padding: '10px 12px', borderRadius: '8px', marginBottom: '12px', display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <label style={{ fontSize: '10px', fontWeight: '700', color: '#B45309', textTransform: 'uppercase' }}>Catégorie</label>
                                        <select
                                            value={selectedCategory}
                                            onChange={e => { setSelectedCategory(e.target.value); setSelectedServiceId(''); }}
                                            style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid rgba(255, 193, 5, 0.3)', background: 'var(--card-bg)', fontSize: '11px' }}
                                        >
                                            <option value="">-- Choisir une catégorie --</option>
                                            {uniqueCategories.map(cat => (
                                                <option key={cat} value={cat}>{cat}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div style={{ flex: 1.5, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <label style={{ fontSize: '10px', fontWeight: '700', color: '#B45309', textTransform: 'uppercase' }}>Sous-Service</label>
                                        <select
                                            value={selectedServiceId}
                                            onChange={e => setSelectedServiceId(e.target.value)}
                                            style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid rgba(255, 193, 5, 0.3)', background: 'var(--card-bg)', maxWidth: '100%', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', fontSize: '11px' }}
                                            disabled={!selectedCategory}
                                        >
                                            <option value="">-- Choisir un sous-service --</option>
                                            {filteredServices.map(srv => (
                                                <option key={srv.id} value={srv.id} title={srv.nom}>{srv.nom}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <button
                                        type="button"
                                        disabled={!selectedServiceId}
                                        onClick={() => {
                                            const srv = servicesList.find(s => s.id === selectedServiceId);
                                            if (srv) {
                                                setLignes([...lignes, { id: Date.now(), desc: srv.nom, qte: 1, prix: srv.prix }]);
                                                setSelectedServiceId('');
                                            }
                                        }}
                                        style={{ height: '28px', padding: '0 12px', borderRadius: '6px', border: 'none', background: selectedServiceId ? 'var(--accent-gold)' : 'rgba(0,0,0,0.05)', color: selectedServiceId ? 'var(--text-main)' : 'var(--text-muted)', fontWeight: '700', fontSize: '11px', cursor: selectedServiceId ? 'pointer' : 'not-allowed', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '4px' }}
                                    >
                                        <Plus size={14} /> Ajouter
                                    </button>
                                </div>
                            );
                        })()}

                        <div style={{ display: 'flex', gap: '8px', padding: '0 8px 4px 8px', fontSize: '10px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                            <div style={{ flex: 3 }}>Description / Service</div>
                            <div style={{ flex: 1 }}>Qté</div>
                            <div style={{ flex: 1.5 }}>Prix unit. HT</div>
                            <div style={{ flex: 1.5, textAlign: 'right', paddingRight: '30px' }}>Total HT</div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {lignes.map((ligne) => (
                                <div key={ligne.id} style={{ display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                                    <div style={{ flex: 3 }}>
                                        <input list="services-list-facture" type="text" placeholder="Sélectionnez ou tapez..." required value={ligne.desc} onChange={e => updateLigne(ligne.id, 'desc', e.target.value)} style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', fontSize: '12px' }} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <input type="number" min="1" required value={ligne.qte} onChange={e => updateLigne(ligne.id, 'qte', parseFloat(e.target.value) || 0)} style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', fontSize: '12px' }} />
                                    </div>
                                    <div style={{ flex: 1.5 }}>
                                        <input type="number" min="0" step="0.001" required value={ligne.prix} onChange={e => updateLigne(ligne.id, 'prix', parseFloat(e.target.value) || 0)} style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', fontSize: '12px' }} />
                                    </div>
                                    <div style={{ flex: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', padding: '6px 0' }}>
                                        <span style={{ fontWeight: '600', fontSize: '12px' }}>{formatMoney(ligne.qte * ligne.prix)}</span>
                                        <button type="button" onClick={() => handleRemoveLigne(ligne.id)} style={{ background: 'transparent', border: 'none', color: 'var(--danger)', opacity: lignes.length > 1 ? 1 : 0.3, cursor: lignes.length > 1 ? 'pointer' : 'not-allowed' }}>
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* BOTTOM SPLIT */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

                        {/* OPTIONS */}
                        <div className="card" style={{ padding: '12px 16px' }}>
                            <h3 style={{ fontSize: '13px', fontWeight: '700', marginBottom: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>Conditions & Options</h3>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <label style={{ fontSize: '11px', fontWeight: '600' }}>Modalités de paiement</label>
                                    <select value={conditions} onChange={e => setConditions(e.target.value)} style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', fontSize: '11px' }}>
                                        <option value="Standard">Standard (CGV)</option>
                                        <option value="30jours">Virement 30 jours</option>
                                        <option value="50upfront">50% à la commande</option>
                                    </select>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: 'rgba(0,0,0,0.02)', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: '500' }}>
                                        <input type="checkbox" checked={applyTva} onChange={e => setApplyTva(e.target.checked)} style={{ width: '14px', height: '14px', accentColor: 'var(--accent-gold)' }} />
                                        Appliquer TVA (19%)
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: '500' }}>
                                        <input type="checkbox" checked={applyTimbre} onChange={e => setApplyTimbre(e.target.checked)} style={{ width: '14px', height: '14px', accentColor: 'var(--accent-gold)' }} />
                                        Appliquer Timbre fiscal (1.000 TND)
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: '500', marginTop: '4px', borderTop: '1px dashed rgba(0,0,0,0.1)', paddingTop: '6px' }}>
                                        <input type="checkbox" checked={isExonore} onChange={e => { setIsExonore(e.target.checked); if(e.target.checked) setApplyTva(false); }} style={{ width: '14px', height: '14px', accentColor: 'var(--accent-gold)' }} />
                                        🎯 Client Exonéré (TVA 0% suspendue)
                                    </label>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <label style={{ fontSize: '11px', fontWeight: '600' }}>Notes complémentaires</label>
                                    <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes affichées sur la facture..." rows="2" style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', resize: 'vertical', fontSize: '11px' }}></textarea>
                                </div>
                            </div>
                        </div>

                        {/* TOTALS */}
                        <div className="card" style={{ padding: '12px 16px', background: 'linear-gradient(135deg, rgba(255,193,5,0.05), rgba(255,255,255,0.5))', display: 'flex', flexDirection: 'column' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
                                <span>Sous-total HT</span>
                                <span style={{ fontWeight: '600', color: 'var(--text-main)' }}>{formatMoney(sousTotalHT)}</span>
                            </div>
                            {applyTva && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
                                    <span>TVA (19%)</span>
                                    <span style={{ fontWeight: '600', color: 'var(--text-main)' }}>{formatMoney(tva)}</span>
                                </div>
                            )}
                            {applyTimbre && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
                                    {timbre > 0 && (
                                        <>
                                            <span>Timbre fiscal</span>
                                            <span style={{ fontWeight: '600', color: 'var(--text-main)' }}>1.000 TND</span>
                                        </>
                                    )}
                                </div>
                            )}
                            <div style={{ borderTop: '1px dashed rgba(0,0,0,0.1)', margin: '8px 0', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-main)' }}>TOTAL TTC</span>
                                <span style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-main)' }}>{formatMoney(totalTTC)}</span>
                            </div>

                            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <label style={{ color: 'var(--text-main)', fontSize: '11px', fontWeight: '700' }}>Statut de l'enregistrement</label>
                                <select value={statut} onChange={e => setStatut(e.target.value)} style={{ padding: '10px', borderRadius: '8px', border: '2px solid var(--accent-gold)', fontWeight: '600', background: 'white' }}>
                                    <option value="Draft">📝 Sauvegarder en Brouillon</option>
                                    <option value="Sent">📤 Valider et Envoyer</option>
                                    <option value="Paid">✅ Marquer comme Payée</option>
                                </select>
                            </div>

                            {/* PAYMENT DETAILS (Conditional) */}
                            {statut === 'Paid' && (
                                <div style={{ marginTop: '12px', padding: '12px', background: 'rgba(16, 185, 129, 0.05)', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.2)', animation: 'slideDown 0.3s ease-out' }}>
                                    <style>{`@keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <label style={{ fontSize: '10px', fontWeight: '700', color: 'var(--success)' }}>📅 DATE PAIEMENT</label>
                                            <input type="date" value={datePaiement} onChange={e => setDatePaiement(e.target.value)} style={{ padding: '6px', borderRadius: '6px', border: '1px solid rgba(16, 185, 129, 0.3)', fontSize: '11px' }} />
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <label style={{ fontSize: '10px', fontWeight: '700', color: 'var(--success)' }}>🏦 COMPTE BANCAIRE</label>
                                            <select value={compteEncaissement} onChange={e => setCompteEncaissement(e.target.value)} style={{ padding: '6px', borderRadius: '6px', border: '1px solid rgba(16, 185, 129, 0.3)', fontSize: '11px', fontWeight: '600' }}>
                                                <option value="BIAT">BIAT (Déclaré)</option>
                                                <option value="QNB">QNB (Perso/ND)</option>
                                                <option value="Espèces">Espèces (Cash)</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                    </div>
                </form>

                {/* FOOTER */}
                <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--card-bg)', backdropFilter: 'var(--glass-blur)', borderBottomLeftRadius: 'var(--radius)', borderBottomRightRadius: 'var(--radius)' }}>
                    <button type="button" onClick={handleDownloadPDF} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '12px', border: '1px solid var(--accent-gold)', background: 'rgba(255, 193, 5, 0.1)', cursor: 'pointer', fontWeight: '600', color: '#B45309' }}>
                        <FileDown size={18} /> Télécharger PDF
                    </button>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button type="button" onClick={onClose} style={{ padding: '10px 24px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'transparent', cursor: 'pointer', fontWeight: '600', color: 'var(--text-muted)' }}>Annuler</button>
                        <button type="button" onClick={handleSubmit} style={{ padding: '10px 24px', borderRadius: '12px', border: 'none', background: 'var(--text-main)', color: 'white', cursor: 'pointer', fontWeight: '700', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>Enregistrer & Valider</button>
                    </div>
                </div>

            </div >
        </div >
    );
};

export default FactureModal;
