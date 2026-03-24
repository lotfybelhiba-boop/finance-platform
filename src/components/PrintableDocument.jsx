import React from 'react';
import { numberToFrenchText } from '../utils/numberToLetters.js';

const PrintableDocument = ({ data, type = 'FACTURE' }) => {
    const formatMoney = (val) => new Intl.NumberFormat('fr-TN', { style: 'currency', currency: 'TND', minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(val);

    return (
        <div style={{ width: '794px', height: '1122px', overflow: 'hidden', background: 'white', padding: '30px', boxSizing: 'border-box', fontFamily: 'Helvetica, Arial, sans-serif', position: 'relative' }}>
            {/* HEADER */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px', borderBottom: '2px solid #FFC105', paddingBottom: '20px' }}>
                <div>
                    <img src="/logo-dark.png" alt="MYNDS" style={{ height: '40px', marginBottom: '4px' }} />
                </div>
                <div style={{ textAlign: 'right' }}>
                    <h2 style={{ fontSize: '36px', fontWeight: '700', color: '#FFC105', margin: 0, textTransform: 'uppercase', letterSpacing: '1px' }}>{type}</h2>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: (data.id === 'non déclarée' || (data.id && data.id.startsWith('ND-'))) ? '#EF4444' : '#333', marginTop: '8px' }}>
                        {(data.id === 'non déclarée' || (data.id && data.id.startsWith('ND-'))) ? 'SANS NUMÉRO (non déclarée)' : `N° ${data.id}`}
                    </div>
                    {data.bonCommande && (
                        <div style={{ fontSize: '12px', fontWeight: '600', color: '#666', marginTop: '4px' }}>
                            Bon de Commande : {data.bonCommande}
                        </div>
                    )}
                </div>
            </div>

            {/* DATE BAR */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '30px', width: '40%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', paddingBottom: '4px' }}>
                    <span style={{ fontSize: '12px', color: '#666' }}>Date de facture:</span>
                    <span style={{ fontSize: '12px', color: '#111', fontWeight: 'bold' }}>{data.dateEmi || data.date}</span>
                </div>
                {data.echeance && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', paddingBottom: '4px' }}>
                        <span style={{ fontSize: '12px', color: '#666' }}>Échéance:</span>
                        <span style={{ fontSize: '12px', color: '#111', fontWeight: 'bold' }}>{data.echeance}</span>
                    </div>
                )}
                {data.validite && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', paddingBottom: '4px' }}>
                        <span style={{ fontSize: '12px', color: '#666' }}>Validité:</span>
                        <span style={{ fontSize: '12px', color: '#111', fontWeight: 'bold' }}>{data.validite}</span>
                    </div>
                )}
                {(data.periodeDebut && data.periodeFin) && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', paddingBottom: '4px' }}>
                        <span style={{ fontSize: '12px', color: '#666' }}>Période:</span>
                        <span style={{ fontSize: '12px', color: '#111', fontWeight: 'bold' }}>{new Date(data.periodeDebut).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })} au {new Date(data.periodeFin).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                    </div>
                )}
            </div>

            {/* ADDRESS BLOCK */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '40px' }}>
                <div style={{ width: '48%' }}>
                    <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#999', textTransform: 'uppercase', marginBottom: '8px' }}>De</div>
                    <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#111', marginBottom: '4px' }}>MYNDS AGENCY</div>
                    <div style={{ fontSize: '12px', color: '#444', lineHeight: '1.5' }}>
                        Centre Urbain Nord<br />
                        Tunis, Tunisie<br />
                        contact@mynds.tn<br />
                        MF : 1782635/A/A/M/000
                    </div>
                </div>
                <div style={{ width: '48%', background: '#fffcf0', padding: '12px 16px', borderLeft: '3px solid #FFC105', borderRadius: '4px' }}>
                    <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#999', textTransform: 'uppercase', marginBottom: '4px' }}>Facturé à</div>
                    <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#111', marginBottom: '4px' }}>{data.client}</div>
                    <div style={{ fontSize: '11px', color: '#444', lineHeight: '1.4' }}>
                        {data.clientObj ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                {data.clientObj.mf && <div><strong style={{ color: '#222' }}>MF :</strong> {data.clientObj.mf}</div>}
                                {data.clientObj.charge && <div><strong style={{ color: '#222' }}>A/A :</strong> {data.clientObj.charge}</div>}
                                {data.clientObj.adresse && <div><strong style={{ color: '#222' }}>Adresse :</strong> {data.clientObj.adresse}</div>}
                                {data.clientObj.telephone && <div><strong style={{ color: '#222' }}>Tél :</strong> {data.clientObj.telephone}</div>}
                            </div>
                        ) : (
                            <div>Client</div>
                        )}
                    </div>
                </div>
            </div>

            {/* ITEMS TABLE */}
            <div style={{ marginBottom: '30px', minHeight: '350px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                        <tr style={{ background: '#111', color: '#fff' }}>
                            <th style={{ padding: '12px 10px', textAlign: 'left', width: '5%', fontWeight: '500' }}>N°</th>
                            <th style={{ padding: '12px 10px', textAlign: 'left', width: '60%', fontWeight: '500' }}>Désignation</th>
                            <th style={{ padding: '12px 10px', textAlign: 'center', width: '15%', fontWeight: '500' }}>PU HT</th>
                            <th style={{ padding: '12px 10px', textAlign: 'right', width: '20%', fontWeight: '500' }}>Total HT</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.lignes && data.lignes.map((l, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                                <td style={{ padding: '8px 10px' }}>{i + 1}</td>
                                <td style={{ padding: '8px 10px' }}>{l.desc}</td>
                                <td style={{ padding: '8px 10px', textAlign: 'center' }}>{formatMoney(l.prix)}</td>
                                <td style={{ padding: '8px 10px', textAlign: 'right' }}>{formatMoney(l.prix * l.qte)}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colSpan="4" style={{ borderTop: '2px solid #111' }}></td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            {/* TOTALS & CONDITIONS */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '50px' }}>
                <div style={{ width: '45%' }}>
                    <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#999', textTransform: 'uppercase', marginBottom: '8px' }}>Modalités & Conditions</div>
                    <div style={{ fontSize: '11px', color: '#444', lineHeight: '1.5', background: '#f9f9f9', padding: '12px', borderRadius: '4px', whiteSpace: 'pre-wrap' }}>
                        {data.conditions}
                    </div>
                    {data.notes && (
                        <div style={{ fontSize: '11px', color: '#666', marginTop: '10px', fontStyle: 'italic', whiteSpace: 'pre-wrap' }}>
                            {data.notes}
                        </div>
                    )}
                </div>
                <div style={{ width: '45%' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <tbody>
                            <tr>
                                <td style={{ padding: '8px 10px', color: '#555' }}>Sous-total HT</td>
                                <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 'bold' }}>{formatMoney(data.sousTotalHT)}</td>
                            </tr>
                            {(data.tva > 0 || data.isExonore) && (
                                <tr>
                                    <td style={{ padding: '8px 10px', color: '#555' }}>
                                        {data.isExonore ? 'TVA (Exonéré en suspension)' : 'TVA (19%)'}
                                    </td>
                                    <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 'bold' }}>
                                        {data.isExonore ? '0,00 TND' : formatMoney(data.tva)}
                                    </td>
                                </tr>
                            )}
                            {data.timbre > 0 && (
                                <tr>
                                    <td style={{ padding: '8px 10px', color: '#555' }}>Timbre fiscal</td>
                                    <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 'bold' }}>1 TND</td>
                                </tr>
                            )}
                            <tr>
                                <td colSpan="2" style={{ padding: 0 }}>
                                    <div style={{ borderTop: '1px solid #ccc', margin: '4px 0' }}></div>
                                </td>
                            </tr>
                            <tr>
                                <td style={{ padding: '12px 10px', fontSize: '16px', fontWeight: '800', color: '#111' }}>TOTAL TTC</td>
                                <td style={{ padding: '12px 10px', textAlign: 'right', fontSize: '18px', fontWeight: '800', color: '#FFC105' }}>{formatMoney(data.montant)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* DOCUMENT TEXT AMOUNT */}
            <div style={{ marginTop: '30px', fontSize: '13px', color: '#333', fontStyle: 'italic' }}>
                Arrêt{type === 'FACTURE' ? 'ée la présente facture' : 'é le présent devis'} à la somme de : <br />
                <span style={{ fontWeight: 'bold' }}>{numberToFrenchText(data.montant || 0)}</span>
            </div>

            {/* ABSOLUTE FOOTER */}
            <div style={{ position: 'absolute', bottom: '40px', left: '40px', right: '40px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <div style={{ fontSize: '10px', color: '#666', lineHeight: '1.5' }}>
                        <strong>Coordonnées Bancaires</strong><br />
                        RIB: 008 0006710083019 15<br />
                        Banque: BIAT | Titulaire: Mynds Team
                    </div>
                    <div style={{ fontSize: '10px', color: '#666', lineHeight: '1.5', textAlign: 'center' }}>
                        <strong>MYNDS SARL</strong> au capital de 10.000 TND<br />
                        MF: 1782635/A/A/M/000<br />
                        www.mynds-team.com
                    </div>
                    <div style={{ textAlign: 'right', width: '150px', height: '80px', border: '2px solid rgba(255,193,5,0.3)', borderRadius: '8px', position: 'relative' }}>
                        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%) rotate(-10deg)', color: 'rgba(255,193,5,0.4)', fontWeight: '800', fontSize: '18px', textTransform: 'uppercase' }}>
                            Signature
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PrintableDocument;
