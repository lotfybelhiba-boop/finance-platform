import React, { useState } from 'react';
import { X, UserPlus, Save, Briefcase, Calendar, Percent, ListTodo, User, CheckCircle2 } from 'lucide-react';

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
            dateFin: '',
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
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(12px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: '20px'
        }}>
            <div style={{
                background: 'rgba(255, 255, 255, 0.95)',
                borderRadius: '20px',
                width: '100%',
                maxWidth: '550px',
                boxShadow: '0 30px 60px -12px rgba(0, 0, 0, 0.25), 0 0 1px rgba(0,0,0,0.1)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                display: 'flex', flexDirection: 'column',
                maxHeight: '90vh',
                animation: 'modalSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                overflow: 'hidden'
            }}>
                {/* HEADER */}
                <div style={{
                    padding: '20px 28px',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: 'linear-gradient(to right, #f8fafc, #ffffff)',
                    borderBottom: '1px solid #f1f5f9'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{
                            width: '42px', height: '42px', borderRadius: '12px',
                            background: 'var(--text-main)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'white',
                            boxShadow: '0 8px 16px -4px rgba(0,0,0,0.1)'
                        }}>
                            {initialData ? <Save size={20} /> : <UserPlus size={20} />}
                        </div>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '900', color: 'var(--text-main)', letterSpacing: '-0.5px' }}>
                                {initialData ? 'Modifier Profil' : 'Nouveau Collaborateur'}
                            </h2>
                            <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>
                                {initialData ? `Édition de ${initialData.nom}` : 'Ajouter un membre à l\'équipe Mynds'}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} style={{
                        background: '#f1f5f9', border: 'none', cursor: 'pointer',
                        color: '#64748b', width: '32px', height: '32px', borderRadius: '10px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.2s'
                    }} onMouseOver={e => { e.currentTarget.style.background = '#e2e8f0'; e.currentTarget.style.color = '#0f172a'; }} onMouseOut={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#64748b'; }}>
                        <X size={18} />
                    </button>
                </div>

                {/* CONTENT */}
                <div style={{ padding: '28px', overflowY: 'auto' }}>
                    <form id="rh-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                        {/* Nom */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Nom Complet
                            </label>
                            <div style={{ position: 'relative' }}>
                                <User size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                <input
                                    required
                                    type="text"
                                    name="nom"
                                    value={formData.nom}
                                    onChange={handleChange}
                                    placeholder="Ex: Jean Dupont"
                                    style={{
                                        width: '100%', padding: '12px 12px 12px 40px', borderRadius: '10px',
                                        border: '1px solid #e2e8f0', background: 'white',
                                        color: '#1e293b', fontSize: '14px', fontWeight: '600', outline: 'none',
                                        transition: 'all 0.2s',
                                        boxSizing: 'border-box'
                                    }}
                                    onFocus={e => e.currentTarget.style.borderColor = 'var(--text-main)'}
                                    onBlur={e => e.currentTarget.style.borderColor = '#e2e8f0'}
                                />
                            </div>
                        </div>

                        {/* Poste */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Poste / Fonction
                            </label>
                            <div style={{ position: 'relative' }}>
                                <Briefcase size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                <input
                                    required
                                    type="text"
                                    name="poste"
                                    value={formData.poste}
                                    onChange={handleChange}
                                    placeholder="Ex: Consultant Senior"
                                    style={{
                                        width: '100%', padding: '12px 12px 12px 40px', borderRadius: '10px',
                                        border: '1px solid #e2e8f0', background: 'white',
                                        color: '#1e293b', fontSize: '14px', fontWeight: '600', outline: 'none',
                                        transition: 'all 0.2s',
                                        boxSizing: 'border-box'
                                    }}
                                    onFocus={e => e.currentTarget.style.borderColor = 'var(--text-main)'}
                                    onBlur={e => e.currentTarget.style.borderColor = '#e2e8f0'}
                                />
                            </div>
                        </div>

                        {/* Dates Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <label style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    Début Collaboration
                                </label>
                                <input
                                    type="date"
                                    name="dateDebut"
                                    value={formData.dateDebut}
                                    onChange={handleChange}
                                    style={{
                                        width: '100%', padding: '11px 12px', borderRadius: '10px',
                                        border: '1px solid #e2e8f0', background: 'white',
                                        color: '#1e293b', fontSize: '13px', fontWeight: '600', outline: 'none',
                                        boxSizing: 'border-box'
                                    }}
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <label style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    Fin Collaboration
                                </label>
                                <input
                                    type="date"
                                    name="dateFin"
                                    value={formData.dateFin || ''}
                                    onChange={handleChange}
                                    style={{
                                        width: '100%', padding: '11px 12px', borderRadius: '10px',
                                        border: '1px solid #e2e8f0', background: 'white',
                                        color: formData.dateFin ? '#ef4444' : '#1e293b', fontSize: '13px', fontWeight: '600', outline: 'none',
                                        boxSizing: 'border-box'
                                    }}
                                />
                            </div>
                        </div>

                        {/* Statut Toggle */}
                        <div style={{ 
                            background: '#f8fafc', 
                            padding: '16px', 
                            borderRadius: '12px', 
                            border: '1px solid #f1f5f9',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <div>
                                <div style={{ fontSize: '13px', fontWeight: '800', color: '#1e293b' }}>Statut de l'employé</div>
                                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>Définit si la paie est générée ce mois-ci</div>
                            </div>
                            <div style={{ display: 'flex', gap: '4px', background: '#e2e8f0', padding: '3px', borderRadius: '10px' }}>
                                <button 
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, actif: true }))}
                                    style={{ 
                                        padding: '6px 16px', borderRadius: '8px', border: 'none',
                                        fontSize: '11px', fontWeight: '900', cursor: 'pointer',
                                        background: formData.actif ? 'white' : 'transparent',
                                        color: formData.actif ? '#10b981' : '#64748b',
                                        boxShadow: formData.actif ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    ACTIF
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, actif: false }))}
                                    style={{ 
                                        padding: '6px 16px', borderRadius: '8px', border: 'none',
                                        fontSize: '11px', fontWeight: '900', cursor: 'pointer',
                                        background: !formData.actif ? 'white' : 'transparent',
                                        color: !formData.actif ? '#ef4444' : '#64748b',
                                        boxShadow: !formData.actif ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    INACTIF
                                </button>
                            </div>
                        </div>

                        {/* Taches */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Missions & Tâches
                            </label>
                            <textarea
                                name="taches"
                                value={formData.taches}
                                onChange={handleChange}
                                placeholder="Détails des missions assignées..."
                                rows={2}
                                style={{
                                    width: '100%', padding: '12px', borderRadius: '10px',
                                    border: '1px solid #e2e8f0', background: 'white',
                                    color: '#1e293b', fontSize: '13px', fontWeight: '600', outline: 'none',
                                    resize: 'none', minHeight: '60px', fontFamily: 'inherit',
                                    boxSizing: 'border-box'
                                }}
                                onFocus={e => e.currentTarget.style.borderColor = 'var(--text-main)'}
                                onBlur={e => e.currentTarget.style.borderColor = '#e2e8f0'}
                            />
                        </div>

                    </form>
                </div>

                {/* FOOTER */}
                <div style={{
                    padding: '20px 28px',
                    background: '#f8fafc',
                    borderTop: '1px solid #f1f5f9',
                    display: 'flex', justifyContent: 'flex-end', gap: '12px'
                }}>
                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            padding: '10px 20px', borderRadius: '10px',
                            background: 'white', border: '1px solid #e2e8f0',
                            color: '#64748b', fontWeight: '700', cursor: 'pointer',
                            fontSize: '13px', transition: 'all 0.2s'
                        }}
                        onMouseOver={e => e.currentTarget.style.background = '#f1f5f9'}
                        onMouseOut={e => e.currentTarget.style.background = 'white'}
                    >
                        Annuler
                    </button>
                    <button
                        form="rh-form"
                        type="submit"
                        style={{
                            padding: '10px 24px', borderRadius: '10px',
                            background: 'var(--text-main)', border: 'none',
                            color: 'white', fontWeight: '800', cursor: 'pointer',
                            fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px',
                            boxShadow: '0 10px 20px -5px rgba(0,0,0,0.2)',
                            transition: 'all 0.2s'
                        }}
                        onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 15px 30px -5px rgba(0,0,0,0.3)'; }}
                        onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 10px 20px -5px rgba(0,0,0,0.2)'; }}
                    >
                        <CheckCircle2 size={16} />
                        {initialData ? 'Enregistrer les modifications' : 'Confirmer l\'ajout'}
                    </button>
                </div>
            </div>
            <style>
                {`
                    @keyframes modalSlideUp {
                        from { opacity: 0; transform: translateY(30px) scale(0.98); }
                        to { opacity: 1; transform: translateY(0) scale(1); }
                    }
                `}
            </style>
        </div>
    );
};

export default RHFormModal;
