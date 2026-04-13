import React, { useState } from 'react';
import { X, UserPlus, Save, Briefcase, Calendar, Percent, ListTodo, User } from 'lucide-react';

const RHFormModal = ({ isOpen, onClose, onSave, initialData }) => {
    const [formData, setFormData] = useState(() => {
        if (initialData) {
            return { ...initialData, actif: initialData.actif !== false };
        }
        return {
            id: `RH_${Date.now()}`,
            nom: '',
            poste: '',
            dateDebut: new Date().toISOString().split('T')[0],
            taches: '',
            actif: true
        };
    });

    if (!isOpen) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
        onClose();
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: '20px'
        }}>
            <div style={{
                background: 'var(--card-bg)',
                borderRadius: '24px',
                width: '100%',
                maxWidth: '650px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                border: '1px solid var(--border-color)',
                display: 'flex', flexDirection: 'column',
                maxHeight: '90vh',
                animation: 'slideUp 0.3s ease-out'
            }}>
                {/* HEADER */}
                <div style={{
                    padding: '24px 32px',
                    borderBottom: '1px solid var(--border-color)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: 'var(--bg-main)',
                    borderTopLeftRadius: '24px', borderTopRightRadius: '24px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{
                            width: '48px', height: '48px', borderRadius: '16px',
                            background: 'rgba(255, 193, 5, 0.1)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'var(--accent-gold)'
                        }}>
                            {initialData ? <Save size={24} /> : <UserPlus size={24} />}
                        </div>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: 'var(--text-main)' }}>
                                {initialData ? 'Modifier Collaborateur' : 'Nouveau Collaborateur'}
                            </h2>
                            <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
                                Renseignez les informations de la ressource humaine
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} style={{
                        background: 'transparent', border: 'none', cursor: 'pointer',
                        color: 'var(--text-muted)', padding: '8px', borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'background 0.2s'
                    }} onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                        <X size={20} />
                    </button>
                </div>

                {/* CONTENT */}
                <div style={{ padding: '32px', overflowY: 'auto' }}>
                    <form id="rh-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                        {/* ROW 1: Nom & Poste */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <div>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                                    <User size={14} /> Nom & Prénom *
                                </label>
                                <input
                                    required
                                    type="text"
                                    name="nom"
                                    value={formData.nom}
                                    onChange={handleChange}
                                    placeholder="Ex: Ahmed Ben Ali"
                                    style={{
                                        width: '100%', padding: '12px 16px', borderRadius: '12px',
                                        border: '1px solid var(--border-color)', background: 'var(--bg-main)',
                                        color: 'var(--text-main)', fontSize: '14px', outline: 'none',
                                        transition: 'border-color 0.2s',
                                        boxSizing: 'border-box'
                                    }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                                    <Briefcase size={14} /> Poste / Rôle *
                                </label>
                                <input
                                    required
                                    type="text"
                                    name="poste"
                                    value={formData.poste}
                                    onChange={handleChange}
                                    placeholder="Ex: UI/UX Designer"
                                    style={{
                                        width: '100%', padding: '12px 16px', borderRadius: '12px',
                                        border: '1px solid var(--border-color)', background: 'var(--bg-main)',
                                        color: 'var(--text-main)', fontSize: '14px', outline: 'none',
                                        transition: 'border-color 0.2s',
                                        boxSizing: 'border-box'
                                    }}
                                />
                            </div>
                        </div>

                        {/* ROW 2: Statut */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                                Statut (Génération de Paie)
                            </label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', color: 'var(--text-main)' }}>
                                    <input type="radio" name="actif" value="true" checked={formData.actif === true} onChange={() => setFormData(prev => ({ ...prev, actif: true }))} />
                                    Actif
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', color: 'var(--text-muted)' }}>
                                    <input type="radio" name="actif" value="false" checked={formData.actif === false} onChange={() => setFormData(prev => ({ ...prev, actif: false }))} />
                                    Inactif
                                </label>
                            </div>
                        </div>

                        {/* ROW 3: Date & Taches */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 1fr) 2fr', gap: '20px' }}>
                            <div>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                                    <Calendar size={14} /> Prise de Projet
                                </label>
                                <input
                                    type="date"
                                    name="dateDebut"
                                    value={formData.dateDebut}
                                    onChange={handleChange}
                                    style={{
                                        width: '100%', padding: '12px 16px', borderRadius: '12px',
                                        border: '1px solid var(--border-color)', background: 'var(--bg-main)',
                                        color: 'var(--text-main)', fontSize: '14px', outline: 'none',
                                        boxSizing: 'border-box'
                                    }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                                    <ListTodo size={14} /> Tâches assignées
                                </label>
                                <textarea
                                    name="taches"
                                    value={formData.taches}
                                    onChange={handleChange}
                                    placeholder="Décrivez les tâches spécifiques pour ce projet..."
                                    rows={3}
                                    style={{
                                        width: '100%', padding: '12px 16px', borderRadius: '12px',
                                        border: '1px solid var(--border-color)', background: 'var(--bg-main)',
                                        color: 'var(--text-main)', fontSize: '14px', outline: 'none',
                                        resize: 'vertical', minHeight: '80px', fontFamily: 'inherit',
                                        boxSizing: 'border-box'
                                    }}
                                />
                            </div>
                        </div>

                    </form>
                </div>

                {/* FOOTER */}
                <div style={{
                    padding: '24px 32px',
                    borderTop: '1px solid var(--border-color)',
                    background: 'var(--bg-main)',
                    borderBottomLeftRadius: '24px', borderBottomRightRadius: '24px',
                    display: 'flex', justifyContent: 'flex-end', gap: '16px'
                }}>
                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            padding: '12px 24px', borderRadius: '12px',
                            background: 'transparent', border: '1px solid var(--border-color)',
                            color: 'var(--text-main)', fontWeight: '600', cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        Annuler
                    </button>
                    <button
                        form="rh-form"
                        type="submit"
                        style={{
                            padding: '12px 32px', borderRadius: '12px',
                            background: 'var(--text-main)', border: 'none',
                            color: 'white', fontWeight: '700', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '8px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                            transition: 'transform 0.2s'
                        }}
                        onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                        onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                        {initialData ? 'Mettre à jour' : 'Ajouter au catalogue'}
                    </button>
                </div>
            </div>
            <style>
                {`
                    @keyframes slideUp {
                        from { opacity: 0; transform: translateY(20px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                `}
            </style>
        </div>
    );
};

export default RHFormModal;
