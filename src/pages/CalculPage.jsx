import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Calculator, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getClients, getStorage, setStorage } from '../services/storageService';

const CalculPage = () => {
    const navigate = useNavigate();

    // === STATE: CURRENT SIMULATION ===
    const [projectName, setProjectName] = useState('');
    const [revenue, setRevenue] = useState('');
    const [tvaRate, setTvaRate] = useState('19'); // '19' (Taux standard), '0' (Exonérations), 'non_declare'
    // duree in months (can be fractional like 1.25)
    const [duree, setDuree] = useState('1');
    const [dureeAffichage, setDureeAffichage] = useState('1 mois');
    const [dateDebut, setDateDebut] = useState('');
    const [dateFin, setDateFin] = useState('');
    const [monthlyCosts, setMonthlyCosts] = useState([
        { id: Date.now() + 1, type: 'RH', name: '', montant: '' },
        { id: Date.now() + 2, type: 'Pub', name: '', montant: '' },
        { id: Date.now() + 3, type: 'Mng', name: '', montant: '' },
        { id: Date.now() + 4, type: 'Abonnement Logiciel', name: '', montant: '' }
    ]);

    // === STATE: SAVED PROJECTS ===
    const [savedProjects, setSavedProjects] = useState([]);

    // === STATE: CLIENTS FOR DROPDOWN ===
    const [clientsDatalist, setClientsDatalist] = useState([]);

    // === STATE: PERSONAL EXPENSES ===
    const [personalCosts, setPersonalCosts] = useState([
        { id: Date.now() + 10, desc: 'Loyer Personnel', montant: '' },
        { id: Date.now() + 11, desc: 'Nourriture & Courses', montant: '' },
        { id: Date.now() + 12, desc: 'Transport / Carburant', montant: '' },
        { id: Date.now() + 13, desc: 'Factures (Électricité, Eau, Internet perso)', montant: '' },
    ]);

    // Load from local storage on mount
    useEffect(() => {
        const stored = getStorage('mynds_saved_simulations');
        if (stored) {
            setSavedProjects(stored);
        }
        const storedPerso = getStorage('mynds_personal_costs');
        if (storedPerso) {
            setPersonalCosts(storedPerso);
        }

        // Load clients
        let parsedClients = getClients();

        // Ensure default test clients exist as per requirement
        const defaultNames = ['Elkindy', 'Globaleep', 'Robert Bosch Tunisie'];
        defaultNames.forEach(name => {
            if (!parsedClients.find(c => c.enseigne === name && c.name === name)) {
                parsedClients.push({ id: `default-${name}`, name, enseigne: name });
            }
        });
        setClientsDatalist(parsedClients);

    }, []);

    // Auto-calculate duration when dates change
    useEffect(() => {
        if (dateDebut && dateFin) {
            const startStr = new Date(dateDebut);
            const endStr = new Date(dateFin);

            if (endStr >= startStr) {
                // To accurately calculate calendar months, we consider the end date inclusive
                const end = new Date(endStr);
                end.setDate(end.getDate() + 1); // e.g. Jan 1 to Jan 31 -> Jan 1 to Feb 1

                let months = 0;
                let tempDate = new Date(startStr);

                // Add full calendar months until exceeding the end date
                while (true) {
                    tempDate.setMonth(tempDate.getMonth() + 1);
                    if (tempDate > end) {
                        tempDate.setMonth(tempDate.getMonth() - 1); // Step back
                        break;
                    }
                    months++;
                }

                // Remaining days
                const diffTime = Math.abs(end - tempDate);
                const remainingDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

                // Calculate fractional duration (approx 1 day = 1/30 month for financial margins)
                const calcFractional = months + (remainingDays / 30);

                // Format display string
                let text = '';
                if (months > 0) {
                    text += `${months} mois`;
                }
                if (remainingDays > 0) {
                    if (text) text += ' et ';
                    text += `${remainingDays} jour${remainingDays > 1 ? 's' : ''}`;
                }
                if (text === '') text = '0 mois';

                setDuree(calcFractional.toString());
                setDureeAffichage(text);
            }
        } else {
            // Manual fallback
            setDureeAffichage(`${duree} mois`);
        }
    }, [dateDebut, dateFin, duree]);

    // Handlers for Current Project Costs
    const handleCostChange = (id, field, value) => {
        setMonthlyCosts(monthlyCosts.map(cost => cost.id === id ? { ...cost, [field]: value } : cost));
    };

    const addCostRow = () => {
        setMonthlyCosts([...monthlyCosts, { id: Date.now(), type: 'Autre', name: '', montant: '' }]);
    };

    const removeCostRow = (id) => {
        setMonthlyCosts(monthlyCosts.filter(cost => cost.id !== id));
    };

    // Handlers for Personal Costs
    const handlePersoChange = (id, field, value) => {
        const newPerso = personalCosts.map(cost => cost.id === id ? { ...cost, [field]: value } : cost);
        setPersonalCosts(newPerso);
        setStorage('mynds_personal_costs', newPerso);
    };

    const addPersoRow = () => {
        const newPerso = [...personalCosts, { id: Date.now(), desc: '', montant: '' }];
        setPersonalCosts(newPerso);
        setStorage('mynds_personal_costs', newPerso);
    };

    const removePersoRow = (id) => {
        const newPerso = personalCosts.filter(cost => cost.id !== id);
        setPersonalCosts(newPerso);
        setStorage('mynds_personal_costs', newPerso);
    };

    // === CALCULATIONS: CURRENT PROJECT ===
    const rawRevenue = parseFloat(revenue) || 0;

    // Calculate VAT based on Net Revenue (HT)
    const parsedRevenue = rawRevenue; // The inputted amount is HT

    let tvaAmount = 0;
    if (tvaRate === '19') {
        tvaAmount = parsedRevenue * 0.19; // Calculate 19% VAT on top of HT
    }
    const totalRevenueTTC = parsedRevenue + tvaAmount;

    const projectMonths = parseFloat(duree) || 1;
    const totalMonthlyCosts = monthlyCosts.reduce((acc, curr) => acc + (parseFloat(curr.montant) || 0), 0);
    const monthlyMargin = parsedRevenue - totalMonthlyCosts;
    const totalProjectMargin = monthlyMargin * projectMonths;
    const annualMargin = monthlyMargin * 12;
    const marginRate = parsedRevenue > 0 ? (monthlyMargin / parsedRevenue) * 100 : 0;

    // Daily rate calculation (approx 21 working days in a month)
    const prixJour = parsedRevenue / 21;

    const handleSaveProject = () => {
        if (!revenue || parsedRevenue <= 0) {
            alert("Veuillez entrer un chiffre d'affaires valide avant de sauvegarder.");
            return;
        }

        const newProject = {
            id: Date.now(),
            name: projectName || `Projet sans nom`,
            duration: projectMonths,
            durationDisplay: dureeAffichage,
            dateDebut: dateDebut || '-',
            dateFin: dateFin || '-',
            rawRevenue,
            tvaRate,
            tvaAmount,
            revenue: parsedRevenue,
            totalMonthlyCosts,
            monthlyMargin,
            totalProjectMargin,
            marginRate
        };

        const updatedProjects = [...savedProjects, newProject];
        setSavedProjects(updatedProjects);
        setStorage('mynds_saved_simulations', updatedProjects);

        // Reset form
        setProjectName('');
        setRevenue('');
        setTvaRate('19');
        setDuree('1');
        setDureeAffichage('1 mois');
        setDateDebut('');
        setDateFin('');
        setMonthlyCosts([
            { id: Date.now() + 1, type: 'RH', name: '', montant: '' },
            { id: Date.now() + 2, type: 'Pub', name: '', montant: '' },
            { id: Date.now() + 3, type: 'Mng', name: '', montant: '' },
            { id: Date.now() + 4, type: 'Abonnement Logiciel', name: '', montant: '' }
        ]);

        // Redirect to Finance page
        navigate('/finance');
    };

    const removeSavedProject = (id) => {
        const updated = savedProjects.filter(p => p.id !== id);
        setSavedProjects(updated);
        setStorage('mynds_saved_simulations', updated);
    };

    // === CALCULATIONS: GLOBAL BILAN ===
    const globalRevenueMonthly = savedProjects.reduce((acc, curr) => acc + curr.revenue, 0);
    const globalCostsMonthly = savedProjects.reduce((acc, curr) => acc + curr.totalMonthlyCosts, 0);
    const globalNetMonthlyAvg = savedProjects.reduce((acc, curr) => acc + curr.monthlyMargin, 0); // Assuming all concurrent
    const globalMarginRate = globalRevenueMonthly > 0 ? (globalNetMonthlyAvg / globalRevenueMonthly) * 100 : 0;

    // === CALCULATIONS: PERSONAL & RESTE A VIVRE ===
    const totalPersonalCosts = personalCosts.reduce((acc, curr) => acc + (parseFloat(curr.montant) || 0), 0);
    const resteAVivre = globalNetMonthlyAvg - totalPersonalCosts;

    const formatMoney = (amount) => {
        return new Intl.NumberFormat('fr-TN', { style: 'currency', currency: 'TND', minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(amount);
    };

    return (
        <div className="page" style={{ paddingBottom: '60px' }}>

            <div className="card" style={{ padding: '24px', marginBottom: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid var(--border-color)' }}>
                    <div style={{ padding: '8px', background: 'var(--primary-color)', borderRadius: '8px', color: 'white' }}>
                        <Calculator size={20} />
                    </div>
                    <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>Simulateur Projet</h2>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '32px', alignItems: 'start' }}>
                    {/* LEFT COL: PROJECT SIMULATOR FORM */}
                    <div style={{ display: 'flex', flexDirection: 'column' }}>

                        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)', gap: '16px', marginBottom: '24px' }}>
                            <div className="form-group">
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Nom du Projet</label>
                                <input
                                    type="text"
                                    list="clients-list"
                                    className="input-field"
                                    value={projectName}
                                    onChange={(e) => setProjectName(e.target.value)}
                                    placeholder="Ex: Refonte Site, Elkindy..."
                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '13px' }}
                                />
                                <datalist id="clients-list">
                                    {clientsDatalist.map(client => (
                                        <option key={client.id} value={client.enseigne || client.name} />
                                    ))}
                                </datalist>
                            </div>
                            <div className="form-group">
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>C.A. Mensuel *</label>
                                <div style={{ position: 'relative' }}>
                                    <input type="number" className="input-field" value={revenue} onChange={(e) => setRevenue(e.target.value)} placeholder="0.000" style={{ width: '100%', padding: '10px 36px 10px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '13px', fontWeight: 'bold', color: 'var(--primary-color)' }} />
                                    <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '12px', fontWeight: '600' }}>TND</span>
                                </div>
                            </div>
                            <div className="form-group">
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>TVA</label>
                                <select
                                    className="input-field"
                                    value={tvaRate}
                                    onChange={(e) => setTvaRate(e.target.value)}
                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '13px', backgroundColor: 'white' }}
                                >
                                    <option value="19">19%</option>
                                    <option value="0">Exonérations</option>
                                    <option value="non_declare">Non déclaré</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Durée (Mois) *</label>
                                <input
                                    type={(dateDebut && dateFin) ? "text" : "number"}
                                    className="input-field"
                                    value={(dateDebut && dateFin) ? dureeAffichage : duree}
                                    onChange={(e) => setDuree(e.target.value)}
                                    min="1"
                                    placeholder="1"
                                    disabled={!!(dateDebut && dateFin)}
                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '13px', fontWeight: 'bold', backgroundColor: (dateDebut && dateFin) ? '#f1f5f9' : 'white', cursor: (dateDebut && dateFin) ? 'not-allowed' : 'text' }}
                                />
                                {(dateDebut && dateFin) && <span style={{ fontSize: '10px', color: '#10b981', marginTop: '4px', display: 'block' }}>Calculé auto.</span>}
                            </div>
                            <div className="form-group">
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Date Début</label>
                                <input type="date" className="input-field" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '13px' }} />
                            </div>
                            <div className="form-group">
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Date Fin</label>
                                <input type="date" className="input-field" value={dateFin} onChange={(e) => setDateFin(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '13px' }} />
                            </div>
                        </div>

                        <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-main)', margin: 0 }}>Charges Mensuelles Directes</h3>
                            <button onClick={addCostRow} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: '600', color: 'var(--primary-color)', background: 'rgba(37, 99, 235, 0.05)', padding: '6px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer' }}>
                                <Plus size={14} /> Ajouter une charge
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {monthlyCosts.map((cost) => (
                                <div key={cost.id} style={{ display: 'grid', gridTemplateColumns: '130px 1fr 140px 32px', gap: '8px', alignItems: 'center' }}>

                                    {/* TYPE DE CHARGE */}
                                    <select
                                        className="input-field"
                                        value={cost.type}
                                        onChange={(e) => handleCostChange(cost.id, 'type', e.target.value)}
                                        style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '13px', backgroundColor: '#f8fafc', fontWeight: '600', color: 'var(--text-main)' }}
                                    >
                                        <option value="RH">RH</option>
                                        <option value="Marketeur">Marketeur</option>
                                        <option value="Pub">Pub</option>
                                        <option value="Mng">Mng</option>
                                        <option value="Abonnement Logiciel">Logiciel</option>
                                        <option value="Autre">Autre</option>
                                    </select>

                                    {/* DETAILS / NOM */}
                                    <input
                                        type="text"
                                        className="input-field"
                                        value={cost.name}
                                        onChange={(e) => handleCostChange(cost.id, 'name', e.target.value)}
                                        placeholder={
                                            cost.type === 'RH' ? 'Nom employé/freelance...' :
                                                cost.type === 'Pub' ? 'Ex: Facebook Ads...' :
                                                    cost.type === 'Mng' ? 'Nom du manager...' :
                                                        cost.type === 'Abonnement Logiciel' ? 'Ex: Adobe, Canva...' :
                                                            'Détails...'
                                        }
                                        style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '13px' }}
                                    />

                                    {/* MONTANT */}
                                    <div style={{ position: 'relative' }}>
                                        <input type="number" className="input-field" value={cost.montant} onChange={(e) => handleCostChange(cost.id, 'montant', e.target.value)} placeholder="0.000" style={{ width: '100%', padding: '8px 32px 8px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '13px', fontWeight: 'bold' }} />
                                        <span style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '11px', fontWeight: '600' }}>TND</span>
                                    </div>

                                    {/* SUPPRIMER */}
                                    <button onClick={() => removeCostRow(cost.id)} style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px', background: '#fee2e2', color: '#ef4444', border: 'none', cursor: 'pointer', opacity: monthlyCosts.length > 1 ? 1 : 0.5 }} disabled={monthlyCosts.length <= 1}>
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* RIGHT COL: SIMULATION RESULTS */}
                    <div style={{ paddingLeft: '24px', borderLeft: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
                        <div>
                            <div style={{ marginBottom: '20px' }}>
                                <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Marge Nette Mensuelle</span>
                                <div style={{ fontSize: '28px', fontWeight: '900', color: 'var(--primary-color)', letterSpacing: '-0.5px' }}>
                                    {formatMoney(monthlyMargin)}
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px dashed var(--border-color)' }}>
                                    <span style={{ color: 'var(--text-main)', fontSize: '13px', fontWeight: '600' }}>C.A. Net (HT)</span>
                                    <span style={{ fontWeight: '800', fontSize: '13px', color: 'var(--text-main)' }}>{formatMoney(parsedRevenue)}</span>
                                </div>
                                {tvaAmount > 0 && (
                                    <>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px dashed var(--border-color)' }}>
                                            <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>TVA (19%) à facturer</span>
                                            <span style={{ fontWeight: '600', fontSize: '13px', color: '#3b82f6' }}>+ {formatMoney(tvaAmount)}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px dashed var(--border-color)' }}>
                                            <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Total Facture (TTC)</span>
                                            <span style={{ fontWeight: '700', fontSize: '13px', color: 'var(--text-muted)' }}>{formatMoney(totalRevenueTTC)}</span>
                                        </div>
                                    </>
                                )}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px dashed var(--border-color)' }}>
                                    <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Prix Jour (J/H Net)</span>
                                    <span style={{ fontWeight: '600', fontSize: '13px', color: 'var(--text-muted)' }}>{formatMoney(prixJour)}/j</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px dashed var(--border-color)' }}>
                                    <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Total Charges</span>
                                    <span style={{ fontWeight: '700', fontSize: '13px', color: '#ef4444' }}>- {formatMoney(totalMonthlyCosts)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px dashed var(--border-color)' }}>
                                    <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Taux de Rentabilité</span>
                                    <span style={{ fontWeight: '800', fontSize: '13px', color: marginRate >= 50 ? '#10b981' : marginRate >= 20 ? '#f59e0b' : '#ef4444' }}>
                                        {marginRate.toFixed(1)}%
                                    </span>
                                </div>
                            </div>

                            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '6px', marginBottom: '20px' }}>
                                <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>Projections</div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                    <span style={{ fontSize: '12px', color: 'var(--text-main)' }}>Bénéf. projet ({dureeAffichage})</span>
                                    <span style={{ fontWeight: '700', fontSize: '13px', color: '#10b981' }}>{formatMoney(totalProjectMargin)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                    <span style={{ fontSize: '12px', color: 'var(--text-main)' }}>Bénéf. annuel (12 mois)</span>
                                    <span style={{ fontWeight: '700', fontSize: '13px', color: '#10b981' }}>{formatMoney(annualMargin)}</span>
                                </div>
                                <button
                                    onClick={handleSaveProject}
                                    style={{
                                        width: '100%',
                                        padding: '14px',
                                        background: 'var(--accent-gold)',
                                        color: 'var(--text-main)',
                                        border: 'none',
                                        borderRadius: '12px',
                                        fontSize: '15px',
                                        fontWeight: '800',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '10px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        boxShadow: '0 8px 20px rgba(255, 193, 5, 0.2)'
                                    }}
                                >
                                    <Check size={18} strokeWidth={3} /> Enregistrer ce projet
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CalculPage;
