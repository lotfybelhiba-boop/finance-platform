import React, { useState, useEffect, useMemo } from 'react';
import Header from '../components/Header';
import { Search, Plus, Trash2, Filter, ArrowUpRight, ArrowDownLeft, Landmark, Wallet, MoreHorizontal, Calculator, Lock, Bot, Check, EyeOff, Calendar, Banknote, Users, FileSpreadsheet, CreditCard, ShieldCheck, RotateCcw } from 'lucide-react';
import { useData } from '../context/DataContext';
import { getStorage, setStorage } from '../services/storageService';
import { isInvoiceNonDeclare } from '../utils/billingUtils';
import { generatePendingPersoCharges, PERSO_CATEGORIES } from '../utils/persoUtils';
import ImportChargesModal from '../components/ImportChargesModal';
import BankReconciliationTab from '../components/BankReconciliationTab';

const BanquePage = () => {
    const { 
        clients, 
        factures, 
        bankTransactions: manualTransactions, 
        addBankTransaction, 
        updateBankTransaction, 
        deleteBankTransaction,
        loading 
    } = useData();

    const activeClientsList = useMemo(() => (clients || []).filter(c => c.etatClient === 'Actif'), [clients]);

    // Sponsoring loaded from local storage (remaining UI pref)
    const [sponsoringList, setSponsoringList] = useState(() => getStorage('mynds_sponsoring', []));
    
    // Company Banks loaded from config
    const [companyBanks, setCompanyBanks] = useState(() => {
        return getStorage('mynds_company_banks', [
            { id: '1', bank_name: 'BIAT', swift_bic: 'BIATTNTN', account_number: '08000000000000000000', currency: 'TND', isDefault: true, actif: true },
            { id: '2', bank_name: 'QNB', swift_bic: 'QNBTNTN', account_number: '12000000000000000000', currency: 'TND', isDefault: false, actif: true }
        ]);
    });
    const activeBanks = companyBanks.filter(b => b.actif);


    const [selectedBank, setSelectedBank] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState(null);
    const [isTVAModalOpen, setIsTVAModalOpen] = useState(false);
    const [editingTVA, setEditingTVA] = useState(null);

    const [activeTab, setActiveTab] = useState('Entrées'); // 'Entrées', 'Charges Mynds', 'Charges CT', 'Charges TVA', 'TVA', 'Rapprochement'

    // Filters for Entrées
    const [entreesMonthFilter, setEntreesMonthFilter] = useState('all');
    const [entreesClientFilter, setEntreesClientFilter] = useState('all');

    // Missing Filters for RH & Charges
    const [rhClientFilter, setRhClientFilter] = useState('all');
    const [chargeTypeFilter, setChargeTypeFilter] = useState('all');
    const [isGroupedByRH, setIsGroupedByRH] = useState(true);
    const [confirmResetId, setConfirmResetId] = useState(null);

    // Filters for Charges Mynds & RH
    const [selectedMonthFilter, setSelectedMonthFilter] = useState(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`);
    


    // Separate filters derived from selectedMonthFilter
    // Separate filters derived from selectedMonthFilter
    const [selYearStr, selMonthRaw] = selectedMonthFilter.split('-');
    const selYear = parseInt(selYearStr, 10);
    const selMonth = selMonthRaw === 'all' ? 'all' : parseInt(selMonthRaw, 10);

    const handleYearChange = (year) => {
        const parts = selectedMonthFilter.split('-');
        setSelectedMonthFilter(`${year}-${parts[1]}`);
    };
 
    const handleMonthChange = (month) => {
        const parts = selectedMonthFilter.split('-');
        setSelectedMonthFilter(`${parts[0]}-${month}`);
    };



    // TVA Transactions
    const [tvaTransactions, setTvaTransactions] = useState(() => getStorage('mynds_tva_achats', []));

    // Ignored Transactions History List
    const [ignoredTxs, setIgnoredTxs] = useState(() => getStorage('mynds_ignored_transactions', []));
    const [showHistory, setShowHistory] = useState(false);

    const handleSave = async (t) => {
        if (parseFloat(t.amount) < 0) {
            alert("❗ Opération refusée. Le montant d'une transaction ne peut pas être négatif.");
            return;
        }

        try {
            if (editingTransaction && editingTransaction.id !== undefined && !editingTransaction.isAuto) {
                await updateBankTransaction(editingTransaction.id, t);
            } else {
                await addBankTransaction(t);
            }
            setIsModalOpen(false);
            setEditingTransaction(null);
        } catch (err) {
            alert('Erreur lors de la sauvegarde : ' + err.message);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("Voulez-vous supprimer définitivement cette transaction ?")) {
            try {
                await deleteBankTransaction(id);
            } catch (err) {
                alert('Erreur lors de la suppression : ' + err.message);
            }
        }
    };

    // Compute automated transactions from paid invoices
    const autoTransactions = factures
        .filter(f => f.statut === 'Paid')
        .flatMap(f => {
            const clientObj = clients.find(c => c.id === f.clientId || c.enseigne === f.client);
            const isNonDeclare = isInvoiceNonDeclare(f, clientObj);

            // Extract the month and year from the service period start, or fallback to emission date
            const serviceDate = f.periodeDebut ? new Date(f.periodeDebut) : new Date(f.dateEmi);
            const serviceMonthFormatted = `${serviceDate.getFullYear()}-${String(serviceDate.getMonth() + 1).padStart(2, '0')}`;

            const baseTrans = {
                id: `auto-${f.id}`,
                date: f.dateEmi, // We keep date as original record date for sorting
                desc: `Facture ${f.clientName || f.client}`,
                bank: f.compteEncaissement || (isNonDeclare ? (activeBanks.find(b => b.bank_name.toLowerCase().includes('qnb'))?.bank_name || 'QNB') : (activeBanks.find(b => b.bank_name.toLowerCase().includes('biat'))?.bank_name || 'BIAT')),
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
                    bank: f.compteEncaissement || (isNonDeclare ? (activeBanks.find(b => b.bank_name.toLowerCase().includes('qnb'))?.bank_name || 'QNB') : (activeBanks.find(b => b.bank_name.toLowerCase().includes('biat'))?.bank_name || 'BIAT')),
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

    // Use the parsed year/month from above for contract validation (used for Sponsoring)
    const targetY = selYear;
    const targetM = selMonth === 'all' ? 0 : selMonth - 1; // Default to Jan if annual, or use actual month

    const isMonthInContract = (client, ty, tm) => {
        if (!client) return false;
        const targetDateObj = new Date(ty, tm, 1);
        const start = client.dateDebut && client.dateDebut !== '-' ? new Date(client.dateDebut) : new Date(2000, 0, 1);

        let end;
        if (client.regime === 'One-Shot') {
            end = new Date(start.getFullYear(), start.getMonth(), start.getDate());
        } else if (client.dateFin) {
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
                bank: 'Carte Technologique',
                type: 'Debit',
                amount: parseFloat(s.montantTNDBanque) || 0,
                category: 'Sponsoring',
                chargeType: 'Exploitations',
                chargeNature: 'Variables',
                isAuto: true,
                originalId: s.id,
                serviceMonth: selectedMonthFilter,
                paymentDate: `${selectedMonthFilter}-10`
            });
        }
    });

    // 1. Combine manual, auto invoices, auto sponsoring
    // Logic: Deduplicate autoTransactions if a manual one exists with same amount/client in the same month
    const allTransactions = useMemo(() => {
        const deduplicatedAuto = autoTransactions.filter(auto => {
            const isMatch = manualTransactions.some(man => {
                const sameMonth = (man.date || '').substring(0, 7) === (auto.date || '').substring(0, 7);
                const manAmt = parseFloat(man.amount) || 0;
                const autoAmt = parseFloat(auto.amount) || 0;
                
                // Allow a 1% margin for bank fees/commission in manual transactions
                const sameAmount = Math.abs(manAmt - autoAmt) < (autoAmt * 0.01 + 1); 
                
                const manDesc = (man.desc || '').toLowerCase();
                const autoDesc = (auto.desc || '').toLowerCase();
                const clientName = autoDesc.replace('facture', '').trim();
                
                // CRITICAL: Ensure manual injections/transfers are NOT mistaken for invoice duplicates
                const isInvoiceRelated = manDesc.includes('facture') || man.category === 'Facture';
                const matchesClient = clientName && manDesc.includes(clientName);
                
                return sameMonth && sameAmount && matchesClient && isInvoiceRelated;
            });
            return !isMatch;
        });

        return [...manualTransactions, ...deduplicatedAuto, ...autoSponsoring].map(t => ({
            ...t,
            isIgnored: ignoredTxs.some(ignored => ignored.id === t.id)
        }));
    }, [manualTransactions, autoTransactions, autoSponsoring, ignoredTxs]);

    // Extract unique RH names/roles dynamically from both clients (database) and actual transactions
    const baseEmployees = [];
    clients.forEach(client => {
        if (client.projectCosts) {
            client.projectCosts.forEach(cost => {
                const nom = cost.nom ? cost.nom.trim() : '';
                if (nom && nom !== 'Inconnu') {
                    baseEmployees.push(nom);
                }
            });
        }
    });

    const uniqueRHNames = Array.from(new Set([
        ...baseEmployees,
        ...allTransactions
            .filter(t => t.chargeType === 'RH' || t.category === 'Mynds Salaire' || (t.desc || '').toLowerCase().includes('salaire'))
            .map(t => {
                if (t.desc && t.desc.startsWith('Salaire ')) {
                    const parts = t.desc.split('-');
                    if (parts.length > 0) {
                        // Extract name, remove "Salaire", and remove project info in parentheses if present
                        return parts[0].replace('Salaire', '').split('(')[0].trim();
                    }
                }
                return null;
            })
            .filter(Boolean)
    ])).sort();

    const uniqueEntreesClients = Array.from(new Set(
        allTransactions
            .filter(t => t.type === 'Credit' && t.isAuto)
            .map(t => t.desc.replace('Facture ', '').trim())
    )).sort();

    const formatMoney = (amount) => {
        if (amount === undefined || amount === null) return '0 DT';
        const formatted = new Intl.NumberFormat('fr-FR', {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1
        }).format(amount);
        return `${formatted} DT`;
    };

    const formatNumber = (num) => {
        return new Intl.NumberFormat('fr-FR', {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1
        }).format(num);
    };

    const handleImportSave = async (importedTransactions) => {
        try {
            for (const t of importedTransactions) {
                await addBankTransaction(t);
            }
            setIsImportModalOpen(false);
            alert(`${importedTransactions.length} transaction(s) importée(s) avec succès !`);
        } catch (err) {
            alert('Erreur lors de l\'import : ' + err.message);
        }
    };

    const handleEdit = (t) => {
        if (t.isAuto) return; 
        setEditingTransaction(t);
        setIsModalOpen(true);
    };

    const toggleIgnore = async (t) => {
        try {
            await updateBankTransaction(t.id, { ...t, isIgnored: !t.isIgnored });
        } catch (err) {
            alert('Erreur lors du toggle ignore : ' + err.message);
        }
    };

    const handleValidateDraft = (t) => {
        setEditingTransaction({
            ...t,
            isDraft: false, 
            statut: 'Payé' 
        });
        setIsModalOpen(true);
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
    const [year, monthStr] = selectedMonthFilter.split('-').map(n => n);
    const yearInt = parseInt(year, 10);
    const isAnnualView = monthStr === 'all';
    
    const currentMonthStr = selectedMonthFilter;
    const currentMonthName = !isAnnualView ? new Date(yearInt, parseInt(monthStr, 10) - 1).toLocaleDateString('fr-FR', { month: 'long' }) : 'Année';

    const sMonthStr = `${parseInt(monthStr, 10) === 1 ? yearInt - 1 : yearInt}-${String(parseInt(monthStr, 10) === 1 ? 12 : parseInt(monthStr, 10) - 1).padStart(2, '0')}`;
    
    const rhPaymentsCurrentMonth = allTransactions.filter(t =>
        (t.chargeType === 'RH' || t.chargeType === 'Ressources Humaines' || t.category === 'RH') &&
        t.type === 'Debit' &&
        t.serviceMonth === sMonthStr
    );

    const salaryProposals = [];
    const sMonth = parseInt(monthStr, 10) === 1 ? 12 : parseInt(monthStr, 10) - 1;
    const sYear = parseInt(monthStr, 10) === 1 ? yearInt - 1 : yearInt;
    const sMonthName = new Date(sYear, sMonth - 1).toLocaleDateString('fr-FR', { month: 'long' });

    // Mutable pools to handle multiple entries for same person/project
    let availableRHPayments = [...rhPaymentsCurrentMonth];
    let availableIgnoredTxs = [...ignoredTxs];

    clients.filter(c => c.etatClient === 'Actif' && !isAnnualView && isMonthInContract(c, sYear, sMonth - 1)).forEach(client => {
        if (rhClientFilter !== 'all' && client.enseigne !== rhClientFilter) return;

        if (client.projectCosts) {
            client.projectCosts.forEach(cost => {
                const amount = parseFloat(cost.montant) || 0;
                if (amount > 0) {
                    // Check if this cost was active during the SERVICE month (M-1)
                    const targetStart = `${sYear}-${String(sMonth).padStart(2, '0')}-01`;
                    const lastDay = new Date(sYear, sMonth, 0).getDate();
                    const targetEnd = `${sYear}-${String(sMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
                    
                    const cStart = (cost.dateDebut || '1970-01-01').split('T')[0];
                    const cEnd = (cost.dateFin || '2099-12-31').split('T')[0];

                    const serviceMonthKey = `${sYear}-${String(sMonth).padStart(2, '0')}`;
                    let isActiveThisMonth = false;

                    if (cost.recurrence === 'Ponctuel') {
                        isActiveThisMonth = cStart.substring(0, 7) === serviceMonthKey;
                    } else {
                        isActiveThisMonth = (cStart <= targetEnd) && (cEnd >= targetStart);
                    }

                    if (!isActiveThisMonth) return;

                    // Match logic: Priority to same amount, then any match for Name+Project
                    const findMatch = (pool, targetCost, targetClient, targetAmount) => {
                        const nameLower = (targetCost.nom || '').toLowerCase().trim();
                        const projectLower = (targetClient.enseigne || '').toLowerCase().trim();
                        
                        // Strict name regex: matches name as a whole word or with specific separators
                        const nameRegex = new RegExp(`(^|\\s|\\(|\\-)${nameLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\s|\\)|\\-|$)`, 'i');

                        // 1. Priority Match: Name + Project + Amount
                        let idx = pool.findIndex(p => {
                            if (p.isIgnored) return false;
                            const descLower = (p.desc || '').toLowerCase();
                            const matchesName = nameRegex.test(descLower);
                            const matchesProject = projectLower && descLower.includes(projectLower);
                            const matchesAmount = Math.abs((parseFloat(p.amount) || 0) - targetAmount) < 0.01;
                            return matchesName && matchesProject && matchesAmount;
                        });

                        // 2. Fallback Match: Name + Project (any amount)
                        if (idx === -1) {
                            idx = pool.findIndex(p => {
                                if (p.isIgnored) return false;
                                const descLower = (p.desc || '').toLowerCase();
                                const matchesName = nameRegex.test(descLower);
                                const matchesProject = projectLower && descLower.includes(projectLower);
                                return matchesName && matchesProject;
                            });
                        }
                        return idx;
                    };

                    const txIdx = findMatch(availableRHPayments, cost, client, amount);
                    const activePayment = txIdx !== -1 ? availableRHPayments[txIdx] : null;
                    if (activePayment) availableRHPayments.splice(txIdx, 1);

                    const archIdx = findMatch(availableIgnoredTxs.filter(p => p.serviceMonth === `${sYear}-${String(sMonth).padStart(2, '0')}`), cost, client, amount);
                    const archivedPayment = archIdx !== -1 ? availableIgnoredTxs[archIdx] : null;
                    // Note: simplified splice for archived if needed, but archive check is mostly to hide
                    if (archivedPayment) {
                         const actualIdx = availableIgnoredTxs.findIndex(p => p.id === archivedPayment.id);
                         if (actualIdx !== -1) availableIgnoredTxs.splice(actualIdx, 1);
                    }

                    // If it's already archived/ignored, don't show it in the propositions table at all
                    if (archivedPayment) return;

                    const isPaid = !!activePayment;

                    let filterMatches = true;
                    if (chargeTypeFilter !== 'all' && chargeTypeFilter.startsWith('RH-')) {
                        const specificName = chargeTypeFilter.replace('RH-', '').toLowerCase();
                        if (!cost.nom || !cost.nom.toLowerCase().includes(specificName)) {
                            filterMatches = false;
                        }
                    }

                    if (filterMatches) {
                        salaryProposals.push({
                            name: cost.nom || 'Inconnu',
                            project: client.enseigne,
                            amount: amount,
                            isPaid: isPaid,
                            transaction: activePayment ? activePayment : null,
                            serviceMonthName: sMonthName,
                            serviceYear: sYear,
                            serviceMonthStr: `${sYear}-${String(sMonth).padStart(2, '0')}`
                        });
                    }
                }
            });
        }
    });

    // Grouping Logic for "Propositions de Salaires"
    const finalSalaryProposals = React.useMemo(() => {
        if (!isGroupedByRH) return salaryProposals;
        const grouped = salaryProposals.reduce((acc, curr) => {
            const key = curr.name;
            if (!acc[key]) {
                acc[key] = { ...curr };
            } else {
                if (!acc[key].project.includes(curr.project)) {
                    acc[key].project += `, ${curr.project}`;
                }
                acc[key].amount += curr.amount;
            }
            return acc;
        }, {});
        return Object.values(grouped);
    }, [salaryProposals, isGroupedByRH]);

    const handleValidateSalary = (items) => {
        const getExactPaymentDate = (serviceMonthStr) => {
            const [sYear, sMonth] = serviceMonthStr.split('-').map(Number);
            // sMonth is 1-12. Passing sMonth directly as the month index (0-11) targets the NEXT month.
            let d = new Date(sYear, sMonth, 5); 
            if (d.getDay() === 0) d.setDate(6); // If Sunday, push to Monday 6th
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        };

        // Individual validation passes through the sleek TransactionModal
        if (items.length === 1) {
            const item = items[0];
            const exactDate = getExactPaymentDate(item.serviceMonthStr);
            setEditingTransaction({
                date: exactDate, // Value date is the exact payment date
                desc: `Salaire ${item.name} (${item.project}) - ${item.serviceMonthName} ${item.serviceYear}`,
                bank: 'BIAT',
                type: 'Debit',
                amount: item.amount,
                category: 'Charges',
                chargeType: 'RH',
                chargeNature: 'Fixes',
                serviceMonth: item.serviceMonthStr,
                paymentDate: exactDate, // Payment date is the exact payment date
                isAuto: false
            });
            setIsModalOpen(true);
            return;
        }

        // Bulk validation case
        const confirmMsg = `Valider le paiement de ${items.length} salaires d'un coup ?\n(Date de valeur: 5 du mois suivant)`;
        if (!window.confirm(confirmMsg)) return;

        let chosenBank = window.prompt("Source de paiement globale pour ces salaires ?\n(Ex: BIAT, QNB, Espèces, Capital Personnel)", "BIAT");
        if (!chosenBank) return;

        const newTxs = [...manualTransactions];
        items.forEach((item, idx) => {
            const exactDate = getExactPaymentDate(item.serviceMonthStr);
            newTxs.push({
                id: Date.now() + idx + Math.floor(Math.random() * 1000),
                date: exactDate,
                desc: `Salaire ${item.name} (${item.project}) - ${item.serviceMonthName} ${item.serviceYear}`,
                bank: chosenBank,
                type: 'Debit',
                amount: item.amount,
                category: 'Charges',
                chargeType: 'RH',
                chargeNature: 'Fixes',
                serviceMonth: item.serviceMonthStr,
                paymentDate: exactDate,
                isAuto: false
            });
        });

        setManualTransactions(newTxs);
        saveBankTransactions(newTxs);
        
        window.dispatchEvent(new Event('storage'));
        window.dispatchEvent(new CustomEvent('mynds_data_updated'));
        
        alert("Salaires validés en lot avec la date de valeur (le 5).");
    };

    const tvaVentesProposals = React.useMemo(() => {
        if (activeTab !== 'Charges TVA') return [];
        const proposals = [];
        factures.forEach(f => {
            if (f.tva > 0 && f.statut !== 'Archived' && f.statut !== 'Draft') {
                const alreadyPaid = manualTransactions.some(t => t.category === 'TVA Ventes' && t.originalId === f.id);
                const isIgnored = ignoredTxs.some(t => t.category === 'TVA Ventes' && t.originalId === f.id);
                if (!alreadyPaid && !isIgnored) {
                    proposals.push({
                        id: f.id,
                        client: f.clientName || f.client,
                        date: f.dateEmi,
                        amount: f.tva,
                        statut: f.statut,
                        originalId: f.id,
                        isPaid: false
                    });
                }
            }
        });
        return proposals.sort((a,b) => new Date(b.date) - new Date(a.date));
    }, [activeTab, factures, manualTransactions, ignoredTxs]);

    const handleValidateTVA = (items) => {
        if (items.length === 1) {
            const item = items[0];
            setEditingTransaction({
                date: new Date().toISOString().split('T')[0],
                desc: `Paiement TVA - Facture ${item.id} (${item.client})`,
                bank: 'BIAT',
                type: 'Debit',
                amount: item.amount,
                category: 'TVA Ventes',
                chargeType: 'Exploitations',
                chargeNature: 'Variables',
                isAuto: false,
                originalId: item.originalId
            });
            setIsModalOpen(true);
            return;
        }

        const confirmMsg = `Valider le paiement de TVA pour ${items.length} factures d'un coup ?`;
        if (!window.confirm(confirmMsg)) return;

        let chosenBank = window.prompt("Source de paiement globale pour ces montants de TVA ?\n(Ex: BIAT, QNB, Espèces)", "BIAT");
        if (!chosenBank) return;

        const newTxs = [...manualTransactions];
        items.forEach((item, idx) => {
            newTxs.push({
                id: Date.now() + idx + Math.floor(Math.random() * 1000),
                date: new Date().toISOString().split('T')[0],
                desc: `Paiement TVA - Facture ${item.id} (${item.client})`,
                bank: chosenBank,
                type: 'Debit',
                amount: item.amount,
                category: 'TVA Ventes',
                chargeType: 'Exploitations',
                chargeNature: 'Variables',
                isAuto: false,
                originalId: item.originalId
            });
        });

        setManualTransactions(newTxs);
        saveBankTransactions(newTxs);
        alert("Paiements TVA validés en lot.");
    };

    // --- UTILS ---
    const safeParseFloat = (val) => {
        if (val === undefined || val === null || val === '') return 0;
        if (typeof val === 'number') return val;
        // Remove spaces and replace comma with dot
        const sanitized = String(val).replace(/\s/g, '').replace(',', '.');
        return parseFloat(sanitized) || 0;
    };

    const handleIgnoreTVA = (item) => {
        if (!window.confirm(`Ignorer/Masquer la TVA de la facture ${item.id} ?`)) return;
        
        const shadowTx = {
            id: Date.now(),
            date: new Date().toISOString().split('T')[0],
            desc: `Ignoré: TVA Facture ${item.id}`,
            bank: 'N/A',
            type: 'Debit',
            amount: item.amount,
            category: 'TVA Ventes',
            originalId: item.originalId,
            isIgnored: true
        };

        setIgnoredTxs([...ignoredTxs, shadowTx]);
    };

    const handleIgnoreProposal = (item) => {
        if (!window.confirm(`Ignorer définitivement le salaire de ${item.name} pour la période ${item.serviceMonthName} ${item.serviceYear} ?\n\nCette action le déplacera vers l'archive.`)) return;
        
        const shadowTx = {
            id: Date.now(),
            date: new Date().toISOString().split('T')[0],
            desc: `Ignoré: Salaire ${item.name} - ${item.serviceMonthName} ${item.serviceYear}`,
            bank: 'N/A',
            type: 'Debit',
            amount: item.amount,
            category: 'Charges',
            chargeType: 'RH',
            chargeNature: 'Fixes',
            serviceMonth: item.serviceMonthStr,
            isIgnored: true
        };

        setIgnoredTxs([...ignoredTxs, shadowTx]);
    };

    const handleResetSalary = (proposal) => {
        try {
            if (!proposal || !proposal.transaction || !proposal.transaction.id) {
                alert("Erreur : Aucune transaction associée trouvée.");
                setConfirmResetId(null);
                return;
            }

            const targetId = proposal.transaction.id;
            const currentTxs = getBankTransactions() || [];
            const newTxs = currentTxs.filter(t => String(t.id) !== String(targetId));

            if (newTxs.length === currentTxs.length) {
                alert("Erreur : Impossible de trouver la transaction dans le stockage.");
                setConfirmResetId(null);
                return;
            }

            saveBankTransactions(newTxs);
            setManualTransactions(newTxs);
            
            // Sync events
            window.dispatchEvent(new Event('storage'));
            window.dispatchEvent(new CustomEvent('mynds_data_updated'));
            
            setConfirmResetId(null);
            console.log("✅ Reset Salary Successful");
        } catch (err) {
            console.error("❌ Reset Salary Error:", err);
            alert("Erreur : " + err.message);
        }
    };
    const bankBalances = useMemo(() => {
        const getBankBalance = (bankName) => {
            if (!bankName) return 0;
            const normalizedTarget = bankName.trim().toLowerCase();
            return allTransactions
                .filter(t => !t.isIgnored && (t.bank || '').trim().toLowerCase() === normalizedTarget)
                .reduce((acc, t) => {
                    const amt = safeParseFloat(t.amount);
                    return acc + (t.type === 'Credit' ? amt : -amt);
                }, 0);
        };

        return activeBanks.reduce((acc, b) => {
            acc[b.bank_name] = getBankBalance(b.bank_name);
            return acc;
        }, {});
    }, [activeBanks, allTransactions]);

    const getSystemBalance = (name) => {
        const normalizedTarget = name.toLowerCase();
        return allTransactions
            .filter(t => !t.isIgnored && (t.bank || '').trim().toLowerCase() === normalizedTarget)
            .reduce((acc, t) => {
                const amt = safeParseFloat(t.amount);
                return acc + (t.type === 'Credit' ? amt : -amt);
            }, 0);
    };

    const balanceEspeces = getSystemBalance('espèces');
    const balanceCT = getSystemBalance('carte technologique');

    const totalGlobalNet = useMemo(() => {
        const configBankSum = Object.values(bankBalances).reduce((a, b) => a + b, 0);
        const hasEspecesInConfig = activeBanks.some(b => b.bank_name.toLowerCase().includes('espèce'));
        const hasCTInConfig = activeBanks.some(b => b.bank_name.toLowerCase().includes('techno'));

        return configBankSum + 
              (hasEspecesInConfig ? 0 : balanceEspeces) + 
              (hasCTInConfig ? 0 : balanceCT);
    }, [bankBalances, activeBanks, balanceEspeces, balanceCT]);

    const totalChargesCT = allTransactions
        .filter(t => !t.isIgnored && (t.bank === 'Carte Technologique' || t.category === 'Charges CT') && t.type === 'Debit')
        .reduce((acc, t) => acc + (parseFloat(t.amount) || 0), 0);

    const filteredTransactions = allTransactions
        .filter(t => !t.isIgnored) 
        .filter(t => t.bank === selectedBank || selectedBank === 'all')
        .filter(t => (t.desc || '').toLowerCase().includes(searchTerm.toLowerCase()))
        .filter(t => {
            if (activeTab === 'Entrées') {
                if (t.type !== 'Credit') return false;
                if (entreesMonthFilter !== 'all') {
                    const tMonth = t.date.substring(0, 7);
                    if (tMonth !== entreesMonthFilter) return false;
                }
                if (entreesClientFilter !== 'all') {
                    // Strict match logic: look for exact name in description or as a word
                    const nameRegex = new RegExp(`(^|\\s|\\(|\\-)${entreesClientFilter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\s|\\)|\\-|$)`, 'i');
                    if (!nameRegex.test(t.desc || '')) return false;
                }
                return true;
            }
            if (activeTab === 'Charges Mynds' || activeTab === 'Charges RH') {
                if (t.type !== 'Debit' || t.category === 'Perso') return false;
                
                const [filterYear, filterMonth] = selectedMonthFilter.split('-');
                if (filterMonth === 'all') {
                    if (!t.date || t.date.split('-')[0] !== filterYear) return false;
                } else {
                    if (t.date && t.date.substring(0, 7) !== selectedMonthFilter) return false;
                }

                const isRHCharge = t.chargeType === 'RH' || t.category === 'Mynds Salaire' || (t.desc || '').toLowerCase().includes('salaire');

                if (activeTab === 'Charges Mynds') {
                    if (isRHCharge) return false;
                    if (t.category === 'Sponsoring') return false;
                    if (t.category === 'Charges CT') return false;
                    if (t.category === 'TVA Ventes') return false;
                    return true;
                }

                if (activeTab === 'Charges RH') {
                    if (!isRHCharge) return false;
                    
                    // Filter by Employee
                    if (chargeTypeFilter !== 'all' && chargeTypeFilter.startsWith('RH-')) {
                        const specificName = chargeTypeFilter.replace('RH-', '').toLowerCase();
                        if (!(t.desc || '').toLowerCase().includes(specificName)) return false;
                    }

                    // Filter by Client
                    if (rhClientFilter !== 'all') {
                        const targetClient = clients.find(c => c.enseigne === rhClientFilter);
                        if (targetClient && targetClient.projectCosts) {
                            const employeeNames = targetClient.projectCosts.map(pc => pc.nom?.toLowerCase()).filter(Boolean);
                            const matches = employeeNames.some(name => (t.desc || '').toLowerCase().includes(name));
                            if (!matches) return false;
                        } else {
                            return false;
                        }
                    }

                    return true;
                }
            }
            if (activeTab === 'Charges CT') return t.type === 'Debit' && (t.category === 'Charges CT' || t.category === 'Sponsoring');
            if (activeTab === 'Charges TVA') return t.type === 'Debit' && t.category === 'TVA Ventes';
            return false;
        })
        .sort((a, b) => new Date(b.date) - new Date(a.date));

    const totalTVA = tvaTransactions.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);
    const filteredTVA = tvaTransactions
        .filter(t => t.statut !== 'Archived')
        .filter(t => (t.fournisseur || '').toLowerCase().includes(searchTerm.toLowerCase()))
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
                            {formatMoney(totalGlobalNet)}
                        </div>
                    </div>

                    {/* The Bank Cards Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(activeBanks.length + 1, 4)}, 1fr)`, gap: '16px', flex: 1 }}>
                        {activeBanks.map((bank) => (
                            <div key={bank.id} style={{
                                background: bank.isDefault ? 'var(--text-main)' : 'var(--card-bg)', 
                                border: bank.isDefault ? 'none' : '1px solid var(--border-color)',
                                padding: '16px', borderRadius: '16px', color: bank.isDefault ? 'white' : 'var(--text-main)',
                                display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', overflow: 'hidden',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
                            }}>
                                <div style={{ position: 'absolute', top: '-10px', right: '-10px', opacity: 0.1, color: bank.isDefault ? 'white' : 'var(--text-main)' }}><Landmark size={80} /></div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <div style={{ fontSize: '9px', fontWeight: '700', color: bank.isDefault ? 'rgba(255,255,255,0.5)' : 'var(--text-muted)', textTransform: 'uppercase' }}>Compte {bank.bank_name}</div>
                                    </div>
                                    {bank.isDefault && <div style={{ background: 'rgba(255,193,5,0.2)', padding: '2px 6px', borderRadius: '6px', fontSize: '8px', fontWeight: '800', color: 'var(--accent-gold)' }}>DÉFAUT</div>}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '12px' }}>
                                    <div style={{ fontSize: '20px', fontWeight: '900' }}>{formatMoney(bankBalances[bank.bank_name] || 0)}</div>
                                    <div style={{ fontSize: '9px', color: bank.isDefault ? 'rgba(255,255,255,0.6)' : 'var(--text-muted)', fontFamily: 'monospace' }}>{bank.account_number.slice(-8).padStart(20, '*')}</div>
                                </div>
                            </div>
                        ))}

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
                                    const clientRef = activeClientsList.find(c => c.id === f.clientId || c.enseigne === f.client);

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
                                        client: f.clientName || f.client,
                                        desc: `Facture ${f.id}`,
                                        date: calculatedDate,
                                        amount: f.montant,
                                        urgency: f.statut === 'Late' ? 'high' : 'medium'
                                    });
                                }
                            });

                            // 2. Active Abonnements not invoiced for the current month
                            activeClientsList.forEach(c => {
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

                                            let periodLabel = `Mois ${String(currentM + 1).padStart(2, '0')}`;
                                            if (c.modeCycle === 'Du 15 au 14') periodLabel = `15/${String(currentM + 1).padStart(2, '0')} - 14/${String(targetDateObj.getMonth() + 1).padStart(2, '0')}`;
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
                                const formatMonthStr = !isNaN(dayObj) ? dayObj.toLocaleString('fr-FR', { month: 'short' }) : '???';

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
            <div style={{ 
                display: 'flex', 
                gap: '4px', 
                marginBottom: '16px', 
                borderBottom: '1px solid var(--border-color)', 
                paddingBottom: '8px',
                overflowX: 'auto',
                whiteSpace: 'nowrap',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none'
            }}>
                <style>{`
                    div::-webkit-scrollbar { display: none; }
                `}</style>
                <button
                    onClick={() => setActiveTab('Entrées')}
                    style={{
                        padding: '6px 16px',
                        borderRadius: '10px',
                        border: 'none',
                        background: activeTab === 'Entrées' ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
                        color: activeTab === 'Entrées' ? '#10b981' : 'var(--text-muted)',
                        fontSize: '12px',
                        fontWeight: '800',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        flexShrink: 0
                    }}
                >
                    <ArrowDownLeft size={16} /> Entrées
                </button>

                <button
                    onClick={() => setActiveTab('Rapprochement')}
                    style={{
                        padding: '6px 16px',
                        borderRadius: '10px',
                        background: activeTab === 'Rapprochement' ? 'rgba(139, 92, 246, 0.15)' : 'transparent',
                        color: activeTab === 'Rapprochement' ? '#8b5cf6' : 'var(--text-main)',
                        fontSize: '12px',
                        fontWeight: '800',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        flexShrink: 0,
                        border: activeTab === 'Rapprochement' ? '1px solid #8b5cf6' : '1px solid transparent'
                    }}
                >
                    <ShieldCheck size={16} /> Rapprochement
                </button>
                <button
                    onClick={() => setActiveTab('Charges Mynds')}
                    style={{
                        padding: '6px 16px',
                        borderRadius: '10px',
                        border: 'none',
                        background: activeTab === 'Charges Mynds' ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
                        color: activeTab === 'Charges Mynds' ? '#ef4444' : 'var(--text-muted)',
                        fontSize: '12px',
                        fontWeight: '800',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        flexShrink: 0
                    }}
                >
                    <ArrowUpRight size={16} /> Mynds
                </button>

                <button
                    onClick={() => setActiveTab('Charges RH')}
                    style={{
                        padding: '6px 16px',
                        borderRadius: '10px',
                        border: 'none',
                        background: activeTab === 'Charges RH' ? 'rgba(245, 158, 11, 0.1)' : 'transparent',
                        color: activeTab === 'Charges RH' ? '#f59e0b' : 'var(--text-muted)',
                        fontSize: '12px',
                        fontWeight: '800',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        flexShrink: 0
                    }}
                >
                    <Users size={16} /> RH / Salaires
                </button>

                <button
                    onClick={() => setActiveTab('Charges CT')}
                    style={{
                        padding: '6px 16px',
                        borderRadius: '10px',
                        border: 'none',
                        background: activeTab === 'Charges CT' ? 'rgba(139, 92, 246, 0.1)' : 'transparent',
                        color: activeTab === 'Charges CT' ? '#8b5cf6' : 'var(--text-muted)',
                        fontSize: '12px',
                        fontWeight: '800',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        flexShrink: 0
                    }}
                >
                    <CreditCard size={16} /> CT
                </button>
                <button
                    onClick={() => setActiveTab('Charges TVA')}
                    style={{
                        padding: '6px 16px',
                        borderRadius: '10px',
                        border: 'none',
                        background: activeTab === 'Charges TVA' ? 'rgba(2, 132, 199, 0.1)' : 'transparent',
                        color: activeTab === 'Charges TVA' ? '#0284c7' : 'var(--text-muted)',
                        fontSize: '12px',
                        fontWeight: '800',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        flexShrink: 0
                    }}
                >
                    <Landmark size={16} /> TVA Mynds
                </button>

                <button
                    onClick={() => setActiveTab('TVA')}
                    style={{
                        padding: '6px 16px',
                        borderRadius: '10px',
                        border: 'none',
                        background: activeTab === 'TVA' ? 'rgba(56, 189, 248, 0.1)' : 'transparent',
                        color: activeTab === 'TVA' ? '#0284c7' : 'var(--text-muted)',
                        fontSize: '12px',
                        fontWeight: '800',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}
                >
                    <Calculator size={16} /> TVA Achats
                </button>


            </div>

            {/* Transactions Section */}
            {activeTab !== 'Rapprochement' ? (
                <>
                <div className="card" style={{ padding: '24px', borderRadius: '24px', marginTop: '24px' }}>

                {/* Salary Proposals Section */}
                {activeTab === 'Charges RH' && finalSalaryProposals.length > 0 && (
                    <div style={{ background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.05) 0%, rgba(245, 158, 11, 0.1) 100%)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: '20px', padding: '20px', marginBottom: '24px', boxShadow: '0 10px 30px rgba(245, 158, 11, 0.05)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#f59e0b', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Users size={20} />
                                </div>
                                <div>
                                    <h3 style={{ fontSize: '15px', fontWeight: '900', color: 'var(--text-main)', margin: 0 }}>Propositions de Salaires (M+1)</h3>
                                    <p style={{ fontSize: '11px', color: 'rgba(217, 119, 6, 0.8)', fontWeight: '700', textTransform: 'uppercase', margin: 0 }}>Basé sur les coûts projets actifs le mois de service</p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button onClick={() => setIsGroupedByRH(!isGroupedByRH)} style={{ background: 'white', color: '#f59e0b', border: '1px solid #fed7aa', borderRadius: '10px', padding: '8px 12px', fontSize: '11px', fontWeight: '800', cursor: 'pointer' }}>
                                    {isGroupedByRH ? 'Dégrouper (Vue Projets)' : 'Grouper par Nom'}
                                </button>
                                <button onClick={() => handleValidateSalary(finalSalaryProposals)} style={{ background: '#f59e0b', color: 'white', border: 'none', borderRadius: '10px', padding: '8px 16px', fontSize: '12px', fontWeight: '900', cursor: 'pointer' }}>
                                    Tout Valider ({formatMoney(finalSalaryProposals.reduce((acc, s) => acc + s.amount, 0))})
                                </button>
                            </div>
                        </div>
                        <div className="clean-table-container">
                            <table className="clean-table">
                                <thead>
                                    <tr>
                                        <th>Collaborateur</th>
                                        <th>Projet(s)</th>
                                        <th className="text-right">Montant Dû</th>
                                        <th className="text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {finalSalaryProposals.map((s, idx) => (
                                        <tr key={idx} style={{ background: s.isPaid ? 'rgba(16, 185, 129, 0.05)' : 'transparent', opacity: s.isPaid ? 0.6 : 1, transition: 'all 0.3s' }}>
                                            <td style={{ fontWeight: '800' }}>{s.name}</td>
                                            <td style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{s.project}</td>
                                            <td className="text-right" style={{ color: s.isPaid ? '#10b981' : '#f59e0b', fontWeight: '800' }}>{formatMoney(s.amount)}</td>
                                            <td className="text-center">
                                                {s.isPaid ? (
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', color: '#10b981', fontSize: '11px', fontWeight: '900' }}>
                                                        <Check size={14} /> PAYÉ
                                                        <button onClick={() => handleResetSalary(s)} style={{ background: 'transparent', border: 'none', color: '#999999', cursor: 'pointer', marginLeft: '4px' }} title="Réinitialiser / Annuler validation"><RotateCcw size={12} /></button>
                                                    </div>
                                                ) : (
                                                    <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                                                        <button onClick={() => handleValidateSalary([s])} style={{ background: 'white', color: '#f59e0b', border: '1px solid #fed7aa', borderRadius: '6px', padding: '4px 8px', fontSize: '10px', fontWeight: '800', cursor: 'pointer', transition: 'all 0.2s' }}>Valider (Débiter)</button>
                                                        <button onClick={() => handleIgnoreProposal(s)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', opacity: 0.6, padding: '4px' }}><EyeOff size={14} /></button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <div>
                        <h2 style={{ fontSize: '18px', fontWeight: '900', color: 'var(--text-main)', margin: 0 }}>
                            {activeTab === 'Entrées' && 'Historique des Entrées'}
                            {activeTab === 'Charges Mynds' && 'Historique des Charges MYNDS'}
                            {activeTab === 'Charges RH' && 'Historique des Salaires (RH)'}
                            {activeTab === 'Charges Perso' && 'Historique des Charges Perso'}
                            {activeTab === 'TVA' && 'Registre de la TVA Collectée (Achats)'}
                        </h2>
                        <div style={{ display: 'flex', gap: '16px', marginTop: '4px' }}>
                            <div style={{ fontSize: '11px', fontWeight: '800', color: (activeTab === 'Entrées' || activeTab === 'TVA') ? '#10b981' : '#ef4444', textTransform: 'uppercase' }}>
                                Total • {formatMoney(activeTab === 'TVA' ? totalTVA : filteredTransactions.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0))}
                            </div>
                            {activeTab === 'Entrées' && (
                                <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                                    En attente (Incr.) • {formatMoney(factures.filter(f => (f.statut === 'Sent' || f.statut === 'Late') && (entreesClientFilter === 'all' || f.client === entreesClientFilter)).reduce((acc, f) => acc + (f.montant || 0), 0))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', overflowX: 'auto', paddingBottom: '4px' }} className="no-scrollbar">
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
                                <div style={{ display: 'flex', gap: '4px' }}>
                                    <select
                                        value={selYear}
                                        onChange={e => handleYearChange(e.target.value)}
                                        style={{ padding: '7px 8px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', fontSize: '11px', fontWeight: '800', color: '#ef4444', outline: 'none' }}
                                    >
                                        {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                                    </select>
                                    <select
                                        value={String(selMonth).padStart(2, '0')}
                                        onChange={e => handleMonthChange(e.target.value)}
                                        style={{ padding: '7px 8px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', fontSize: '11px', fontWeight: '800', color: '#ef4444', outline: 'none' }}
                                    >
                                        <option value="all">Tous les mois (ANNUEL)</option>
                                        {['01','02','03','04','05','06','07','08','09','10','11','12'].map((m, i) => (
                                            <option key={m} value={m}>{['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'][i]}</option>
                                        ))}
                                    </select>
                                </div>
                            </>
                        )}

                        {activeTab === 'Charges RH' && (
                            <>
                                <div style={{ display: 'flex', gap: '4px' }}>
                                    <select
                                        value={selYear}
                                        onChange={e => handleYearChange(e.target.value)}
                                        style={{ padding: '7px 8px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', fontSize: '11px', fontWeight: '800', color: '#f59e0b', outline: 'none' }}
                                    >
                                        {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                                    </select>
                                    <select
                                        value={String(selMonth).padStart(2, '0')}
                                        onChange={e => handleMonthChange(e.target.value)}
                                        style={{ padding: '7px 8px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', fontSize: '11px', fontWeight: '800', color: '#f59e0b', outline: 'none' }}
                                    >
                                        <option value="all">Tous les mois (ANNUEL)</option>
                                        {['01','02','03','04','05','06','07','08','09','10','11','12'].map((m, i) => (
                                            <option key={m} value={m}>{['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'][i]}</option>
                                        ))}
                                    </select>
                                </div>
                                <select
                                    value={chargeTypeFilter}
                                    onChange={e => setChargeTypeFilter(e.target.value)}
                                    style={{ padding: '8px 10px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', fontSize: '12px', fontWeight: '800', outline: 'none', color: chargeTypeFilter !== 'all' ? '#f59e0b' : 'var(--text-main)' }}
                                >
                                    <option value="all">Tout le Staff</option>
                                    {uniqueRHNames.map(name => (
                                        <option key={name} value={`RH-${name}`}>{name}</option>
                                    ))}
                                </select>
                                <select
                                    value={rhClientFilter}
                                    onChange={e => setRhClientFilter(e.target.value)}
                                    style={{ padding: '8px 10px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', fontSize: '12px', fontWeight: '800', outline: 'none', color: rhClientFilter !== 'all' ? '#f59e0b' : 'var(--text-main)' }}
                                >
                                    <option value="all">Tous Projets</option>
                                    {activeClientsList.map(c => (
                                        <option key={c.id} value={c.enseigne}>{c.enseigne}</option>
                                    ))}
                                </select>
                            </>
                        )}

                        <div style={{ display: 'flex', gap: '8px' }}>
                            {(activeTab === 'Charges Mynds' || activeTab === 'Charges Perso' || activeTab === 'Charges CT') && (
                                <button
                                    onClick={() => setIsImportModalOpen(true)}
                                    style={{ padding: '8px 16px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'white', color: 'var(--text-main)', fontSize: '12px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}
                                >
                                    <FileSpreadsheet size={16} color={activeTab === 'Charges Perso' ? '#f59e0b' : activeTab === 'Charges CT' ? '#8b5cf6' : '#ca8a04'} /> Importer
                                </button>
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
                </div>



                {activeTab === 'Charges TVA' && (
                    <div style={{ background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.05) 0%, rgba(2, 132, 199, 0.1) 100%)', border: '1px solid rgba(2, 132, 199, 0.2)', borderRadius: '20px', padding: '20px', marginBottom: '24px', boxShadow: '0 10px 30px rgba(2, 132, 199, 0.05)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#0284c7', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Landmark size={20} />
                                </div>
                                <div>
                                    <h3 style={{ fontSize: '15px', fontWeight: '900', color: 'var(--text-main)', margin: 0 }}>Propositions de Paiement TVA (Déclaré BIAT)</h3>
                                    <p style={{ fontSize: '11px', color: 'rgba(2, 132, 199, 0.8)', fontWeight: '700', textTransform: 'uppercase', margin: 0 }}>TVA sur factures non archivées / non masquées</p>
                                </div>
                            </div>
                            {tvaVentesProposals.length > 0 && (
                                <button onClick={() => handleValidateTVA(tvaVentesProposals)} style={{ background: '#0284c7', color: 'white', border: 'none', borderRadius: '10px', padding: '8px 16px', fontSize: '12px', fontWeight: '900', cursor: 'pointer' }}>
                                    Tout Valider ({formatMoney(tvaVentesProposals.reduce((acc, s) => acc + s.amount, 0))})
                                </button>
                            )}
                        </div>
                        {tvaVentesProposals.length === 0 ? (
                            <div style={{ padding: '20px', textAlign: 'center', color: '#0284c7', fontWeight: '700', fontSize: '12px' }}>
                                Aucune TVA en attente de paiement.
                            </div>
                        ) : (
                            <div className="clean-table-container">
                                <table className="clean-table">
                                    <thead>
                                        <tr>
                                            <th>Client</th>
                                            <th>N° Facture</th>
                                            <th>Date Émission</th>
                                            <th className="text-right">Montant TVA</th>
                                            <th className="text-center">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {tvaVentesProposals.map((s, idx) => (
                                            <tr key={idx} style={{ background: 'transparent', transition: 'all 0.3s' }}>
                                                <td style={{ fontWeight: '800' }}>{s.client}</td>
                                                <td><span style={{ fontSize: '11px', background: 'rgba(0,0,0,0.05)', padding: '2px 8px', borderRadius: '12px' }}>{s.id}</span></td>
                                                <td>{new Date(s.date).toLocaleDateString('fr-FR')}</td>
                                                <td className="text-right" style={{ color: '#0284c7', fontWeight: '800' }}>{formatMoney(s.amount)}</td>
                                                <td className="text-center">
                                                    <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                                                        <button onClick={() => handleValidateTVA([s])} style={{ background: 'white', color: '#0284c7', border: '1px solid #bae6fd', borderRadius: '6px', padding: '4px 8px', fontSize: '10px', fontWeight: '800', cursor: 'pointer', transition: 'all 0.2s' }}>Valider (Débiter)</button>
                                                        <button 
                                                            onClick={() => handleIgnoreTVA(s)} 
                                                            style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', opacity: 0.6, padding: '4px' }}
                                                            title="Supprimer / Ignorer"
                                                        >
                                                            <Trash2 size={14} />
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

                <div className="clean-table-container">
                    {activeTab !== 'TVA' ? (
                        <table className="clean-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>N° Fact</th>
                                    <th>Désignation</th>
                                    <th>Mois (Svc)</th>
                                    <th>Banque</th>
                                    <th>Catégorie</th>
                                    <th className="text-right">Montant</th>
                                    <th className="text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTransactions.map((t) => (
                                    <tr key={t.id} style={{ background: t.isAuto ? 'rgba(250, 250, 250, 0.5)' : 'white' }}>
                                        <td className="clean-secondary-text">{new Date(t.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}</td>
                                        <td className="clean-primary-text">{t.originalId ? <span style={{ background: 'rgba(255, 193, 5, 0.1)', padding: '2px 4px', borderRadius: '4px', fontSize: '10px' }}>{t.originalId === 'non déclarée' ? 'ND' : t.originalId}</span> : '-'}</td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <div className="clean-primary-text">{t.desc}</div>
                                                {t.isDraft && <span className="status-pending" style={{ fontSize: '10px', marginLeft: '6px' }}>En attente</span>}
                                                {t.isAuto && <span className="status-paid" style={{ fontSize: '10px', marginLeft: '6px' }}>Validé</span>}
                                            </div>
                                        </td>
                                        <td className="clean-secondary-text">{t.serviceMonth ? new Date(t.serviceMonth + '-01').toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }) : '-'}</td>
                                        <td className="clean-secondary-text">{t.bank}</td>
                                        <td className="clean-secondary-text">{t.category}</td>
                                        <td className="text-right" style={{ color: t.type === 'Credit' ? '#8DAB96' : '#222222', fontWeight: '400' }}>{t.type === 'Debit' ? '-' : '+'}{formatMoney(t.amount)}</td>
                                        <td className="text-center">
                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                {t.isDraft ? (
                                                    <button onClick={() => handleValidateDraft(t)} style={{ background: '#d97706', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '800', cursor: 'pointer' }}>Valider</button>
                                                ) : (
                                                    <>
                                                        {!t.isAuto && <button onClick={() => handleEdit(t)} style={{ background: 'transparent', border: 'none', color: '#999999', cursor: 'pointer' }}><MoreHorizontal size={14} /></button>}
                                                        <button onClick={(e) => {
                                                            e.stopPropagation();
                                                            e.preventDefault();
                                                            if (t.isAuto) {
                                                                if (window.confirm("Voulez-vous supprimer définitivement cette transaction ?")) toggleIgnore(t);
                                                            } else {
                                                                handleDelete(t.id);
                                                            }
                                                        }} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', opacity: 0.6 }}><Trash2 size={14} /></button>

                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <table className="clean-table">
                            <thead>
                                <tr>
                                    <th>Date Facture</th>
                                    <th>Fournisseur / Désignation</th>
                                    <th className="text-right">Montant TVA</th>
                                    <th className="text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTVA.length === 0 ? (
                                    <tr><td colSpan="4" className="text-center clean-secondary-text" style={{ padding: '40px' }}>Aucune TVA enregistrée.</td></tr>
                                ) : (
                                    filteredTVA.map((t) => (
                                        <tr key={t.id}>
                                            <td className="clean-primary-text">{new Date(t.date).toLocaleDateString('fr-FR')}</td>
                                            <td>
                                                <div className="clean-primary-text">{t.fournisseur}</div>
                                                {t.desc && <div className="clean-secondary-text" style={{ marginTop: '2px' }}>{t.desc}</div>}
                                            </td>
                                            <td className="text-right" style={{ color: '#222222' }}>{formatMoney(t.amount)}</td>
                                            <td className="text-center">
                                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                    <button onClick={() => handleEditTVA(t)} style={{ background: 'transparent', border: 'none', color: '#999999', cursor: 'pointer' }}><MoreHorizontal size={14} /></button>
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
                                        {[...ignoredTxs].sort((a, b) => new Date(b.date) - new Date(a.date)).map(t => (
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
                )}
                </div>
                </>
            ) : (
                <div style={{ marginTop: '24px' }}>
                    <BankReconciliationTab 
                        factures={factures} 
                        manualTransactions={manualTransactions} 
                        onRefresh={() => {
                            setFactures(getFactures());
                            const savedTx = getBankTransactions();
                            if (savedTx) setManualTransactions(savedTx);
                        }} 
                    />
                </div>
            )}

            {isModalOpen && (
                <TransactionModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleSave}
                    transaction={editingTransaction}
                    activeTab={activeTab}
                    activeBanks={activeBanks}
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

            {isImportModalOpen && (
                <ImportChargesModal
                    isOpen={isImportModalOpen}
                    onClose={() => setIsImportModalOpen(false)}
                    onSave={handleImportSave}
                    existingTransactions={allTransactions}
                    importCategory={activeTab === 'Charges CT' ? 'Charges CT' : 'Charges'}
                />
            )}
        </div>
    );
};

const TransactionModal = ({ isOpen, onClose, onSave, transaction, activeTab, activeBanks }) => {
    const getModalContext = () => {
        if (activeTab === 'Entrées') return { title: 'Nouvelle Entrée Cash', color: '#10b981', icon: <ArrowDownLeft size={20} />, defaultType: 'Credit' };

        if (activeTab === 'Charges CT') return { title: 'Charge / Versement CT', color: '#8b5cf6', icon: <CreditCard size={20} />, defaultType: 'Debit' };

        return { title: 'Charge Mynds Team', color: '#ef4444', icon: <ArrowUpRight size={20} />, defaultType: 'Debit' };
    };

    const context = getModalContext();

    const [formData, setFormData] = useState(transaction || {
        date: new Date().toISOString().split('T')[0],
        desc: '',
        bank: activeBanks.find(b => b.isDefault)?.bank_name || 'BIAT',
        type: context.defaultType,
        amount: 0,
        category: activeTab === 'Charges CT' ? 'Charges CT' : (activeTab === 'Charges RH' ? 'Charges' : (activeTab === 'Charges Mynds' ? 'Mynds Logistique' : 'Autre')),
        chargeType: activeTab === 'Charges RH' ? 'RH' : 'Exploitations',
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
    } else if (activeTab === 'Charges CT') {
        availableCategories = ['Charges CT'];
    } else {
        availableCategories = myndsCategories;
    }

    if (transaction && !availableCategories.includes(transaction.category)) {
        availableCategories.push(transaction.category);
    }

    const getAllowedBanks = (cat) => {
        const bankNames = activeBanks.map(b => b.bank_name);
        if (cat === 'Perso') return [...bankNames, 'Espèces', 'Capital Personnel'];
        if (cat === 'Charges CT') return [...bankNames, 'Carte Technologique'];
        return [...bankNames, 'Espèces', 'Capital Personnel'];
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

                    {/* Section 2: Contexte Financier Pro */}
                    {(activeTab === 'Charges Mynds' || activeTab === 'Charges RH') && (
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
