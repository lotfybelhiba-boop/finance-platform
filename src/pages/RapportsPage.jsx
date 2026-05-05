import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import { Download, Printer, Filter, Building2, Calendar, FileText, CheckCircle2, Users, Briefcase, Network } from 'lucide-react';
import { getBankTransactions, getFactures, getClients } from '../services/storageService';
import CalculsOrganigramme from '../components/CalculsOrganigramme';

const RapportsPage = () => {
    const [activeTab, setActiveTab] = useState('Mynds');
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState('all'); // 'all' ou 0-11
    const [selectedClient, setSelectedClient] = useState('all'); // 'all' ou client.enseigne
    const [clientSearch, setClientSearch] = useState('');
    const [showClientDrop, setShowClientDrop] = useState(false);
    
    const [factures, setFactures] = useState(() => getFactures());
    const [transactions, setTransactions] = useState(() => getBankTransactions());
    const [clients, setClients] = useState(() => getClients());

    // Configuration de l'agence (statique pour l'impression officielle)
    const agenceInfo = {
        enseigne: "MYNDS AGENCY",
        mf: "1724584/W/A/M/000",
        adresse: "Tunis, Tunisie",
        telephone: "+216 25 801 700",
        mail: "contact@mynds-team.com"
    };

    useEffect(() => {
        const handleStorage = () => {
            setTransactions(getBankTransactions());
            setFactures(getFactures());
            setClients(getClients());
        };
        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, []);

    const handlePrint = () => {
        window.print();
    };

    // Fonctions utilitaires pour calculer les montants encaissés
    const getCollectedTTC = (f) => {
        if (f.statut === 'Paid') return parseFloat(f.montant) || 0;
        if (f.montantPaye && f.montantPaye > 0) return parseFloat(f.montantPaye);
        return 0;
    };

    const getCollectedHT = (f) => {
        const collectedTTC = getCollectedTTC(f);
        if (collectedTTC === 0) return 0;
        if (f.statut === 'Paid' && f.sousTotalHT) return parseFloat(f.sousTotalHT);
        // Si partiel ou pas de sousTotalHT
        return collectedTTC / 1.19;
    };

    // --- CALCULS DU RAPPORT ---

    // 1. REVENUS (Chiffre d'Affaires)
    // On prend toutes les factures facturées et payées sur l'année sélectionnée, filtrées par mois et client si spécifiés
    const facturesYear = factures.filter(f => {
        if (!f.dateEmi) return false;
        const date = new Date(f.dateEmi);
        const yearMatch = date.getFullYear() === selectedYear;
        const monthMatch = selectedMonth === 'all' ? true : date.getMonth() === parseInt(selectedMonth);
        const clientMatch = selectedClient === 'all' ? true : f.client === selectedClient;

        return yearMatch && monthMatch && clientMatch && f.statut === 'Paid';
    });

    const totalRevenusHT = facturesYear.reduce((acc, f) => {
        // Fallback: s'il n'y a pas de sous-total HT enregistré, on prend le montant TTC
        const ht = parseFloat(f.sousTotalHT) || (parseFloat(f.montant) / 1.19);
        return acc + ht;
    }, 0);

    // Simplification : on part du principe que le "montant" = TTC ou net à payer
    const totalRevenusTTC = facturesYear.reduce((acc, f) => acc + (parseFloat(f.montant) || 0), 0);
    const totalTVACollectee = totalRevenusTTC - totalRevenusHT;

    // 2. DEPENSES (Charges d'exploitation)
    const transactionsYear = transactions.filter(t => {
        if (!t.date) return false;
        const date = new Date(t.date);
        const yearMatch = date.getFullYear() === selectedYear;
        const monthMatch = selectedMonth === 'all' ? true : date.getMonth() === parseInt(selectedMonth);

        // Pour les transactions "globales", si on sélectionne 'all' clients, on les prend toutes.
        // Si on choisit un client spécifique, on devrait idéalement ne prendre que les transactions liées à ce client.
        // Comme les transactions n'ont pas toujours de "client" taggé par défaut dans le modèle de base, 
        // on va filtrer uniquement par Date (Mois/Année) pour le bilan global, 
        // MAIS pour le tableau analytique, on isolera la charge précise du client.
        // Note: Si une transaction a un champ 'clientTag' (selon de futures implémentations), on le gèrera ici.
        const clientTagMatch = selectedClient === 'all' ? true : (t.clientTag === selectedClient || t.client === selectedClient);

        // Actuellement, MYNDS ne stocke pas le 'client' sur chaque charge globale (ex: Loyer), 
        // donc filtrer les charges par client risque de mettre le Bilan Global à 0 de charges si on sélectionne un client.
        // Solution: Quand un client spécifique est sélectionné, on n'affiche QUE les charges affectées explicitement à ce client.
        // Si aucune charge n'est affectée, le Bilan affichera 0 en charge externe (seules les charges RH/Mng du tableau comptent).

        return yearMatch && monthMatch && t.type === 'Debit' && (selectedClient === 'all' ? true : clientTagMatch);
    });

    // --- CHARGES MYNDS (miroir exact de l'onglet "Charges Mynds" de BanquePage) ---
    const MYNDS_CATEGORIES = [
        'Mynds Logistique','Mynds Loyer Bureau','Mynds Technique','Mynds Banque',
        'Mynds Internet','Mynds Logiciels','Mynds Fournitures','Mynds Charges sociales',
        'Mynds Formation','Mynds Evenement','Mynds Comptable','Mynds Paperasse','Mynds Prime',
        'Charges','Mynds Logistique'
    ];

    const chargesMynds = transactions.filter(t => {
        if (!t.date) return false;
        const date = new Date(t.date);
        const yearMatch  = date.getFullYear() === selectedYear;
        const monthMatch = selectedMonth === 'all' ? true : date.getMonth() === parseInt(selectedMonth);
        if (!yearMatch || !monthMatch) return false;
        if (t.type !== 'Debit') return false;
        if (t.category === 'Perso') return false;
        const isRH = t.chargeType === 'RH' || t.category === 'Mynds Salaire'
                  || (t.desc || '').toLowerCase().includes('salaire');
        return !isRH;
    }).sort((a, b) => new Date(b.date) - new Date(a.date));

    const totalChargesMynds = chargesMynds.reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);

    // Groupement des charges par catégorie globale (On exclut le Perso du "vrai" Bilan, et possiblement la TVA si on raisonne HT)
    // Pour un bilan simple comptable, on liste les charges directes
    const chargesExploitation = transactionsYear.filter(t => t.category === 'Charges' && t.chargeType === 'Exploitations');
    const chargesRH = transactionsYear.filter(t => t.category === 'Charges' && t.chargeType === 'Ressources Humaines');
    const chargesMarketing = transactionsYear.filter(t => t.category === 'Charges' && t.chargeType === 'Marketing/Pub');
    const transfertsTVA = transactionsYear.filter(t => t.category === 'TVA'); // Paiements de TVA à l'État

    const sumCategory = (arr) => arr.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);

    const totalExploitation = sumCategory(chargesExploitation);
    const totalRH = sumCategory(chargesRH);
    const totalMarketing = sumCategory(chargesMarketing);
    const totalTVA = sumCategory(transfertsTVA); // Payé

    // Total toutes charges déductibles (Hors Perso et Hors TVA reversée, selon la compta stricte, mais incluons-les pour vue agence)
    const totalChargesExploitation = totalExploitation + totalRH + totalMarketing;

    // BENEFICE NET COMPTABLE (Avant Impôts & Dépenses Perso)
    const beneficeNet = totalRevenusHT - totalChargesExploitation;

    // === TABLEAU ANALYTIQUE PAR CLIENT ===
    // On extrait la liste des clients actifs ayant eu une activité cette année
    // Si un client spécifique est sélectionné, on ne map que lui
    const clientsToAnalyze = selectedClient === 'all' ? clients : clients.filter(c => c.enseigne === selectedClient);

    const analytiqueClients = clientsToAnalyze.map(client => {
        // 1. Durée de collab
        let duree = client.dureeService || '-';
        if (duree === '-' && client.dateDebut) {
            const startYear = new Date(client.dateDebut).getFullYear();
            if (startYear <= selectedYear) duree = 'Année complète / En cours'; // Fallback textuel court
        }

        // 2. Chiffre d'Affaires ENCAISSÉ pour CE client sur la période choisie
        const facturesClient = facturesYear.filter(f => f.client === client.enseigne);
        const caHT = facturesClient.reduce((acc, f) => acc + getCollectedHT(f), 0);
        const caTTC = facturesClient.reduce((acc, f) => acc + getCollectedTTC(f), 0);
        const tva = caTTC - caHT;

        // 3. Charges (depuis client.totalCosts si sauvegardées, sinon estimation)
        // Les RH sont souvent stockés dans la structure client de MYNDS
        // Si filtre par mois : on doit diviser le total par 12 (très approximatif) ou utiliser la base mensuelle
        // Pour être sûr, client.totalCosts est souvent mensuel dans MYNDS. 
        // Si 'all' year, on multiplie par 12 ? Restons sur la valeur stockée (qui est générée mensuellement)
        let chargesRH = parseFloat(client.totalCosts) || 0;
        if (selectedMonth === 'all') {
            // Si vision annuelle et coût mensuel, approximons * 12 si contrat annuel
            // Pour l'instant, laissons la donnée brut saisie dans le profil client.
        }

        // 4. Charges Mng (Distribution arbitraire d'exploitation ou frais fixes si gérés au niveau transaction ?)
        const numActiveClients = clients.filter(c => c.etatClient === 'Actif').length || 1;
        const defaultChargeMng = (totalExploitation / numActiveClients); // Amortissement d'infrastructure
        // Soit on met 0, mais ça fausse le "Gain", soit on attribue la part stockée dans le client
        const chargeMng = 0; // Le plus juste si non alloué individuellement

        const gain = caHT - chargesRH - chargeMng;

        // 5. Nouvelles colonnes facturation : on cherche TOUTES les factures de ce client sur la période (peu importe le statut)
        const facturesClientAll = factures.filter(f => {
            if (!f.dateEmi) return false;
            const date = new Date(f.dateEmi);
            const yearMatch = date.getFullYear() === selectedYear;
            const monthMatch = selectedMonth === 'all' ? true : date.getMonth() === parseInt(selectedMonth);
            return yearMatch && monthMatch && f.client === client.enseigne;
        });

        const totalFactureTTC = facturesClientAll.reduce((acc, f) => acc + (parseFloat(f.montant) || 0), 0);

        // On prend la dernière facture émise dans la période
        const latestFacture = [...facturesClientAll].sort((a, b) => new Date(b.dateEmi) - new Date(a.dateEmi))[0];
        const dateFacturation = latestFacture ? new Date(latestFacture.dateEmi).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '-';
        const datePaiement = latestFacture && latestFacture.datePaiement ? new Date(latestFacture.datePaiement).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '-';

        let retardStr = '-';
        let retardColor = '#9ca3af';
        if (latestFacture) {
            if (latestFacture.statut === 'Paid') {
                retardStr = 'Payé';
                retardColor = '#10b981'; // vert
            } else {
                retardStr = 'Impayé';
                retardColor = '#ef4444'; // rouge
            }
        }

        return {
            id: client.id,
            enseigne: client.enseigne,
            duree,
            caHT,
            caTTC: totalFactureTTC, // Montant TTC facturé toutes factures
            dateFacturation,
            datePaiement,
            retardStr,
            retardColor,
            chargesRH,
            chargeMng,
            gain,
            tva,
            hasActivity: facturesClientAll.length > 0 || client.etatClient === 'Actif'
        };
    }).filter(c => c.hasActivity).sort((a, b) => b.caHT - a.caHT);

    // Ajustement du Bilan Global SI un client spécifique est sélectionné :
    // Les charges d'exploitation globales n'ont plus de sens, on les remplace par les RH et Mng du client
    const finalRevenusHT = selectedClient === 'all' ? totalRevenusHT : analytiqueClients.reduce((acc, c) => acc + c.caHT, 0);
    const finalRevenusTTC = selectedClient === 'all' ? totalRevenusTTC : analytiqueClients.reduce((acc, c) => acc + c.caHT + c.tva, 0);
    const finalTVACollectee = selectedClient === 'all' ? totalTVACollectee : analytiqueClients.reduce((acc, c) => acc + c.tva, 0);

    const finalExploitation = selectedClient === 'all' ? totalExploitation : analytiqueClients.reduce((acc, c) => acc + c.chargeMng, 0);
    const finalRH = selectedClient === 'all' ? totalRH : analytiqueClients.reduce((acc, c) => acc + c.chargesRH, 0);
    const finalMarketing = selectedClient === 'all' ? totalMarketing : 0;
    const finalTVAReversee = selectedClient === 'all' ? totalTVA : 0;

    const finalChargesExploitation = finalExploitation + finalRH + finalMarketing;
    const finalBeneficeNet = finalRevenusHT - finalChargesExploitation;


    const formatMoney = (amount) => {
        return new Intl.NumberFormat('fr-TN', { style: 'currency', currency: 'TND', minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(amount);
    };
    const formatNumber = (amount) => {
        return new Intl.NumberFormat('fr-TN', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(amount);
    };

    return (
        <div className="page" style={{ paddingBottom: '60px' }}>
            {/* INTERFACE DE CONTROLE (Non imprimée) */}
            <div className="no-print" style={{ marginBottom: '24px' }}>
                <Header title="Rapports Comptables" subtitle="Générer, visualiser et exporter le bilan formel" />

                {/* SOUS-MENU HORIZONTAL — Premium Nav Bar */}
                <div style={{
                    display: 'inline-flex',
                    gap: '2px',
                    background: '#F5F5F5',
                    borderRadius: '12px',
                    padding: '4px',
                    marginBottom: '24px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.06), inset 0 1px 2px rgba(0,0,0,0.04)'
                }}>
                    {[
                        { id: 'Mynds',        icon: Building2,  label: 'Mynds' },
                        { id: 'Client',       icon: FileText,   label: 'Par Client' },
                        { id: 'Employé',      icon: Users,      label: 'Employés' },
                        { id: 'Organigramme', icon: Network,    label: 'Organigramme' }
                    ].map(tab => {
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => {
                                    setActiveTab(tab.id);
                                    if (tab.id === 'Mynds') setSelectedClient('all');
                                }}
                                style={{
                                    position: 'relative',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '7px',
                                    padding: '9px 18px',
                                    borderRadius: '9px',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontFamily: "'Inter', 'Segoe UI', sans-serif",
                                    fontSize: '13px',
                                    fontWeight: isActive ? '700' : '500',
                                    letterSpacing: '-0.1px',
                                    color: isActive ? '#0F172A' : '#888888',
                                    background: isActive
                                        ? '#FFFFFF'
                                        : 'transparent',
                                    boxShadow: isActive
                                        ? '0 1px 4px rgba(0,0,0,0.10), 0 0 0 1px rgba(0,0,0,0.04)'
                                        : 'none',
                                    transition: 'all 0.18s ease',
                                    whiteSpace: 'nowrap'
                                }}
                                onMouseEnter={e => {
                                    if (!isActive) {
                                        e.currentTarget.style.background = '#EBEBEB';
                                        e.currentTarget.style.color = '#1A1A1A';
                                    }
                                }}
                                onMouseLeave={e => {
                                    if (!isActive) {
                                        e.currentTarget.style.background = 'transparent';
                                        e.currentTarget.style.color = '#888888';
                                    }
                                }}
                            >
                                <tab.icon
                                    size={15}
                                    strokeWidth={isActive ? 2.2 : 1.8}
                                    style={{ color: isActive ? '#FFC105' : 'currentColor', flexShrink: 0 }}
                                />
                                {tab.label}
                                {/* Gold underline accent on active */}
                                {isActive && (
                                    <span style={{
                                        position: 'absolute',
                                        bottom: '5px',
                                        left: '50%',
                                        transform: 'translateX(-50%)',
                                        width: '20px',
                                        height: '2px',
                                        borderRadius: '2px',
                                        background: '#FFC105'
                                    }} />
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* BARRE DE FILTRES — Premium SaaS */}
                {(activeTab === 'Mynds' || activeTab === 'Client') && (() => {
                    const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
                    const selectStyle = {
                        appearance: 'none',
                        WebkitAppearance: 'none',
                        padding: '8px 32px 8px 12px',
                        borderRadius: '9px',
                        border: '1px solid #E5E7EB',
                        background: '#FAFAFA',
                        color: '#1A1A1A',
                        fontSize: '13px',
                        fontWeight: '500',
                        fontFamily: "'Inter','Segoe UI',sans-serif",
                        outline: 'none',
                        cursor: 'pointer',
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'right 10px center',
                        minWidth: '120px',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                    };

                    const activeClients = clients.filter(c => c.etatClient === 'Actif');
                    const filteredClients = clientSearch
                        ? activeClients.filter(c => c.enseigne.toLowerCase().includes(clientSearch.toLowerCase()))
                        : activeClients;
                    const selectedClientObj = activeClients.find(c => c.enseigne === selectedClient);
                    const initials = (name) => name.split(' ').slice(0,2).map(w => w[0]).join('').toUpperCase();
                    const hashColor = (name) => {
                        let h = 0; for(let i=0;i<name.length;i++) h = name.charCodeAt(i) + ((h<<5)-h);
                        return `hsl(${Math.abs(h)%360},55%,55%)`;
                    };

                    return (
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            background: '#FFFFFF',
                            border: '1px solid #EFEFEF',
                            borderRadius: '14px',
                            padding: '12px 16px',
                            marginBottom: '24px',
                            boxShadow: '0 1px 4px rgba(0,0,0,0.05)'
                        }}>
                            {/* LEFT — Filters */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {/* Icon */}
                                <div style={{ display:'flex', alignItems:'center', marginRight:'4px', color:'#AAAAAA' }}>
                                    <Filter size={15} strokeWidth={1.8} />
                                </div>

                                {/* Year */}
                                <div style={{ position:'relative' }}>
                                    <select
                                        value={selectedYear}
                                        onChange={e => setSelectedYear(parseInt(e.target.value))}
                                        style={selectStyle}
                                    >
                                        {[2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
                                    </select>
                                </div>

                                {/* Divider */}
                                <div style={{ width:'1px', height:'20px', background:'#E5E7EB' }} />

                                {/* Month */}
                                <div style={{ position:'relative' }}>
                                    <select
                                        value={selectedMonth}
                                        onChange={e => setSelectedMonth(e.target.value)}
                                        style={{ ...selectStyle, minWidth: '140px' }}
                                    >
                                        <option value="all">Tous les mois</option>
                                        {MONTHS.map((m,i) => <option key={i} value={i}>{m}</option>)}
                                    </select>
                                </div>

                                {/* Divider */}
                                <div style={{ width:'1px', height:'20px', background:'#E5E7EB' }} />

                                {/* Client — Custom searchable dropdown */}
                                <div style={{ position:'relative' }} onBlur={e => { if(!e.currentTarget.contains(e.relatedTarget)) setShowClientDrop(false); }}>
                                    <button
                                        type="button"
                                        onClick={() => setShowClientDrop(v => !v)}
                                        style={{
                                            display:'flex', alignItems:'center', gap:'8px',
                                            padding:'8px 32px 8px 12px',
                                            borderRadius:'9px',
                                            border: showClientDrop ? '1px solid #FFC105' : '1px solid #E5E7EB',
                                            background: selectedClient !== 'all' ? 'rgba(255,193,5,0.06)' : '#FAFAFA',
                                            color:'#1A1A1A',
                                            fontSize:'13px',
                                            fontWeight: selectedClient !== 'all' ? '600' : '500',
                                            fontFamily:"'Inter','Segoe UI',sans-serif",
                                            cursor:'pointer',
                                            minWidth:'160px',
                                            textAlign:'left',
                                            boxShadow: showClientDrop ? '0 0 0 3px rgba(255,193,5,0.15)' : '0 1px 2px rgba(0,0,0,0.04)',
                                            transition:'all 0.15s ease',
                                            backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                                            backgroundRepeat:'no-repeat',
                                            backgroundPosition:'right 10px center'
                                        }}
                                    >
                                        {selectedClientObj ? (
                                            <>
                                                <span style={{ width:'18px', height:'18px', borderRadius:'50%', background:hashColor(selectedClientObj.enseigne), display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:'9px', fontWeight:'800', color:'#fff', flexShrink:0 }}>
                                                    {initials(selectedClientObj.enseigne)}
                                                </span>
                                                {selectedClientObj.enseigne}
                                            </>
                                        ) : 'Tous les clients'}
                                    </button>

                                    {showClientDrop && (
                                        <div style={{
                                            position:'absolute', top:'calc(100% + 6px)', left:0,
                                            background:'#fff',
                                            border:'1px solid #E5E7EB',
                                            borderRadius:'12px',
                                            boxShadow:'0 8px 24px rgba(0,0,0,0.10)',
                                            zIndex:200,
                                            minWidth:'220px',
                                            overflow:'hidden'
                                        }}>
                                            {/* Search */}
                                            <div style={{ padding:'10px 10px 6px 10px', borderBottom:'1px solid #F3F4F6' }}>
                                                <input
                                                    autoFocus
                                                    type="text"
                                                    placeholder="Rechercher un client..."
                                                    value={clientSearch}
                                                    onChange={e => setClientSearch(e.target.value)}
                                                    style={{
                                                        width:'100%', padding:'6px 10px',
                                                        border:'1px solid #E5E7EB', borderRadius:'7px',
                                                        fontSize:'12px', fontFamily:"'Inter','Segoe UI',sans-serif",
                                                        outline:'none', background:'#F9FAFB',
                                                        boxSizing:'border-box'
                                                    }}
                                                />
                                            </div>
                                            {/* Options */}
                                            <div style={{ maxHeight:'200px', overflowY:'auto', padding:'4px' }}>
                                                {/* All option */}
                                                <button type="button" onClick={() => { setSelectedClient('all'); setClientSearch(''); setShowClientDrop(false); }}
                                                    style={{ width:'100%', display:'flex', alignItems:'center', gap:'8px', padding:'8px 10px', borderRadius:'8px', border:'none', background: selectedClient==='all' ? '#FFF8DC':'transparent', cursor:'pointer', fontSize:'12px', fontWeight: selectedClient==='all'?'700':'500', color:'#1A1A1A', textAlign:'left', transition:'background 0.12s' }}
                                                >
                                                    <span style={{ width:'18px', height:'18px', borderRadius:'50%', background:'#E5E7EB', display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:'9px', color:'#888', flexShrink:0 }}>✦</span>
                                                    Tous les clients
                                                </button>
                                                {filteredClients.map(c => (
                                                    <button key={c.id} type="button"
                                                        onClick={() => { setSelectedClient(c.enseigne); setClientSearch(''); setShowClientDrop(false); }}
                                                        style={{ width:'100%', display:'flex', alignItems:'center', gap:'8px', padding:'8px 10px', borderRadius:'8px', border:'none', background: selectedClient===c.enseigne ? '#FFF8DC':'transparent', cursor:'pointer', fontSize:'12px', fontWeight: selectedClient===c.enseigne?'700':'400', color:'#1A1A1A', textAlign:'left', transition:'background 0.12s' }}
                                                    >
                                                        <span style={{ width:'18px', height:'18px', borderRadius:'50%', background:hashColor(c.enseigne), display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:'9px', fontWeight:'800', color:'#fff', flexShrink:0 }}>
                                                            {initials(c.enseigne)}
                                                        </span>
                                                        {c.enseigne}
                                                    </button>
                                                ))}
                                                {filteredClients.length === 0 && (
                                                    <div style={{ padding:'12px', textAlign:'center', fontSize:'12px', color:'#9CA3AF' }}>Aucun résultat</div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Reset chip if client selected */}
                                {selectedClient !== 'all' && (
                                    <button type="button" onClick={() => setSelectedClient('all')}
                                        style={{ display:'flex', alignItems:'center', gap:'4px', padding:'4px 8px', borderRadius:'20px', border:'none', background:'rgba(255,193,5,0.15)', color:'#92700A', fontSize:'11px', fontWeight:'700', cursor:'pointer' }}
                                    >
                                        ✕ Reset
                                    </button>
                                )}
                            </div>

                            {/* RIGHT — Print button */}
                            <button
                                onClick={handlePrint}
                                style={{
                                    display:'flex', alignItems:'center', gap:'7px',
                                    padding:'9px 18px',
                                    borderRadius:'9px',
                                    border:'1px solid #1A1A1A',
                                    background:'#1A1A1A',
                                    color:'#FFFFFF',
                                    fontSize:'13px',
                                    fontWeight:'600',
                                    fontFamily:"'Inter','Segoe UI',sans-serif",
                                    cursor:'pointer',
                                    boxShadow:'0 2px 8px rgba(0,0,0,0.15)',
                                    transition:'all 0.15s ease',
                                    letterSpacing:'-0.1px'
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background='#333'; e.currentTarget.style.boxShadow='0 4px 12px rgba(0,0,0,0.2)'; }}
                                onMouseLeave={e => { e.currentTarget.style.background='#1A1A1A'; e.currentTarget.style.boxShadow='0 2px 8px rgba(0,0,0,0.15)'; }}
                            >
                                <Printer size={14} strokeWidth={2} />
                                Imprimer PDF
                            </button>
                        </div>
                    );
                })()}
            </div>

            {/* TAB: Employé */}
            {activeTab === 'Employé' && (
                <div className="printable-report">
                    <div className="card" style={{ marginBottom: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
                            <h3 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-main)', textTransform: 'uppercase', margin: 0 }}>
                                Récapitulatif Annuel des Salaires & RH ({selectedYear})
                            </h3>
                            <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--accent-gold)' }}>Moyenne / Mois : {formatMoney(transactions.filter(t => t.category === 'Salaires' && new Date(t.date).getFullYear() === selectedYear).reduce((acc, t) => acc + (parseFloat(t.amount) || 0), 0) / 12)}</div>
                        </div>

                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10.5px' }}>
                                <thead>
                                    <tr style={{ background: '#f8fafc' }}>
                                        <th style={{ textAlign: 'left', padding: '10px 8px', borderBottom: '2px solid #e2e8f1', color: '#475569', fontWeight: '800', minWidth: '150px' }}>Employé / RH</th>
                                        <th style={{ textAlign: 'left', padding: '10px 8px', borderBottom: '2px solid #e2e8f1', color: '#475569', fontWeight: '800', minWidth: '150px' }}>Projets Actifs</th>
                                        {['JAN', 'FÉV', 'MAR', 'AVR', 'MAI', 'JUN', 'JUI', 'AOÛ', 'SEP', 'OCT', 'NOV', 'DÉC'].map(m => (
                                            <th key={m} style={{ textAlign: 'center', padding: '10px 4px', borderBottom: '2px solid #e2e8f1', color: '#475569', fontWeight: '800' }}>{m}</th>
                                        ))}
                                        <th style={{ textAlign: 'right', padding: '10px 8px', borderBottom: '2px solid #e2e8f1', color: '#1e293b', fontWeight: '900', background: 'rgba(255,193,5,0.05)' }}>TOTAL ANNUEL</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(() => {
                                        // Correction de la clé : ConfigPage utilise 'mynds_config_rh'
                                        const rhList = JSON.parse(localStorage.getItem('mynds_config_rh') || localStorage.getItem('mynds_rh') || '[]');
                                        if (rhList.length === 0) return <tr><td colSpan="15" style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>Aucun employé trouvé dans la configuration.</td></tr>;
                                        
                                        return rhList.map((emp) => {
                                            const empSalaries = transactions.filter(t => 
                                                (t.chargeType === 'RH' || (t.category || '').includes('Salaire')) && 
                                                (
                                                    (t.client && t.client.toLowerCase() === emp.nom.toLowerCase()) || 
                                                    (t.desc && t.desc.toLowerCase().includes(emp.nom.toLowerCase()))
                                                ) &&
                                                new Date(t.date).getFullYear() === selectedYear
                                            );

                                            const monthlySalaries = Array.from({ length: 12 }, (_, i) => {
                                                return empSalaries.filter(t => new Date(t.date).getMonth() === i)
                                                                 .reduce((acc, t) => acc + (parseFloat(t.amount) || 0), 0);
                                            });

                                            const totalYear = monthlySalaries.reduce((acc, s) => acc + s, 0);
                                            
                                            // Détection dynamique des projets via les clients actifs
                                            const activeProjects = clients.filter(c => 
                                                c.etatClient === 'Actif' && 
                                                c.projectCosts && c.projectCosts.some(cost => 
                                                    cost.nom && cost.nom.toLowerCase().trim() === emp.nom.toLowerCase().trim()
                                                )
                                            ).map(c => c.enseigne);

                                            return (
                                                <tr key={emp.id} style={{ borderBottom: '1px solid #f1f5f9' }} className="hover-row">
                                                    <td style={{ padding: '8px' }}>
                                                        <div style={{ fontWeight: '800', color: '#334155', fontSize: '11px' }}>{emp.nom}</div>
                                                        <div style={{ fontSize: '9px', color: '#94a3b8', fontStyle: 'italic', fontWeight: '600' }}>{emp.poste || emp.role || 'Poste non défini'}</div>
                                                    </td>
                                                    <td style={{ padding: '8px' }}>
                                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
                                                            {activeProjects.length > 0 ? activeProjects.map(p => (
                                                                <span key={p} style={{ background: 'rgba(255,193,5,0.08)', padding: '2px 5px', borderRadius: '4px', fontSize: '8px', color: '#B45309', border: '1px solid rgba(255,193,5,0.2)', fontWeight: '700' }}>{p}</span>
                                                            )) : <span style={{ color: '#cbd5e1', fontSize: '9px' }}>Aucun projet actif</span>}
                                                        </div>
                                                    </td>
                                                    {monthlySalaries.map((s, idx) => (
                                                        <td key={idx} style={{ textAlign: 'center', padding: '8px 4px', fontSize: '9.5px', fontWeight: s > 0 ? '800' : '400', color: s > 0 ? '#1e293b' : '#e2e8f0' }}>
                                                            {s > 0 ? formatNumber(s) : '—'}
                                                        </td>
                                                    ))}
                                                    <td style={{ textAlign: 'right', padding: '8px', fontWeight: '900', color: '#0F172A', background: 'rgba(255,193,5,0.05)', fontSize: '11px' }}>
                                                        {formatMoney(totalYear)}
                                                    </td>
                                                </tr>
                                            );
                                        });
                                    })()}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                         <div className="card" style={{ padding: '20px' }}>
                            <h4 style={{ fontSize: '12px', fontWeight: '800', marginBottom: '16px', textTransform: 'uppercase', color: '#475569' }}>Top Collaborateurs (Rémunération)</h4>
                            {(() => {
                                const rhList = JSON.parse(localStorage.getItem('mynds_config_rh') || localStorage.getItem('mynds_rh') || '[]');
                                const rankings = rhList.map(e => {
                                    const total = transactions.filter(t => 
                                        (t.chargeType === 'RH' || (t.category || '').includes('Salaire')) && 
                                        ((t.client && t.client.toLowerCase() === e.nom.toLowerCase()) || (t.desc && t.desc.toLowerCase().includes(e.nom.toLowerCase())))
                                        && new Date(t.date).getFullYear() === selectedYear)
                                                            .reduce((acc, t) => acc + (parseFloat(t.amount) || 0), 0);
                                    return { name: e.nom, total };
                                }).sort((a,b) => b.total - a.total).slice(0, 5);

                                return rankings.map((r, i) => (
                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < rankings.length-1 ? '1px dashed #f1f5f9' : 'none' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <span style={{ width: '20px', height: '20px', background: i === 0 ? '#FFC105' : '#f1f5f9', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: i === 0 ? '#fff' : '#64748b', fontWeight: '900' }}>{i+1}</span>
                                            <span style={{ fontSize: '13px', fontWeight: '600', color: '#1e293b' }}>{r.name}</span>
                                        </div>
                                        <span style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>{formatMoney(r.total)}</span>
                                    </div>
                                ));
                            })()}
                         </div>
                         <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
                            <Users size={32} color="#94a3b8" style={{ marginBottom: '12px' }} />
                            <h4 style={{ fontSize: '12px', fontWeight: '800', marginBottom: '4px', textTransform: 'uppercase', color: '#475569' }}>Total Ressources</h4>
                            <div style={{ fontSize: '32px', fontWeight: '900', color: '#0f172a' }}>
                                {JSON.parse(localStorage.getItem('mynds_config_rh') || localStorage.getItem('mynds_rh') || '[]').length}
                            </div>
                            <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '8px' }}>Collaborateurs actifs et historiques</p>
                         </div>
                    </div>
                </div>
            )}

            {/* TAB: Organigramme */}
            {activeTab === 'Organigramme' && (
                <div style={{ marginBottom: '40px' }}>
                    <CalculsOrganigramme />
                </div>
            )}

            {/* TAB: Mynds / Client — DOCUMENT OFFICIEL */}
            {(activeTab === 'Mynds' || activeTab === 'Client') && (
            <>
            <div className="printable-report" style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '24px',
                color: 'var(--text-main)'
            }}>
                {/* EN-TÊTE DU RAPPORT */}
                <div className="print-only" style={{ display: 'none', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #1a1a1a', paddingBottom: '24px', marginBottom: '32px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '900', letterSpacing: '-1px', color: '#000' }}>
                            {selectedClient === 'all' ? 'BILAN FINANCIER' : `BILAN CLIENT : ${selectedClient.toUpperCase()}`}
                        </h1>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '1px' }}>
                            Exercice {selectedYear} {selectedMonth !== 'all' ? `- ${new Date(selectedYear, selectedMonth).toLocaleString('fr-FR', { month: 'long' })}` : ''}
                        </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                        <h2 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '800', color: '#000' }}>{agenceInfo.enseigne}</h2>
                        <div style={{ fontSize: '12px', color: '#4b5563', lineHeight: '1.6' }}>
                            <div>MF: <span style={{ fontWeight: '600' }}>{agenceInfo.mf}</span></div>
                            <div>{agenceInfo.adresse}</div>
                            <div>{agenceInfo.telephone}</div>
                            <div>{agenceInfo.mail}</div>
                        </div>
                    </div>
                </div>

                {/* INFO GENERALE */}
                <div className="print-only card" style={{ display: 'none', justifyContent: 'space-between', marginBottom: '32px', padding: '16px', background: '#f9fafb', border: '1px solid #f3f4f6', borderRadius: '6px' }}>
                    <div>
                        <div style={{ fontSize: '10px', color: '#6b7280', textTransform: 'uppercase', fontWeight: '700', marginBottom: '4px' }}>Date d'édition</div>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#111827' }}>{new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '10px', color: '#6b7280', textTransform: 'uppercase', fontWeight: '700', marginBottom: '4px' }}>Devise</div>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#111827' }}>Dinar Tunisien (TND)</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '10px', color: '#6b7280', textTransform: 'uppercase', fontWeight: '700', marginBottom: '4px' }}>Statut Document</div>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#111827', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <CheckCircle2 size={14} color="#10b981" /> Certifié Conforme
                        </div>
                    </div>
                </div>

                {/* TABLEAU ANALYTIQUE PAR CLIENT (Nouveau) */}
                <div className="card" style={{ marginBottom: '40px', pageBreakInside: 'avoid' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-main)', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '24px', textTransform: 'uppercase' }}>
                        Tableau de Rentabilité par Client
                    </h3>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                        <thead>
                            <tr>
                                <th style={{ textAlign: 'left', padding: '6px 4px', borderBottom: '1px solid #111827', color: '#111827', fontWeight: '800', textTransform: 'uppercase' }}>Client</th>
                                <th style={{ textAlign: 'left', padding: '6px 4px', borderBottom: '1px solid #111827', color: '#111827', fontWeight: '800', textTransform: 'uppercase' }}>Durée de Collab</th>
                                <th style={{ textAlign: 'right', padding: '6px 4px', borderBottom: '1px solid #111827', color: '#111827', fontWeight: '800', textTransform: 'uppercase' }}>Facturation(TTC)</th>
                                <th style={{ textAlign: 'center', padding: '6px 4px', borderBottom: '1px solid #111827', color: '#111827', fontWeight: '800', textTransform: 'uppercase' }}>Date Fact.</th>
                                <th style={{ textAlign: 'center', padding: '6px 4px', borderBottom: '1px solid #111827', color: '#111827', fontWeight: '800', textTransform: 'uppercase' }}>Date Paie.</th>
                                <th style={{ textAlign: 'center', padding: '6px 4px', borderBottom: '1px solid #111827', color: '#111827', fontWeight: '800', textTransform: 'uppercase' }}>Statut</th>
                                <th style={{ textAlign: 'right', padding: '6px 4px', borderBottom: '1px solid #111827', color: '#6b7280', fontWeight: '800', textTransform: 'uppercase' }}>Encaissé(HT)</th>
                                <th style={{ textAlign: 'right', padding: '6px 4px', borderBottom: '1px solid #111827', color: '#d97706', fontWeight: '800', textTransform: 'uppercase' }}>TVA</th>
                                <th style={{ textAlign: 'right', padding: '6px 4px', borderBottom: '1px solid #111827', color: '#dc2626', fontWeight: '800', textTransform: 'uppercase' }}>Charges RH</th>
                                <th style={{ textAlign: 'right', padding: '6px 4px', borderBottom: '1px solid #111827', color: '#dc2626', fontWeight: '800', textTransform: 'uppercase' }}>Charge Mng</th>
                                <th style={{ textAlign: 'right', padding: '6px 4px', borderBottom: '1px solid #111827', color: '#111827', fontWeight: '800', textTransform: 'uppercase' }}>Gain Net</th>
                            </tr>
                        </thead>
                        <tbody>
                            {analytiqueClients.length > 0 ? analytiqueClients.map((client, idx) => (
                                <tr key={client.id} style={{ background: idx % 2 === 0 ? '#ffffff' : '#f9fafb', transition: 'background 0.2s' }}>
                                    <td style={{ padding: '8px 4px', borderBottom: '1px dashed #e5e7eb', fontWeight: '700', color: '#111827' }}>{client.enseigne}</td>
                                    <td style={{ padding: '8px 4px', borderBottom: '1px dashed #e5e7eb', color: '#4b5563', fontSize: '10px' }}>{client.duree}</td>
                                    <td style={{ textAlign: 'right', padding: '8px 4px', borderBottom: '1px dashed #e5e7eb', fontWeight: '700', color: '#111827' }}>{formatNumber(client.caTTC)}</td>
                                    <td style={{ textAlign: 'center', padding: '8px 4px', borderBottom: '1px dashed #e5e7eb', color: '#4b5563', fontSize: '10px' }}>{client.dateFacturation}</td>
                                    <td style={{ textAlign: 'center', padding: '8px 4px', borderBottom: '1px dashed #e5e7eb', color: '#4b5563', fontSize: '10px' }}>{client.datePaiement}</td>
                                    <td style={{ textAlign: 'center', padding: '8px 4px', borderBottom: '1px dashed #e5e7eb', fontWeight: '700', color: client.retardColor, fontSize: '10px' }}>{client.retardStr}</td>
                                    <td style={{ textAlign: 'right', padding: '8px 4px', borderBottom: '1px dashed #e5e7eb', fontWeight: '600', color: '#6b7280' }}>{formatNumber(client.caHT)}</td>
                                    <td style={{ textAlign: 'right', padding: '8px 4px', borderBottom: '1px dashed #e5e7eb', fontWeight: '600', color: '#d97706' }}>
                                        {client.tva > 0 ? formatNumber(client.tva) : <span style={{ color: '#d1d5db' }}>—</span>}
                                    </td>
                                    <td style={{ textAlign: 'right', padding: '8px 4px', borderBottom: '1px dashed #e5e7eb', color: '#ef4444' }}>{client.chargesRH > 0 ? `-${formatNumber(client.chargesRH)}` : '-'}</td>
                                    <td style={{ textAlign: 'right', padding: '8px 4px', borderBottom: '1px dashed #e5e7eb', color: '#ef4444' }}>{client.chargeMng > 0 ? `-${formatNumber(client.chargeMng)}` : '-'}</td>
                                    <td style={{ textAlign: 'right', padding: '8px 4px', borderBottom: '1px dashed #e5e7eb', fontWeight: '800', color: client.gain >= 0 ? '#10b981' : '#ef4444' }}>{formatNumber(client.gain)}</td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="11" style={{ textAlign: 'center', padding: '16px', color: '#6b7280', fontSize: '12px' }}>Aucune activité client détectée sur cette période.</td>
                                </tr>
                            )}
                            {/* Ligne de sous-total du tableau analytique */}
                            {analytiqueClients.length > 0 && (
                                <tr>
                                    <td colSpan="2" style={{ padding: '10px 4px', borderTop: '2px solid #111827', fontWeight: '800', color: '#111827', textTransform: 'uppercase' }}>Sous-total Analytique</td>
                                    <td style={{ textAlign: 'right', padding: '10px 4px', borderTop: '2px solid #111827', fontWeight: '800', color: '#111827' }}>{formatMoney(analytiqueClients.reduce((acc, c) => acc + c.caTTC, 0))}</td>
                                    <td colSpan="3" style={{ borderTop: '2px solid #111827' }}></td>
                                    <td style={{ textAlign: 'right', padding: '10px 4px', borderTop: '2px solid #111827', fontWeight: '800', color: '#6b7280' }}>{formatMoney(analytiqueClients.reduce((acc, c) => acc + c.caHT, 0))}</td>
                                    <td style={{ textAlign: 'right', padding: '10px 4px', borderTop: '2px solid #111827', fontWeight: '700', color: '#d97706' }}>{formatMoney(analytiqueClients.reduce((acc, c) => acc + c.tva, 0))}</td>
                                    <td style={{ textAlign: 'right', padding: '10px 4px', borderTop: '2px solid #111827', fontWeight: '700', color: '#ef4444' }}>-{formatMoney(analytiqueClients.reduce((acc, c) => acc + c.chargesRH, 0))}</td>
                                    <td style={{ textAlign: 'right', padding: '10px 4px', borderTop: '2px solid #111827', fontWeight: '700', color: '#ef4444' }}>-{formatMoney(analytiqueClients.reduce((acc, c) => acc + c.chargeMng, 0))}</td>
                                    <td style={{ textAlign: 'right', padding: '10px 4px', borderTop: '2px solid #111827', fontWeight: '800', color: '#10b981' }}>{formatMoney(analytiqueClients.reduce((acc, c) => acc + c.gain, 0))}</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* NOUVEAU : Matrice de Rentabilité Mensuelle (Vue Croisée) */}
                <div className="card" style={{ marginBottom: '40px', pageBreakInside: 'avoid', overflow: 'hidden' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '20px' }}>
                        <h3 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-main)', textTransform: 'uppercase', margin: 0 }}>
                            Matrice de Rentabilité Mensuelle (Bénéfice Net HT)
                        </h3>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>Vue Annuelle {selectedYear}</div>
                    </div>
                    
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
                            <thead>
                                <tr style={{ background: '#f8fafc' }}>
                                    <th style={{ textAlign: 'left', padding: '10px 8px', borderBottom: '2px solid #e2e8f1', color: '#475569', fontWeight: '800', position: 'sticky', left: 0, background: '#f8fafc', zIndex: 1, minWidth: '120px' }}>Client</th>
                                    {['JAN', 'FÉV', 'MAR', 'AVR', 'MAI', 'JUN', 'JUI', 'AOÛ', 'SEP', 'OCT', 'NOV', 'DÉC'].map(m => (
                                        <th key={m} style={{ textAlign: 'center', padding: '10px 4px', borderBottom: '2px solid #e2e8f1', color: '#475569', fontWeight: '800' }}>{m}</th>
                                    ))}
                                    <th style={{ textAlign: 'right', padding: '10px 8px', borderBottom: '2px solid #e2e8f1', color: '#1e293b', fontWeight: '900', background: 'rgba(255,193,5,0.05)' }}>TOTAL ANNUEL</th>
                                </tr>
                            </thead>
                            <tbody>
                                {analytiqueClients.map((client, idx) => {
                                    const clientObj = clients.find(c => c.enseigne === client.enseigne);
                                    let annualTotal = 0;
                                    
                                    return (
                                        <tr key={client.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' }} className="hover-row">
                                            <td style={{ padding: '8px', fontWeight: '700', color: '#334155', position: 'sticky', left: 0, background: 'white', borderRight: '1px solid #f1f5f9' }}>{client.enseigne}</td>
                                            {Array.from({ length: 12 }).map((_, mIdx) => {
                                                // 1. Revenue for this month
                                                const monthFactures = factures.filter(f => {
                                                    if (!f.dateEmi) return false;
                                                    const d = new Date(f.dateEmi);
                                                    return d.getFullYear() === selectedYear && d.getMonth() === mIdx && f.client === client.enseigne && f.statut === 'Paid';
                                                });
                                                const revHT = monthFactures.reduce((acc, f) => acc + (parseFloat(f.sousTotalHT) || (parseFloat(f.montant) / 1.19)), 0);
                                                
                                                // 2. Cost for this month
                                                let cost = 0;
                                                if (clientObj && clientObj.etatClient === 'Actif') {
                                                    const startDate = clientObj.dateDebut ? new Date(clientObj.dateDebut) : null;
                                                    const currentDate = new Date(selectedYear, mIdx, 1);
                                                    if (!startDate || currentDate >= new Date(startDate.getFullYear(), startDate.getMonth(), 1)) {
                                                        cost = parseFloat(clientObj.totalCosts) || 0;
                                                    }
                                                }
                                                
                                                const margin = revHT - cost;
                                                annualTotal += margin;
                                                
                                                return (
                                                    <td key={mIdx} style={{ textAlign: 'center', padding: '6px 4px', fontSize: '9px' }}>
                                                        <div style={{ 
                                                            fontWeight: margin !== 0 ? '700' : '400',
                                                            color: margin > 0 ? '#10b981' : margin < 0 ? '#ef4444' : '#cbd5e1'
                                                        }}>
                                                            {margin !== 0 ? formatNumber(margin) : '—'}
                                                        </div>
                                                    </td>
                                                );
                                            })}
                                            <td style={{ textAlign: 'right', padding: '8px', fontWeight: '900', color: annualTotal >= 0 ? '#059669' : '#ef4444', background: 'rgba(255,193,5,0.03)' }}>
                                                {formatNumber(annualTotal)}
                                            </td>
                                        </tr>
                                    );
                                })}
                                {/* Footer: Total Agency per month */}
                                <tr style={{ background: '#f8fafc', borderTop: '2px solid #e2e8f1' }}>
                                    <td style={{ padding: '10px 8px', fontWeight: '900', color: '#1e293b', position: 'sticky', left: 0, background: '#f8fafc' }}>TOTAL AGENCE</td>
                                    {Array.from({ length: 12 }).map((_, mIdx) => {
                                        const monthTotal = analytiqueClients.reduce((acc, client) => {
                                            const facturesM = factures.filter(f => {
                                                const d = new Date(f.dateEmi);
                                                return d.getFullYear() === selectedYear && d.getMonth() === mIdx && f.client === client.enseigne && f.statut === 'Paid';
                                            });
                                            const revHT = facturesM.reduce((s, f) => s + (parseFloat(f.sousTotalHT) || (parseFloat(f.montant) / 1.19)), 0);
                                            const clientObj = clients.find(c => c.enseigne === client.enseigne);
                                            let cost = 0;
                                            if (clientObj && clientObj.etatClient === 'Actif') {
                                                const startDate = clientObj.dateDebut ? new Date(clientObj.dateDebut) : null;
                                                const currentDate = new Date(selectedYear, mIdx, 1);
                                                if (!startDate || currentDate >= new Date(startDate.getFullYear(), startDate.getMonth(), 1)) cost = parseFloat(clientObj.totalCosts) || 0;
                                            }
                                            return acc + (revHT - cost);
                                        }, 0);
                                        return (
                                            <td key={mIdx} style={{ textAlign: 'center', padding: '8px 4px', fontWeight: '900', color: monthTotal >= 0 ? '#059669' : '#ef4444' }}>
                                                {formatNumber(monthTotal)}
                                            </td>
                                        );
                                    })}
                                    <td style={{ textAlign: 'right', padding: '10px 8px', fontWeight: '900', color: '#FFC105', background: '#1e293b', fontSize: '11px' }}>
                                        {formatNumber(analytiqueClients.reduce((acc, c) => {
                                            const facturesC = factures.filter(f => new Date(f.dateEmi).getFullYear() === selectedYear && f.client === c.enseigne && f.statut === 'Paid');
                                            const revHT = facturesC.reduce((s, f) => s + (parseFloat(f.sousTotalHT) || (parseFloat(f.montant) / 1.19)), 0);
                                            // Approximation annuelle simple
                                            const clientObj = clients.find(cl => cl.enseigne === c.enseigne);
                                            let costYear = 0;
                                            for(let m=0;m<12;m++) {
                                                if (clientObj) {
                                                     const startDate = clientObj.dateDebut ? new Date(clientObj.dateDebut) : null;
                                                     const currentDate = new Date(selectedYear, m, 1);
                                                     if (!startDate || currentDate >= new Date(startDate.getFullYear(), startDate.getMonth(), 1)) costYear += (parseFloat(clientObj.totalCosts) || 0);
                                                }
                                            }
                                            return acc + (revHT - costYear);
                                        }, 0))}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
                {/* TABLEAU DES CHARGES */}
                <div className="card" style={{ marginBottom: '40px', pageBreakInside: 'avoid' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '20px' }}>
                        <h3 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-main)', textTransform: 'uppercase', margin: 0 }}>
                            Charges de l'Entreprise
                        </h3>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', fontWeight: '600', color: '#6b7280' }}>
                                {chargesMynds.length} opération{chargesMynds.length !== 1 ? 's' : ''}
                            </span>
                            <span style={{ fontSize: '12px', fontWeight: '800', color: '#ef4444', background: 'rgba(239,68,68,0.08)', padding: '3px 10px', borderRadius: '20px' }}>
                                − {formatMoney(totalChargesMynds)}
                            </span>
                        </div>
                    </div>

                    {(() => {
                        if (chargesMynds.length === 0) {
                            return <div style={{ textAlign: 'center', padding: '24px', color: '#9ca3af', fontSize: '12px' }}>Aucune charge enregistrée sur cette période.</div>;
                        }

                        const grouped = chargesMynds.reduce((acc, t) => {
                            const cat = t.category || 'Autre';
                            if (!acc[cat]) acc[cat] = [];
                            acc[cat].push(t);
                            return acc;
                        }, {});

                        const th = { padding: '5px 8px', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.6px', color: '#9ca3af', borderBottom: '1px solid #e5e7eb', textAlign: 'left' };
                        const td = { padding: '5px 8px', fontSize: '11.5px', color: '#374151', borderBottom: '1px solid #f3f4f6', verticalAlign: 'middle' };

                        return (
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr>
                                        <th style={{ ...th, width: '88px' }}>Date</th>
                                        <th style={th}>Description</th>
                                        <th style={{ ...th, width: '120px' }}>Catégorie</th>
                                        <th style={{ ...th, width: '100px' }}>Nature</th>
                                        <th style={{ ...th, textAlign: 'right', width: '100px' }}>Montant</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Object.entries(grouped).map(([cat, rows]) => {
                                        const subtotal = rows.reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
                                        return (
                                            <React.Fragment key={cat}>
                                                {/* Category separator */}
                                                <tr>
                                                    <td colSpan="5" style={{ padding: '6px 8px 4px', background: '#F7F7F7', fontSize: '10px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', borderTop: '1px solid #e5e7eb' }}>
                                                        {cat}
                                                        <span style={{ fontWeight: '400', marginLeft: '8px', color: '#9ca3af' }}>
                                                            {rows.length} ligne{rows.length > 1 ? 's' : ''} · {formatMoney(subtotal)}
                                                        </span>
                                                    </td>
                                                </tr>
                                                {/* Data rows */}
                                                {rows.map((t, i) => (
                                                    <tr key={t.id || i}>
                                                        <td style={{ ...td, color: '#9ca3af', fontSize: '10.5px', whiteSpace: 'nowrap' }}>
                                                            {t.date ? new Date(t.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—'}
                                                        </td>
                                                        <td style={{ ...td, fontWeight: '500' }}>
                                                            {t.desc || t.fournisseur || t.description || '—'}
                                                        </td>
                                                        <td style={{ ...td, color: '#6b7280', fontSize: '10.5px' }}>{cat}</td>
                                                        <td style={{ ...td, color: '#9ca3af', fontSize: '10.5px' }}>{t.chargeNature || '—'}</td>
                                                        <td style={{ ...td, textAlign: 'right', fontWeight: '500', color: '#111827' }}>
                                                            {formatMoney(parseFloat(t.amount) || 0)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </React.Fragment>
                                        );
                                    })}
                                    {/* Total */}
                                    <tr>
                                        <td colSpan="4" style={{ padding: '8px 8px', fontWeight: '700', fontSize: '11px', color: '#111827', textTransform: 'uppercase', borderTop: '2px solid #111827', letterSpacing: '0.5px' }}>
                                            Total Charges
                                        </td>
                                        <td style={{ padding: '8px 8px', textAlign: 'right', fontWeight: '700', fontSize: '12px', color: '#111827', borderTop: '2px solid #111827' }}>
                                            {formatMoney(totalChargesMynds)}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        );
                    })()}
                </div>

                {/* 1. PRODUITS D'EXPLOITATION (REVENUS) */}
                <div className="card" style={{ marginBottom: '40px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '24px', textTransform: 'uppercase' }}>
                        1. Produits d'Exploitation (Chiffre d'Affaires)
                    </h3>

                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <thead>
                            <tr>
                                <th style={{ textAlign: 'left', padding: '8px 0', borderBottom: '1px solid #d1d5db', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', fontSize: '11px' }}>Désignation</th>
                                <th style={{ textAlign: 'right', padding: '8px 0', borderBottom: '1px solid #d1d5db', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', fontSize: '11px' }}>Montant (HT)</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style={{ padding: '12px 0', borderBottom: '1px dashed #e5e7eb', color: '#374151' }}>Prestations de services facturées et encaissées ({facturesYear.length} factures)</td>
                                <td style={{ textAlign: 'right', padding: '12px 0', borderBottom: '1px dashed #e5e7eb', fontWeight: '600', color: '#111827' }}>{formatMoney(finalRevenusHT)}</td>
                            </tr>
                            <tr>
                                <td style={{ padding: '12px 0', borderBottom: '1px dashed #e5e7eb', color: '#374151' }}>TVA Facturée et Collectée (Estimation)</td>
                                <td style={{ textAlign: 'right', padding: '12px 0', borderBottom: '1px dashed #e5e7eb', fontWeight: '500', color: '#6b7280' }}>{formatMoney(finalTVACollectee)}</td>
                            </tr>
                            <tr style={{ background: '#f9fafb' }}>
                                <td style={{ padding: '12px 16px', fontWeight: '800', color: '#111827', borderTop: '2px solid #e5e7eb', borderBottom: '2px solid #e5e7eb' }}>TOTAL CHIFFRE D'AFFAIRES (TTC)</td>
                                <td style={{ textAlign: 'right', padding: '12px 16px', fontWeight: '800', color: '#111827', borderTop: '2px solid #e5e7eb', borderBottom: '2px solid #e5e7eb' }}>{formatMoney(finalRevenusTTC)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* 2. CHARGES D'EXPLOITATION (DEPENSES) */}
                <div className="card" style={{ marginBottom: '40px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '24px', textTransform: 'uppercase' }}>
                        2. Charges d'Exploitation (Dépenses Déductibles)
                    </h3>

                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <thead>
                            <tr>
                                <th style={{ textAlign: 'left', padding: '8px 0', borderBottom: '1px solid #d1d5db', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', fontSize: '11px' }}>Catégorie</th>
                                <th style={{ textAlign: 'right', padding: '8px 0', borderBottom: '1px solid #d1d5db', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', fontSize: '11px' }}>Montant Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style={{ padding: '12px 0', borderBottom: '1px dashed #e5e7eb', color: '#374151' }}>Frais d'Exploitations & Outils {selectedClient === 'all' ? `(${chargesExploitation.length} opérations)` : ''}</td>
                                <td style={{ textAlign: 'right', padding: '12px 0', borderBottom: '1px dashed #e5e7eb', fontWeight: '500', color: '#374151' }}>{formatMoney(finalExploitation)}</td>
                            </tr>
                            <tr>
                                <td style={{ padding: '12px 0', borderBottom: '1px dashed #e5e7eb', color: '#374151' }}>Ressources Humaines & Sous-traitance {selectedClient === 'all' ? `(${chargesRH.length} opérations)` : ''}</td>
                                <td style={{ textAlign: 'right', padding: '12px 0', borderBottom: '1px dashed #e5e7eb', fontWeight: '500', color: '#374151' }}>{formatMoney(finalRH)}</td>
                            </tr>
                            <tr>
                                <td style={{ padding: '12px 0', borderBottom: '1px dashed #e5e7eb', color: '#374151' }}>Dépenses Marketing & Publicité {selectedClient === 'all' ? `(${chargesMarketing.length} opérations)` : ''}</td>
                                <td style={{ textAlign: 'right', padding: '12px 0', borderBottom: '1px dashed #e5e7eb', fontWeight: '500', color: '#374151' }}>{formatMoney(finalMarketing)}</td>
                            </tr>
                            {finalTVAReversee > 0 && (
                                <tr>
                                    <td style={{ padding: '12px 0', borderBottom: '1px dashed #e5e7eb', color: '#6b7280', fontStyle: 'italic' }}>TVA Reversée à l'État ({transfertsTVA.length} déclarations)</td>
                                    <td style={{ textAlign: 'right', padding: '12px 0', borderBottom: '1px dashed #e5e7eb', fontWeight: '500', color: '#6b7280' }}>{formatMoney(finalTVAReversee)}</td>
                                </tr>
                            )}
                            <tr style={{ background: '#f9fafb' }}>
                                <td style={{ padding: '12px 16px', fontWeight: '800', color: '#ef4444', borderTop: '2px solid #e5e7eb', borderBottom: '2px solid #e5e7eb' }}>TOTAL CHARGES DEDUCTIBLES</td>
                                <td style={{ textAlign: 'right', padding: '12px 16px', fontWeight: '800', color: '#ef4444', borderTop: '2px solid #e5e7eb', borderBottom: '2px solid #e5e7eb' }}>{formatMoney(finalChargesExploitation)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* 3. RÉSULTAT NET */}
                <div style={{ marginBottom: '40px' }}>
                    <div style={{
                        border: '2px solid #111827',
                        padding: '24px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: beneficeNet >= 0 ? '#f0fdf4' : '#fef2f2',
                        borderColor: beneficeNet >= 0 ? '#10b981' : '#ef4444'
                    }}>
                        <div>
                            <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: '900', color: finalBeneficeNet >= 0 ? '#059669' : '#b91c1c', textTransform: 'uppercase' }}>
                                RÉSULTAT D'EXPLOITATION (BÉNÉFICE NET)
                            </h3>
                            <div style={{ fontSize: '12px', color: '#4b5563' }}>Avant impôts sur les sociétés et prélèvements du gérant</div>
                        </div>
                        <div style={{ fontSize: '28px', fontWeight: '900', color: finalBeneficeNet >= 0 ? '#059669' : '#b91c1c', letterSpacing: '-1px' }}>
                            {formatMoney(finalBeneficeNet)}
                        </div>
                    </div>
                </div>

                {/* SIGNATURES */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', marginTop: '60px' }}>
                    <div style={{ borderTop: '1px solid #111827', paddingTop: '8px', textAlign: 'center' }}>
                        <div style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: '#111827' }}>Le Gérant</div>
                        <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>Cachet et Signature</div>
                        <div style={{ height: '80px' }}></div>
                    </div>
                    <div style={{ borderTop: '1px solid #111827', paddingTop: '8px', textAlign: 'center' }}>
                        <div style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: '#111827' }}>Le Cabinet Comptable</div>
                        <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>Validation et Certification (Optionnel)</div>
                        <div style={{ height: '80px' }}></div>
                    </div>
                </div>

                {/* FOOTER FORMEL */}
                <div style={{ textAlign: 'center', marginTop: '40px', paddingTop: '20px', borderTop: '1px solid #e5e7eb', fontSize: '10px', color: '#9ca3af' }}>
                    Généré électroniquement depuis le système de gestion MYNDS Finance - {new Date().getFullYear()}
                </div>

            </div>

            {/* CSS pour l'impression */}
            <style>{`
                @media print {
                    .no-print, .sidebar, header, nav, button {
                        display: none !important;
                    }
                    @page {
                        margin: 1.5cm;
                        size: A4 landscape;
                    }
                    body {
                        background: white !important;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    .page {
                        padding: 0 !important;
                        margin: 0 !important;
                        margin-left: -280px !important;
                        width: 100vw !important;
                    }
                    .printable-report {
                        box-shadow: none !important;
                        border: none !important;
                        max-width: 100% !important;
                        padding: 0 !important;
                    }
                }
            `}</style>
            </>
            )}
        </div>
    );
};

export default RapportsPage;
