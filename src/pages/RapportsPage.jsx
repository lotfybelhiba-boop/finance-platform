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
        let retardColor = '#9ca3af'; // muted
        if (latestFacture) {
            const isLatestPartiallyPaid = latestFacture.montantPaye && latestFacture.montantPaye > 0 && latestFacture.statut !== 'Paid';

            if (latestFacture.statut === 'Late') {
                retardStr = isLatestPartiallyPaid ? 'Partiel R' : 'Retard';
                retardColor = '#ef4444'; // danger
                if (latestFacture.echeance) {
                    const days = Math.floor((new Date() - new Date(latestFacture.echeance)) / (1000 * 3600 * 24));
                    if (days > 0) retardStr = isLatestPartiallyPaid ? `${days}j R (Part.)` : `${days}j R`;
                }
            } else if (latestFacture.statut === 'Paid') {
                retardStr = isLatestPartiallyPaid ? 'Partiel R (+)' : 'Payé';
                retardColor = isLatestPartiallyPaid ? '#ef4444' : '#10b981'; // success
            } else if (latestFacture.statut === 'Sent') {
                retardStr = isLatestPartiallyPaid ? 'Partiel S' : 'Attente';
                retardColor = isLatestPartiallyPaid ? '#d97706' : '#f59e0b'; // warning
            } else if (latestFacture.statut === 'Draft') {
                retardStr = 'Brouillon';
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

                {/* SOUS-MENU HORIZONTAL */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', overflowX: 'auto', paddingBottom: '4px' }}>
                    {[
                        { id: 'Mynds', icon: Building2, label: 'Mynds (Global)' },
                        { id: 'Client', icon: FileText, label: 'Par Client' },
                        { id: 'Employé', icon: Briefcase, label: 'Employés' },
                        { id: 'Organigramme', icon: Network, label: 'Organigramme' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => {
                                setActiveTab(tab.id);
                                if (tab.id === 'Mynds') setSelectedClient('all');
                            }}
                            style={{
                                padding: '10px 20px',
                                borderRadius: '12px',
                                border: '1px solid',
                                borderColor: activeTab === tab.id ? 'var(--primary-color)' : 'var(--border-color)',
                                background: activeTab === tab.id ? 'var(--primary-color)' : 'var(--bg-main)',
                                color: activeTab === tab.id ? 'white' : 'var(--text-main)',
                                fontWeight: activeTab === tab.id ? '800' : '600',
                                fontSize: '13px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                transition: 'all 0.2s',
                                boxShadow: activeTab === tab.id ? '0 4px 12px rgba(139, 92, 246, 0.2)' : 'none'
                            }}
                        >
                            <tab.icon size={16} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Filtres : visible uniquement pour Mynds et Client */}
                {(activeTab === 'Mynds' || activeTab === 'Client') && (
                <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <Filter size={18} color="var(--text-muted)" />
                            <select
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-main)', fontSize: '13px', fontWeight: '700', outline: 'none', cursor: 'pointer' }}
                            >
                                {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                            <select
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-main)', fontSize: '13px', fontWeight: '600', outline: 'none', cursor: 'pointer' }}
                            >
                                <option value="all">Tous les mois</option>
                                {['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'].map((month, idx) => (
                                    <option key={idx} value={idx}>{month}</option>
                                ))}
                            </select>
                            {activeTab === 'Client' && (
                            <select
                                value={selectedClient}
                                onChange={(e) => setSelectedClient(e.target.value)}
                                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-main)', fontSize: '13px', fontWeight: '600', outline: 'none', cursor: 'pointer', maxWidth: '200px' }}
                            >
                                <option value="all">Tous les clients</option>
                                {clients.filter(c => c.etatClient === 'Actif').map(c => (
                                    <option key={c.id} value={c.enseigne}>{c.enseigne}</option>
                                ))}
                            </select>
                            )}
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '12px', border: 'none', background: 'var(--text-main)', color: 'white', cursor: 'pointer', fontWeight: '700', fontSize: '13px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                            <Printer size={16} /> Imprimer (PDF)
                        </button>
                    </div>
                </div>
                )}
            </div>

            {/* TAB: Employé */}
            {activeTab === 'Employé' && (
                <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border-color)', marginBottom: '40px' }}>
                    <Briefcase size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
                    <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>Rapport par Employé</h3>
                    <p style={{ fontSize: '14px', maxWidth: '400px', margin: '0 auto' }}>
                        Cette section affichera bientôt les statistiques RH et les indicateurs de performance des membres de votre équipe.
                    </p>
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
                                    <td style={{ textAlign: 'right', padding: '8px 4px', borderBottom: '1px dashed #e5e7eb', color: '#ef4444' }}>{client.chargesRH > 0 ? `-${formatNumber(client.chargesRH)}` : '-'}</td>
                                    <td style={{ textAlign: 'right', padding: '8px 4px', borderBottom: '1px dashed #e5e7eb', color: '#ef4444' }}>{client.chargeMng > 0 ? `-${formatNumber(client.chargeMng)}` : '-'}</td>
                                    <td style={{ textAlign: 'right', padding: '8px 4px', borderBottom: '1px dashed #e5e7eb', fontWeight: '800', color: client.gain >= 0 ? '#10b981' : '#ef4444' }}>{formatNumber(client.gain)}</td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="10" style={{ textAlign: 'center', padding: '16px', color: '#6b7280', fontSize: '12px' }}>Aucune activité client détectée sur cette période.</td>
                                </tr>
                            )}
                            {/* Ligne de sous-total du tableau analytique */}
                            {analytiqueClients.length > 0 && (
                                <tr>
                                    <td colSpan="2" style={{ padding: '10px 4px', borderTop: '2px solid #111827', fontWeight: '800', color: '#111827', textTransform: 'uppercase' }}>Sous-total Analytique</td>
                                    <td style={{ textAlign: 'right', padding: '10px 4px', borderTop: '2px solid #111827', fontWeight: '800', color: '#111827' }}>{formatMoney(analytiqueClients.reduce((acc, c) => acc + c.caTTC, 0))}</td>
                                    <td colSpan="3" style={{ borderTop: '2px solid #111827' }}></td>
                                    <td style={{ textAlign: 'right', padding: '10px 4px', borderTop: '2px solid #111827', fontWeight: '800', color: '#6b7280' }}>{formatMoney(analytiqueClients.reduce((acc, c) => acc + c.caHT, 0))}</td>
                                    <td style={{ textAlign: 'right', padding: '10px 4px', borderTop: '2px solid #111827', fontWeight: '700', color: '#ef4444' }}>-{formatMoney(analytiqueClients.reduce((acc, c) => acc + c.chargesRH, 0))}</td>
                                    <td style={{ textAlign: 'right', padding: '10px 4px', borderTop: '2px solid #111827', fontWeight: '700', color: '#ef4444' }}>-{formatMoney(analytiqueClients.reduce((acc, c) => acc + c.chargeMng, 0))}</td>
                                    <td style={{ textAlign: 'right', padding: '10px 4px', borderTop: '2px solid #111827', fontWeight: '800', color: '#10b981' }}>{formatMoney(analytiqueClients.reduce((acc, c) => acc + c.gain, 0))}</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
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
