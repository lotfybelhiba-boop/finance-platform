import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import { Search, Plus, Trash2, Filter, ArrowUpRight, ArrowDownLeft, Landmark, Wallet, MoreHorizontal, Calculator, Lock, Bot, Check, EyeOff, Calendar, Banknote } from 'lucide-react';
import { getBankTransactions, saveBankTransactions, getFactures, getClients, getStorage, setStorage } from '../services/storageService';
import { generatePendingPersoCharges, PERSO_CATEGORIES } from '../utils/persoUtils';

const BanquePage = () => {
    // Manual transactions
    const [manualTransactions, setManualTransactions] = useState(() => {
        const saved = getBankTransactions();
        return (saved && saved.length > 0) ? saved : [
            { id: 1, date: '2026-03-08', desc: 'Loyer Bureau', bank: 'BIAT', type: 'Debit', amount: 850, category: 'Charges', chargeType: 'Exploitations', chargeNature: 'Fixes', serviceMonth: '2026-03', paymentDate: '2026-03-08' },
            { id: 2, date: '2026-03-05', desc: 'Retrait Personnel', bank: 'QNB', type: 'Debit', amount: 500, category: 'Perso', serviceMonth: '2026-03', paymentDate: '2026-03-05' }
        ];
    });

    // Invoices loaded from local storage
    const [factures, setFactures] = useState(() => getFactures());

    // Clients loaded from local storage for automated salaries
    const [clients, setClients] = useState(() => getClients());
    const activeClients = clients.filter(c => c.etatClient === 'Actif');

    // Sponsoring loaded from local storage
    const [sponsoringList, setSponsoringList] = useState(() => getStorage('mynds_sponsoring', []));


    const [selectedBank, setSelectedBank] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState(null);
    const [isTVAModalOpen, setIsTVAModalOpen] = useState(false);
    const [editingTVA, setEditingTVA] = useState(null);

    const [activeTab, setActiveTab] = useState('Entrées'); // 'Entrées', 'Charges Mynds', 'Charges Perso', 'TVA'
    
    // Filters for Entrées
    const [entreesMonthFilter, setEntreesMonthFilter] = useState('all');
    const [entreesClientFilter, setEntreesClientFilter] = useState('all');

    // Filters for Charges Mynds
    const [selectedMonthFilter, setSelectedMonthFilter] = useState(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`);
    const [chargeTypeFilter, setChargeTypeFilter] = useState('all'); // 'all', 'RH'

    // TVA Transactions
    const [tvaTransactions, setTvaTransactions] = useState(() => getStorage('mynds_tva_achats', []));

    // Ignored Transactions History List
    const [ignoredTxs, setIgnoredTxs] = useState(() => getStorage('mynds_ignored_transactions', []));
    const [showHistory, setShowHistory] = useState(false);

    // Écouteur de synchronisation multi-onglets
    useEffect(() => {
        const syncData = () => {
            const savedTx = getBankTransactions();
            if (savedTx) setManualTransactions(savedTx);
            setFactures(getFactures() || []);
            setClients(getClients() || []);
            setSponsoringList(getStorage('mynds_sponsoring', []));
            setTvaTransactions(getStorage('mynds_tva_achats', []));
            setIgnoredTxs(getStorage('mynds_ignored_transactions', []));
        };
        window.addEventListener('storage', syncData);
        return () => window.removeEventListener('storage', syncData);
    }, []);

    useEffect(() => {
        setStorage('mynds_ignored_transactions', ignoredTxs);
    }, [ignoredTxs]);

    // Automations (Salaries + Perso)
    useEffect(() => {
        // En supposant que generatePendingSalaries est globalement disponible ou importé si besoin
        // Ici on se concentre sur Perso
        generatePendingPersoCharges();
    }, []);

    useEffect(() => {
        saveBankTransactions(manualTransactions);
    }, [manualTransactions]);

    useEffect(() => {
        setStorage('mynds_tva_achats', tvaTransactions);
    }, [tvaTransactions]);

    // Compute automated transactions from paid invoices
    const autoTransactions = factures
        .filter(f => f.statut === 'Paid')
        .flatMap(f => {
            const isNonDeclare = f.id.startsWith('ND-');

            // Extract the month and year from the service period start, or fallback to emission date
            const serviceDate = f.periodeDebut ? new Date(f.periodeDebut) : new Date(f.dateEmi);
            const serviceMonthFormatted = `${serviceDate.getFullYear()}-${String(serviceDate.getMonth() + 1).padStart(2, '0')}`;

            const baseTrans = {
                id: `auto-${f.id}`,
                date: f.dateEmi, // We keep date as original record date for sorting
                desc: `Facture ${f.client}`,
                bank: f.compteEncaissement || (isNonDeclare ? 'QNB' : 'BIAT'),
                type: 'Credit',
                amount: parseFloat(f.montant) || 0,
                category: 'Facture',
                isAuto: true,
                originalId: f.id,
                serviceMonth: serviceMonthFormatted,
                paymentDate: f.datePaiement || f.dateEmi // Use datePaiement if it exists on the invoice, else fallback to dateEmi
            };

            const generated = [baseTrans];

            if (f.isExtra && f.coutExtra > 0) {
                generated.push({
                    id: `auto-extra-${f.id}`,
                    date: f.dateEmi,
                    desc: `Coût Auto Mission Extra (${f.ressourceExtra || 'Externe'}) - Facture ${f.id}`,
                    bank: f.compteEncaissement || (isNonDeclare ? 'QNB' : 'BIAT'),
                    type: 'Debit',
                    amount: parseFloat(f.coutExtra) || 0,
                    category: 'Charges',
                    chargeType: 'Exploitations',
                    chargeNature: 'Variables',
                    isAuto: true,
                    originalId: f.id,
                    serviceMonth: serviceMonthFormatted,
                    paymentDate: f.datePaiement || f.dateEmi
                });
            }

            return generated;
        });

    // Extract target year/month for contract validation (used for Sponsoring)
    const [selYearStr, selMonthStr] = selectedMonthFilter.split('-');
    const targetY = parseInt(selYearStr, 10);
    const targetM = parseInt(selMonthStr, 10) - 1; // 0-indexed

    const isMonthInContract = (client, ty, tm) => {
        if (!client) return false;
        const targetDateObj = new Date(ty, tm, 1);
        const start = client.dateDebut && client.dateDebut !== '-' ? new Date(client.dateDebut) : new Date(2000, 0, 1);
        
        let end;
        if (client.dateFin) {
            end = new Date(client.dateFin);
        } else if (client.regime === 'Projet' && client.dureeMois) {
            end = new Date(start.getFullYear(), start.getMonth() + parseInt(client.dureeMois) - 1, start.getDate());
        } else {
            end = new Date(ty, 11, 31);
        }
        
        const startMonthObj = new Date(start.getFullYear(), start.getMonth(), 1);
        const endMonthObj = new Date(end.getFullYear(), end.getMonth(), 1);
        
        return targetDateObj >= startMonthObj && targetDateObj <= endMonthObj;
    };

    // Compute automated sponsoring costs, projected dynamically like salaries!
    const autoSponsoring = [];
    sponsoringList.forEach(s => {
        if (s.statut !== 'En pause' && isMonthInContract(s, targetY, targetM)) {
            autoSponsoring.push({
                id: `auto-sponsoring-${s.id}-${selectedMonthFilter}`,
                date: `${selectedMonthFilter}-10`, // Assume typically paid mid-month
                desc: `Achat Sponsoring ${s.plateforme} - ${s.client}`,
                bank: 'BIAT',
                type: 'Debit',
                amount: parseFloat(s.montantTNDBanque) || 0,
                category: 'Charges',
                chargeType: 'Exploitations',
                chargeNature: 'Variables',
                isAuto: true,
                originalId: s.id,
                serviceMonth: selectedMonthFilter,
                paymentDate: `${selectedMonthFilter}-10`
            });
        }
    });

    // Combine manual, auto invoices, auto sponsoring
    const allTransactions = [...manualTransactions, ...autoTransactions, ...autoSponsoring].map(t => ({
        ...t,
        isIgnored: ignoredTxs.some(ignored => ignored.id === t.id)
    }));

    // Extract unique RH names/roles dynamically for the filter dropdown
    const uniqueRHNames = Array.from(new Set(
        allTransactions
            .filter(t => t.chargeType === 'RH' || t.category === 'Mynds Salaire' || t.desc.toLowerCase().includes('salaire'))
            .map(t => {
                if (t.desc.startsWith('Salaire ')) {
                    const parts = t.desc.split('-');
                    if (parts.length > 0) {
                        return parts[0].replace('Salaire', '').trim();
                    }
                }
            })
            .filter(Boolean)
    )).sort();

    const uniqueEntreesClients = Array.from(new Set(
        allTransactions
            .filter(t => t.type === 'Credit' && t.isAuto)
            .map(t => t.desc.replace('Facture ', '').trim())
    )).sort();

    const formatMoney = (amount) => {
        return new Intl.NumberFormat('fr-TN', { style: 'currency', currency: 'TND', minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(amount);
    };

    const handleSave = (t) => {
        if (parseFloat(t.amount) < 0) {
            alert("❗ Opération refusée.\nLe montant d'une transaction ne peut pas être négatif.");
            return;
        }
        
        if (editingTransaction && editingTransaction.id !== undefined) {
            // C'est une vraie modification d'une transaction manuelle
            setManualTransactions(manualTransactions.map(item => item.id === t.id ? t : item));
        } else {
            // Création d'une nouvelle transaction OU validation d'un draft (id n'existe pas encore dans manualTransactions)
            setManualTransactions([...manualTransactions, { ...t, id: Date.now() }]);
        }

        // Si c'est une charge perso récurrente, l'ajouter à la config si c'est nouveau
        if (t.category === 'Perso' && t.isRecurrent) {
            const configs = getStorage('mynds_perso_config', []);
            // Vérifier si une config similaire existe déjà (par nom/montant)
            const exists = configs.some(c => c.name === t.desc && c.category === t.persoCategory);
            if (!exists) {
                const newConfig = {
                    id: Date.now() + Math.floor(Math.random()*1000),
                    name: t.desc,
                    amount: t.amount,
                    category: t.persoCategory,
                    day: new Date(t.date).getDate(),
                    bank: t.bank,
                    active: true
                };
                setStorage('mynds_perso_config', [...configs, newConfig]);
            }
        }

        setIsModalOpen(false);
        setEditingTransaction(null);
    };

    const handleDelete = (id) => {
        if (window.confirm("Supprimer cette transaction manuelle ?")) {
            setManualTransactions(manualTransactions.filter(t => t.id !== id));
        }
    };

    const handleEdit = (t) => {
        if (t.isAuto) return; // Prevention for auto invoices
        setEditingTransaction(t);
        setIsModalOpen(true);
    };

    const handleValidateDraft = (t) => {
        // Open modal with draft prefilled so user can modify date/bank/amount before saving as permanent
        setEditingTransaction({
            ...t,
            isDraft: false,  // Remove draft flag to lock it as an actual transaction
            statut: 'Payé' // Ensure status flips from 'En attente'
        });
        setIsModalOpen(true);
    };

    const toggleIgnore = (t) => {
        const alreadyIgnored = ignoredTxs.some(item => item.id === t.id);
        if (alreadyIgnored) {
            setIgnoredTxs(ignoredTxs.filter(item => item.id !== t.id));
        } else {
            setIgnoredTxs([...ignoredTxs, t]);
        }
    };

    // --- TVA Handlers ---
    const handleSaveTVA = (tva) => {
        if (editingTVA) {
            setTvaTransactions(tvaTransactions.map(item => item.id === tva.id ? tva : item));
        } else {
            setTvaTransactions([...tvaTransactions, { ...tva, id: Date.now() }]);
        }
        setIsTVAModalOpen(false);
        setEditingTVA(null);
    };

    const handleDeleteTVA = (id) => {
        if (window.confirm("Supprimer cet enrgistrement de TVA ?")) {
            setTvaTransactions(tvaTransactions.filter(t => t.id !== id));
        }
    };

    const handleEditTVA = (tva) => {
        setEditingTVA(tva);
        setIsTVAModalOpen(true);
    };

    // 1. DATA Extraction for Salary Proposals
    const [year, month] = selectedMonthFilter.split('-').map(n => parseInt(n, 10));
    const currentMonthStr = selectedMonthFilter;
    const currentMonthName = new Date(year, month - 1).toLocaleDateString('fr-FR', { month: 'long' });

    const rhPaymentsCurrentMonth = manualTransactions.filter(t => 
        (t.chargeType === 'RH' || t.chargeType === 'Ressources Humaines' || t.category === 'RH') && 
        t.type === 'Debit' &&
        t.serviceMonth === currentMonthStr
    );

    const salaryProposals = [];
    clients.filter(c => c.etatClient === 'Actif').forEach(client => {
        if (client.projectCosts) {
            client.projectCosts.forEach(cost => {
                const amount = parseFloat(cost.montant) || 0;
                if (amount > 0) {
                    const isPaid = rhPaymentsCurrentMonth.some(p => 
                        p.desc?.toLowerCase().includes(cost.nom?.toLowerCase()) || 
                        (cost.nom && p.desc?.toLowerCase().includes(cost.nom.toLowerCase()))
                    );

                    if (!isPaid) {
                        salaryProposals.push({
                            name: cost.nom || 'Inconnu',
                            project: client.enseigne,
                            amount: amount
                        });
                    }
                }
            });
        }
    });

    const handleValidateSalary = (items) => {
        const confirmMsg = items.length > 1 
            ? `Valider le paiement de ${items.length} salaires ?` 
            : `Confirmer le paiement du salaire de ${items[0].name} (${formatMoney(items[0].amount)}) ?`;

        if (!window.confirm(confirmMsg)) return;

        const newTxs = [...manualTransactions];
        items.forEach(item => {
            const paymentDate = new Date(year, month - 1, 5).toISOString().split('T')[0];
            newTxs.push({
                id: generateId('TRX'),
                date: new Date().toISOString().split('T')[0],
                desc: `Salaire ${item.name} - ${currentMonthName} ${year}`,
                bank: 'BIAT',
                type: 'Debit',
                amount: item.amount,
                category: 'Charges',
                chargeType: 'RH',
                chargeNature: 'Fixes',
                serviceMonth: currentMonthStr,
                paymentDate: paymentDate,
                isAuto: false
            });
        });

        setManualTransactions(newTxs);
        saveBankTransactions(newTxs);
        alert(items.length > 1 ? "Salaires validés." : "Salaire validé.");
    };

    const balanceBIAT = allTransactions
        .filter(t => t.bank === 'BIAT' && !t.isDraft && !t.isIgnored)
        .reduce((acc, curr) => acc + (curr.type === 'Credit' ? (parseFloat(curr.amount) || 0) : -(parseFloat(curr.amount) || 0)), 0);

    const balanceQNB = allTransactions
        .filter(t => t.bank === 'QNB' && !t.isDraft && !t.isIgnored)
        .reduce((acc, curr) => acc + (curr.type === 'Credit' ? (parseFloat(curr.amount) || 0) : -(parseFloat(curr.amount) || 0)), 0);

    const balanceEspeces = allTransactions
        .filter(t => t.bank === 'Espèces' && !t.isDraft && !t.isIgnored)
        .reduce((acc, curr) => acc + (curr.type === 'Credit' ? (parseFloat(curr.amount) || 0) : -(parseFloat(curr.amount) || 0)), 0);

    const filteredTransactions = allTransactions
        .filter(t => !t.isIgnored) // Hide ignored transactions entirely from Banque
        .filter(t => selectedBank === 'all' || t.bank === selectedBank)
        .filter(t => t.desc.toLowerCase().includes(searchTerm.toLowerCase()))
        .filter(t => {
            if (activeTab === 'Entrées') {
                if (t.type !== 'Credit') return false;
                if (entreesMonthFilter !== 'all') {
                    const tMonth = t.date.substring(0, 7);
                    if (tMonth !== entreesMonthFilter) return false;
                }
                if (entreesClientFilter !== 'all') {
                    // Check if the client name is part of the description, case-insensitive
                    // Assuming client name is typically found after "Facture " or similar
                    const clientNameInDesc = t.desc.toLowerCase().includes(entreesClientFilter.toLowerCase());
                    if (!clientNameInDesc) return false;
                }
                return true;
            }
            if (activeTab === 'Charges Mynds') {
                if (t.type !== 'Debit' || t.category === 'Perso') return false;
                // Specific "Charges Mynds" Tab Filters
                if (selectedMonthFilter && t.serviceMonth !== selectedMonthFilter) return false;
                
                const isRHCharge = t.chargeType === 'RH' || t.category === 'Mynds Salaire' || t.desc.toLowerCase().includes('salaire');
                
                if (chargeTypeFilter === 'RH') {
                    return isRHCharge;
                } else if (chargeTypeFilter.startsWith('RH-')) {
                    const specificName = chargeTypeFilter.replace('RH-', '');
                    return isRHCharge && t.desc.includes(specificName);
                }
                
                return true;
            }
            if (activeTab === 'Charges Perso') return t.type === 'Debit' && t.category === 'Perso';
            return false;
        })
        .sort((a, b) => new Date(b.date) - new Date(a.date));

    const totalTVA = tvaTransactions.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);
    const filteredTVA = tvaTransactions
        .filter(t => t.fournisseur.toLowerCase().includes(searchTerm.toLowerCase()))
        .sort((a, b) => new Date(b.date) - new Date(a.date));

    return (
        <div style={{ padding: '0 24px' }}>
            <Header showMonthSelector={false} title="Banque" subtitle="Suivi des Comptes & Transactions" />

            {/* TOP LAYOUT: 70% Balances / 30% Expected Transfers Timeline */}
            <div style={{ display: 'flex', gap: '24px', marginBottom: '24px', alignItems: 'stretch' }}>
                
                {/* LEFT COLUMN: Balances */}
                <div style={{ flex: '2', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Total Global Mini Card */}
                    <div style={{
                        background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '16px',
                        display: 'flex', flexDirection: 'column', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
                    }}>
                        <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Solde Global Net
                        </div>
                        <div style={{ fontSize: '24px', fontWeight: '900', color: 'var(--text-main)', marginTop: '4px' }}>
                            {formatMoney(balanceBIAT + balanceQNB + balanceEspeces)}
                        </div>
                    </div>

                    {/* The 3 Bank Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', flex: 1 }}>
                        {/* BIAT Card */}
                        <div style={{
                            background: 'var(--text-main)', padding: '16px', borderRadius: '16px', color: 'white',
                            display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', overflow: 'hidden'
                        }}>
                            <div style={{ position: 'absolute', top: '-10px', right: '-10px', opacity: 0.1 }}><Landmark size={80} /></div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <div style={{ fontSize: '9px', fontWeight: '700', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Compte BIAT</div>
                                </div>
                                <div style={{ background: 'rgba(255,193,5,0.2)', padding: '2px 6px', borderRadius: '6px', fontSize: '8px', fontWeight: '800', color: 'var(--accent-gold)' }}>SOCIÉTÉ</div>
                            </div>
                            <div style={{ fontSize: '20px', fontWeight: '900', marginTop: '12px' }}>{formatMoney(balanceBIAT)}</div>
                        </div>

                        {/* QNB Card */}
                        <div style={{
                            background: 'white', padding: '16px', borderRadius: '16px', border: '1px solid var(--border-color)',
                            display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', overflow: 'hidden'
                        }}>
                            <div style={{ position: 'absolute', top: '-10px', right: '-10px', color: 'var(--text-muted)', opacity: 0.05 }}><Wallet size={80} /></div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <div style={{ fontSize: '9px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Compte QNB</div>
                                </div>
                                <div style={{ background: 'rgba(220, 38, 38, 0.1)', padding: '2px 6px', borderRadius: '6px', fontSize: '8px', fontWeight: '800', color: '#dc2626' }}>PERSO</div>
                            </div>
                            <div style={{ fontSize: '20px', fontWeight: '900', color: 'var(--text-main)', marginTop: '12px' }}>{formatMoney(balanceQNB)}</div>
                        </div>

                        {/* Espèces Card */}
                        <div style={{
                            background: 'var(--bg-main)', padding: '16px', borderRadius: '16px', border: '1px solid var(--border-color)',
                            display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', overflow: 'hidden'
                        }}>
                            <div style={{ position: 'absolute', bottom: '-5px', right: '-5px', color: 'var(--accent-gold)', opacity: 0.1 }}><Calculator size={70} /></div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <div style={{ fontSize: '9px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Espèces Cash</div>
                                </div>
                                <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '2px 6px', borderRadius: '6px', fontSize: '8px', fontWeight: '800', color: '#10b981' }}>MAIN</div>
                            </div>
                            <div style={{ fontSize: '20px', fontWeight: '900', color: 'var(--text-main)', marginTop: '12px' }}>{formatMoney(balanceEspeces)}</div>
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN: Calendar / Expected Transfers */}
                <div style={{
                    flex: '1', background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '16px',
                    display: 'flex', flexDirection: 'column', maxHeight: '200px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px dashed var(--border-color)' }}>
                        <div style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', padding: '6px', borderRadius: '8px', display: 'flex' }}>
                            <Calendar size={14} />
                        </div>
                        <div>
                            <h3 style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-main)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Échéancier Bancaire</h3>
                            <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: '600', marginTop: '2px' }}>Virements & Encaissements attendus</div>
                        </div>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
                        {(() => {
                            const pendingAlerts = [];
                            const now = new Date();
                            const currentY = now.getFullYear();
                            const currentM = now.getMonth();

                            // 1. Sent or Late Invoices
                            factures.forEach(f => {
                                if (f.statut === 'Sent' || f.statut === 'Late') {
                                    let calculatedDate;
                                    
                                    // IGNORER L'ECHEANCE DE LA FACTURE : TOUJOURS CALCULER DEPUIS LA FICHE CLIENT EN TEMPS RÉEL
                                    const clientRef = activeClients.find(c => c.id === f.clientId || c.enseigne === f.client);
                                    
                                    if (clientRef) {
                                        const delay = parseInt(clientRef.delaiPaiement, 10);
                                        
                                        if (!isNaN(delay)) {
                                            // Priority 1: User defined delay (e.g., 30 days, 60 days)
                                            const emiObj = new Date(f.dateEmi);
                                            emiObj.setDate(emiObj.getDate() + delay);
                                            calculatedDate = emiObj.toISOString().split('T')[0];
                                        } else if (clientRef.regime === 'Abonnement' && clientRef.jourPaiement) {
                                            // Priority 2: Fallback to Abonnement Custom 'jourPaiement' (e.g., 5th of the month)
                                            const dPay = parseInt(clientRef.jourPaiement, 10) || 5;
                                            const emiObj = new Date(f.dateEmi);
                                            let targetM = emiObj.getMonth();
                                            let targetY = emiObj.getFullYear();
                                            
                                            // If emission date passed the monthly payment day, it cascades to the next month
                                            if (emiObj.getDate() > dPay) {
                                                targetM += 1;
                                                if (targetM > 11) {
                                                    targetM = 0;
                                                    targetY += 1;
                                                }
                                            }
                                            
                                            const targetDateObj = new Date(targetY, targetM, dPay);
                                            calculatedDate = `${targetDateObj.getFullYear()}-${String(targetDateObj.getMonth() + 1).padStart(2, '0')}-${String(targetDateObj.getDate()).padStart(2, '0')}`;
                                        } else if (clientRef.regime === 'One-Shot' && clientRef.datePaiement) {
                                            // Priority 3: One-Shot default scheduled payment date
                                            calculatedDate = clientRef.datePaiement;
                                        } else {
                                            // Priority 4: Universal 48h emergency fallback
                                            const emiObj = new Date(f.dateEmi);
                                            emiObj.setDate(emiObj.getDate() + 2);
                                            calculatedDate = emiObj.toISOString().split('T')[0];
                                        }
                                    } else {
                                        // Unknown Client fallback (uses emission date + 48h)
                                        const emiObj = new Date(f.dateEmi);
                                        emiObj.setDate(emiObj.getDate() + 2);
                                        calculatedDate = emiObj.toISOString().split('T')[0];
                                    }

                                    pendingAlerts.push({
                                        id: `inv-${f.id}`,
                                        type: f.statut === 'Late' ? 'Retard' : 'Facturé',
                                        client: f.client,
                                        desc: `Facture ${f.id}`,
                                        date: calculatedDate,
                                        amount: f.montant,
                                        urgency: f.statut === 'Late' ? 'high' : 'medium'
                                    });
                                }
                            });

                            // 2. Active Abonnements not invoiced for the current month
                            activeClients.forEach(c => {
                                if (c.regime === 'Abonnement' && isMonthInContract(c, currentY, currentM)) {
                                    const hasInvoiceThisMonth = factures.some(f => {
                                        if (f.client !== c.enseigne && f.clientId !== c.id) return false;
                                        const d = f.periodeDebut ? new Date(f.periodeDebut) : new Date(f.dateEmi);
                                        return !isNaN(d.getTime()) && d.getFullYear() === currentY && d.getMonth() === currentM;
                                    });
                                    
                                    if (!hasInvoiceThisMonth) {
                                        const estimatedTTC = (c.montantMensuel || 0) * (c.sousTVA === false ? 1 : 1.19);
                                        if (estimatedTTC > 0) {
                                            const dPay = parseInt(c.jourPaiement, 10) || 5;
                                            const targetDateObj = new Date(currentY, currentM + 1, dPay);
                                            const exactDueDate = `${targetDateObj.getFullYear()}-${String(targetDateObj.getMonth() + 1).padStart(2, '0')}-${String(targetDateObj.getDate()).padStart(2, '0')}`;
                                            
                                            let periodLabel = `Mois ${String(currentM+1).padStart(2,'0')}`;
                                            if (c.modeCycle === 'Du 15 au 14') periodLabel = `15/${String(currentM+1).padStart(2,'0')} - 14/${String(targetDateObj.getMonth()+1).padStart(2,'0')}`;
                                            else if (c.modeCycle === 'Personnalisé' || c.modeCycle === 'Date de début') periodLabel = `Cycle du ${c.jourCycle}`;

                                            pendingAlerts.push({
                                                id: `sub-${c.id}`,
                                                type: 'Récurrent',
                                                client: c.enseigne,
                                                desc: `Non-facturé (${periodLabel})`,
                                                date: exactDueDate,
                                                amount: estimatedTTC,
                                                urgency: 'low'
                                            });
                                        }
                                    }
                                }
                            });
                            
                            pendingAlerts.sort((a, b) => new Date(a.date) - new Date(b.date));

                            if (pendingAlerts.length === 0) {
                                return <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '12px' }}>Aucun virement en attente.</div>;
                            }

                            return pendingAlerts.map(alert => {
                                const dayObj = new Date(alert.date);
                                const formatDay = !isNaN(dayObj) ? String(dayObj.getDate()).padStart(2, '0') : '??';
                                const formatMonthStr = !isNaN(dayObj) ? dayObj.toLocaleString('fr-FR', {month: 'short'}) : '???';
                                
                                return (
                                    <div key={alert.id} style={{
                                        display: 'flex', alignItems: 'center', gap: '12px', padding: '8px', borderRadius: '10px',
                                        background: alert.urgency === 'high' ? 'rgba(239, 68, 68, 0.05)' : 'var(--bg-main)',
                                        border: `1px solid ${alert.urgency === 'high' ? 'rgba(239, 68, 68, 0.2)' : 'var(--border-color)'}`,
                                        transition: 'all 0.2s'
                                    }}>
                                        {/* Date Box */}
                                        <div style={{
                                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                            background: alert.urgency === 'high' ? '#ef4444' : 'var(--card-bg)', color: alert.urgency === 'high' ? 'white' : 'var(--text-main)',
                                            borderRadius: '8px', minWidth: '36px', height: '36px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                                            border: alert.urgency !== 'high' ? '1px solid var(--border-color)' : 'none'
                                        }}>
                                            <span style={{ fontSize: '12px', fontWeight: '900', lineHeight: '1' }}>{formatDay}</span>
                                            <span style={{ fontSize: '8px', fontWeight: '800', textTransform: 'uppercase', opacity: 0.8 }}>{formatMonthStr}</span>
                                        </div>

                                        {/* Content Box */}
                                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-main)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{alert.client}</div>
                                                <div style={{ fontSize: '11px', fontWeight: '900', color: 'var(--text-main)', paddingLeft: '8px' }}>{formatMoney(alert.amount)}</div>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div style={{ fontSize: '9px', color: 'var(--text-muted)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{alert.desc}</div>
                                                <div style={{
                                                    fontSize: '8px', fontWeight: '800', padding: '2px 4px', borderRadius: '4px',
                                                    background: alert.urgency === 'high' ? 'rgba(239,68,68,0.1)' : alert.urgency === 'medium' ? 'rgba(245,158,11,0.1)' : 'rgba(59,130,246,0.1)',
                                                    color: alert.urgency === 'high' ? '#ef4444' : alert.urgency === 'medium' ? '#f59e0b' : '#3b82f6', textTransform: 'uppercase'
                                                }}>
                                                    {alert.type}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            });
                        })()}
                    </div>
                </div>
            </div>

            {/* Tab Navigation */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                <button
                    onClick={() => setActiveTab('Entrées')}
                    style={{
                        padding: '10px 24px',
                        borderRadius: '12px',
                        border: 'none',
                        background: activeTab === 'Entrées' ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
                        color: activeTab === 'Entrées' ? '#10b981' : 'var(--text-muted)',
                        fontSize: '14px',
                        fontWeight: '800',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}
                >
                    <ArrowDownLeft size={18} /> Entrées (Recettes)
                </button>
                <button
                    onClick={() => setActiveTab('Charges Mynds')}
                    style={{
                        padding: '10px 24px',
                        borderRadius: '12px',
                        border: 'none',
                        background: activeTab === 'Charges Mynds' ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
                        color: activeTab === 'Charges Mynds' ? '#ef4444' : 'var(--text-muted)',
                        fontSize: '14px',
                        fontWeight: '800',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}
                >
                    <ArrowUpRight size={18} /> Charges Mynds
                </button>
                <button
                    onClick={() => setActiveTab('Charges Perso')}
                    style={{
                        padding: '10px 24px',
                        borderRadius: '12px',
                        border: 'none',
                        background: activeTab === 'Charges Perso' ? 'rgba(245, 158, 11, 0.1)' : 'transparent',
                        color: activeTab === 'Charges Perso' ? '#f59e0b' : 'var(--text-muted)',
                        fontSize: '14px',
                        fontWeight: '800',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}
                >
                    <ArrowUpRight size={18} /> Charges Perso
                </button>
                <div style={{ width: '1px', background: 'var(--border-color)', margin: '0 8px' }}></div>
                <button
                    onClick={() => setActiveTab('TVA')}
                    style={{
                        padding: '10px 24px',
                        borderRadius: '12px',
                        border: 'none',
                        background: activeTab === 'TVA' ? 'rgba(56, 189, 248, 0.1)' : 'transparent',
                        color: activeTab === 'TVA' ? '#0284c7' : 'var(--text-muted)',
                        fontSize: '14px',
                        fontWeight: '800',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}
                >
                    <Calculator size={18} /> TVA (Achats)
                </button>
            </div>

            {/* Transactions Section */}
            <div className="card" style={{ padding: '24px', borderRadius: '24px', marginTop: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <div>
                        <h2 style={{ fontSize: '18px', fontWeight: '900', color: 'var(--text-main)', margin: 0 }}>
                            {activeTab === 'Entrées' && 'Historique des Entrées'}
                            {activeTab === 'Charges Mynds' && 'Historique des Charges MYNDS'}
                            {activeTab === 'Charges Perso' && 'Historique des Charges Perso'}
                            {activeTab === 'TVA' && 'Registre de la TVA Collectée (Achats)'}
                        </h2>
                        <div style={{ fontSize: '12px', fontWeight: '800', color: (activeTab === 'Entrées' || activeTab === 'TVA') ? '#10b981' : '#ef4444', textTransform: 'uppercase', marginTop: '2px' }}>
                            Total • {formatMoney(activeTab === 'TVA' ? totalTVA : filteredTransactions.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0))}
                        </div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <div style={{ position: 'relative' }}>
                            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                                type="text"
                                placeholder="Recherche..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                style={{ padding: '8px 10px 8px 30px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', fontSize: '12px', width: '180px', outline: 'none' }}
                            />
                        </div>

                        {activeTab === 'Entrées' && (
                            <>
                                <input
                                    type="month"
                                    value={entreesMonthFilter === 'all' ? '' : entreesMonthFilter}
                                    onChange={e => setEntreesMonthFilter(e.target.value || 'all')}
                                    style={{ padding: '7px 10px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', fontSize: '12px', fontWeight: '800', color: '#10b981', outline: 'none' }}
                                />
                                <select
                                    value={entreesClientFilter}
                                    onChange={e => setEntreesClientFilter(e.target.value)}
                                    style={{ padding: '8px 10px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', fontSize: '12px', fontWeight: '800', outline: 'none', color: entreesClientFilter !== 'all' ? '#10b981' : 'var(--text-main)' }}
                                >
                                    <option value="all">Tous Clients</option>
                                    {uniqueEntreesClients.map(name => (
                                        <option key={name} value={name}>{name}</option>
                                    ))}
                                </select>
                            </>
                        )}

                        {activeTab === 'Charges Mynds' && (
                            <>
                                <input
                                    type="month"
                                    value={selectedMonthFilter}
                                    onChange={e => setSelectedMonthFilter(e.target.value)}
                                    style={{ padding: '7px 10px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', fontSize: '12px', fontWeight: '800', color: '#ef4444', outline: 'none' }}
                                />
                                <select
                                    value={chargeTypeFilter}
                                    onChange={e => setChargeTypeFilter(e.target.value)}
                                    style={{ padding: '8px 10px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', fontSize: '12px', fontWeight: '800', outline: 'none', color: chargeTypeFilter.startsWith('RH') ? '#3b82f6' : 'var(--text-main)' }}
                                >
                                    <option value="all">Toutes Charges</option>
                                    <option value="RH">Toutes RH</option>
                                    {uniqueRHNames.map(name => (
                                        <option key={name} value={`RH-${name}`}>👤 {name}</option>
                                    ))}
                                </select>
                            </>
                        )}

                        <button
                            onClick={() => {
                                if (activeTab === 'TVA') {
                                    setEditingTVA(null);
                                    setIsTVAModalOpen(true);
                                } else {
                                    setEditingTransaction(null);
                                    setIsModalOpen(true);
                                }
                            }}
                            style={{ padding: '8px 16px', borderRadius: '12px', border: 'none', background: activeTab === 'TVA' ? '#0284c7' : 'var(--text-main)', color: 'white', fontSize: '12px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                        >
                            <Plus size={16} /> Ajouter
                        </button>
                    </div>
                </div>

                {activeTab === 'Charges Mynds' && salaryProposals.length > 0 && (
                    <div style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.05) 0%, rgba(139, 92, 246, 0.1) 100%)', border: '1px solid rgba(139, 92, 246, 0.2)', borderRadius: '20px', padding: '20px', marginBottom: '24px', boxShadow: '0 10px 30px rgba(139, 92, 246, 0.05)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#8b5cf6', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Banknote size={20} />
                                </div>
                                <div>
                                    <h3 style={{ fontSize: '15px', fontWeight: '900', color: 'var(--text-main)', margin: 0 }}>Propositions de Salaires</h3>
                                    <p style={{ fontSize: '11px', color: 'rgba(139, 92, 246, 0.8)', fontWeight: '700', textTransform: 'uppercase', margin: 0 }}>Basé sur fiches projets - {currentMonthName}</p>
                                </div>
                            </div>
                            <button onClick={() => handleValidateSalary(salaryProposals)} style={{ background: '#8b5cf6', color: 'white', border: 'none', borderRadius: '10px', padding: '8px 16px', fontSize: '12px', fontWeight: '900', cursor: 'pointer' }}>
                                Tout Valider ({formatMoney(salaryProposals.reduce((acc, s) => acc + s.amount, 0))})
                            </button>
                        </div>
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                            {salaryProposals.map((s, idx) => (
                                <div key={idx} style={{ background: 'white', border: '1px solid rgba(139, 92, 246, 0.15)', borderRadius: '14px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-main)' }}>{s.name}</div>
                                        <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{s.project}</div>
                                    </div>
                                    <div style={{ fontSize: '13px', fontWeight: '900', color: '#8b5cf6' }}>{formatMoney(s.amount)}</div>
                                    <button onClick={() => handleValidateSalary([s])} style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', border: 'none', borderRadius: '6px', padding: '4px 8px', fontSize: '10px', fontWeight: '900', cursor: 'pointer' }}>Valider</button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'TVA' && (
                    <div style={{ background: 'rgba(56, 189, 248, 0.05)', padding: '16px', borderRadius: '12px', marginBottom: '20px', border: '1px solid rgba(56, 189, 248, 0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div style={{ fontSize: '12px', fontWeight: '700', color: '#0284c7', textTransform: 'uppercase' }}>Total TVA (Achats) Enregistrée</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Montant global récupérable</div>
                        </div>
                        <div style={{ fontSize: '24px', fontWeight: '900', color: '#0284c7' }}>{formatMoney(totalTVA)}</div>
                    </div>
                )}

                <div style={{ overflowX: 'auto' }}>
                    {activeTab !== 'TVA' ? (
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                    <th style={{ textAlign: 'left', padding: '6px 4px', fontSize: '9px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Date</th>
                                    <th style={{ textAlign: 'left', padding: '6px 4px', fontSize: '9px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>N° Fact</th>
                                    <th style={{ textAlign: 'left', padding: '6px 4px', fontSize: '9px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Désignation</th>
                                    <th style={{ textAlign: 'left', padding: '6px 4px', fontSize: '9px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Mois (Svc)</th>
                                    <th style={{ textAlign: 'left', padding: '6px 4px', fontSize: '9px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Banque</th>
                                    <th style={{ textAlign: 'left', padding: '6px 4px', fontSize: '9px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Catégorie</th>
                                    <th style={{ textAlign: 'right', padding: '6px 4px', fontSize: '9px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Montant</th>
                                    <th style={{ textAlign: 'center', padding: '6px 4px', fontSize: '9px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTransactions.map((t) => (
                                    <tr key={t.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s', background: t.isAuto ? 'var(--bg-main)' : 'white' }} className="table-row-hover">
                                        <td style={{ padding: '8px 4px', fontSize: '11px', color: 'var(--text-muted)', fontWeight: '500' }}>{new Date(t.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}</td>
                                        <td style={{ padding: '8px 4px', fontSize: '10px', fontWeight: '800', color: 'var(--text-main)' }}>{t.originalId ? <span style={{ background: 'rgba(255, 193, 5, 0.1)', padding: '2px 4px', borderRadius: '4px' }}>{t.originalId === 'non déclarée' ? 'ND' : t.originalId}</span> : '-'}</td>
                                        <td style={{ padding: '8px 4px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <div style={{ fontWeight: '700', color: 'var(--text-main)', fontSize: '11px' }}>{t.desc}</div>
                                                {t.isDraft && <span style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#d97706', padding: '1px 4px', borderRadius: '4px', fontSize: '8px', fontWeight: '800' }}>BROUILLON</span>}
                                                {t.isAuto && <span style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '1px 4px', borderRadius: '4px', fontSize: '8px', fontWeight: '800' }}>AUTO</span>}
                                            </div>
                                        </td>
                                        <td style={{ padding: '8px 4px', fontSize: '10px', fontWeight: '700', color: 'var(--text-secondary)' }}>{t.serviceMonth ? new Date(t.serviceMonth + '-01').toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }) : '-'}</td>
                                        <td style={{ padding: '8px 4px' }}><span style={{ padding: '2px 4px', borderRadius: '4px', fontSize: '9px', fontWeight: '800', background: t.bank === 'BIAT' ? 'rgba(59, 130, 246, 0.1)' : t.bank === 'QNB' ? 'rgba(220, 38, 38, 0.1)' : 'rgba(16, 185, 129, 0.1)', color: t.bank === 'BIAT' ? '#3b82f6' : t.bank === 'QNB' ? '#dc2626' : '#10b981' }}>{t.bank}</span></td>
                                        <td style={{ padding: '8px 4px', fontSize: '10px', fontWeight: '700', color: 'var(--text-secondary)' }}>{t.category}</td>
                                        <td style={{ padding: '8px 4px', textAlign: 'right', fontWeight: '800', fontSize: '12px', color: t.type === 'Credit' ? '#10b981' : '#ef4444' }}>{t.type === 'Debit' ? '-' : '+'}{formatMoney(t.amount)}</td>
                                        <td style={{ padding: '8px 4px', textAlign: 'center' }}>
                                            <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                                                {t.isDraft ? (
                                                    <button onClick={() => handleValidateDraft(t)} style={{ background: '#d97706', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '800', cursor: 'pointer' }}>Valider</button>
                                                ) : (
                                                    <>
                                                        {!t.isAuto && <button onClick={() => handleEdit(t)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><MoreHorizontal size={14} /></button>}
                                                        <button onClick={() => t.isAuto ? (window.confirm("Ignorer définitivement ?") && toggleIgnore(t)) : handleDelete(t.id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', opacity: 0.6 }}><Trash2 size={14} /></button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                    <th style={{ textAlign: 'left', padding: '6px 4px', fontSize: '9px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Date Facture</th>
                                    <th style={{ textAlign: 'left', padding: '6px 4px', fontSize: '9px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Fournisseur / Désignation</th>
                                    <th style={{ textAlign: 'right', padding: '6px 4px', fontSize: '9px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Montant TVA</th>
                                    <th style={{ textAlign: 'center', padding: '6px 4px', fontSize: '9px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTVA.length === 0 ? (
                                    <tr><td colSpan="4" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Aucune TVA enregistrée.</td></tr>
                                ) : (
                                    filteredTVA.map((t) => (
                                        <tr key={t.id} style={{ borderBottom: '1px solid var(--border-color)', background: 'white' }}>
                                            <td style={{ padding: '12px 8px', fontSize: '12px' }}>{new Date(t.date).toLocaleDateString('fr-FR')}</td>
                                            <td style={{ padding: '12px 8px' }}>
                                                <div style={{ fontWeight: '700', fontSize: '13px' }}>{t.fournisseur}</div>
                                                {t.desc && <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{t.desc}</div>}
                                            </td>
                                            <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: '800', fontSize: '14px', color: '#0284c7' }}>{formatMoney(t.amount)}</td>
                                            <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                                                <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                                                    <button onClick={() => handleEditTVA(t)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><MoreHorizontal size={14} /></button>
                                                    <button onClick={() => handleDeleteTVA(t.id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', opacity: 0.5 }}><Trash2 size={14} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    )}
                </div>


            {/* HISTORY / IGNORED TRANSACTIONS SECTION */}
            <div style={{ marginTop: '40px', marginBottom: '60px' }}>
                <button 
                    onClick={() => setShowHistory(!showHistory)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: 'transparent',
                        border: '1px solid var(--border-color)',
                        padding: '10px 20px',
                        borderRadius: '12px',
                        color: 'var(--text-muted)',
                        fontSize: '13px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        margin: '0 auto'
                    }}
                >
                    {showHistory ? <EyeOff size={16} /> : <Trash2 size={16} />}
                    {showHistory ? 'Masquer l\'historique des suppressions' : `Voir l'historique des transactions masquées (${ignoredTxs.length})`}
                </button>

                {showHistory && (
                    <div className="card" style={{ marginTop: '24px', padding: '24px', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>Dernières Transactions Ignorées / Masquées</h3>
                            {ignoredTxs.length > 0 && (
                                <button 
                                    onClick={() => {
                                        if (window.confirm("Vider définitivement l'historique des suppressions ?")) {
                                            setIgnoredTxs([]);
                                        }
                                    }}
                                    style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}
                                >
                                    Tout effacer
                                </button>
                            )}
                        </div>

                        {ignoredTxs.length === 0 ? (
                            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                                Aucun historique de suppression.
                            </div>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                            <th style={{ textAlign: 'left', padding: '8px', fontSize: '9px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Date</th>
                                            <th style={{ textAlign: 'left', padding: '8px', fontSize: '9px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Désignation</th>
                                            <th style={{ textAlign: 'left', padding: '8px', fontSize: '9px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Type</th>
                                            <th style={{ textAlign: 'right', padding: '8px', fontSize: '9px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Montant</th>
                                            <th style={{ textAlign: 'center', padding: '8px', fontSize: '9px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {[...ignoredTxs].sort((a,b) => new Date(b.date) - new Date(a.date)).map(t => (
                                            <tr key={t.id} style={{ borderBottom: '1px solid var(--border-color)', opacity: 0.7 }}>
                                                <td style={{ padding: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>{t.date}</td>
                                                <td style={{ padding: '8px', fontSize: '11px', fontWeight: '700', color: 'var(--text-main)' }}>{t.desc}</td>
                                                <td style={{ padding: '8px', fontSize: '9px', fontWeight: '800', color: t.isAuto ? '#10b981' : '#3b82f6', textTransform: 'uppercase' }}>
                                                    {t.isAuto ? 'Automatique' : 'Manuelle'}
                                                </td>
                                                <td style={{ padding: '8px', textAlign: 'right', fontSize: '11px', fontWeight: '800', color: 'var(--text-main)' }}>{formatMoney(t.amount)}</td>
                                                <td style={{ padding: '8px', textAlign: 'center' }}>
                                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                        <button 
                                                            onClick={() => toggleIgnore(t)}
                                                            style={{ background: '#10b981', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '700', cursor: 'pointer' }}
                                                            title="Restaurer vers le tableau principal"
                                                        >
                                                            Restaurer
                                                        </button>
                                                        <button 
                                                            onClick={() => {
                                                                if (window.confirm("Supprimer définitivement cet enregistrement de l'historique ?")) {
                                                                    setIgnoredTxs(ignoredTxs.filter(item => item.id !== t.id));
                                                                    // If manual, also purge from manualTransactions just in case it was still there
                                                                    if (!t.isAuto) {
                                                                        setManualTransactions(manualTransactions.filter(item => item.id !== t.id));
                                                                    }
                                                                }
                                                            }}
                                                            style={{ background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', padding: '3px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '700', cursor: 'pointer' }}
                                                        >
                                                            Purger
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                    </div>
                )}

                {isModalOpen && (
                    <TransactionModal
                        isOpen={isModalOpen}
                        onClose={() => setIsModalOpen(false)}
                        onSave={handleSave}
                        transaction={editingTransaction}
                        activeTab={activeTab}
                    />
                )}

                {isTVAModalOpen && (
                    <TVAModal
                        isOpen={isTVAModalOpen}
                        onClose={() => setIsTVAModalOpen(false)}
                        onSave={handleSaveTVA}
                        tva={editingTVA}
                    />
                )}
            </div>
        </div>
    );
};

const TransactionModal = ({ isOpen, onClose, onSave, transaction, activeTab }) => {
    const getModalContext = () => {
        if (activeTab === 'Entrées') return { title: 'Nouvelle Entrée Cash', color: '#10b981', icon: <ArrowDownLeft size={20} />, defaultType: 'Credit' };
        if (activeTab === 'Charges Perso') return { title: 'Dépense Personnelle', color: '#f59e0b', icon: <ArrowUpRight size={20} />, defaultType: 'Debit' };
        return { title: 'Charge Mynds Team', color: '#ef4444', icon: <ArrowUpRight size={20} />, defaultType: 'Debit' };
    };

    const context = getModalContext();

    const [formData, setFormData] = useState(transaction || {
        date: new Date().toISOString().split('T')[0],
        desc: '',
        bank: activeTab === 'Charges Perso' ? 'QNB' : 'BIAT',
        type: context.defaultType,
        amount: 0,
        category: activeTab === 'Charges Perso' ? 'Perso' : (activeTab === 'Charges Mynds' ? 'Mynds Logistique' : 'Autre'),
        chargeType: 'Exploitations',
        chargeNature: 'Variables',
        serviceMonth: new Date().toISOString().substring(0, 7),
        paymentDate: new Date().toISOString().split('T')[0],
        persoCategory: 'Autre',
        isRecurrent: false
    });

    // 3. Category & Bank Logic
    const myndsCategories = [
        'Mynds Logistique', 'Mynds Loyer Bureau', 'Mynds Technique', 'Mynds Banque', 
        'Mynds Internet', 'Mynds Logiciels', 'Mynds Fournitures', 'Mynds Charges sociales', 
        'Mynds Formation', 'Mynds Evenement', 'Mynds Comptable', 'Mynds Paperasse', 'Mynds Prime', 'Charges'
    ];

    let availableCategories = [];
    if (activeTab === 'Entrées') {
        availableCategories = ['Autre', 'Facture'];
    } else if (activeTab === 'Charges Perso') {
        availableCategories = ['Perso'];
    } else {
        availableCategories = myndsCategories;
    }

    if (transaction && !availableCategories.includes(transaction.category)) {
        availableCategories.push(transaction.category);
    }

    const getAllowedBanks = (cat) => {
        if (cat === 'Perso') return ['QNB', 'Espèces'];
        return ['BIAT', 'QNB', 'Espèces']; 
    };

    const allowedBanks = getAllowedBanks(formData.category);

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(10px)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }} onClick={onClose}>
            <div className="card" style={{ width: '100%', maxWidth: '440px', padding: 0, position: 'relative', background: 'white', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }} onClick={e => e.stopPropagation()}>
                
                {/* Header Contextuel */}
                <div style={{ padding: '20px 24px', background: `${context.color}10`, borderBottom: `1px dashed ${context.color}30`, display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ background: context.color, color: 'white', padding: '8px', borderRadius: '12px', display: 'flex' }}>
                        {context.icon}
                    </div>
                    <div>
                        <h2 style={{ fontSize: '16px', fontWeight: '900', color: 'var(--text-main)', margin: 0 }}>{transaction ? 'Modifier' : context.title}</h2>
                        <div style={{ fontSize: '10px', fontWeight: '700', color: context.color, textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '2px' }}>
                            {activeTab.replace('Charges ', '')} Dashboard Context
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    
                    {/* Section 1: Coeur de la transaction */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <label style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', marginLeft: '4px' }}>Date Valeur</label>
                            <input type="date" required value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} style={{ padding: '10px', borderRadius: '12px', border: '1px solid var(--border-color)', fontSize: '13px', fontWeight: '600', outline: 'none', transition: 'border-color 0.2s' }} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <label style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', marginLeft: '4px' }}>Catégorie</label>
                            <select value={formData.category} onChange={e => {
                                const newCat = e.target.value;
                                const newBanks = getAllowedBanks(newCat);
                                setFormData(prev => ({
                                    ...prev,
                                    category: newCat,
                                    bank: newBanks.includes(prev.bank) ? prev.bank : newBanks[0]
                                }));
                            }} style={{ padding: '10px', borderRadius: '12px', border: '1px solid var(--border-color)', fontSize: '13px', fontWeight: '600', outline: 'none' }}>
                                {availableCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                            </select>
                        </div>
                    </div>

                    {(formData.category === 'Facture' || formData.originalId) && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <label style={{ fontSize: '10px', fontWeight: '800', color: 'var(--accent-gold)', textTransform: 'uppercase', marginLeft: '4px' }}>N° Facture Liée</label>
                            <input 
                                type="text" 
                                placeholder="Ex: N01-2026-001" 
                                value={formData.originalId || ''} 
                                onChange={e => setFormData({ ...formData, originalId: e.target.value })} 
                                style={{ padding: '10px', borderRadius: '12px', border: '1px solid var(--accent-gold)', background: 'rgba(255, 193, 5, 0.02)', fontSize: '13px', fontWeight: '800', outline: 'none' }} 
                            />
                        </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', marginLeft: '4px' }}>Désignation / Note</label>
                        <input type="text" required placeholder="Ex: Paiement Loyer Mars, Facture Internet..." value={formData.desc} onChange={e => setFormData({ ...formData, desc: e.target.value })} style={{ padding: '10px', borderRadius: '12px', border: '1px solid var(--border-color)', fontSize: '13px', fontWeight: '600', outline: 'none' }} />
                    </div>

                    {/* Section 2: Contexte Financier Pro ou Perso */}
                    {activeTab === 'Charges Mynds' && (
                        <div style={{ padding: '14px', background: 'var(--bg-main)', borderRadius: '16px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <label style={{ fontSize: '9px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Type de Charge</label>
                                    <select value={formData.chargeType} onChange={e => setFormData({ ...formData, chargeType: e.target.value })} style={{ padding: '8px', borderRadius: '10px', border: '1px solid var(--border-color)', fontSize: '12px', fontWeight: '600' }}>
                                        <option value="Exploitations">Exploitations</option>
                                        <option value="RH">RH / Salaires</option>
                                    </select>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <label style={{ fontSize: '9px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Nature</label>
                                    <select value={formData.chargeNature} onChange={e => setFormData({ ...formData, chargeNature: e.target.value })} style={{ padding: '8px', borderRadius: '10px', border: '1px solid var(--border-color)', fontSize: '12px', fontWeight: '600' }}>
                                        <option value="Variables">Variables</option>
                                        <option value="Fixes">Fixes</option>
                                        <option value="Investissements">Investissements</option>
                                    </select>
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <label style={{ fontSize: '9px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Mois de Service</label>
                                    <input type="month" required value={formData.serviceMonth} onChange={e => setFormData({ ...formData, serviceMonth: e.target.value })} style={{ padding: '8px', borderRadius: '10px', border: '1px solid var(--border-color)', fontSize: '12px', fontWeight: '600' }} />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <label style={{ fontSize: '9px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Date Paym.</label>
                                    <input type="date" required value={formData.paymentDate} onChange={e => setFormData({ ...formData, paymentDate: e.target.value })} style={{ padding: '8px', borderRadius: '10px', border: '1px solid var(--border-color)', fontSize: '12px', fontWeight: '600' }} />
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'Charges Perso' && (
                        <div style={{ padding: '14px', background: `${context.color}08`, borderRadius: '16px', border: `1px solid ${context.color}30`, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <label style={{ fontSize: '9px', fontWeight: '800', color: context.color, textTransform: 'uppercase' }}>Sous-Catégorie Personnelle</label>
                                <select value={formData.persoCategory} onChange={e => setFormData({ ...formData, persoCategory: e.target.value })} style={{ padding: '10px', borderRadius: '12px', border: `1px solid ${context.color}30`, fontSize: '13px', fontWeight: '600', outline: 'none' }}>
                                    {PERSO_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                </select>
                            </div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: '700', color: 'var(--text-main)', padding: '4px' }}>
                                <input 
                                    type="checkbox" 
                                    checked={formData.isRecurrent} 
                                    onChange={e => setFormData({ ...formData, isRecurrent: e.target.checked })}
                                    style={{ width: '18px', height: '18px', accentColor: context.color }}
                                />
                                Définir comme dépense récurrente
                            </label>
                        </div>
                    )}

                    {/* Section 3: Infos Financières Finales */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '12px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <label style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', marginLeft: '4px' }}>Compte Bancaire</label>
                            <select value={formData.bank} onChange={e => setFormData({ ...formData, bank: e.target.value })} style={{ padding: '10px', borderRadius: '12px', border: '1px solid var(--border-color)', fontSize: '13px', fontWeight: '800', outline: 'none' }}>
                                {allowedBanks.map(b => <option key={b} value={b}>{b}</option>)}
                            </select>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <label style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', marginLeft: '4px' }}>Montant Net (TND)</label>
                            <div style={{ position: 'relative' }}>
                                <input 
                                    type="number" 
                                    step="0.001" 
                                    required 
                                    autoFocus
                                    value={formData.amount || ''} 
                                    onChange={e => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })} 
                                    style={{ width: '100%', padding: '10px 12px', borderRadius: '12px', border: `2px solid ${context.color}40`, fontSize: '16px', fontWeight: '900', textAlign: 'right', outline: 'none', background: `${context.color}05` }} 
                                />
                                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '10px', fontWeight: '900', color: context.color }}>TND</span>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                        <label style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', marginLeft: '4px' }}>Sens de l'opération</label>
                        <div style={{ display: 'flex', gap: '8px', background: 'var(--bg-main)', padding: '6px', borderRadius: '14px', border: '1px solid var(--border-color)' }}>
                            <button 
                                type="button" 
                                onClick={() => setFormData({ ...formData, type: 'Credit' })} 
                                style={{ flex: 1, padding: '8px', borderRadius: '10px', border: 'none', background: formData.type === 'Credit' ? '#10b981' : 'transparent', color: formData.type === 'Credit' ? 'white' : 'var(--text-muted)', fontSize: '11px', fontWeight: '800', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                            >
                                <ArrowDownLeft size={14} /> ENTRÉE (+)
                            </button>
                            <button 
                                type="button" 
                                onClick={() => setFormData({ ...formData, type: 'Debit' })} 
                                style={{ flex: 1, padding: '8px', borderRadius: '10px', border: 'none', background: formData.type === 'Debit' ? 'var(--text-main)' : 'transparent', color: formData.type === 'Debit' ? 'white' : 'var(--text-muted)', fontSize: '11px', fontWeight: '800', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                            >
                                <ArrowUpRight size={14} /> SORTIE (-)
                            </button>
                        </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                        <button type="button" onClick={onClose} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-muted)', fontWeight: '800', cursor: 'pointer', fontSize: '14px', transition: 'all 0.2s' }}>Annuler</button>
                        <button type="submit" style={{ flex: 1.5, padding: '12px', borderRadius: '12px', border: 'none', background: 'var(--text-main)', color: 'white', fontWeight: '900', cursor: 'pointer', fontSize: '14px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', transition: 'all 0.2s' }}>Confirmer & Sauver</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const TVAModal = ({ isOpen, onClose, onSave, tva }) => {
    const [formData, setFormData] = useState(tva || {
        date: new Date().toISOString().split('T')[0],
        fournisseur: '',
        desc: '',
        amount: 0
    });

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: 'var(--bg-color)', width: '400px', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
                <div style={{ padding: '24px', borderBottom: '1px solid var(--border-color)', background: 'var(--card-bg)' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: '800', margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#0284c7' }}>
                        <Calculator size={20} />
                        {tva ? 'Modifier la TVA (Achat)' : 'Déclarer TVA (Achat)'}
                    </h2>
                </div>

                <div style={{ padding: '24px' }}>
                    <form onSubmit={handleSubmit}>
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '6px' }}>Date</label>
                            <input
                                type="date"
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', fontSize: '14px', fontWeight: '600' }}
                                required
                            />
                        </div>

                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '6px' }}>Fournisseur</label>
                            <input
                                type="text"
                                placeholder="Nom du fournisseur. ex: STEG, Topnet..."
                                value={formData.fournisseur}
                                onChange={(e) => setFormData({ ...formData, fournisseur: e.target.value })}
                                style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', fontSize: '14px' }}
                                required
                            />
                        </div>

                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '6px' }}>Note / Désignation (Optionnel)</label>
                            <input
                                type="text"
                                placeholder="ex: Facture Internet Février"
                                value={formData.desc}
                                onChange={(e) => setFormData({ ...formData, desc: e.target.value })}
                                style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', fontSize: '14px' }}
                            />
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '6px' }}>Montant de la TVA (TND)</label>
                            <div style={{ position: 'relative' }}>
                                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontWeight: '800', color: '#0284c7' }}>DT</span>
                                <input
                                    type="number"
                                    step="0.001"
                                    min="0"
                                    value={formData.amount}
                                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                    style={{ width: '100%', padding: '12px 12px 12px 40px', borderRadius: '10px', border: '1px solid rgba(56, 189, 248, 0.3)', background: 'rgba(56, 189, 248, 0.05)', fontSize: '16px', fontWeight: '800', color: '#0284c7' }}
                                    required
                                />
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '30px' }}>
                            <button type="button" onClick={onClose} style={{ padding: '10px 20px', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'transparent', fontWeight: '600', cursor: 'pointer' }}>
                                Annuler
                            </button>
                            <button type="submit" style={{ padding: '10px 20px', borderRadius: '10px', border: 'none', background: '#0284c7', color: 'white', fontWeight: '700', cursor: 'pointer' }}>
                                Enregistrer la TVA
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default BanquePage;
