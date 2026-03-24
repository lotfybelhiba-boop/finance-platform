import React from 'react';
import { X, Printer } from 'lucide-react';
import { numberToFrenchText } from '../utils/numberToLetters.js';

const InvoicePreviewModal = ({ isOpen, onClose, facture }) => {
    if (!isOpen || !facture) return null;

    const formatMoney = (val) => new Intl.NumberFormat('fr-TN', { style: 'currency', currency: 'TND', minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(val || 0);

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="modal-overlay" style={{ display: 'flex', zIndex: 1000, padding: '20px' }}>
            {/* Modal Container */}
            <div className="invoice-preview-container" style={{
                background: 'var(--bg-main)',
                width: '100%',
                maxWidth: '900px',
                height: '100%',
                maxHeight: '90vh',
                borderRadius: '16px',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 24px 48px rgba(0,0,0,0.5)',
                overflow: 'hidden'
            }}>
                {/* Header Actions */}
                <div className="no-print" style={{
                    padding: '16px 24px',
                    borderBottom: '1px solid var(--border-color)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'var(--card-bg)'
                }}>
                    <h2 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>Aperçu de la Facture</h2>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'var(--accent-gold)', color: 'var(--text-main)', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>
                            <Printer size={16} /> Imprimer / PDF
                        </button>
                        <button onClick={onClose} style={{ padding: '8px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', borderRadius: '8px' }}>
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Scrollable Document Area */}
                <div className="no-print-bg" style={{
                    padding: '40px',
                    overflowY: 'auto',
                    background: '#0f172a', // Darker background to contrast the white paper
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'flex-start',
                    flex: 1
                }}>

                    {/* THE A4 INVOICE PAPER */}
                    <div className="invoice-paper" style={{
                        width: '210mm',
                        minHeight: '297mm',
                        background: '#ffffff',
                        padding: '50px',
                        boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
                        color: '#0f172a', // Dark text for light background
                        fontFamily: "'Inter', sans-serif",
                        display: 'flex',
                        flexDirection: 'column'
                    }}>

                        {/* HEADER: LOGO LEFT, INVOICE INFO RIGHT */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '50px' }}>
                            {/* Logo */}
                            <div>
                                <img src="/logo-dark.png" alt="MYNDS" style={{ height: '45px', marginBottom: '4px' }} />
                            </div>

                            {/* Info */}
                            <div style={{ textAlign: 'right' }}>
                                <h2 style={{ fontSize: '36px', fontWeight: '300', color: '#0f172a', margin: '0 0 8px 0', textTransform: 'uppercase', letterSpacing: '2px' }}>Facture</h2>
                                <div style={{ fontSize: '14px', color: '#64748b', fontWeight: '500' }}>Réf: <span style={{ color: '#0f172a', fontWeight: '700' }}>{(facture.id === 'non déclarée' || (facture.id && facture.id.startsWith('ND-'))) ? 'SANS NUMÉRO (non déclarée)' : facture.id}</span></div>
                            </div>
                        </div>

                        {/* INFO SECTION: FROM, TO, DATES */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '50px' }}>
                            {/* Clients Info */}
                            <div style={{ width: '45%', background: '#f8fafc', padding: '16px 20px', borderRadius: '8px', borderLeft: '4px solid #f59e0b' }}>
                                <div style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.5px' }}>Facturé à:</div>
                                <div style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', marginBottom: '6px' }}>{facture.clientObj ? facture.clientObj.enseigne : (facture.client || 'Client Non Défini')}</div>
                                <div style={{ fontSize: '13px', color: '#475569', lineHeight: '1.4' }}>
                                    {facture.clientObj ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                            {facture.clientObj.mf && <div><strong style={{ color: '#0f172a' }}>MF :</strong> {facture.clientObj.mf}</div>}
                                            {facture.clientObj.charge && <div><strong style={{ color: '#0f172a' }}>A/A :</strong> {facture.clientObj.charge}</div>}
                                            {facture.clientObj.adresse && <div><strong style={{ color: '#0f172a' }}>Adresse :</strong> {facture.clientObj.adresse}</div>}
                                            {facture.clientObj.telephone && <div><strong style={{ color: '#0f172a' }}>Tél :</strong> {facture.clientObj.telephone}</div>}
                                        </div>
                                    ) : (
                                        <div>Client B2B</div>
                                    )}
                                </div>
                            </div>

                            {/* Dates Info */}
                            <div style={{ width: '45%' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
                                        <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>Date de facture:</span>
                                        <span style={{ fontSize: '13px', color: '#0f172a', fontWeight: '700' }}>{facture.dateEmi || 'N/A'}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
                                        <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>Échéance:</span>
                                        <span style={{ fontSize: '13px', color: '#0f172a', fontWeight: '700' }}>{facture.echeance || 'N/A'}</span>
                                    </div>
                                    {(facture.periodeDebut && facture.periodeFin) && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
                                            <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>Période:</span>
                                            <span style={{ fontSize: '13px', color: '#0f172a', fontWeight: '700' }}>{new Date(facture.periodeDebut).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })} au {new Date(facture.periodeFin).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* TABLE */}
                        <div style={{ marginBottom: '40px', minHeight: '300px' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ background: '#0f172a', color: '#ffffff' }}>
                                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', borderTopLeftRadius: '6px' }}>Description des prestations</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '13px', fontWeight: '600', width: '10%' }}>Qté</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '13px', fontWeight: '600', width: '20%' }}>Prix Unitaire HT</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '13px', fontWeight: '600', width: '20%', borderTopRightRadius: '6px' }}>Total HT</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {facture.lignes && facture.lignes.length > 0 ? facture.lignes.map((line, i) => (
                                        <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                            <td style={{ padding: '8px 16px', fontSize: '13px', color: '#1e293b', fontWeight: '500' }}>{line.desc || 'Prestation par défaut'}</td>
                                            <td style={{ padding: '8px 16px', fontSize: '13px', color: '#475569', textAlign: 'center' }}>{line.qte || 1}</td>
                                            <td style={{ padding: '8px 16px', fontSize: '13px', color: '#1e293b', textAlign: 'right' }}>{formatMoney(line.prix)}</td>
                                            <td style={{ padding: '8px 16px', fontSize: '13px', color: '#0f172a', textAlign: 'right', fontWeight: '600' }}>{formatMoney((line.prix || 0) * (line.qte || 1))}</td>
                                        </tr>
                                    )) : (
                                        <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                            <td colSpan="4" style={{ padding: '16px', textAlign: 'center', fontSize: '14px', color: '#94a3b8' }}>Aucune ligne facturée</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* TOTALS */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '50px' }}>
                            <div style={{ width: '45%' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                                    <tbody>
                                        <tr>
                                            <td style={{ padding: '8px 16px', color: '#64748b' }}>Sous-total HT</td>
                                            <td style={{ padding: '8px 16px', textAlign: 'right', fontWeight: '600', color: '#0f172a' }}>{formatMoney(facture.sousTotalHT || 0)}</td>
                                        </tr>
                                        {facture.tva > 0 && (
                                            <tr>
                                                <td style={{ padding: '8px 16px', color: '#64748b' }}>TVA (19%)</td>
                                                <td style={{ padding: '8px 16px', textAlign: 'right', fontWeight: '600', color: '#0f172a' }}>{formatMoney(facture.tva)}</td>
                                            </tr>
                                        )}
                                        {facture.timbre > 0 && (
                                            <tr>
                                                <td style={{ padding: '8px 16px', color: '#64748b' }}>Timbre Fiscal</td>
                                                <td style={{ padding: '8px 16px', textAlign: 'right', fontWeight: '600', color: '#0f172a' }}>{formatMoney(facture.timbre)}</td>
                                            </tr>
                                        )}
                                        <tr>
                                            <td colSpan="2" style={{ padding: '16px 0 0 0' }}>
                                                <div style={{ borderTop: '2px solid #0f172a' }}></div>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td style={{ padding: '16px 16px 0 16px', fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>TOTAL TTC</td>
                                            <td style={{ padding: '16px 16px 0 16px', textAlign: 'right', fontSize: '24px', fontWeight: '900', color: '#f59e0b' }}>{formatMoney(facture.montant || 0)}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* INVOICE TEXT AMOUNT */}
                        <div style={{ marginBottom: '40px', fontSize: '14px', color: '#0f172a', fontWeight: '500', fontStyle: 'italic' }}>
                            Arrêtée la présente facture à la somme de : <br />
                            <span style={{ fontWeight: '700' }}>{numberToFrenchText(facture.montant || 0)}</span>
                        </div>

                        {/* NOTES */}
                        {facture.notes && (
                            <div style={{ marginBottom: '40px' }}>
                                <div style={{ fontSize: '12px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>Notes & Conditions</div>
                                <div style={{ fontSize: '13px', color: '#475569', lineHeight: '1.6', background: '#f8fafc', padding: '16px', borderRadius: '8px', borderLeft: '4px solid #cbd5e1' }}>
                                    {facture.notes}
                                </div>
                            </div>
                        )}

                        {/* FOOTER */}
                        <div style={{ marginTop: 'auto', borderTop: '2px solid #e2e8f0', paddingTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                            {/* Banking Details (Bottom Left) */}
                            <div style={{ textAlign: 'left' }}>
                                <div style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.5px' }}>Coordonnées Bancaires</div>
                                <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a' }}>RIB: 008 0006710083019 15</div>
                                <div style={{ fontSize: '12px', color: '#475569' }}>Banque: BIAT</div>
                                <div style={{ fontSize: '12px', color: '#475569' }}>Titulaire: Mynds Team</div>
                            </div>

                            {/* Company Details (Bottom Right) */}
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', marginBottom: '4px', letterSpacing: '0.5px' }}>MYNDS SARL</div>
                                <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '8px' }}>Centre Urbain Nord, Tunis • MF: 1782635/A/A/M/000</div>
                                <div style={{ fontSize: '13px', fontWeight: '800', color: '#f59e0b', letterSpacing: '1px' }}>www.mynds-team.com</div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            <style>{`
                @media print {
                    @page {
                        size: A4 portrait;
                        margin: 0;
                    }
                    body * {
                        visibility: hidden !important;
                    }
                    html, body, #root, .modal-overlay, .invoice-preview-container {
                        background: white !important;
                        padding: 0 !important;
                        margin: 0 !important;
                        width: 100% !important;
                        height: 100% !important;
                        overflow: hidden !important;
                        box-shadow: none !important;
                    }
                    .no-print {
                        display: none !important;
                    }
                    .no-print-bg {
                        background: transparent !important;
                        padding: 0 !important;
                        margin: 0 !important;
                        overflow: visible !important;
                        display: block !important;
                    }
                    .invoice-paper, .invoice-paper * {
                        visibility: visible !important;
                    }
                    .invoice-paper {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 210mm !important;
                        height: 296mm !important;
                        max-height: 296mm !important;
                        padding: 15mm 20mm !important;
                        box-sizing: border-box !important;
                        box-shadow: none !important;
                        margin: 0 !important;
                        overflow: hidden !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        page-break-after: avoid !important;
                        page-break-before: avoid !important;
                        page-break-inside: avoid !important;
                    }
                }
            `}</style>
        </div>
    );
};

export default InvoicePreviewModal;
