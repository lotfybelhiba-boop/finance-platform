import React, { useState } from 'react';
import Header from '../components/Header';
import FactureModal from '../components/FactureModal';
import InvoicePreviewModal from '../components/InvoicePreviewModal';
import InvoiceAuditModal from '../components/InvoiceAuditModal';
import InvoiceStatusHistoryChart from '../components/InvoiceStatusHistoryChart';
import { Search, Plus, Trash2, Archive, Edit, Send, Printer, History, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { getFactures, saveFactures, getClients, getStorage, setStorage } from '../services/storageService';
import { calculatePendingInvoices } from '../utils/billingUtils';

const FacturesPage = () => {
    const navigate = useNavigate();
    const [filter, setFilter] = useState('all');
    const [clientFilter, setClientFilter] = useState('all');
    const [monthFilter, setMonthFilter] = useState('all');
    const [yearFilter, setYearFilter] = useState(new Date().getFullYear().toString());
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
    const [previewFacture, setPreviewFacture] = useState(null);
    const [selectedFactures, setSelectedFactures] = useState([]);
    // paymentModalInfo : { id: string } or null
    const [paymentModalInfo, setPaymentModalInfo] = useState(null);
    const [factures, setFactures] = useState(() => {
        let parsed = getFactures();
        if (parsed && parsed.length > 0) {
            let modified = false;
            parsed = parsed.map((f, index) => {
                if (f.id === 'non déclarée') {
                    modified = true;
                    // Provide a unique ID using timestamp + index to avoid collisions
                    return { ...f, id: `ND-${Date.now().toString().slice(-6)}-${index}` };
                }
                return f;
            });
            if (modified) {
                saveFactures(parsed);
            }
            return parsed;
        }

        const currentYear = new Date().getFullYear();
        const currentMonthPadded = (new Date().getMonth() + 1).toString().padStart(2, '0');
        return [
            { id: `N01-${currentYear}-001`, client: 'Global Mkt', montant: 4500, dateEmi: `${currentYear}-${currentMonthPadded}-01`, echeance: `${currentYear}-${currentMonthPadded}-15`, statut: 'Paid' },
            { id: `N02-${currentYear}-001`, client: 'Studio Design', montant: 1250, dateEmi: `${currentYear}-${currentMonthPadded}-05`, echeance: `${currentYear}-${currentMonthPadded}-20`, statut: 'Sent' },
            { id: `N03-${currentYear}-001`, client: 'Retail Plus', montant: 3200, dateEmi: `${currentYear}-${currentMonthPadded}-02`, echeance: `${currentYear}-${currentMonthPadded}-10`, statut: 'Late' },
            { id: `N04-${currentYear}-001`, client: 'Alpha Corp', montant: 800, dateEmi: `${currentYear}-${currentMonthPadded}-10`, echeance: `${currentYear}-${currentMonthPadded}-25`, statut: 'Draft' },
        ];
    });

    // Custom confirm modal state
    // actionType: 'delete_single', 'delete_mass', 'historique_mass'
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, type: null, id: null, message: '' });

    // --- NEW PENDING SUBSCRIPTION INVOICES KPI ---
    const [pendingInvoicesStats, setPendingInvoicesStats] = useState({ count: 0, amount: 0, missingClients: [] });
    const [expandedClientAlerts, setExpandedClientAlerts] = useState({});
    const [ignoredAlerts, setIgnoredAlerts] = useState(() => {
        return getStorage('mynds_ignored_alerts', []);
    });

    const handleIgnoreAlert = (clientId, month, year) => {
        const alertKey = `${clientId}-${month}-${year}`;
        const newIgnored = [...ignoredAlerts, alertKey];
        setIgnoredAlerts(newIgnored);
        setStorage('mynds_ignored_alerts', newIgnored);
    };

    React.useEffect(() => {
        const calculatePending = () => {
            try {
                const clientsList = getClients() || [];
                const stats = calculatePendingInvoices(clientsList, factures, ignoredAlerts);
                setPendingInvoicesStats(stats);
            } catch (e) {
                console.error("Erreur calcul factures en attente", e);
            }
        };

        calculatePending();
    }, [factures, ignoredAlerts]);
    // ---------------------------------------------

    // Écouteur pour la synchronisation multi-onglets
    React.useEffect(() => {
        const syncData = () => {
            const parsed = getFactures();
            if (parsed && parsed.length > 0) {
                setFactures(parsed);
            }
        };
        window.addEventListener('storage', syncData);
        return () => window.removeEventListener('storage', syncData);
    }, []);

    // Save factures
    React.useEffect(() => {
        saveFactures(factures);
    }, [factures]);

    const [editingFacture, setEditingFacture] = useState(null);
    const [quickInvoiceClient, setQuickInvoiceClient] = useState(null);
    const [quickInvoiceTargetDate, setQuickInvoiceTargetDate] = useState(null);

    const handleManualIdEdit = (oldId, currentId) => {
        const newId = prompt("Modifier le numéro de facture (Entrez la nouvelle valeur) :", currentId);
        if (newId && newId.trim() !== '' && newId.trim() !== currentId) {
            if (factures.some(f => f.id === newId.trim())) {
                alert("Ce numéro de facture existe déjà !");
                return;
            }
            setFactures(factures.map(f => {
                if (f.id === oldId) {
                    return { ...f, id: newId.trim(), manualId: true };
                }
                return f;
            }));
        }
    };

    const handleSaveFacture = (nouvelleFacture) => {
        if (editingFacture) {
            setFactures(factures.map(f => f.id === editingFacture.id ? nouvelleFacture : f));
        } else {
            setFactures([nouvelleFacture, ...factures]);
        }
        setEditingFacture(null);
    };

    const handleDelete = (id) => {
        setConfirmModal({
            isOpen: true,
            type: 'delete_single',
            id: id,
            message: "Êtes-vous sûr de vouloir supprimer cette facture ?"
        });
    };

    const handleMassDelete = () => {
        if (selectedFactures.length === 0) {
            alert("Veuillez sélectionner au moins une facture à supprimer.");
            return;
        }

        setConfirmModal({
            isOpen: true,
            type: 'delete_mass',
            id: null,
            message: `Êtes-vous sûr de vouloir supprimer DÉFINITIVEMENT ${selectedFactures.length} facture(s) ?`
        });
    };

    const handleArchive = (id) => {
        setFactures(prev => prev.map(f => f.id === id ? { ...f, statut: 'Archived' } : f));
    };

    const handleSend = (id) => {
        setFactures(prev => prev.map(f => f.id === id ? { ...f, statut: 'Sent' } : f));
        alert("Facture marquée comme envoyée.");
    };

    const handleModify = (facture) => {
        setEditingFacture(facture);
        setIsModalOpen(true);
    };

    const handlePrint = (facture) => {
        let clientsList = getClients();

        const clientObj = clientsList.find(c => c.id === facture.clientId) || clientsList.find(c => c.enseigne === facture.client) || {};
        setPreviewFacture({ ...facture, clientObj });
    };

    const handleMoveToHistorique = () => {
        if (selectedFactures.length === 0) {
            alert("Veuillez sélectionner au moins une facture à déplacer.");
            return;
        }

        setConfirmModal({
            isOpen: true,
            type: 'historique_mass',
            id: null,
            message: `${selectedFactures.length} facture(s) vont être déplacée(s) vers l'historique. Continuer ?`
        });
    };

    const executeConfirmAction = () => {
        const { type, id } = confirmModal;
        if (type === 'delete_single') {
            setFactures(factures.filter(f => f.id !== id));
        } else if (type === 'delete_mass') {
            setFactures(factures.filter(f => !selectedFactures.includes(f.id)));
            setSelectedFactures([]);
        } else if (type === 'historique_mass') {
            setFactures(factures.map(f =>
                selectedFactures.includes(f.id) ? { ...f, statut: 'Archived' } : f
            ));
            setSelectedFactures([]);
            alert("Facture(s) déplacée(s) vers l'historique.");
        }
        setConfirmModal({ isOpen: false, type: null, id: null, message: '' });
    };

    const formatMoney = (val) => new Intl.NumberFormat('fr-TN', { style: 'currency', currency: 'TND', minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(val);
    const formatNumber = (val) => new Intl.NumberFormat('fr-TN', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(val);

    const uniqueClients = [...new Set(factures.map(f => f.client))].filter(Boolean).sort();
    
    // Extraire les années uniques depuis dateEmi
    const uniqueYears = [...new Set(factures.map(f => {
        if (!f.dateEmi) return null;
        const d = new Date(f.dateEmi);
        return isNaN(d.getTime()) ? null : d.getFullYear().toString();
    }))].filter(Boolean).sort((a, b) => b - a); // Décroissant: 2026, 2025...

    // S'assurer que l'année courante est toujours dans la liste
    const currentYearStr = new Date().getFullYear().toString();
    if (!uniqueYears.includes(currentYearStr)) uniqueYears.push(currentYearStr);
    uniqueYears.sort((a, b) => b - a);

    const monthsList = [
        { val: '1', label: 'Janvier' }, { val: '2', label: 'Février' }, { val: '3', label: 'Mars' },
        { val: '4', label: 'Avril' }, { val: '5', label: 'Mai' }, { val: '6', label: 'Juin' },
        { val: '7', label: 'Juillet' }, { val: '8', label: 'Août' }, { val: '9', label: 'Septembre' },
        { val: '10', label: 'Octobre' }, { val: '11', label: 'Novembre' }, { val: '12', label: 'Décembre' }
    ];

    const todoFactures = pendingInvoicesStats.missingClients.map(mc => ({
        id: `TODO-${mc.enseigne}-${mc.targetMonth}-${mc.targetYear}`, 
        isTodo: true,
        clientId: mc.id,
        client: mc.enseigne,
        statut: 'A faire',
        montant: mc.montantMensuel,
        dateEmi: `${mc.targetYear}-${String(mc.targetMonth + 1).padStart(2, '0')}-${String(mc.cycleDay || 1).padStart(2, '0')}`,
        periodeDebut: `${mc.targetYear}-${String(mc.targetMonth + 1).padStart(2, '0')}-01`,
        periodeFin: new Date(mc.targetYear, mc.targetMonth + 1, 0).toISOString().split('T')[0],
        cycleDay: mc.cycleDay,
        targetMonth: mc.targetMonth,
        targetYear: mc.targetYear,
        alertStatus: mc.alertStatus
    }));

    const allInvoicesSequence = [...factures, ...todoFactures];

    const baseFactures = filter === 'Archived' ? allInvoicesSequence : allInvoicesSequence.filter(f => f.statut !== 'Archived');
    const filteredFactures = baseFactures.filter(f => {
        if (filter !== 'all' && f.statut !== filter) return false;
        if (clientFilter !== 'all' && f.client !== clientFilter) return false;
        if (monthFilter !== 'all') {
            const d = new Date(f.dateEmi);
            if (!isNaN(d.getTime())) {
                if (d.getMonth() + 1 !== parseInt(monthFilter)) return false;
            }
        }
        if (yearFilter !== 'all') {
            const d = new Date(f.dateEmi);
            if (!isNaN(d.getTime())) {
                if (d.getFullYear().toString() !== yearFilter) return false;
            }
        }
        return true;
    });

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const sortedFactures = [...filteredFactures].sort((a, b) => {
        if (!sortConfig.key) return 0;

        let aVal = a[sortConfig.key] || '';
        let bVal = b[sortConfig.key] || '';

        if (sortConfig.key === 'id') {
            return sortConfig.direction === 'asc'
                ? aVal.localeCompare(bVal, undefined, { numeric: true })
                : bVal.localeCompare(aVal, undefined, { numeric: true });
        }

        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedFactures(filteredFactures.map(f => f.id));
        } else {
            setSelectedFactures([]);
        }
    };

    const toggleSelection = (id) => {
        setSelectedFactures(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    const handleStatusChange = (id, newStatus) => {
        if (newStatus === 'Paid') {
            setPaymentModalInfo({ id });
        } else {
            setFactures(prev => prev.map(f => f.id === id ? { ...f, statut: newStatus } : f));
        }
    };

    const getStatusSelect = (facture, isDynamicallyLate = false) => {
        let style = { padding: '4px 6px', borderRadius: '8px', fontSize: '11px', fontWeight: '700', cursor: 'pointer', outline: 'none', transition: 'all 0.2s', width: '100px', textAlign: 'center' };

        // Determiner si c'est paiement partiel
        const isPartiallyPaid = facture.montantPaye && facture.montantPaye > 0 && facture.montantPaye < facture.montant;

        // Force visuelle du statut si retard dynamique non acté
        const effectiveStatus = (facture.statut === 'Sent' && isDynamicallyLate) ? 'Late' : facture.statut;

        switch (effectiveStatus) {
            case 'Paid':
                style = { ...style, background: 'var(--success-bg)', color: 'var(--success)', border: '1px solid rgba(16, 185, 129, 0.2)' };
                break;
            case 'Sent':
                // Jaune: Encore dans l'échéance
                if (isPartiallyPaid) style = { ...style, background: 'rgba(245, 158, 11, 0.1)', color: '#d97706', border: '1px solid rgba(245, 158, 11, 0.2)' };
                else style = { ...style, background: 'rgba(234, 179, 8, 0.1)', color: '#ca8a04', border: '1px solid rgba(234, 179, 8, 0.2)' }; // Yellow
                break;
            case 'Late':
                // Rouge: Échéance dépassée
                if (isPartiallyPaid) style = { ...style, background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', border: '2px solid rgba(239, 68, 68, 0.5)' };
                else style = { ...style, background: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid rgba(239, 68, 68, 0.2)' }; // Red
                break;
            case 'Draft':
                style = { ...style, background: 'rgba(100, 116, 139, 0.1)', color: 'var(--text-muted)', border: '1px solid rgba(100, 116, 139, 0.2)' };
                break;
            case 'Archived':
                style = { ...style, background: 'rgba(71, 85, 105, 0.1)', color: 'var(--text-muted)', border: '1px solid rgba(71, 85, 105, 0.2)' };
                break;
            case 'A faire':
                style = { ...style, background: 'rgba(239, 68, 68, 0.05)', color: 'var(--danger)', border: '1px dashed rgba(239, 68, 68, 0.3)' };
                break;
            default: break;
        }

        if (facture.isTodo) {
            return <div style={{...style, display: 'inline-block'}}>{facture.alertStatus === 'urgent' ? '⚠️ À faire' : 'À faire'}</div>;
        }

        return (
            <select
                value={facture.statut}
                onChange={(e) => handleStatusChange(facture.id, e.target.value)}
                style={style}
            >
                <option value="Paid" style={{ color: 'var(--text-main)', background: 'var(--card-bg)' }}>✅ Payée</option>
                <option value="Sent" style={{ color: 'var(--text-main)', background: 'var(--card-bg)' }}>
                    {isPartiallyPaid ? '⏳ Partiel_S' : '⏳ En attente'}
                </option>
                <option value="Late" style={{ color: 'var(--text-main)', background: 'var(--card-bg)' }}>
                    {isPartiallyPaid ? '🔴 Partiel_R' : '🔴 En retard'}
                </option>
                <option value="Draft" style={{ color: 'var(--text-main)', background: 'var(--card-bg)' }}>📝 Brouillon</option>
                <option value="Archived" style={{ color: 'var(--text-main)', background: 'var(--card-bg)' }}>📦 Archivée</option>
            </select>
        );
    };

    const handleBankChange = (id, account) => {
        setFactures(prev => prev.map(f => f.id === id ? { ...f, compteEncaissement: account } : f));
    };

    const togglePaidStatus = (id) => {
        const facture = factures.find(f => f.id === id);
        if (facture.statut === 'Paid') {
            let newStatus = 'Sent';
            if (facture.echeance !== 'N/A' && new Date(facture.echeance) < new Date()) {
                newStatus = 'Late';
            }
            setFactures(prev => prev.map(f => f.id === id ? { ...f, statut: newStatus, datePaiement: null, montantPaye: 0, paiements: [] } : f));
        } else {
            setPaymentModalInfo({ id }); // Prompt for date and partial amount
        }
    };

    const confirmPaymentDetails = (date, isPartial, partialAmount, destAccount) => {
        if (paymentModalInfo) {
            setFactures(prev => prev.map(f => {
                if (f.id === paymentModalInfo.id) {
                    const amountPaid = isPartial ? parseFloat(partialAmount) : parseFloat(f.montant);
                    const isFullyPaid = amountPaid >= parseFloat(f.montant);
                    const finalStatus = isFullyPaid ? 'Paid' : f.statut;

                    const newPayment = { id: Date.now(), date: date, montant: amountPaid, compte: destAccount || f.compteEncaissement || 'QNB' };
                    const existingPaiements = f.paiements ? [...f.paiements] : [];
                    
                    // Migration for older invoices that have montantPaye but no paiements array
                    if (f.montantPaye > 0 && existingPaiements.length === 0) {
                        existingPaiements.push({ id: Date.now() - 1000, date: f.datePaiement || f.dateEmi, montant: f.montantPaye, compte: f.compteEncaissement || 'QNB' });
                    }
                    existingPaiements.push(newPayment);

                    return {
                        ...f,
                        statut: finalStatus,
                        datePaiement: date,
                        montantPaye: (f.montantPaye || 0) + amountPaid,
                        paiements: existingPaiements,
                        ...(destAccount ? { compteEncaissement: destAccount } : {})
                    };
                }
                return f;
            }));
            setPaymentModalInfo(null);
        }
    };

    // Grouper les factures manquantes par client pour l'affichage liste déroulante
    const groupedMissingClients = pendingInvoicesStats.missingClients.reduce((acc, client) => {
        if (!acc[client.enseigne]) {
            acc[client.enseigne] = {
                enseigne: client.enseigne,
                totalAmount: 0,
                monthsCount: 0,
                hasUrgent: false,
                invoices: []
            };
        }
        acc[client.enseigne].invoices.push(client);
        acc[client.enseigne].totalAmount += parseFloat(client.montantMensuel || 0);
        acc[client.enseigne].monthsCount += 1;
        if (client.alertStatus === 'urgent') {
            acc[client.enseigne].hasUrgent = true;
        }
        return acc;
    }, {});

    const toggleClientAlertExpand = (clientName) => {
        setExpandedClientAlerts(prev => ({
            ...prev,
            [clientName]: !prev[clientName]
        }));
    };

    // -- NOUVELLES CARTES KPI SIMPLIFIÉES --
    const now = new Date();
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Charger les clients pour appliquer le délai rétroactif sur les anciennes factures
    let allClients = [];
    try { allClients = getClients(); } catch(e) {}
    
    // 1. En attente (Toutes les sent/late)
    const enAttenteFactures = factures.filter(f => f.statut === 'Sent' || f.statut === 'Late');
    const enAttenteCount = enAttenteFactures.length;
    const enAttenteSum = enAttenteFactures.reduce((acc, f) => acc + (parseFloat(f.montant) - (f.montantPaye || 0)), 0);

    // 2. En retard (> 48h ou après Échéance)
    const enRetardFactures = enAttenteFactures.filter(f => {
        let finalEch = null;
        if (f.echeance && f.echeance !== 'N/A') {
            finalEch = new Date(f.echeance);
        } else if (f.clientId && f.dateEmi) {
            // Rétroactif: Si pas d'échéance, on regarde le Délai de paiement du client
            const cObj = allClients.find(c => c.id === f.clientId);
            if (cObj && cObj.delaiPaiement) {
                finalEch = new Date(f.dateEmi);
                finalEch.setDate(finalEch.getDate() + parseInt(cObj.delaiPaiement, 10));
            }
        }

        if (finalEch) {
            const echMidnight = new Date(finalEch.getFullYear(), finalEch.getMonth(), finalEch.getDate());
            return todayMidnight > echMidnight; // STRICTLY greater than the due date's midnight
        }

        if (!f.dateEmi) return false;
        // Fallback ultime: Règle des 48h sur date émission
        const eDate = new Date(f.dateEmi);
        const diffHours = (now - eDate) / (1000 * 60 * 60);
        return diffHours > 48;
    });
    const enRetardCount = enRetardFactures.length;
    const enRetardSum = enRetardFactures.reduce((acc, f) => acc + (parseFloat(f.montant) - (f.montantPaye || 0)), 0);

    // 3. Reçu (Déclarés, ND QNB, ND Cash)
    let recuDeclare = 0;
    let recuNdQnb = 0;
    let recuNdCash = 0;

    factures.forEach(f => {
        let paidAmt = 0;
        if (f.statut === 'Paid') paidAmt = parseFloat(f.montant);
        else if (f.montantPaye > 0) paidAmt = parseFloat(f.montantPaye);

        if (paidAmt > 0) {
            const isND = ((!f.tva || f.tva === 0) && !f.isExonore) || f.id === 'non déclarée' || (f.id && f.id.startsWith('ND-'));
            if (!isND) {
                recuDeclare += paidAmt;
            } else {
                const acc = f.compteEncaissement || 'QNB';
                if (acc === 'Cash') recuNdCash += paidAmt;
                else recuNdQnb += paidAmt;
            }
        }
    });

    return (
        <div>
            <Header title="Factures" subtitle="Gestion des factures clients et encours" />

            {/* Factures Specific KPIs */}
            <div className="kpi-grid" style={{ marginBottom: '16px', gap: '12px', display: 'flex', flexWrap: 'wrap' }}>
                <div className="kpi-card" style={{ flex: 1, minWidth: '200px', padding: '16px', background: 'var(--card-bg)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div className="kpi-title" style={{ color: 'var(--warning)', fontWeight: '700', fontSize: '12px', margin: 0, textTransform: 'uppercase' }}>En attente</div>
                        <span style={{ background: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)', padding: '2px 8px', borderRadius: '100px', fontSize: '11px', fontWeight: '800' }}>
                            {enAttenteCount} fact.
                        </span>
                    </div>
                    <div className="kpi-value" style={{ color: 'var(--text-main)', fontSize: '24px', fontWeight: '800' }}>
                        {formatMoney(enAttenteSum)}
                    </div>
                </div>

                <div className="kpi-card" style={{ flex: 1, minWidth: '200px', padding: '16px', background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.05), rgba(255, 255, 255, 0.5))', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div className="kpi-title" style={{ color: 'var(--danger)', fontWeight: '700', fontSize: '12px', margin: 0, textTransform: 'uppercase' }}>En retard {'>'} 48h</div>
                        <span style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: '2px 8px', borderRadius: '100px', fontSize: '11px', fontWeight: '800' }}>
                            {enRetardCount} fact.
                        </span>
                    </div>
                    <div className="kpi-value" style={{ color: 'var(--danger)', fontSize: '24px', fontWeight: '800' }}>
                        {formatMoney(enRetardSum)}
                    </div>
                </div>

                <div className="kpi-card" style={{ flex: 2, minWidth: '350px', padding: '16px', background: 'var(--card-bg)' }}>
                    <div className="kpi-title" style={{ color: 'var(--success)', fontSize: '12px', textTransform: 'uppercase', marginBottom: '12px', fontWeight: '700' }}>Reçu (Encaissé)</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600', marginBottom: '4px' }}>Déclarés</div>
                            <div style={{ color: 'var(--success)', fontSize: '16px', fontWeight: '800' }}>{formatMoney(recuDeclare)}</div>
                        </div>
                        <div style={{ width: '1px', background: 'var(--border-color)', height: '30px' }}></div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600', marginBottom: '4px' }}>Cash (ND)</div>
                            <div style={{ color: '#065f46', fontSize: '16px', fontWeight: '800' }}>{formatMoney(recuNdCash)}</div>
                        </div>
                        <div style={{ width: '1px', background: 'var(--border-color)', height: '30px' }}></div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600', marginBottom: '4px' }}>QNB (ND)</div>
                            <div style={{ color: '#9d174d', fontSize: '16px', fontWeight: '800' }}>{formatMoney(recuNdQnb)}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Historique Bar Chart */}
            <InvoiceStatusHistoryChart missingClients={pendingInvoicesStats.missingClients} />

            {/* Filters Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: '10px', flex: 1, flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative', width: '200px' }}>
                        <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                            type="text"
                            placeholder="Rechercher..."
                            style={{ width: '100%', padding: '8px 12px 8px 34px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', fontSize: '13px', outline: 'none', color: 'var(--text-main)' }}
                        />
                    </div>

                    <select
                        value={clientFilter}
                        onChange={(e) => setClientFilter(e.target.value)}
                        style={{ padding: '8px 12px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-main)', fontSize: '13px', outline: 'none', cursor: 'pointer', minWidth: '150px' }}
                    >
                        <option value="all">Tous les Clients</option>
                        {uniqueClients.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>

                    <select
                        value={yearFilter}
                        onChange={(e) => setYearFilter(e.target.value)}
                        style={{ padding: '8px 12px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-main)', fontSize: '13px', outline: 'none', cursor: 'pointer', minWidth: '100px' }}
                    >
                        <option value="all">Toutes Années</option>
                        {uniqueYears.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>

                    <select
                        value={monthFilter}
                        onChange={(e) => setMonthFilter(e.target.value)}
                        style={{ padding: '8px 12px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-main)', fontSize: '13px', outline: 'none', cursor: 'pointer', minWidth: '130px' }}
                    >
                        <option value="all">Tous les Mois</option>
                        {monthsList.map(m => <option key={m.val} value={m.val}>{m.label}</option>)}
                    </select>

                    <div style={{ display: 'flex', background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--border-color)', padding: '3px', flexWrap: 'wrap' }}>
                        {['all', 'À faire', 'Draft', 'Sent', 'Late', 'Paid', 'Archived'].map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                style={{
                                    padding: '6px 12px',
                                    borderRadius: '10px',
                                    border: 'none',
                                    background: filter === f ? 'var(--text-main)' : 'transparent',
                                    color: filter === f ? 'white' : 'var(--text-muted)',
                                    fontWeight: filter === f ? '600' : '500',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {f === 'all' ? 'Toutes' : f === 'Draft' ? 'Brouillon' : f === 'Sent' ? 'Envoyée' : f === 'Late' ? 'Retard' : f === 'Paid' ? 'Payée' : f === 'À faire' ? 'À faire' : 'Archivée'}
                            </button>
                        ))}
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        onClick={handleMoveToHistorique}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 16px',
                            background: selectedFactures.length > 0 ? 'var(--text-main)' : 'var(--card-bg)',
                            color: selectedFactures.length > 0 ? 'white' : 'var(--text-main)',
                            border: '1px solid',
                            borderColor: selectedFactures.length > 0 ? 'var(--text-main)' : 'var(--border-color)',
                            borderRadius: '12px',
                            fontSize: '13px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        <History size={16} /> Vers Historique {selectedFactures.length > 0 && `(${selectedFactures.length})`}
                    </button>
                    {selectedFactures.length > 0 && (
                        <button
                            onClick={handleMassDelete}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '8px 16px',
                                background: 'rgba(239, 68, 68, 0.1)',
                                color: 'var(--danger)',
                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                borderRadius: '12px',
                                fontSize: '13px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            <Trash2 size={16} /> Supprimer {`(${selectedFactures.length})`}
                        </button>
                    )}
                    <button onClick={() => setIsAuditModalOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--info)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '12px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s' }}>
                        <ShieldCheck size={16} /> Audit Factures
                    </button>
                    <button onClick={() => setIsModalOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: 'var(--accent-gold)', color: 'var(--text-main)', border: 'none', borderRadius: '12px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 2px 8px rgba(255, 193, 5, 0.2)', transition: 'all 0.2s' }}>
                        <Plus size={16} /> Nouvelle Facture
                    </button>
                </div>
            </div>

            {/* Reminders Section - Refactored into a compact list */}
            {Object.keys(groupedMissingClients).length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                        <div style={{ width: '3px', height: '14px', background: 'var(--accent-gold)', borderRadius: '4px' }}></div>
                        <h3 style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-main)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Rappels de facturation ({pendingInvoicesStats.count})</h3>
                    </div>
                    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                        {Object.values(groupedMissingClients).map((group, index) => {
                            const isExpanded = expandedClientAlerts[group.enseigne];
                            const isUrgent = group.hasUrgent;

                            return (
                                <div key={group.enseigne}>
                                    {/* Main Row */}
                                    <div
                                        onClick={() => toggleClientAlertExpand(group.enseigne)}
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            padding: '8px 12px',
                                            cursor: 'pointer',
                                            background: isUrgent ? 'rgba(239, 68, 68, 0.02)' : 'transparent',
                                            borderBottom: isExpanded || index === Object.keys(groupedMissingClients).length - 1 ? 'none' : '1px solid var(--border-color)',
                                            transition: 'background 0.2s'
                                        }}
                                        onMouseOver={(e) => { e.currentTarget.style.backgroundColor = isUrgent ? 'rgba(239, 68, 68, 0.05)' : 'rgba(0,0,0,0.02)' }}
                                        onMouseOut={(e) => { e.currentTarget.style.backgroundColor = isUrgent ? 'rgba(239, 68, 68, 0.02)' : 'transparent' }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{
                                                width: '6px',
                                                height: '6px',
                                                borderRadius: '50%',
                                                background: isUrgent ? 'var(--danger)' : '#B45309'
                                            }} />
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <div style={{ fontWeight: '700', fontSize: '12px', color: 'var(--text-main)' }}>{group.enseigne}</div>
                                                <div style={{ fontSize: '10px', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.04)', padding: '2px 6px', borderRadius: '10px', maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {group.invoices.map(inv => {
                                                        const m = new Date(2024, inv.targetMonth, 1).toLocaleDateString('fr-FR', { month: 'short' });
                                                        return m.charAt(0).toUpperCase() + m.slice(1).replace('.', '');
                                                    }).join(', ')}
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{ fontWeight: '800', fontSize: '12px', color: 'var(--text-main)' }}>
                                                {formatNumber(group.totalAmount)}
                                            </div>
                                            <div style={{
                                                transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                                transition: 'transform 0.2s',
                                                color: 'var(--text-muted)'
                                            }}>
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Expanded Sub-rows */}
                                    {isExpanded && (
                                        <div style={{ background: 'rgba(0,0,0,0.015)', borderTop: '1px dashed var(--border-color)', borderBottom: index < Object.keys(groupedMissingClients).length - 1 ? '1px solid var(--border-color)' : 'none' }}>
                                            {group.invoices.map((inv, idx) => {
                                                const rStartDate = new Date(inv.targetYear, inv.targetMonth, inv.cycleDay);
                                                const rEndDate = new Date(inv.targetYear, inv.targetMonth + 1, inv.cycleDay - 1);

                                                return (
                                                    <div key={`${inv.id}-${inv.targetMonth}-${inv.targetYear}`} style={{
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                        padding: '6px 12px 6px 22px',
                                                        borderBottom: idx < group.invoices.length - 1 ? '1px solid rgba(0,0,0,0.03)' : 'none'
                                                    }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            {inv.alertStatus === 'urgent' ? <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--danger)' }}></span> : <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#B45309' }}></span>}
                                                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                                                Période : <span style={{ fontWeight: '600', color: 'var(--text-main)' }}>{rStartDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span> ➔ <span style={{ fontWeight: '600', color: 'var(--text-main)' }}>{rEndDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                                            </span>
                                                        </div>

                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                            <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-main)', marginRight: '4px' }}>
                                                                {formatNumber(inv.montantMensuel)}
                                                            </span>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleIgnoreAlert(inv.id, inv.targetMonth, inv.targetYear);
                                                                }}
                                                                title="Ignorer ce mois"
                                                                style={{ padding: '4px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                                                                onMouseOver={(e) => { e.currentTarget.style.color = 'var(--danger)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)'; e.currentTarget.style.background = 'rgba(239,68,68,0.05)'; }}
                                                                onMouseOut={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.background = 'transparent'; }}
                                                            >
                                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                                                            </button>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setEditingFacture(null);
                                                                    setIsModalOpen(true);
                                                                    setQuickInvoiceClient(inv.id);
                                                                    setQuickInvoiceTargetDate({ month: inv.targetMonth, year: inv.targetYear, cycleDay: inv.cycleDay });
                                                                }}
                                                                style={{ padding: '2px 8px', borderRadius: '4px', border: 'none', background: 'var(--text-main)', color: 'white', fontSize: '10px', fontWeight: '700', cursor: 'pointer', transition: 'background 0.2s' }}
                                                                onMouseOver={(e) => e.currentTarget.style.background = 'var(--text-secondary)'}
                                                                onMouseOut={(e) => e.currentTarget.style.background = 'var(--text-main)'}
                                                            >
                                                                Générer
                                                            </button>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="card" style={{ padding: 0, overflow: 'visible' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ background: 'rgba(0,0,0,0.02)' }}>
                        <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            <th style={{ padding: '4px 8px', width: '24px', textAlign: 'center' }}>
                                <input
                                    type="checkbox"
                                    onChange={handleSelectAll}
                                    checked={filteredFactures.length > 0 && selectedFactures.length === filteredFactures.length}
                                    style={{ cursor: 'pointer', accentColor: 'var(--accent-gold)' }}
                                />
                            </th>
                            <th style={{ padding: '4px 8px', width: '24px', textAlign: 'center' }}>Payé</th>
                            <th style={{ padding: '4px 8px' }}>Client</th>
                            <th onClick={() => handleSort('id')} style={{ padding: '4px 8px', cursor: 'pointer', userSelect: 'none' }} title="Trier par N° Facture">
                                N° Facture {sortConfig.key === 'id' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : <span style={{ opacity: 0.3 }}>↕</span>}
                            </th>
                            <th style={{ padding: '4px 8px' }}>Période</th>
                            <th style={{ padding: '4px 8px' }}>Mois</th>
                            <th style={{ padding: '4px 8px' }}>Émission</th>
                            <th style={{ padding: '4px 8px', textAlign: 'right' }}>Montant TTC</th>
                            <th style={{ padding: '4px 8px', textAlign: 'center' }}>Statut</th>
                            <th style={{ padding: '4px 8px', textAlign: 'center' }}>Banque</th>
                            <th style={{ padding: '4px 8px', textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedFactures.map((f) => {
                            const now = new Date();
                            const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                            const allClients = getClients() || [];
                            
                            // Determine row background color based on status
                            let isDynamicallyLate = false;
                            
                            if (f.statut === 'Sent' || f.statut === 'Late') {
                                let finalEch = null;
                                if (f.echeance && f.echeance !== 'N/A') {
                                    finalEch = new Date(f.echeance);
                                } else if (f.clientId && f.dateEmi) {
                                    const cObj = allClients.find(c => c.id === f.clientId);
                                    if (cObj && cObj.delaiPaiement) {
                                        finalEch = new Date(f.dateEmi);
                                        finalEch.setDate(finalEch.getDate() + parseInt(cObj.delaiPaiement, 10));
                                    }
                                }

                                if (finalEch) {
                                    const echMidnight = new Date(finalEch.getFullYear(), finalEch.getMonth(), finalEch.getDate());
                                    // Retard SEULEMENT si on a dépassé l'échéance (minuit de ce jour là)
                                    isDynamicallyLate = todayMidnight > echMidnight;
                                } else if (f.dateEmi) {
                                    isDynamicallyLate = ((now - new Date(f.dateEmi)) / (1000 * 60 * 60) > 48);
                                }
                            }

                            let rowBg = 'transparent';
                            if (f.statut === 'Paid') rowBg = 'rgba(16, 185, 129, 0.05)'; // Faint green
                            else if (isDynamicallyLate || f.statut === 'Late') rowBg = 'rgba(239, 68, 68, 0.1)'; // Faint red for expired
                            else if (f.statut === 'Sent') rowBg = 'rgba(234, 179, 8, 0.05)'; // Faint yellow for pending
                            else if (f.statut === 'À faire') rowBg = 'rgba(255, 193, 5, 0.05)'; // Faint gold for todo

                            const isPartiallyPaid = f.montantPaye && f.montantPaye > 0 && f.statut !== 'Paid';
                            if (isPartiallyPaid && !isDynamicallyLate) rowBg = 'rgba(245, 158, 11, 0.08)'; // Orange for partial

                            const amountOwed = parseFloat(f.montant);
                            const amountPaid = f.statut === 'Paid' ? amountOwed : (f.montantPaye || 0);
                            const amountRemaining = amountOwed - amountPaid;

                            return (
                                <tr
                                    key={f.id}
                                    style={{
                                        borderBottom: '1px solid var(--border-color)',
                                        fontSize: '12px',
                                        transition: 'all 0.2s ease',
                                        backgroundColor: rowBg
                                    }}
                                    onMouseOver={(e) => { e.currentTarget.style.backgroundColor = f.statut === 'Paid' ? 'rgba(16, 185, 129, 0.1)' : f.statut === 'Late' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255, 255, 255, 0.5)' }}
                                    onMouseOut={(e) => { e.currentTarget.style.backgroundColor = rowBg }}
                                >
                                    <td style={{ padding: '3px 8px', textAlign: 'center' }}>
                                        <input
                                            type="checkbox"
                                            checked={selectedFactures.includes(f.id)}
                                            onChange={() => toggleSelection(f.id)}
                                            style={{ cursor: 'pointer', accentColor: 'var(--accent-gold)' }}
                                            disabled={f.isTodo} // Disable selection for virtual invoices
                                        />
                                    </td>
                                    <td style={{ padding: '3px 8px', textAlign: 'center' }}>
                                        {f.statut !== 'Archived' && f.statut !== 'Draft' && !f.isTodo ? (
                                            <input
                                                type="checkbox"
                                                onChange={() => togglePaidStatus(f.id)}
                                                checked={f.statut === 'Paid'}
                                                style={{ cursor: 'pointer', accentColor: 'var(--success)' }}
                                                title={f.statut === 'Paid' ? "Annuler" : "Payer"}
                                            />
                                        ) : null}
                                    </td>
                                    <td style={{ padding: '3px 8px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <span style={{ fontWeight: '700', color: 'var(--text-main)', fontSize: '11px' }}>{f.client}</span>
                                            {f.isExtra && <span style={{ fontSize: '8px', color: '#059669', fontWeight: '800', background: 'rgba(16, 185, 129, 0.1)', padding: '1px 4px', borderRadius: '4px', border: '1px solid rgba(16, 185, 129, 0.2)' }} title={`Coût Extra: ${formatMoney(f.coutExtra)} - ${f.ressourceExtra}`}>EXTRA</span>}
                                            {f.isExonore && <span style={{ fontSize: '8px', color: '#B45309', fontWeight: '800', background: 'rgba(245, 158, 11, 0.1)', padding: '1px 4px', borderRadius: '4px', border: '1px solid rgba(245, 158, 11, 0.2)' }} title="Client Exonéré de TVA">EXONÉRÉ</span>}
                                        </div>
                                    </td>
                                    <td style={{ padding: '3px 8px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            {(f.tva === 0 && !f.isExonore) || f.id === 'non déclarée' || (f.id && f.id.startsWith('ND-')) ? (
                                                <span style={{ fontSize: '8px', color: 'var(--danger)', fontWeight: '800', textTransform: 'uppercase', background: 'rgba(239, 68, 68, 0.08)', padding: '1px 3px', borderRadius: '3px' }}>ND</span>
                                            ) : (
                                                <span style={{ fontSize: '10px', color: 'var(--text-main)', fontWeight: '600' }}>
                                                    {f.id}
                                                    {f.manualId && <span style={{ marginLeft: '4px', fontSize: '8px', color: 'var(--accent-gold)', fontStyle: 'italic' }}>(Modifié)</span>}
                                                </span>
                                            )}
                                            {!f.isTodo && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleManualIdEdit(f.id, f.id); }}
                                                    title="Modifier le N° Facture"
                                                    style={{ background: 'transparent', border: 'none', padding: '2px', cursor: 'pointer', color: 'var(--text-muted)' }}>
                                                    <Edit size={10} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                    <td style={{ padding: '3px 8px', color: 'var(--text-muted)' }}>
                                        {(f.periodeDebut && f.periodeFin) ? (
                                            <div style={{ fontSize: '9px', background: 'rgba(15, 23, 42, 0.04)', padding: '1px 4px', borderRadius: '4px', display: 'inline-block' }}>
                                                {new Date(f.periodeDebut).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })} - {new Date(f.periodeFin).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                                            </div>
                                        ) : (
                                            <span style={{ fontSize: '9px' }}>--</span>
                                        )}
                                    </td>
                                    <td style={{ padding: '3px 8px', color: 'var(--text-main)', fontWeight: '600', textTransform: 'capitalize', fontSize: '10px' }}>
                                        {new Date(f.dateEmi).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}
                                    </td>
                                    <td style={{ padding: '3px 8px', color: 'var(--text-muted)', fontSize: '10px' }}>
                                        <div>{f.dateEmi}</div>
                                    </td>
                                    <td style={{ padding: '3px 8px', textAlign: 'right', fontWeight: '700', color: 'var(--text-main)', fontSize: '11px' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                            <span style={{ width: '100%', textAlign: 'right' }}>{formatNumber(f.montant)}</span>
                                            {f.paiements && f.paiements.length > 0 && (
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginTop: '4px', borderTop: '1px dashed var(--border-color)', paddingTop: '4px', width: '100%' }}>
                                                    {f.paiements.map((p, idx) => (
                                                        <span key={'pt-'+idx} style={{ fontSize: '9px', color: '#059669', opacity: 0.9 }}>
                                                            + {formatNumber(p.montant)} le {new Date(p.date).toLocaleDateString('fr-FR', {day: '2-digit', month: '2-digit', year: 'numeric'})}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                            {isPartiallyPaid && (
                                                <span style={{ fontSize: '9px', color: '#d97706', fontWeight: '600' }}>
                                                    Reste: {formatNumber(amountRemaining)}
                                                </span>
                                            )}
                                            {(f.statut === 'Paid' || (amountPaid > 0 && !isPartiallyPaid)) && (
                                                <span style={{ fontSize: '9px', color: 'var(--success)', fontWeight: '600' }}>
                                                    Payé en totalité
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td style={{ padding: '3px 8px', textAlign: 'center' }}>
                                        <div style={{ transform: 'scale(0.85)' }}>
                                            {getStatusSelect(f, isDynamicallyLate)}
                                        </div>
                                    </td>
                                    <td style={{ padding: '3px 8px', textAlign: 'center' }}>
                                        {f.isTodo ? (
                                            <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>--</span>
                                        ) : (() => {
                                            const isND = ((!f.tva || f.tva === 0) && !f.isExonore) || f.id === 'non déclarée' || (f.id && f.id.startsWith('ND-'));
                                            const currentAcc = f.compteEncaissement || (isND ? 'QNB' : 'BIAT');
                                            
                                            let bgColor = 'transparent';
                                            let textColor = 'var(--text-main)';
                                            let borderColor = 'var(--border-color)';
                                            
                                            if (currentAcc === 'BIAT') {
                                                bgColor = '#DBEAFE'; textColor = '#1E3A8A'; borderColor = 'rgba(30, 58, 138, 0.2)';
                                            } else if (currentAcc === 'CASH' || currentAcc === 'Cash') {
                                                bgColor = '#D1FAE5'; textColor = '#065F46'; borderColor = 'rgba(6, 95, 70, 0.2)';
                                            } else if (currentAcc === 'QNB') {
                                                bgColor = '#fce7f3'; textColor = '#9d174d'; borderColor = 'rgba(157, 23, 77, 0.2)';
                                            }
                                            
                                            return (
                                                <select
                                                    value={currentAcc}
                                                    onChange={e => handleBankChange(f.id, e.target.value)}
                                                    onClick={e => e.stopPropagation()}
                                                    style={{
                                                        fontSize: '9px',
                                                        fontWeight: '800',
                                                        color: textColor,
                                                        background: bgColor,
                                                        padding: '2px 18px 2px 6px',
                                                        borderRadius: '4px',
                                                        border: `1px solid ${borderColor}`,
                                                        outline: 'none',
                                                        cursor: 'pointer',
                                                        appearance: 'none',
                                                        textAlign: 'center',
                                                        textTransform: 'uppercase'
                                                    }}
                                                    title="Changer le compte d'encaissement"
                                                >
                                                    <option value="BIAT">BIAT</option>
                                                    <option value="QNB">QNB</option>
                                                    <option value="Cash">CASH</option>
                                                </select>
                                            );
                                        })()}
                                    </td>
                                    <td style={{ padding: '4px 8px', textAlign: 'right' }}>
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '4px' }}>
                                            {f.isTodo ? (
                                                <>
                                                    <button 
                                                        onClick={(e) => { 
                                                            e.stopPropagation(); 
                                                            setEditingFacture(null);
                                                            setIsModalOpen(true);
                                                            setQuickInvoiceClient(f.clientId);
                                                            setQuickInvoiceTargetDate({ month: f.targetMonth, year: f.targetYear, cycleDay: f.cycleDay });
                                                        }} 
                                                        title="Créer la facture" 
                                                        style={{ padding: '2px 10px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--text-main)', color: 'white', fontSize: '9px', fontWeight: '800', cursor: 'pointer', marginLeft: 'auto' }}
                                                    >
                                                        GÉNÉRER
                                                    </button>
                                                    <button 
                                                        onClick={(e) => { 
                                                            e.stopPropagation(); 
                                                            handleIgnoreAlert(f.clientId, f.targetMonth, f.targetYear); 
                                                        }} 
                                                        title="Ignorer" 
                                                        style={{ padding: '2px 6px', borderRadius: '4px', border: 'none', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}
                                                    >
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <button onClick={() => handleSend(f.id)} title="Envoyer" style={{ background: 'transparent', border: '1px solid var(--border-color)', padding: '2px', borderRadius: '4px', cursor: 'pointer', color: 'var(--info)' }}><Send size={11} /></button>
                                                    <button onClick={() => handlePrint(f)} title="Imprimer" style={{ background: 'transparent', border: '1px solid var(--border-color)', padding: '2px', borderRadius: '4px', cursor: 'pointer', color: 'var(--text-main)' }}><Printer size={11} /></button>
                                                    <button onClick={() => handleModify(f)} title="Modifier" style={{ background: 'transparent', border: '1px solid var(--border-color)', padding: '2px', borderRadius: '4px', cursor: 'pointer', color: 'var(--accent-gold)' }}><Edit size={11} /></button>
                                                    <button onClick={() => handleArchive(f.id)} title="Archiver" style={{ background: 'transparent', border: '1px solid var(--border-color)', padding: '2px', borderRadius: '4px', cursor: 'pointer', color: 'var(--text-muted)' }}><Archive size={11} /></button>
                                                    <button onClick={(e) => { e.stopPropagation(); handleDelete(f.id); }} title="Supprimer" style={{ background: 'transparent', border: '1px solid var(--border-color)', padding: '2px', borderRadius: '4px', cursor: 'pointer', color: 'var(--danger)' }}><Trash2 size={11} /></button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <FactureModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setEditingFacture(null);
                    setQuickInvoiceClient(null);
                    setQuickInvoiceTargetDate(null);
                }}
                onSave={handleSaveFacture}
                factureToEdit={editingFacture}
                initialClientName={quickInvoiceClient}
                targetDate={quickInvoiceTargetDate}
            />

            <InvoicePreviewModal
                isOpen={!!previewFacture}
                onClose={() => setPreviewFacture(null)}
                facture={previewFacture}
            />

            {/* Payment Date & Partial Modal */}
            {paymentModalInfo && (
                <PaymentConfirmationModal
                    isOpen={!!paymentModalInfo}
                    onClose={() => setPaymentModalInfo(null)}
                    onConfirm={(date, isPartial, amountPaid, destAccount) => confirmPaymentDetails(date, isPartial, amountPaid, destAccount)}
                    facture={factures.find(f => f.id === paymentModalInfo.id)}
                />
            )}

            {/* Custom Confirm Modal */}
            {confirmModal.isOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: 'var(--card-bg)', padding: '24px', borderRadius: '12px', width: '400px', maxWidth: '90%', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
                        <h3 style={{ margin: '0 0 16px 0', color: 'var(--text-main)', fontSize: '16px' }}>Confirmation</h3>
                        <p style={{ margin: '0 0 24px 0', color: 'var(--text-muted)', fontSize: '14px', lineHeight: '1.5' }}>{confirmModal.message}</p>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            <button onClick={() => setConfirmModal({ isOpen: false, type: null, id: null, message: '' })} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-main)', cursor: 'pointer', fontWeight: '600' }}>Annuler</button>
                            <button onClick={executeConfirmAction} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: 'var(--danger)', color: '#fff', cursor: 'pointer', fontWeight: '600' }}>Confirmer</button>
                        </div>
                    </div>
                </div>
            )}

            <InvoiceAuditModal 
                isOpen={isAuditModalOpen} 
                onClose={() => setIsAuditModalOpen(false)} 
            />
        </div>
    );
};

// Extracted Payment Confirmation Component to manage its internal state
const PaymentConfirmationModal = ({ isOpen, onClose, onConfirm, facture }) => {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [isPartial, setIsPartial] = useState(false);
    const [destAccount, setDestAccount] = useState('QNB');

    // Amount remaining to pay for this specific invoice
    const maxAmount = facture ? (parseFloat(facture.montant) - (facture.montantPaye || 0)) : 0;
    const [amount, setAmount] = useState(maxAmount);
    
    const isNonDeclared = facture && (!facture.tva || facture.tva === 0 || facture.id === 'non déclarée' || (facture.id && facture.id.startsWith('ND-')));

    // Sync amount if type changes or facture changes
    React.useEffect(() => {
        if (!isPartial) setAmount(maxAmount);
    }, [isPartial, maxAmount]);

    if (!isOpen || !facture) return null;

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)',
            display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
            <div style={{
                background: 'var(--bg-main)', width: '400px', borderRadius: '24px',
                padding: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
            }}>
                <h2 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '16px' }}>Confirmer le paiement</h2>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px', background: 'var(--card-bg)', padding: '12px', borderRadius: '8px' }}>
                    Facture <strong>{facture.id}</strong> - Client <strong>{facture.client}</strong><br />
                    Montant total: <strong>{new Intl.NumberFormat('fr-TN', { style: 'currency', currency: 'TND' }).format(facture.montant)}</strong>
                    {facture.montantPaye > 0 && (
                        <div style={{ color: 'var(--warning)', marginTop: '4px' }}>
                            Déjà payé: {new Intl.NumberFormat('fr-TN', { style: 'currency', currency: 'TND' }).format(facture.montantPaye)}<br />
                            Reste à payer: <strong>{new Intl.NumberFormat('fr-TN', { style: 'currency', currency: 'TND' }).format(maxAmount)}</strong>
                        </div>
                    )}
                </div>

                <div style={{ marginBottom: '20px' }}>
                    <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Type de Paiement</label>
                    <div style={{ display: 'flex', gap: '16px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                            <input
                                type="radio"
                                checked={!isPartial}
                                onChange={() => setIsPartial(false)}
                                style={{ accentColor: 'var(--success)' }}
                            />
                            Totalité du reste
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                            <input
                                type="radio"
                                checked={isPartial}
                                onChange={() => setIsPartial(true)}
                                style={{ accentColor: 'var(--warning)' }}
                            />
                            Partiel (Acompte)
                        </label>
                    </div>
                </div>

                {isPartial && (
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--warning)', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Montant Encaissé (TND)</label>
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            max={maxAmount}
                            min={0}
                            style={{ width: '100%', padding: '10px', borderRadius: '12px', border: '1px solid var(--warning)', background: 'var(--card-bg)', color: 'var(--warning)', fontSize: '16px', fontWeight: 'bold' }}
                        />
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>Le statut de la facture restera ouvert jusqu'à paiement des 100%.</div>
                    </div>
                )}

                <div style={{ marginBottom: '24px' }}>
                    <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Date d'encaissement</label>
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        max={new Date().toISOString().split('T')[0]} // Cannot be in future
                        style={{ width: '100%', padding: '10px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-main)', fontSize: '14px' }}
                    />
                </div>

                {isNonDeclared && (
                    <div style={{ marginBottom: '24px' }}>
                        <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Encaissé sur</label>
                        <select
                            value={destAccount}
                            onChange={(e) => setDestAccount(e.target.value)}
                            style={{ width: '100%', padding: '10px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-main)', fontSize: '14px', outline: 'none' }}
                        >
                            <option value="QNB">QNB</option>
                            <option value="Cash">Cash (Espèces)</option>
                        </select>
                    </div>
                )}

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                    <button onClick={onClose} style={{ padding: '10px 20px', borderRadius: '12px', border: 'none', background: 'var(--card-bg)', color: 'var(--text-main)', fontWeight: '700', cursor: 'pointer' }}>Annuler</button>
                    <button
                        onClick={() => onConfirm(date, isPartial, amount, isNonDeclared ? destAccount : null)}
                        disabled={isPartial && (!amount || amount <= 0 || amount > maxAmount)}
                        style={{
                            padding: '10px 20px', borderRadius: '12px', border: 'none',
                            background: isPartial ? 'var(--warning)' : 'var(--success)', color: 'white',
                            fontWeight: '700', cursor: 'pointer', opacity: (isPartial && (!amount || amount <= 0 || amount > maxAmount)) ? 0.5 : 1
                        }}
                    >
                        Valider {isPartial ? "l'Acompte" : 'le Paiement'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FacturesPage;
