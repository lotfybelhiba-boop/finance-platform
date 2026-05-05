import React, { useState, useEffect } from 'react';
import { Plus, StickyNote, X, Trash2, ChevronDown } from 'lucide-react';

const NotesWidget = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [notes, setNotes] = useState(() => {
        const saved = localStorage.getItem('mynds_notes');
        return saved ? JSON.parse(saved) : [];
    });
    const [newNote, setNewNote] = useState('');

    useEffect(() => {
        localStorage.setItem('mynds_notes', JSON.stringify(notes));
    }, [notes]);

    const addNote = () => {
        if (!newNote.trim()) return;
        const note = {
            id: Date.now(),
            text: newNote,
            date: new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
            color: ['#FFF9C4', '#F1F8E9', '#E3F2FD', '#FCE4EC'][Math.floor(Math.random() * 4)]
        };
        setNotes([note, ...notes]);
        setNewNote('');
    };

    const deleteNote = (id) => {
        setNotes(notes.filter(n => n.id !== id));
    };

    return (
        <div style={{ position: 'fixed', bottom: '32px', right: '32px', zIndex: 9999 }}>
            {isOpen && (
                <div style={{
                    width: '320px',
                    maxHeight: '500px',
                    background: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    borderRadius: '28px',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                    display: 'flex',
                    flexDirection: 'column',
                    marginBottom: '20px',
                    overflow: 'hidden',
                    animation: 'notesSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
                }}>
                    {/* Header */}
                    <div style={{ 
                        padding: '24px 24px 16px', 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        background: 'linear-gradient(to bottom, rgba(255,255,255,0.8), transparent)'
                    }}>
                        <h3 style={{ 
                            margin: 0, 
                            fontSize: '18px', 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '10px',
                            fontFamily: 'var(--font-heading)',
                            color: 'var(--text-main)'
                        }}>
                            <div style={{ 
                                background: 'var(--accent-gold)', 
                                width: '32px', 
                                height: '32px', 
                                borderRadius: '10px', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                boxShadow: '0 4px 12px rgba(255, 193, 5, 0.3)'
                            }}>
                                <StickyNote size={18} color="white" />
                            </div>
                            Pense-bêtes
                        </h3>
                        <button 
                            onClick={() => setIsOpen(false)} 
                            style={{ 
                                background: '#F1F5F9', 
                                border: 'none', 
                                cursor: 'pointer', 
                                color: 'var(--text-muted)',
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s'
                            }}
                            onMouseOver={e => e.currentTarget.style.background = '#E2E8F0'}
                            onMouseOut={e => e.currentTarget.style.background = '#F1F5F9'}
                        >
                            <ChevronDown size={18} />
                        </button>
                    </div>

                    {/* Input Area */}
                    <div style={{ padding: '0 24px 20px' }}>
                        <div style={{ position: 'relative' }}>
                            <input 
                                value={newNote}
                                onChange={(e) => setNewNote(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && addNote()}
                                placeholder="Écrire un rappel..."
                                style={{ 
                                    width: '100%', 
                                    padding: '14px 50px 14px 16px', 
                                    borderRadius: '16px', 
                                    border: '1px solid #E2E8F0',
                                    outline: 'none',
                                    fontSize: '14px',
                                    fontFamily: 'var(--font-body)',
                                    background: '#F8FAFC',
                                    transition: 'all 0.2s'
                                }}
                                onFocus={e => e.currentTarget.style.borderColor = 'var(--accent-gold)'}
                                onBlur={e => e.currentTarget.style.borderColor = '#E2E8F0'}
                            />
                            <button 
                                onClick={addNote} 
                                style={{ 
                                    position: 'absolute',
                                    right: '8px',
                                    top: '8px',
                                    width: '36px', 
                                    height: '36px', 
                                    borderRadius: '12px', 
                                    background: 'var(--accent-gold)', 
                                    color: 'white', 
                                    border: 'none', 
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: '0 4px 10px rgba(255, 193, 5, 0.2)'
                                }}
                            >
                                <Plus size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Notes List */}
                    <div style={{ 
                        flex: 1, 
                        overflowY: 'auto', 
                        padding: '0 24px 24px', 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '12px',
                        scrollbarWidth: 'none'
                    }}>
                        {notes.map(note => (
                            <div key={note.id} style={{ 
                                padding: '18px', 
                                background: note.color, 
                                borderRadius: '20px', 
                                boxShadow: '0 4px 15px rgba(0,0,0,0.03)',
                                position: 'relative',
                                transform: `rotate(${(Math.random() * 2 - 1).toFixed(1)}deg)`,
                                transition: 'all 0.2s',
                                border: '1px solid rgba(0,0,0,0.05)'
                            }}>
                                <p style={{ 
                                    margin: 0, 
                                    fontSize: '14px', 
                                    color: '#334155', 
                                    lineHeight: '1.6',
                                    fontWeight: '500'
                                }}>{note.text}</p>
                                <div style={{ 
                                    display: 'flex', 
                                    justifyContent: 'space-between', 
                                    alignItems: 'center', 
                                    marginTop: '14px',
                                    borderTop: '1px solid rgba(0,0,0,0.05)',
                                    paddingTop: '10px'
                                }}>
                                    <span style={{ fontSize: '11px', fontWeight: '600', color: '#64748B' }}>{note.date}</span>
                                    <button 
                                        onClick={() => deleteNote(note.id)} 
                                        style={{ 
                                            background: 'rgba(255,255,255,0.5)', 
                                            border: 'none', 
                                            cursor: 'pointer', 
                                            padding: '6px', 
                                            borderRadius: '8px',
                                            color: '#EF4444',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                        {notes.length === 0 && (
                            <div style={{ 
                                textAlign: 'center', 
                                padding: '60px 0', 
                                color: 'var(--text-muted)', 
                                fontSize: '14px',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '12px'
                            }}>
                                <div style={{ opacity: 0.3 }}><StickyNote size={48} /></div>
                                <p style={{ fontWeight: '500' }}>Aucun rappel important.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Global Trigger Button */}
            <button 
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '22px',
                    background: 'var(--accent-gold)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: 'none',
                    boxShadow: '0 12px 30px rgba(255, 193, 5, 0.4)',
                    cursor: 'pointer',
                    transition: 'all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                    transform: isOpen ? 'rotate(135deg) scale(0.9)' : 'scale(1)',
                    position: 'relative'
                }}
                title="Notes et Rappels"
            >
                <Plus size={32} />
                {!isOpen && notes.length > 0 && (
                    <div style={{
                        position: 'absolute',
                        top: '-5px',
                        right: '-5px',
                        background: '#EF4444',
                        color: 'white',
                        fontSize: '10px',
                        fontWeight: '900',
                        width: '22px',
                        height: '22px',
                        borderRadius: '50%',
                        border: '3px solid #F8FAFC',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 8px rgba(239, 68, 68, 0.3)'
                    }}>
                        {notes.length}
                    </div>
                )}
            </button>

            <style>{`
                @keyframes notesSlideUp {
                    from { transform: translateY(30px) scale(0.95); opacity: 0; }
                    to { transform: translateY(0) scale(1); opacity: 1; }
                }
            `}</style>
        </div>
    );
};

export default NotesWidget;
