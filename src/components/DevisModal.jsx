import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, FileDown } from 'lucide-react';
import { generateDocumentPDF } from '../utils/pdfGenerator.jsx';
import { loadConfig, initialServices } from '../data/defaultConfig';

const DevisModal = ({ isOpen, onClose, onSave }) => {
    const [client, setClient] = useState('');
    const [dateEmi, setDateEmi] = useState(new Date().toISOString().split('T')[0]);
    const [validite, setValidite] = useState('');
    const [lignes, setLignes] = useState([]);
    const [conditions, setConditions] = useState('Standard');
    const [applyTva, setApplyTva] = useState(true);
    const [applyTimbre, setApplyTimbre] = useState(true);
    const [notes, setNotes] = useState('');
    const [statut, setStatut] = useState('Draft');

    // NOUVEAUX ÉTATS POUR LA SÉLECTION HIÉRARCHIQUE DE SERVICES
    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedServiceId, setSelectedServiceId] = useState('');

    const [servicesList, setServicesList] = useState([]);

    useEffect(() => {
        if (isOpen) {
            setServicesList(loadConfig('services', initialServices));
        }
    }, [isOpen]);

    const clients = ['Future Corp', 'Green Energy', 'Tech Build', 'Local Shop'];

    const sousTotalHT = lignes.reduce((acc, ligne) => acc + (ligne.qte * ligne.prix), 0);
    const tva = applyTva ? sousTotalHT * 0.19 : 0;
    const timbre = applyTimbre ? 1 : 0;
    const totalTTC = sousTotalHT + tva + timbre;

    const formatMoney = (val) => new Intl.NumberFormat('fr-TN', { style: 'currency', currency: 'TND', minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(val);

    const handleAddLigne = () => setLignes([...lignes, { id: Date.now(), desc: '', qte: 1, prix: 0 }]);
    const handleRemoveLigne = (id) => setLignes(lignes.filter(l => l.id !== id));

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
        onSave({
            id: `DEV-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
            client,
            montant: totalTTC,
            date: dateEmi,
            validite: validite || "N/A",
            statut,
            lignes,
            sousTotalHT,
            tva,
            timbre,
            notes,
            conditions
        });
        onClose();
    };

    const handleDownloadPDF = (e) => {
        e.preventDefault();
        const currentData = {
            id: `DEV-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
            client,
            montant: totalTTC,
            date: dateEmi,
            validite: validite || "N/A",
            statut,
            lignes,
            sousTotalHT,
            tva,
            timbre,
            notes,
            conditions
        };
        generateDocumentPDF(currentData, 'DEVIS');
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', justifyContent: 'center', padding: '24px', overflowY: 'auto' }} onClick={onClose}>
            <div className="modal-content card" style={{ width: '100%', maxWidth: '1000px', margin: 'auto', background: 'var(--bg-color)', padding: 0, display: 'flex', flexDirection: 'column', maxHeight: '100%' }} onClick={e => e.stopPropagation()}>

                <div style={{ padding: '24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--card-bg)', backdropFilter: 'var(--glass-blur)' }}>
                    <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-main)' }}>Nouveau Devis</h2>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={24} /></button>
                </div>

                <form onSubmit={handleSubmit} style={{ overflowY: 'visible', padding: '24px', flex: 1 }}>
                    <div className="card" style={{ marginBottom: '16px', padding: '16px' }}>
                        <h3 style={{ fontSize: '13px', fontWeight: '700', marginBottom: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>Informations Générales</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)', gap: '12px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)' }}>Client *</label>
                                <select required value={client} onChange={e => setClient(e.target.value)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', fontSize: '12px' }}>
                                    <option value="">Sélectionner un client</option>
                                    {clients.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)' }}>Date du devis *</label>
                                <input type="date" required value={dateEmi} onChange={e => setDateEmi(e.target.value)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', fontSize: '12px' }} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)' }}>Date de validité</label>
                                <input type="date" value={validite} onChange={e => setValidite(e.target.value)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', fontSize: '12px' }} />
                            </div>
                        </div>
                    </div>

                    <div className="card" style={{ marginBottom: '24px', padding: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', marginBottom: '16px' }}>
                            <h3 style={{ fontSize: '14px', fontWeight: '700', margin: 0 }}>Détail des Prestations</h3>
                            <button type="button" onClick={handleAddLigne} style={{ fontSize: '12px', padding: '6px 12px', border: '1px dashed var(--accent-gold)', color: '#B45309', background: 'rgba(255, 193, 5, 0.1)', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Plus size={14} /> Ajouter une ligne
                            </button>
                        </div>

                        {/* SELECTEUR HIÉRARCHIQUE DE SERVICES */}
                        {(() => {
                            const uniqueCategories = [...new Set(servicesList.map(s => s.categorie))];
                            const filteredServices = servicesList.filter(s => s.categorie === selectedCategory);

                            return (
                                <div style={{ background: 'rgba(255, 193, 5, 0.05)', border: '1px solid rgba(255, 193, 5, 0.2)', padding: '16px', borderRadius: '12px', marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <label style={{ fontSize: '11px', fontWeight: '700', color: '#B45309', textTransform: 'uppercase' }}>Catégorie</label>
                                        <select
                                            value={selectedCategory}
                                            onChange={e => { setSelectedCategory(e.target.value); setSelectedServiceId(''); }}
                                            style={{ padding: '10px', borderRadius: '8px', border: '1px solid rgba(255, 193, 5, 0.3)', background: 'var(--card-bg)' }}
                                        >
                                            <option value="">-- Choisir une catégorie --</option>
                                            {uniqueCategories.map(cat => (
                                                <option key={cat} value={cat}>{cat}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div style={{ flex: 1.5, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <label style={{ fontSize: '11px', fontWeight: '700', color: '#B45309', textTransform: 'uppercase' }}>Sous-Service</label>
                                        <select
                                            value={selectedServiceId}
                                            onChange={e => setSelectedServiceId(e.target.value)}
                                            style={{ padding: '10px', borderRadius: '8px', border: '1px solid rgba(255, 193, 5, 0.3)', background: 'var(--card-bg)', maxWidth: '100%', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}
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
                                        style={{ height: '40px', padding: '0 16px', borderRadius: '8px', border: 'none', background: selectedServiceId ? 'var(--accent-gold)' : 'rgba(0,0,0,0.05)', color: selectedServiceId ? 'var(--text-main)' : 'var(--text-muted)', fontWeight: '700', cursor: selectedServiceId ? 'pointer' : 'not-allowed', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '6px' }}
                                    >
                                        <Plus size={16} /> Ajouter
                                    </button>
                                </div>
                            );
                        })()}

                        <div style={{ display: 'flex', gap: '8px', padding: '0 10px 8px 10px', fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                            <div style={{ flex: 3 }}>Description / Service</div>
                            <div style={{ flex: 1 }}>Qté</div>
                            <div style={{ flex: 1.5 }}>Prix unit. HT</div>
                            <div style={{ flex: 1.5, textAlign: 'right', paddingRight: '40px' }}>Total HT</div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {lignes.map((ligne) => (
                                <div key={ligne.id} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                                    <div style={{ flex: 3 }}>
                                        <input list="services-list-devis" type="text" placeholder="Sélectionnez ou tapez..." required value={ligne.desc} onChange={e => updateLigne(ligne.id, 'desc', e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', fontSize: '13px' }} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <input type="number" min="1" required value={ligne.qte} onChange={e => updateLigne(ligne.id, 'qte', parseFloat(e.target.value) || 0)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', fontSize: '13px' }} />
                                    </div>
                                    <div style={{ flex: 1.5 }}>
                                        <input type="number" min="0" step="0.001" required value={ligne.prix} onChange={e => updateLigne(ligne.id, 'prix', parseFloat(e.target.value) || 0)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', fontSize: '13px' }} />
                                    </div>
                                    <div style={{ flex: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px', padding: '10px 0' }}>
                                        <span style={{ fontWeight: '600', fontSize: '14px' }}>{formatMoney(ligne.qte * ligne.prix)}</span>
                                        <button type="button" onClick={() => handleRemoveLigne(ligne.id)} style={{ background: 'transparent', border: 'none', color: 'var(--danger)', opacity: lignes.length > 1 ? 1 : 0.3, cursor: lignes.length > 1 ? 'pointer' : 'not-allowed' }}>
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                        <div className="card" style={{ padding: '20px' }}>
                            <h3 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>Conditions & Options</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '12px', fontWeight: '600' }}>Modalités (Devis)</label>
                                    <select value={conditions} onChange={e => setConditions(e.target.value)} style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--card-bg)' }}>
                                        <option value="Standard">Standard (Acompte 50%)</option>
                                        <option value="Comptant">Paiement comptant</option>
                                    </select>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px', background: 'rgba(0,0,0,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>
                                        <input type="checkbox" checked={applyTva} onChange={e => setApplyTva(e.target.checked)} style={{ width: '16px', height: '16px', accentColor: 'var(--accent-gold)' }} />
                                        Appliquer TVA (19%)
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>
                                        <input type="checkbox" checked={applyTimbre} onChange={e => setApplyTimbre(e.target.checked)} style={{ width: '16px', height: '16px', accentColor: 'var(--accent-gold)' }} />
                                        Appliquer Timbre fiscal (1.000 TND)
                                    </label>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
                                    <label style={{ fontSize: '12px', fontWeight: '600' }}>Notes complémentaires</label>
                                    <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Ex: Ce devis comprend 2 allers-retours..." rows="3" style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', resize: 'vertical' }}></textarea>
                                </div>
                            </div>
                        </div>

                        <div className="card" style={{ padding: '24px', background: 'linear-gradient(135deg, rgba(255,193,5,0.05), rgba(255,255,255,0.5))', display: 'flex', flexDirection: 'column' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '14px', color: 'var(--text-muted)' }}>
                                <span>Sous-total HT</span>
                                <span style={{ fontWeight: '600', color: 'var(--text-main)' }}>{formatMoney(sousTotalHT)}</span>
                            </div>
                            {applyTva && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '14px', color: 'var(--text-muted)' }}>
                                    <span>TVA (19%)</span>
                                    <span style={{ fontWeight: '600', color: 'var(--text-main)' }}>{formatMoney(tva)}</span>
                                </div>
                            )}
                            {applyTimbre && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', fontSize: '14px', color: 'var(--text-muted)' }}>
                                    <span>Timbre fiscal</span>
                                    <span style={{ fontWeight: '600', color: 'var(--text-main)' }}>1 TND</span>
                                </div>
                            )}
                            <div style={{ borderTop: '1px dashed rgba(0,0,0,0.1)', margin: '16px 0', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-main)' }}>TOTAL TTC</span>
                                <span style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-main)' }}>{formatMoney(totalTTC)}</span>
                            </div>

                            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ color: 'var(--text-main)', fontSize: '12px', fontWeight: '700' }}>Statut de l'enregistrement</label>
                                <select value={statut} onChange={e => setStatut(e.target.value)} style={{ padding: '10px', borderRadius: '8px', border: '2px solid var(--accent-gold)', fontWeight: '600', background: 'white' }}>
                                    <option value="Draft">📝 Brouillon</option>
                                    <option value="Sent">📤 Envoyé au client</option>
                                    <option value="Accepted">✅ Accepté</option>
                                    <option value="Rejected">❌ Refusé</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </form>

                <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--card-bg)', backdropFilter: 'var(--glass-blur)', borderBottomLeftRadius: 'var(--radius)', borderBottomRightRadius: 'var(--radius)' }}>
                    <button type="button" onClick={handleDownloadPDF} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '12px', border: '1px solid var(--accent-gold)', background: 'rgba(255, 193, 5, 0.1)', cursor: 'pointer', fontWeight: '600', color: '#B45309' }}>
                        <FileDown size={18} /> Télécharger PDF
                    </button>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button type="button" onClick={onClose} style={{ padding: '10px 24px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'transparent', cursor: 'pointer', fontWeight: '600', color: 'var(--text-muted)' }}>Annuler</button>
                        <button type="button" onClick={handleSubmit} style={{ padding: '10px 24px', borderRadius: '12px', border: 'none', background: 'var(--text-main)', color: 'white', cursor: 'pointer', fontWeight: '700', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>Enregistrer Devis</button>
                    </div>
                </div>

            </div >
        </div >
    );
};

export default DevisModal;
