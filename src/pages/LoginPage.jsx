import React, { useState } from 'react';
import { Lock, Mail, ArrowRight, ShieldCheck } from 'lucide-react';

const LoginPage = ({ onLogin }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        
        try {
            const response = await fetch('http://localhost:5000/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                localStorage.setItem('mynds_user', JSON.stringify(data.user));
                localStorage.setItem('mynds_migrated_to_pg', 'true'); // Enable sync
                onLogin();
            } else {
                setError(data.error || 'Identifiants incorrects. Veuillez réessayer.');
            }
        } catch (err) {
            console.error('Login error:', err);
            setError('Erreur de connexion au serveur.');
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--bg-main)',
            position: 'relative',
            overflow: 'hidden',
            fontFamily: "'Inter', sans-serif"
        }}>
            {/* Background Decorations */}
            <div className="bg-blob blob-1" style={{ width: '40vw', height: '40vw', background: 'rgba(255,193,5,0.1)' }}></div>
            <div className="bg-blob blob-2" style={{ width: '50vw', height: '50vw', background: 'rgba(59,130,246,0.05)' }}></div>
            
            <div style={{
                width: '100%',
                maxWidth: '440px',
                padding: '48px',
                background: 'var(--card-bg)',
                backdropFilter: 'var(--glass-blur)',
                borderRadius: '32px',
                border: '1px solid var(--border-color)',
                boxShadow: '0 24px 48px rgba(0,0,0,0.05)',
                position: 'relative',
                zIndex: 10
            }}>
                <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '64px', height: '64px', borderRadius: '20px', background: 'rgba(255, 193, 5, 0.1)', color: 'var(--accent-gold)', marginBottom: '24px' }}>
                        <ShieldCheck size={32} />
                    </div>
                    <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '900', color: 'var(--text-main)', letterSpacing: '-1px' }}>MYNDS Finance</h1>
                    <p style={{ margin: '8px 0 0 0', fontSize: '15px', color: 'var(--text-muted)', fontWeight: '500' }}>Veuillez vous identifier pour accéder au tableau de bord.</p>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {error && (
                        <div style={{ padding: '12px 16px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', borderRadius: '12px', fontSize: '13px', fontWeight: '600', textAlign: 'center', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                            {error}
                        </div>
                    )}
                    
                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Adresse Email</label>
                        <div style={{ position: 'relative' }}>
                            <Mail size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input 
                                type="email" 
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="lotfybelhiba@gmail.com"
                                required
                                style={{
                                    width: '100%',
                                    padding: '16px 16px 16px 44px',
                                    background: 'var(--bg-main)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '16px',
                                    color: 'var(--text-main)',
                                    fontSize: '15px',
                                    fontWeight: '600',
                                    transition: 'all 0.2s',
                                    outline: 'none',
                                    boxSizing: 'border-box'
                                }}
                                onFocus={e => e.target.style.borderColor = 'var(--accent-gold)'}
                                onBlur={e => e.target.style.borderColor = 'var(--border-color)'}
                            />
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Mot de passe</label>
                        <div style={{ position: 'relative' }}>
                            <Lock size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input 
                                type="password" 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                style={{
                                    width: '100%',
                                    padding: '16px 16px 16px 44px',
                                    background: 'var(--bg-main)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '16px',
                                    color: 'var(--text-main)',
                                    fontSize: '15px',
                                    fontWeight: '600',
                                    transition: 'all 0.2s',
                                    outline: 'none',
                                    boxSizing: 'border-box'
                                }}
                                onFocus={e => e.target.style.borderColor = 'var(--accent-gold)'}
                                onBlur={e => e.target.style.borderColor = 'var(--border-color)'}
                            />
                        </div>
                    </div>

                    <button 
                        type="submit"
                        style={{
                            marginTop: '12px',
                            background: 'var(--accent-gold)',
                            color: 'white',
                            border: 'none',
                            padding: '18px',
                            borderRadius: '16px',
                            fontSize: '16px',
                            fontWeight: '800',
                            letterSpacing: '0.5px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '12px',
                            transition: 'all 0.2s',
                            boxShadow: '0 8px 24px rgba(255, 193, 5, 0.3)'
                        }}
                        onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                        onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                        Se Connecter <ArrowRight size={20} />
                    </button>
                    
                    <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '13px', color: 'var(--text-muted)', fontWeight: '500' }}>
                        Accès sécurisé et restreint
                    </div>
                </form>
            </div>
        </div>
    );
};

export default LoginPage;
