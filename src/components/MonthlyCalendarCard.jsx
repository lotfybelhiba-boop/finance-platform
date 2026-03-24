import React, { useState, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { getClients, getFactures } from '../services/storageService';

const MonthlyCalendarCard = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [days, setDays] = useState([]);
    const [alerts, setAlerts] = useState({});

    // Récupérer les données pour alimenter le calendrier
    useEffect(() => {
        const fetchAlerts = () => {
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth();
            const newAlerts = {};

            // Helper function to add alert
            const addAlert = (day, type, message) => {
                if (!newAlerts[day]) newAlerts[day] = [];
                newAlerts[day].push({ type, message });
            };

            // 1. Déclarations comptables (Dates fixes globales)
            addAlert(15, 'compta', 'Déclaration Mensuelle (TVA, RS)');
            if ([0, 3, 6, 9].includes(month)) {
                addAlert(28, 'compta', 'Déclaration trimestrielle CNSS');
            }

            // 2. VIREMENTS ATTENDUS (Entrées d'argent réelles calculées dynamiquement)
            try {
                const clients = getClients() || [];
                const factures = getFactures() || [];
                
                // A. Factures Emises ou En Retard
                factures.forEach(f => {
                    if (f.statut === 'Sent' || f.statut === 'Late') {
                        let calculatedDate;
                        const clientRef = clients.find(c => c.id === f.clientId || c.enseigne === f.client);
                        
                        if (clientRef) {
                            const delay = parseInt(clientRef.delaiPaiement, 10);
                            if (!isNaN(delay)) {
                                const emiObj = new Date(f.dateEmi);
                                emiObj.setDate(emiObj.getDate() + delay);
                                calculatedDate = emiObj;
                            } else if (clientRef.regime === 'Abonnement' && clientRef.jourPaiement) {
                                const dPay = parseInt(clientRef.jourPaiement, 10) || 5;
                                const emiObj = new Date(f.dateEmi);
                                let tM = emiObj.getMonth();
                                let tY = emiObj.getFullYear();
                                if (emiObj.getDate() > dPay) {
                                    tM += 1;
                                    if (tM > 11) { tM = 0; tY += 1; }
                                }
                                calculatedDate = new Date(tY, tM, dPay);
                            } else if (clientRef.regime === 'One-Shot' && clientRef.datePaiement) {
                                calculatedDate = new Date(clientRef.datePaiement);
                            } else {
                                const emiObj = new Date(f.dateEmi);
                                emiObj.setDate(emiObj.getDate() + 2);
                                calculatedDate = emiObj;
                            }
                        } else {
                            const emiObj = new Date(f.dateEmi);
                            emiObj.setDate(emiObj.getDate() + 2);
                            calculatedDate = emiObj;
                        }

                        // Seulement les afficher si c'est le mois et l'année en cours affichés sur le calendrier
                        if (calculatedDate && !isNaN(calculatedDate.getTime())) {
                            if (calculatedDate.getMonth() === month && calculatedDate.getFullYear() === year) {
                                addAlert(calculatedDate.getDate(), 'entree', `Virement attendu: ${f.client} (${f.montant}TND)`);
                            }
                        }
                    }
                });

                // Helper to check if a month is within the client contract (start to end dates)
                const isMonthInContract = (c, year, month) => {
                    const targetDate = new Date(year, month, 1);
                    if (c.dateDebut) {
                        const dStart = new Date(c.dateDebut);
                        if (!isNaN(dStart.getTime()) && targetDate < new Date(dStart.getFullYear(), dStart.getMonth(), 1)) return false;
                    }
                    if (c.dateFin) {
                        const dEnd = new Date(c.dateFin);
                        if (!isNaN(dEnd.getTime()) && targetDate > new Date(dEnd.getFullYear(), dEnd.getMonth(), 1)) return false;
                    }
                    return true;
                };

                // B. Abonnements Non facturés (Prévisions)
                clients.forEach(c => {
                    if (c.regime === 'Abonnement' && c.etatClient === 'Actif' && isMonthInContract(c, year, month)) {
                        // Check if invoice exists for this month
                        const hasInvoiceThisMonth = factures.some(f => {
                            if (f.client !== c.enseigne && f.clientId !== c.id) return false;
                            const d = f.periodeDebut ? new Date(f.periodeDebut) : new Date(f.dateEmi);
                            return !isNaN(d.getTime()) && d.getFullYear() === year && d.getMonth() === month;
                        });

                        if (!hasInvoiceThisMonth) {
                            const dPay = parseInt(c.jourPaiement, 10) || 5;
                            // Le calendrier regarde un mois spécifique, l'abonnement tombe ce mois précis (mois calendaire M, généré fin M-1 en théorie, ou M selon la vision bancaire)
                            // Pour simplifier et synchroniser avec la Banque: l'entrée est prévue le dPay du mois affiché
                            addAlert(dPay, 'entree', `Prév. Abonnement: ${c.enseigne}`);
                        }
                    }
                });

            } catch (e) {
                console.error("Erreur de calcul des prévisions de trésorerie", e);
            }

            // 3. Rapports à préparer (Fin du mois)
            const lastDay = new Date(year, month + 1, 0).getDate();
            addAlert(lastDay, 'rapport', 'Préparer les reportings mensuels');

            setAlerts(newAlerts);
        };

        fetchAlerts();
    }, [currentDate]);

    // Générer la grille des jours
    useEffect(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0(Sun) - 6(Sat)
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        // Ajuster pour commencer la semaine au Lundi (1)
        let startingBlankDays = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

        const newDays = [];
        // Jours vides du mois précédent
        for (let i = 0; i < startingBlankDays; i++) {
            newDays.push(null);
        }
        // Jours du mois en cours
        for (let i = 1; i <= daysInMonth; i++) {
            newDays.push(i);
        }

        setDays(newDays);
    }, [currentDate]);

    const handlePrevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const getAlertColor = (type) => {
        switch (type) {
            case 'entree': return '#10B981'; // Green (Cash flow incoming)
            case 'compta': return '#EF4444'; // Red
            case 'rapport': return '#3B82F6'; // Blue
            default: return 'var(--text-muted)';
        }
    };

    const monthNames = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

    const isToday = (day) => {
        const today = new Date();
        return day === today.getDate() && currentDate.getMonth() === today.getMonth() && currentDate.getFullYear() === today.getFullYear();
    };

    return (
        <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', height: '100%' }}>

            {/* Header Calendrier */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ background: 'rgba(255, 193, 5, 0.1)', color: 'var(--accent-gold)', width: '32px', height: '32px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Calendar size={16} />
                    </div>
                    <div>
                        <h2 style={{ fontSize: '14px', fontWeight: '800', margin: '0 0 2px 0', color: 'var(--text-main)' }}>Calendrier des Alertes</h2>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '500' }}>{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</div>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={handlePrevMonth} style={{ background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '4px', cursor: 'pointer', color: 'var(--text-main)', transition: 'all 0.2s', ':hover': { background: 'rgba(0,0,0,0.05)' } }}>
                        <ChevronLeft size={16} />
                    </button>
                    <button onClick={handleNextMonth} style={{ background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '4px', cursor: 'pointer', color: 'var(--text-main)', transition: 'all 0.2s', ':hover': { background: 'rgba(0,0,0,0.05)' } }}>
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>

            {/* Légende Compacte */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', fontSize: '9px', fontWeight: '600', flexWrap: 'wrap', justifyContent: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }} title="Virements Attendus">
                    <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.4)' }} />
                    <span style={{ color: '#10B981' }}>Virements</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }} title="Déclarations comptables">
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: getAlertColor('compta') }} />
                    <span style={{ color: 'var(--text-muted)' }}>Compta.</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }} title="Rapports à préparer">
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: getAlertColor('rapport') }} />
                    <span style={{ color: 'var(--text-muted)' }}>Rapports</span>
                </div>
            </div>

            {/* Grille Jours de la semaine */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '4px' }}>
                {['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'].map(day => (
                    <div key={day} style={{ textAlign: 'center', fontSize: '9px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                        {day}
                    </div>
                ))}
            </div>

            {/* Grille Calendrier */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
                {days.map((day, index) => {
                    const dayAlerts = day ? alerts[day] : null;
                    const hasEntree = dayAlerts && dayAlerts.some(a => a.type === 'entree');
                    const otherAlerts = dayAlerts ? dayAlerts.filter(a => a.type !== 'entree') : null;

                    return (
                        <div
                            key={index}
                            style={{
                                aspectRatio: '1',
                                background: day ? (isToday(day) ? 'rgba(255, 193, 5, 0.1)' : hasEntree ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-main)') : 'transparent',
                                border: day ? `1px solid ${isToday(day) ? 'var(--accent-gold)' : hasEntree ? 'rgba(16, 185, 129, 0.4)' : 'var(--border-color)'}` : 'none',
                                borderRadius: '6px',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                position: 'relative',
                                cursor: dayAlerts ? 'help' : 'default',
                                transition: 'all 0.2s',
                            }}
                            title={dayAlerts ? dayAlerts.map(a => a.message).join('\n') : ''}
                        >
                            {day && (
                                <>
                                    <span style={{ fontSize: '11px', fontWeight: (isToday(day) || hasEntree) ? '800' : '600', color: isToday(day) ? 'var(--accent-gold)' : hasEntree ? '#10B981' : 'var(--text-main)' }}>
                                        {day}
                                    </span>

                                    {/* Conteneur pour les points d'alerte (sauf entree) */}
                                    {otherAlerts && otherAlerts.length > 0 && (
                                        <div style={{ display: 'flex', gap: '2px', position: 'absolute', bottom: '4px' }}>
                                            {otherAlerts.slice(0, 3).map((alert, i) => (
                                                <div key={i} style={{ width: '4px', height: '4px', borderRadius: '50%', background: getAlertColor(alert.type) }} />
                                            ))}
                                            {otherAlerts.length > 3 && (
                                                <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--text-muted)' }} />
                                            )}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default MonthlyCalendarCard;
