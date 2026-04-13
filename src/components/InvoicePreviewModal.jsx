import React, { useState } from 'react';
import { X, Printer, Download, Eye, Loader2 } from 'lucide-react';
import A4InvoiceDocument from './A4InvoiceDocument';
import { generateDocumentPDF } from '../utils/pdfGenerator';

const InvoicePreviewModal = ({ isOpen, onClose, facture }) => {
    const [isExporting, setIsExporting] = useState(false);

    const handlePrint = () => {
        window.print();
    };

    const handleDownloadPDF = async () => {
        setIsExporting(true);
        try {
            await generateDocumentPDF(facture, 'FACTURE');
        } catch (error) {
            console.error("Erreur export PDF:", error);
            alert("Erreur lors de la génération du PDF.");
        } finally {
            setIsExporting(false);
        }
    };

    // Auto-trigger download if requested
    React.useEffect(() => {
        if (isOpen && facture?.autoDownload) {
            handleDownloadPDF();
        }
    }, [isOpen, facture?.id, facture?.autoDownload]);

    if (!isOpen || !facture) return null;

    return (
        <div className="modal-overlay" style={{ display: 'flex', zIndex: 1000, padding: '20px', background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)' }}>
            
            {/* Modal Container */}
            <div className="invoice-preview-container" style={{
                background: 'var(--bg-main)',
                width: '100%',
                maxWidth: '1100px',
                height: '100%',
                maxHeight: '94vh',
                borderRadius: '24px',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 40px 100px rgba(0,0,0,0.6)',
                overflow: 'hidden',
                border: '1px solid rgba(255,255,255,0.1)'
            }}>
                
                {/* Header Actions */}
                <div className="no-print" style={{
                    padding: '20px 32px',
                    borderBottom: '1px solid var(--border-color)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'rgba(15, 23, 42, 0.8)',
                    backdropFilter: 'blur(5px)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ background: 'var(--accent-gold)', padding: '8px', borderRadius: '10px' }}>
                            <Eye size={20} color="var(--text-main)" />
                        </div>
                        <div>
                            <h2 style={{ fontSize: '18px', fontWeight: '800', margin: 0, color: 'white' }}>Aperçu Facture</h2>
                            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '1px' }}>Format A4 - WYSIWYG</div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button 
                            onClick={handleDownloadPDF} 
                            disabled={isExporting}
                            style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '8px', 
                                padding: '10px 20px', 
                                background: 'white', 
                                color: 'black', 
                                border: 'none', 
                                borderRadius: '12px', 
                                fontWeight: '700', 
                                cursor: isExporting ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s',
                                boxShadow: '0 4px 12px rgba(255,255,255,0.1)'
                            }}
                        >
                            {isExporting ? <Loader2 size={18} className="spin" /> : <Download size={18} />}
                            {isExporting ? 'Génération...' : 'Télécharger PDF'}
                        </button>
                        
                        <button 
                            onClick={handlePrint} 
                            style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '8px', 
                                padding: '10px 20px', 
                                background: 'rgba(255,255,255,0.1)', 
                                color: 'white', 
                                border: '1px solid rgba(255,255,255,0.2)', 
                                borderRadius: '12px', 
                                fontWeight: '600', 
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            <Printer size={18} /> Imprimer
                        </button>

                        <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)', margin: '0 8px' }}></div>

                        <button 
                            onClick={onClose} 
                            style={{ 
                                width: '40px',
                                height: '40px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: 'rgba(239, 68, 68, 0.1)', 
                                border: 'none', 
                                color: '#ef4444', 
                                cursor: 'pointer', 
                                borderRadius: '12px',
                                transition: 'all 0.2s'
                            }}
                        >
                            <X size={22} />
                        </button>
                    </div>
                </div>

                {/* Scrollable Document Area */}
                <div className="no-print-bg" style={{
                    padding: '60px 20px',
                    overflowY: 'auto',
                    background: '#0a0a0b', // Deep dark backdrop to make paper pop
                    backgroundImage: 'radial-gradient(circle at 50% 50%, #1c1c1e 0%, #0a0a0b 100%)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'flex-start',
                    flex: 1
                }}>
                    <div style={{ transform: 'scale(0.95)', transformOrigin: 'top center', boxShadow: '0 50px 100px rgba(0,0,0,0.8)' }}>
                        <A4InvoiceDocument facture={facture} />
                    </div>
                </div>
            </div>

            <style>{`
                .spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

                @media print {
                    @page {
                        size: A4 portrait;
                        margin: 0;
                    }
                    html, body {
                        height: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        background: white !important;
                        overflow: hidden !important;
                    }
                    /* Hide EVERYTHING in the body */
                    body * {
                        visibility: hidden !important;
                        box-shadow: none !important;
                        border: none !important;
                    }
                    /* Force display and visibility for ONLY the invoice and its children */
                    #invoice-document, #invoice-document * {
                        visibility: visible !important;
                        display: inherit !important;
                    }
                    /* Re-enable flex/grid/table for the invoice specifically */
                    #invoice-document {
                        display: flex !important;
                        flex-direction: column !important;
                        visibility: visible !important;
                        position: fixed !important; /* Pin to top-left of page */
                        left: 0 !important;
                        top: 0 !important;
                        width: 210mm !important;
                        height: 296mm !important; /* Slightly less than 297 to avoid 2nd page */
                        padding: 10mm 15mm !important;
                        margin: 0 !important;
                        background: white !important;
                        z-index: 99999 !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        overflow: hidden !important;
                    }
                    /* Specifically ensure table elements keep their display types */
                    #invoice-document table { display: table !important; }
                    #invoice-document thead { display: table-header-group !important; }
                    #invoice-document tbody { display: table-row-group !important; }
                    #invoice-document tr { display: table-row !important; }
                    #invoice-document td, #invoice-document th { display: table-cell !important; }
                }
            `}</style>
        </div>
    );
};

export default InvoicePreviewModal;
