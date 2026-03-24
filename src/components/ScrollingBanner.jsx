import React, { useState, useEffect } from 'react';
import { AlertTriangle, Clock, Send, ShieldAlert, CalendarClock } from 'lucide-react';
import { getClients, getFactures } from '../services/storageService';

const ScrollingBanner = () => {
    const [alerts, setAlerts] = useState([]);

    useEffect(() => {
        const calculateAlerts = () => {
            const newAlerts = [];

            // 1. Load Data
            let clients = [];
            let factures = [];
            try {
                clients = getClients();
                factures = getFactures();
            } catch (e) {
                console.error("Error loading data for banner", e);
                return;
            }

            const now = new Date();
            const currentYear = now.getFullYear();
            const currentMonth = now.getMonth();

            // 2. Contrats à envoyer (Active Abonnements without explicit cycle tracking or missing initial contract)
            // Simplified logic: Active Abonnements that don't have a 'dateDebut' set, meaning they are active but lack formal start tracking
            const contratsAEnvoyer = clients.filter(c => c.regime === 'Abonnement' && c.etatClient === 'Actif' && !c.dateDebut).length;
            if (contratsAEnvoyer > 0) {
                newAlerts.push({
                    id: 'contrats',
                    label: 'Contrats à finaliser',
                    value: contratsAEnvoyer,
                    icon: <ShieldAlert size={14} />,
                    color: 'var(--warning)',
                    bg: 'var(--warning-bg)'
                });
            }

            // 3. Factures non envoyées (Drafts)
            const draftFactures = factures.filter(f => f.statut === 'Draft').length;
            if (draftFactures > 0) {
                newAlerts.push({
                    id: 'drafts',
                    label: 'Factures non envoyées',
                    value: draftFactures,
                    icon: <Send size={14} />,
                    color: 'var(--text-muted)',
                    bg: 'rgba(100, 116, 139, 0.1)' // Slate transparent
                });
            }

            // 4. En attente de paiement (Sent)
            const sentFactures = factures.filter(f => f.statut === 'Sent').length;
            if (sentFactures > 0) {
                newAlerts.push({
                    id: 'sent',
                    label: 'En attente de paiement',
                    value: sentFactures,
                    icon: <Clock size={14} />,
                    color: 'var(--info)',
                    bg: 'var(--info-bg)'
                });
            }

            // 5. Retard de paiement (Late)
            const lateFactures = factures.filter(f => f.statut === 'Late').length;
            if (lateFactures > 0) {
                newAlerts.push({
                    id: 'late',
                    label: 'Retards de paiement',
                    value: lateFactures,
                    icon: <AlertTriangle size={14} />,
                    color: 'var(--danger)',
                    bg: 'var(--danger-bg)'
                });
            }

            // 6. Prochain paiement (Due in next 7 days)
            const upcomingPayments = factures.filter(f => {
                if (f.statut !== 'Sent' || !f.echeance || f.echeance === 'N/A') return false;
                const dueDate = new Date(f.echeance);
                if (isNaN(dueDate.getTime())) return false;

                const diffTime = dueDate.getTime() - now.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                return diffDays >= 0 && diffDays <= 7;
            }).length;

            if (upcomingPayments > 0) {
                newAlerts.push({
                    id: 'upcoming',
                    label: 'Paiements imminents (7j)',
                    value: upcomingPayments,
                    icon: <CalendarClock size={14} />,
                    color: 'var(--success)',
                    bg: 'var(--success-bg)'
                });
            }

            // If everything is perfect, show a success message so the banner isn't completely empty
            if (newAlerts.length === 0) {
                newAlerts.push({
                    id: 'all-good',
                    label: 'Tout est à jour !',
                    value: '0 action requise',
                    icon: <ShieldAlert size={14} />,
                    color: 'var(--success)',
                    bg: 'var(--success-bg)'
                });
            }

            setAlerts(newAlerts);
        };

        calculateAlerts();

        // Optional: set an interval to refresh the banner data periodically (e.g., every 60s)
        const interval = setInterval(calculateAlerts, 60000);
        return () => clearInterval(interval);
    }, []);

    // Duplicate the alerts array to create a seamless infinite loop
    const displayAlerts = [...alerts, ...alerts, ...alerts];

    return (
        <div style={{
            width: '100%',
            overflow: 'hidden',
            background: 'var(--card-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            marginBottom: '24px',
            padding: '10px 0',
            display: 'flex',
            alignItems: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
            position: 'relative'
        }}>
            {/* Left fade gradient */}
            <div style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: '40px',
                background: 'linear-gradient(to right, var(--bg-color), transparent)',
                zIndex: 2,
                pointerEvents: 'none',
                borderTopLeftRadius: '16px',
                borderBottomLeftRadius: '16px'
            }}></div>

            {/* The scrolling container */}
            <div className="marquee-container" style={{
                display: 'flex',
                gap: '24px',
                paddingLeft: '24px', /* Initial offset */
            }}>
                {displayAlerts.map((alert, index) => (
                    <div
                        key={`${alert.id}-${index}`}
                        className="marquee-item"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            background: alert.bg,
                            padding: '6px 14px',
                            borderRadius: '100px',
                            border: `1px solid ${alert.color}33`, /* 33 is 20% opacity in hex */
                            whiteSpace: 'nowrap',
                            cursor: 'default',
                            transition: 'transform 0.2s, box-shadow 0.2s'
                        }}
                    >
                        <div style={{ color: alert.color, display: 'flex', alignItems: 'center' }}>
                            {alert.icon}
                        </div>
                        <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-main)' }}>
                            {alert.label}
                        </div>
                        <div style={{
                            fontSize: '12px',
                            fontWeight: '800',
                            background: alert.color,
                            color: 'white',
                            padding: '2px 8px',
                            borderRadius: '10px',
                            marginLeft: '4px'
                        }}>
                            {alert.value}
                        </div>
                    </div>
                ))}
            </div>

            {/* Right fade gradient */}
            <div style={{
                position: 'absolute',
                right: 0,
                top: 0,
                bottom: 0,
                width: '40px',
                background: 'linear-gradient(to left, var(--bg-color), transparent)',
                zIndex: 2,
                pointerEvents: 'none',
                borderTopRightRadius: '16px',
                borderBottomRightRadius: '16px'
            }}></div>
        </div>
    );
};

export default ScrollingBanner;
