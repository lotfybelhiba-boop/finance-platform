import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import { 
    Users, UserPlus, Shield, Lock, Trash2, 
    CheckCircle2, XCircle, ChevronRight, 
    MoreVertical, Search, Key, Eye, Edit3,
    Ban, Globe, HardDrive, Smartphone
} from 'lucide-react';
import { getStorage, setStorage, generateId } from '../services/storageService';

const USERS_KEY = 'mynds_users_registry';

const DEFAULT_USERS = [
    { 
        id: 'user-admin-1', 
        nom: 'Lotfy Belhiba', 
        email: 'lotfybelhiba@gmail.com', 
        password: 'admin',
        role: 'ADMIN', 
        status: 'Actif',
        lastLogin: 'Aujourd\'hui, 14:20',
        permissions: ['dashboard', 'finance', 'banque', 'rh', 'clients', 'factures', 'users', 'config', 'vie-perso']
    },
    { 
        id: 'user-mgr-1', 
        nom: 'Responsable RH', 
        email: 'rh@mynds.tn', 
        password: 'admin',
        role: 'MANAGER', 
        status: 'Actif',
        lastLogin: 'Hier, 09:15',
        permissions: ['dashboard', 'rh', 'clients']
    }
];

const ROLES = [
    { id: 'ADMIN', name: 'Administrateur', color: '#ef4444', desc: 'Accès total à toutes les fonctionnalités et paramètres.' },
    { id: 'MANAGER', name: 'Gestionnaire', color: '#3b82f6', desc: 'Gestion opérationnelle (Finance, RH, Clients) sans accès aux paramètres système.' },
    { id: 'VIEWER', name: 'Observateur', color: '#10b981', desc: 'Consultation uniquement des rapports et tableaux de bord.' }
];

const PAGES = [
    { id: 'dashboard', name: 'Tableau de Bord', category: 'Global' },
    { id: 'finance', name: 'Finance & Trésorerie', category: 'Opérations' },
    { id: 'banque', name: 'Comptes Bancaires', category: 'Opérations' },
    { id: 'rh', name: 'Ressources Humaines', category: 'Opérations' },
    { id: 'clients', name: 'Gestion Clients', category: 'Opérations' },
    { id: 'factures', name: 'Facturation & Devis', category: 'Ventes' },
    { id: 'users', name: 'Gestion Utilisateurs', category: 'Système' },
    { id: 'config', name: 'Configuration Page', category: 'Système' },
    { id: 'vie-perso', name: 'Vie Privée', category: 'Personnel' }
];

const UsersPage = () => {
    const [users, setUsers] = useState(() => getStorage(USERS_KEY, DEFAULT_USERS));
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);

    useEffect(() => {
        setStorage(USERS_KEY, users);
    }, [users]);

    const handleSaveUser = (userData) => {
        if (editingUser) {
            setUsers(users.map(u => u.id === editingUser.id ? { ...userData, id: u.id } : u));
        } else {
            setUsers([...users, { ...userData, id: generateId(), lastLogin: 'Jamais', status: 'Actif' }]);
        }
        setIsModalOpen(false);
        setEditingUser(null);
    };

    const handleDeleteUser = (id) => {
        if (window.confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) {
            setUsers(users.filter(u => u.id !== id));
        }
    };

    const filteredUsers = users.filter(u => 
        u.nom.toLowerCase().includes(searchTerm.toLowerCase()) || 
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div style={{ padding: '0 24px' }}>
            <Header showMonthSelector={false} title="Utilisateurs & Accès" subtitle="Gérez les permissions et les comptes de votre équipe" />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '32px' }}>
                <div className="card" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '20px', background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', color: 'white' }}>
                    <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Users size={28} />
                    </div>
                    <div>
                        <div style={{ fontSize: '24px', fontWeight: '900' }}>{users.length}</div>
                        <div style={{ fontSize: '12px', opacity: 0.6, fontWeight: '700', textTransform: 'uppercase' }}>Utilisateurs inscrits</div>
                    </div>
                </div>

                <div className="card" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(59,130,246,0.1)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Shield size={28} />
                    </div>
                    <div>
                        <div style={{ fontSize: '24px', fontWeight: '900' }}>{users.filter(u => u.role === 'ADMIN').length}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Administrateurs</div>
                    </div>
                </div>

                <div className="card" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(16,185,129,0.1)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Lock size={28} />
                    </div>
                    <div>
                        <div style={{ fontSize: '24px', fontWeight: '900' }}>98%</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Sécurité du Système</div>
                    </div>
                </div>
            </div>

            <div className="card" style={{ marginBottom: '40px' }}>
                <div style={{ padding: '24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ position: 'relative' }}>
                        <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input 
                            type="text" 
                            placeholder="Rechercher un membre..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ padding: '10px 16px 10px 40px', borderRadius: '12px', border: '1px solid var(--border-color)', width: '300px', outline: 'none' }}
                        />
                    </div>
                    <button onClick={() => { setEditingUser(null); setIsModalOpen(true); }} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <UserPlus size={18} /> Ajouter un Utilisateur
                    </button>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table className="clean-table">
                        <thead>
                            <tr>
                                <th>Utilisateur</th>
                                <th>Rôle</th>
                                <th>Accès</th>
                                <th>Statut</th>
                                <th>Dernière Connexion</th>
                                <th className="text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.map(user => (
                                <tr key={user.id}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: '900', color: '#64748b' }}>
                                                {user.nom.charAt(0)}
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-main)' }}>{user.nom}</div>
                                                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{user.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <span style={{ 
                                            padding: '4px 10px', 
                                            borderRadius: '8px', 
                                            fontSize: '11px', 
                                            fontWeight: '800', 
                                            background: (ROLES.find(r => r.id === user.role)?.color + '10') || '#f1f5f9',
                                            color: ROLES.find(r => r.id === user.role)?.color || '#64748b',
                                            border: `1px solid ${ROLES.find(r => r.id === user.role)?.color + '20'}`
                                        }}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td>
                                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>
                                            {user.permissions.length === PAGES.length ? 'Accès Total' : `${user.permissions.length} modules`}
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: user.status === 'Actif' ? '#10b981' : '#ef4444', fontSize: '13px', fontWeight: '700' }}>
                                            {user.status === 'Actif' ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                                            {user.status}
                                        </div>
                                    </td>
                                    <td style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{user.lastLogin}</td>
                                    <td className="text-right">
                                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                            <button onClick={() => { setEditingUser(user); setIsModalOpen(true); }} className="btn-icon" style={{ background: 'rgba(59,130,246,0.05)', color: '#3b82f6' }}><Edit3 size={16} /></button>
                                            <button onClick={() => handleDeleteUser(user.id)} className="btn-icon" style={{ background: 'rgba(239,68,68,0.05)', color: '#ef4444' }}><Trash2 size={16} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {isModalOpen && (
                <UserModal 
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleSaveUser}
                    user={editingUser}
                />
            )}
        </div>
    );
};

const UserModal = ({ isOpen, onClose, onSave, user }) => {
    const [formData, setFormData] = useState(user || {
        nom: '',
        email: '',
        password: '',
        role: 'VIEWER',
        permissions: ['dashboard']
    });
    const [showPassword, setShowPassword] = useState(false);

    const togglePermission = (pid) => {
        const newPerms = formData.permissions.includes(pid)
            ? formData.permissions.filter(p => p !== pid)
            : [...formData.permissions, pid];
        setFormData({ ...formData, permissions: newPerms });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const finalData = { ...formData };
        // Si c'est une édition et que le mot de passe est vide, on garde l'ancien
        if (user && !finalData.password) {
            finalData.password = user.password;
        }
        onSave(finalData);
    };

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }} onClick={onClose}>
            <div className="card" style={{ width: '100%', maxWidth: '600px', padding: 0, background: 'white', borderRadius: '28px', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
                <div style={{ padding: '24px 32px', background: '#f8fafc', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'var(--text-main)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <UserPlus size={24} />
                    </div>
                    <div>
                        <h2 style={{ fontSize: '18px', fontWeight: '900', color: 'var(--text-main)', margin: 0 }}>{user ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}</h2>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>Configuration des droits d'accès</div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} style={{ padding: '32px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Nom Complet</label>
                            <input 
                                type="text" 
                                required 
                                value={formData.nom} 
                                onChange={e => setFormData({ ...formData, nom: e.target.value })}
                                style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border-color)', boxSizing: 'border-box' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Adresse Email</label>
                            <input 
                                type="email" 
                                required 
                                value={formData.email} 
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border-color)', boxSizing: 'border-box' }}
                            />
                        </div>
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Mot de Passe</label>
                        <div style={{ position: 'relative' }}>
                            <input 
                                type={showPassword ? "text" : "password"} 
                                required={!user} 
                                placeholder={user ? "Laisser vide pour inchangé" : "••••••••"}
                                value={formData.password} 
                                onChange={e => setFormData({ ...formData, password: e.target.value })}
                                style={{ width: '100%', padding: '12px 40px 12px 16px', borderRadius: '12px', border: '1px solid var(--border-color)', boxSizing: 'border-box' }}
                            />
                            <button 
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                            >
                                {showPassword ? <Lock size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '12px' }}>Rôle & Niveau de Privilège</label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                            {ROLES.map(role => (
                                <div 
                                    key={role.id}
                                    onClick={() => setFormData({ ...formData, role: role.id, permissions: role.id === 'ADMIN' ? PAGES.map(p => p.id) : formData.permissions })}
                                    style={{ 
                                        padding: '12px', 
                                        borderRadius: '16px', 
                                        border: `2px solid ${formData.role === role.id ? role.color : 'var(--border-color)'}`,
                                        background: formData.role === role.id ? `${role.color}05` : 'white',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    <div style={{ fontSize: '13px', fontWeight: '900', color: formData.role === role.id ? role.color : 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        {formData.role === role.id && <CheckCircle2 size={14} />}
                                        {role.name}
                                    </div>
                                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px', lineHeight: '1.4' }}>{role.desc}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div style={{ marginBottom: '32px' }}>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '12px' }}>Permissions par Module</label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', background: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                            {PAGES.map(page => (
                                <label key={page.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: formData.role === 'ADMIN' ? 'not-allowed' : 'pointer', opacity: formData.role === 'ADMIN' ? 0.6 : 1 }}>
                                    <input 
                                        type="checkbox" 
                                        checked={formData.permissions.includes(page.id)}
                                        disabled={formData.role === 'ADMIN'}
                                        onChange={() => togglePermission(page.id)}
                                        style={{ width: '18px', height: '18px', accentColor: 'var(--text-main)' }}
                                    />
                                    <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-main)' }}>{page.name}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button type="button" onClick={onClose} style={{ flex: 1, padding: '14px', borderRadius: '14px', border: '1px solid var(--border-color)', background: 'transparent', fontWeight: '800', cursor: 'pointer' }}>Annuler</button>
                        <button type="submit" style={{ flex: 1.5, padding: '14px', borderRadius: '14px', border: 'none', background: 'var(--text-main)', color: 'white', fontWeight: '900', cursor: 'pointer' }}>Enregistrer l'accès</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default UsersPage;
