import React, { useState } from 'react';
import { X, Printer, Download, Eye, Loader2 } from 'lucide-react';
import A4InvoiceDocument from './A4InvoiceDocument';
import { generateDocumentPDF } from '../utils/pdfGenerator';

const InvoicePreviewModal = ({ isOpen, onClose, facture }) => {
    const [isExporting, setIsExporting] = useState(false);

    const handlePrint = () => {
        const root = document.getElementById('root');
        const originalInvoice = document.getElementById('invoice-document');
        
        if (!originalInvoice) return;

        // Build standard filename for the Print Dialog's "Save as PDF" function
        const dateEmi = facture.dateEmi || new Date().toISOString().split('T')[0];
        const yearMonth = dateEmi.substring(0, 7); 
        const suggestedFilename = `FACTURE_MYNDS_${yearMonth}_${facture.id || 'EXPORT'}`;
        
        // Temporarily change document title so browser uses it as default file name
        const originalTitle = document.title;
        document.title = suggestedFilename;

        // 1. Create a dedicated print container completely outside the React DOM tree
        // This escapes all the CSS transforms, blurs, and overflows of the modal.
        const printContainer = document.createElement('div');
        printContainer.id = 'temp-print-container';
        printContainer.style.width = '210mm';
        printContainer.style.backgroundColor = 'white';
        printContainer.style.position = 'absolute';
        printContainer.style.top = '0';
        printContainer.style.left = '0';
        printContainer.style.zIndex = '999999';
        
        // 2. Clone the invoice exactly as it appears
        printContainer.appendChild(originalInvoice.cloneNode(true));
        document.body.appendChild(printContainer);
        
        // 3. Inject a bulletproof print stylesheet
        const style = document.createElement('style');
        style.id = 'temp-print-style';
        style.innerHTML = `
            @media print {
                body { margin: 0; padding: 0; background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                #root { display: none !important; }
                @page { size: A4 portrait; margin: 0; }
            }
        `;
        document.head.appendChild(style);

        // 4. Trigger the native print dialog
        window.print();
        
        // 5. Cleanup after the print dialog captures the snapshot
        setTimeout(() => {
            document.title = originalTitle; // Restore original title
            if (printContainer.parentNode) document.body.removeChild(printContainer);
            if (style.parentNode) document.head.removeChild(style);
        }, 1500);
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

    // Auto-trigger actions if requested from external tables
    React.useEffect(() => {
        if (isOpen && facture) {
            if (facture.autoDownload) {
                // Short delay ensures DOM and images are completely wired
                setTimeout(() => {
                    handleDownloadPDF();
                }, 300);
            } else if (facture.autoPrint) {
                // Require a slight delay for modal CSS to settle before the native snapshot
                setTimeout(() => {
                    handlePrint();
                }, 300);
            }
        }
    }, [isOpen, facture?.id]);

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
            `}</style>
        </div>
    );
};

export default InvoicePreviewModal;
