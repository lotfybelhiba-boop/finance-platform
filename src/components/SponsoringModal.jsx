import React, { useState, useEffect } from 'react';
import { X, AlertCircle, Save } from 'lucide-react';
import { getClients } from '../services/storageService';

const emptySponsoring = {
    id: '',
    client: '',
    plateforme: 'Meta',
    montantClientTND: '', // What the client pays for ads
    fraisService: 30,     // Fixed service fee per campaign
    tauxVente: 5,         // Our rate for the client
    tauxAchat: 3.5,       // Rate the bank charges us
    dateDebut: '',
    dateFin: '',
    statut: 'Actif'
};

const SponsoringModal = ({ isOpen, onClose, onSave, initialData }) => {
    const [formData, setFormData] = useState(emptySponsoring);
    const [clientsList, setClientsList] = useState([]);

    useEffect(() => {
        if (isOpen) {
            setFormData(initialData ? { ...initialData } : { ...emptySponsoring, id: `SPONSOR-${Date.now()}` });

            // Fetch clients for dropdown
            const savedClients = getClients();
            if (savedClients) {
                setClientsList(savedClients.map(c => c.enseigne));
            }
        }
    }, [isOpen, initialData]);

    if (!isOpen) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = () => {
        if (!formData.client || !formData.montantClientTND || !formData.dateDebut) {
            alert('Veuillez remplir les champs obligatoires (Client, Budget TND, Date de début).');
            return;
        }

        const clientTND = parseFloat(formData.montantClientTND) || 0;

        if (clientTND < 0) {
            alert("❗ Opération refusée.\nLe budget fixé par le client ne peut pas être négatif.");
            return;
        }

        if (formData.dateDebut && formData.dateFin) {
            if (new Date(formData.dateFin) < new Date(formData.dateDebut)) {
                alert("❗ Opération refusée.\nLa date de fin de sponsoring ne peut pas être antérieure à la date de début.");
                return;
            }
        }

        const fraisSvc = parseFloat(formData.fraisService) || 0;
        const tv = parseFloat(formData.tauxVente) || 1;
        const ta = parseFloat(formData.tauxAchat) || 1;

        // 1. Déduire les frais de service du budget global du client
        const adBudgetTND = Math.max(0, clientTND - fraisSvc);

        // 2. Calculer le budget USD qui ira sur la plateforme
        const budgetUSD = tv > 0 ? adBudgetTND / tv : 0;

        // 3. Calculer combien la banque va nous facturer pour ces USD
        const coutBanqueTND = budgetUSD * ta;

        // 4. Marge = Total payé par le client - Ce qu'on paie à la banque
        const margeNette = clientTND - coutBanqueTND;

        // 5. Total facturé = Exactement le budget fixé par le client
        const totalFacture = clientTND;

        const completeData = {
            ...formData,
            montantClientTND: clientTND,
            fraisService: fraisSvc,
            tauxVente: tv,
            tauxAchat: ta,
            montantUSD: budgetUSD,
            montantTNDBanque: coutBanqueTND,
            montantTNDFacture: totalFacture,
            margeNette: margeNette
        };

        onSave(completeData);
        onClose();
    };

    const plateformes = ['Meta', 'Google Ads', 'TikTok', 'LinkedIn', 'Snapchat', 'Autre'];

    // Dynamic calculations for the UI
    const currentBudgetClient = parseFloat(formData.montantClientTND) || 0;
    const currentFraisSvc = parseFloat(formData.fraisService) || 0;
    const currentTauxVente = parseFloat(formData.tauxVente) || 1;
    const currentTauxAchat = parseFloat(formData.tauxAchat) || 1;

    // Example: Client gives 100 TND. Fee is 30. Remaining for ads is 70 TND.
    const currentAdBudgetTND = Math.max(0, currentBudgetClient - currentFraisSvc);
    // 70 TND / 5 TND/USD = 14 USD
    const currentUSD = currentTauxVente > 0 ? (currentAdBudgetTND / currentTauxVente) : 0;
    // 14 USD * 3.5 TND/USD = 49 TND cost
    const currentBankCost = currentUSD * currentTauxAchat;
    // Total Gain = 100 TND (Given) - 49 TND (Bank Cost) = 51 TND
    const currentMargin = currentBudgetClient - currentBankCost;
    // Total Billed = 100 TND exactly
    const currentTotalBilled = currentBudgetClient;

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '16px' }}>
            <div className="card" style={{ background: 'var(--card-bg)', width: '100%', maxWidth: '520px', borderRadius: '12px', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 50px rgba(0,0,0,0.2)', border: '1px solid var(--border-color)' }}>

                {/* Header */}
                <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-main)', borderTopLeftRadius: '12px', borderTopRightRadius: '12px' }}>
                    <h2 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-main)', margin: '0' }}>
                        {initialData ? 'Modifier le Sponsoring' : 'Nouveau Budget Sponsoring'}
                    </h2>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px' }}>
                        <X size={16} />
                    </button>
                </div>

                {/* Content */}
                <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

                    {/* Ligne 1 : Client & Plateforme */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '12px' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Client / Projet *</label>
                            <select
                                name="client"
                                value={formData.client}
                                onChange={handleChange}
                                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-main)', fontSize: '12px', outline: 'none', cursor: 'pointer' }}
                            >
                                <option value="" disabled>Sélectionner...</option>
                                {clientsList.map((c, i) => <option key={i} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Plateforme</label>
                            <select
                                name="plateforme"
                                value={formData.plateforme}
                                onChange={handleChange}
                                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-main)', fontSize: '12px', outline: 'none', cursor: 'pointer' }}
                            >
                                {plateformes.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Ligne 2 : Budget Fixé & Frais */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '12px' }}>
                        <div style={{ background: 'var(--bg-main)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                            <div style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>BUDGET FIXÉ PAR LE CLIENT (TND)</div>
                            <div style={{ position: 'relative' }}>
                                <input type="number" name="montantClientTND" value={formData.montantClientTND} onChange={handleChange} placeholder="ex: 100" style={{ width: '100%', padding: '8px 36px 8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-main)', fontSize: '14px', outline: 'none', fontWeight: '800' }} />
                                <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '11px', fontWeight: '700' }}>TND</span>
                            </div>
                        </div>
                        <div style={{ background: 'var(--bg-main)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                            <div style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>FRAIS DE SERVICE</div>
                            <div style={{ position: 'relative' }}>
                                <input type="number" name="fraisService" value={formData.fraisService} onChange={handleChange} placeholder="ex: 30" style={{ width: '100%', padding: '8px 36px 8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-main)', fontSize: '14px', outline: 'none', fontWeight: '800' }} />
                                <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '11px', fontWeight: '700' }}>TND</span>
                            </div>
                        </div>
                    </div>

                    {/* Ligne 3: Conversion Taux et Calculs (No bold colors, strictly neutral) */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        {/* Budget Plateforme (USD) */}
                        <div style={{ background: 'var(--bg-main)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>1. Budget Alloué (USD)</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Je vends à:</span>
                                <input type="number" step="0.01" name="tauxVente" value={formData.tauxVente} onChange={handleChange} style={{ width: '60px', padding: '4px 6px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-main)', fontSize: '11px', outline: 'none', fontWeight: '700' }} />
                            </div>
                            <div style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-main)' }}>
                                {currentUSD.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                            </div>
                        </div>

                        {/* Banque (TND) */}
                        <div style={{ background: 'var(--bg-main)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>2. Coût Banque (TND)</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>J'achète à:</span>
                                <input type="number" step="0.01" name="tauxAchat" value={formData.tauxAchat} onChange={handleChange} style={{ width: '60px', padding: '4px 6px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-main)', fontSize: '11px', outline: 'none', fontWeight: '700' }} />
                            </div>
                            <div style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-main)' }}>
                                {currentBankCost.toLocaleString('fr-TN', { minimumFractionDigits: 3 })} <span style={{ fontSize: '10px' }}>TND</span>
                            </div>
                        </div>
                    </div>

                    {/* Ligne 4: Totals & Marge */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--bg-main)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <div>
                            <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '2px' }}>Total Facturé au Client</span>
                            <span style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-main)' }}>
                                {currentTotalBilled.toLocaleString('fr-TN', { minimumFractionDigits: 3 })} TND
                            </span>
                        </div>
                        <div style={{ width: '1px', height: '20px', background: 'var(--border-color)' }}></div>
                        <div style={{ textAlign: 'right' }}>
                            <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '2px' }}>Marge Nette (Mynds)</span>
                            <span style={{ fontSize: '15px', fontWeight: '900', color: currentMargin > 0 ? 'var(--success)' : (currentMargin < 0 ? 'var(--text-main)' : 'var(--text-muted)') }}>
                                {currentMargin > 0 ? '+' : ''}{currentMargin.toLocaleString('fr-TN', { minimumFractionDigits: 3 })} TND
                            </span>
                        </div>
                    </div>

                    {/* Ligne 5 : Dates & Statut */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Début *</label>
                            <input type="date" name="dateDebut" value={formData.dateDebut} onChange={handleChange} style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-main)', fontSize: '12px', outline: 'none' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Fin</label>
                            <input type="date" name="dateFin" value={formData.dateFin} onChange={handleChange} style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-main)', fontSize: '12px', outline: 'none' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Statut</label>
                            <select
                                name="statut"
                                value={formData.statut}
                                onChange={handleChange}
                                style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-main)', fontSize: '12px', outline: 'none', cursor: 'pointer' }}
                            >
                                <option value="Actif">Actif</option>
                                <option value="Terminé">Terminé</option>
                                <option value="En pause">En pause</option>
                            </select>
                        </div>
                    </div>

                </div>

                {/* Footer */}
                <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: '8px', background: 'var(--bg-main)', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px' }}>
                    <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-main)', cursor: 'pointer', fontWeight: '700', fontSize: '12px', transition: 'all 0.2s' }}>
                        Annuler
                    </button>
                    <button onClick={handleSave} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '8px', border: 'none', background: 'var(--text-main)', color: 'white', cursor: 'pointer', fontWeight: '700', fontSize: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', transition: 'all 0.2s' }}>
                        <Save size={14} /> Enregistrer
                    </button>
                </div>

            </div>
        </div>
    );
};

export default SponsoringModal;
