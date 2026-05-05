import React from 'react';
import { numberToFrenchText } from '../utils/numberToLetters.js';

/**
 * A4InvoiceDocument: Optimized for Luxe Minimalist Design & Strict A4 Fit.
 * Colors: Black & White dominant, Yellow (#FFC105) for accents.
 */
const A4InvoiceDocument = ({ facture }) => {
    if (!facture) return null;

    const formatMoney = (val) => new Intl.NumberFormat('fr-TN', { style: 'currency', currency: 'TND', minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(val || 0);

    const isND = (facture.id === 'non déclarée' || (facture.id && facture.id.startsWith('ND-')));

    const myndsInfo = {
        name: "Mynds Team",
        adresse: "136 Ave de la liberté, Tunis",
        telephone: "29 543 202",
        email: "contact@mynds-team.com",
        mf: "1782635/A/A/M/000",
        rib: isND ? "2300 3200 3213 3900 0149" : "008 0006710083019 15",
        banque: isND ? "QNB" : "BIAT"
    };

    const client = {
        enseigne: facture.client,
        adresse: facture.clientAdresse || facture.clientObj?.adresse || "Tunisie",
        mf: facture.clientMF || facture.clientObj?.mf || "",
        telephone: facture.clientObj?.telephone || ""
    };

    const yellowAccent = "#FFC105";

    return (
        <div id="invoice-document" style={{
            width: '210mm',
            height: '297mm',
            padding: '8mm 15mm 18mm 15mm',
            background: '#ffffff',
            color: '#000000',
            fontFamily: "'Inter', 'Segoe UI', Roboto, sans-serif",
            fontSize: '11pt',
            lineHeight: '1.4',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            overflow: 'hidden'  // Clip at exact A4 height — prevents blank 2nd page
        }}>
            {/* WATERMARK LOGO */}
            <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%) rotate(-15deg)',
                opacity: 0.03,
                pointerEvents: 'none',
                width: '120mm',
                zIndex: 0
            }}>
                <img src="/logo-dark.png" alt="" style={{ width: '100%' }} />
            </div>

            <div style={{ position: 'relative', zIndex: 1, height: '100%', display: 'flex', flexDirection: 'column' }}>
                
                {/* 1. HEADER */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10mm' }}>
                    <div style={{ flex: 1 }}>
                        <img src="/logo-dark.png" alt="MYNDS" style={{ height: '14mm' }} />
                    </div>
                    <div style={{ flex: 1, textAlign: 'right', fontSize: '8.5pt', color: '#555' }}>
                        <div style={{ fontWeight: '900', fontSize: '11pt', color: '#000', marginBottom: '1mm' }}>{myndsInfo.name}</div>
                        <div>{myndsInfo.adresse}</div>
                        <div>Tél: {myndsInfo.telephone}</div>
                        <div>{myndsInfo.email}</div>
                        <div style={{ fontWeight: '700', color: '#000', marginTop: '1mm' }}>MF: {myndsInfo.mf}</div>
                    </div>
                </div>

                {/* 2. TITLE & INFO BAR */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '8mm', borderBottom: '1px solid #eee', paddingBottom: '4mm' }}>
                    <div style={{ flex: 1.5 }}>
                        <div style={{ fontSize: '28pt', fontWeight: '900', color: yellowAccent, textTransform: 'uppercase', marginBottom: '3mm', lineHeight: 1 }}>FACTURE</div>
                        <div style={{ fontSize: '9pt', color: '#999', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '1pt', marginBottom: '1mm' }}>Facturé à</div>
                        <div style={{ fontSize: '13pt', fontWeight: '900', marginBottom: '2mm' }}>{client.enseigne}</div>
                        <div style={{ fontSize: '9pt', color: '#444', lineHeight: '1.5', maxWidth: '80%' }}>
                            {client.adresse && <div>{client.adresse}</div>}
                            {client.mf && <div style={{ color: '#000', fontWeight: '600', marginTop: '1mm' }}>MF: {client.mf}</div>}
                        </div>
                    </div>
                    <div style={{ flex: 1, textAlign: 'right' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2mm', fontSize: '10pt' }}>
                            <div><span style={{ color: '#999' }}>N°</span> <span style={{ fontWeight: '900', color: isND ? '#EF4444' : '#000', fontSize: '11pt' }}>{isND ? 'ND' : facture.id}</span></div>
                            <div><span style={{ color: '#999' }}>DATE</span> <span style={{ fontWeight: '900', color: '#000' }}>{facture.dateEmi}</span></div>
                            {(facture.periodeDebut || facture.periodeFin) && (
                                <div style={{ marginTop: '1mm', fontSize: '8.5pt' }}>
                                    <span style={{ color: '#999', fontSize: '7pt', textTransform: 'uppercase', display: 'block', marginBottom: '0.5mm' }}>Période de prestation</span>
                                    <span style={{ fontWeight: '700', color: '#555' }}>
                                        {facture.periodeDebut ? `Du ${facture.periodeDebut.split('-').reverse().join('/')}` : ''} 
                                        {facture.periodeFin ? ` Au ${facture.periodeFin.split('-').reverse().join('/')}` : ''}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* 3. TABLE */}
                <div style={{ flex: 1 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '5mm' }}>
                        <thead>
                            <tr style={{ textAlign: 'left', fontSize: '7.5pt', textTransform: 'uppercase', letterSpacing: '1pt', color: '#666' }}>
                                <th style={{ padding: '2.5mm 0', borderBottom: '1.5pt solid #000', width: '60%' }}>Désignation</th>
                                <th style={{ padding: '2.5mm 0', borderBottom: '1.5pt solid #000', textAlign: 'center', width: '10%' }}>Qté</th>
                                <th style={{ padding: '2.5mm 0', borderBottom: '1.5pt solid #000', textAlign: 'right', width: '15%' }}>P.U HT</th>
                                <th style={{ padding: '2.5mm 0', borderBottom: '1.5pt solid #000', textAlign: 'right', width: '15%' }}>Total HT</th>
                            </tr>
                        </thead>
                        <tbody style={{ fontSize: '9.5pt' }}>
                            {(facture.lignes || [{ desc: 'Prestation de Services', qte: 1, prix: facture.montantHT || (facture.montant / 1.19) }]).map((ligne, idx) => {
                                const isFree = (parseFloat(ligne.prix) === 0);
                                return (
                                    <tr key={idx} style={{ borderBottom: '0.5pt solid #f0f0f0' }}>
                                        <td style={{ padding: '2mm 0', verticalAlign: 'middle', fontWeight: '500', lineHeight: '1.3' }}>{ligne.desc}</td>
                                        <td style={{ padding: '2mm 0', verticalAlign: 'middle', textAlign: 'center' }}>{!isFree ? ligne.qte : ''}</td>
                                        <td style={{ padding: '2mm 0', verticalAlign: 'middle', textAlign: 'right' }}>{!isFree ? formatMoney(ligne.prix) : ''}</td>
                                        <td style={{ padding: '2mm 0', verticalAlign: 'middle', textAlign: 'right', fontWeight: '600' }}>{!isFree ? formatMoney(ligne.prix * ligne.qte) : ''}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>

                    {/* 4. TOTALS */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4mm' }}>
                        <div style={{ width: '50%', fontSize: '8.5pt', color: '#777', fontStyle: 'italic' }}>
                            Arrêtée la présente facture à la somme de : <br />
                            <span style={{ fontWeight: '700', color: '#000', fontStyle: 'normal' }}>{numberToFrenchText(facture.montant)}</span>
                        </div>
                        <div style={{ width: '70mm' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1.5mm 0', fontSize: '9pt' }}>
                                <span style={{ color: '#666' }}>Sous-total HT</span>
                                <span style={{ fontWeight: '600' }}>{formatMoney(facture.sousTotalHT || (facture.montant / 1.19))}</span>
                            </div>
                            {facture.tva > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1.5mm 0', fontSize: '9pt' }}>
                                    <span style={{ color: '#666' }}>TVA (19%)</span>
                                    <span style={{ fontWeight: '600' }}>{formatMoney(facture.tva)}</span>
                                </div>
                            )}
                            {facture.timbre > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1.5mm 0', fontSize: '9pt' }}>
                                    <span style={{ color: '#666' }}>Timbre Fiscal</span>
                                    <span style={{ fontWeight: '600' }}>{formatMoney(facture.timbre)}</span>
                                </div>
                            )}
                            <div style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                padding: '4mm 0', 
                                marginTop: '2mm', 
                                borderTop: '2pt solid #000',
                                position: 'relative'
                            }}>
                                <div style={{ position: 'absolute', top: '-1pt', right: 0, width: '20mm', height: '3pt', background: yellowAccent }}></div>
                                <span style={{ fontSize: '12pt', fontWeight: '900', textTransform: 'uppercase' }}>Total TTC</span>
                                <span style={{ fontSize: '15pt', fontWeight: '900', color: '#000' }}>{formatMoney(facture.montant)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 5. FOOTER */}
                <div style={{ marginTop: 'auto', borderTop: '1px solid #eee', paddingTop: '3mm', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontSize: '8pt', color: '#666' }}>
                    <div style={{ flex: 2 }}>
                        {/* STAMP / CACHET — gauche, au-dessus des coordonnées bancaires */}
                        <img
                            src="/stamp-mynds.png"
                            alt="Cachet"
                            style={{
                                display: 'block',
                                marginBottom: '3mm',
                                width: '40mm',
                                height: 'auto',
                                opacity: 0.9,
                                pointerEvents: 'none'
                            }}
                        />
                        <div style={{ fontWeight: '800', textTransform: 'uppercase', marginBottom: '1mm', color: '#000' }}>Coordonnées Bancaires</div>
                        <div style={{ display: 'flex', gap: '4mm' }}>
                            <div>Banque: <span style={{ fontWeight: '700', color: '#333' }}>{myndsInfo.banque}</span></div>
                            <div>RIB: <span style={{ fontWeight: '700', color: '#333' }}>{myndsInfo.rib}</span></div>
                        </div>
                    </div>
                    <div style={{ flex: 1, textAlign: 'right', position: 'relative' }}>
                        <div style={{ fontWeight: '800', color: '#000', fontSize: '9pt' }}>Mynds Team</div>
                        <div>Merci pour votre collaboration.</div>
                    </div>
                </div>

            </div>

        </div>
    );
};

export default A4InvoiceDocument;
