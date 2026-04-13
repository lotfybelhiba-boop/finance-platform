import fs from 'fs';

const filePath = 'd:/Mynds Finance/financial-dashboard/src/pages/RapportsPage.jsx';
let content = fs.readFileSync(filePath, 'utf-8');

// Strategy: Extract the return block and rebuild it cleanly.
// We identify the return statement and rebuild only the JSX tree.

// Find line "    return (" and everything after until the final export
const returnIdx = content.indexOf('    return (');
const exportIdx = content.indexOf('export default RapportsPage;');

if (returnIdx === -1 || exportIdx === -1) {
    console.error('Could not find return block or export!');
    process.exit(1);
}

const beforeReturn = content.substring(0, returnIdx);
const afterExport = content.substring(exportIdx);

// Now rebuild the return block cleanly
const returnBlock = `    return (
        <div className="page" style={{ paddingBottom: '60px' }}>
            {/* INTERFACE DE CONTROLE (Non imprimée) */}
            <div className="no-print" style={{ marginBottom: '24px' }}>
                <Header title="Rapports Comptables" subtitle="Générer, visualiser et exporter le bilan formel" />

                {/* SOUS-MENU HORIZONTAL */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', overflowX: 'auto', paddingBottom: '4px' }}>
                    {[
                        { id: 'Mynds', icon: Building2, label: 'Mynds (Global)' },
                        { id: 'Client', icon: FileText, label: 'Par Client' },
                        { id: 'Employé', icon: Briefcase, label: 'Employés' },
                        { id: 'Organigramme', icon: Network, label: 'Organigramme' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => {
                                setActiveTab(tab.id);
                                if (tab.id === 'Mynds') setSelectedClient('all');
                            }}
                            style={{
                                padding: '10px 20px',
                                borderRadius: '12px',
                                border: '1px solid',
                                borderColor: activeTab === tab.id ? 'var(--primary-color)' : 'var(--border-color)',
                                background: activeTab === tab.id ? 'var(--primary-color)' : 'var(--bg-main)',
                                color: activeTab === tab.id ? 'white' : 'var(--text-main)',
                                fontWeight: activeTab === tab.id ? '800' : '600',
                                fontSize: '13px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                transition: 'all 0.2s',
                                boxShadow: activeTab === tab.id ? '0 4px 12px rgba(139, 92, 246, 0.2)' : 'none'
                            }}
                        >
                            <tab.icon size={16} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Filtres : visible uniquement pour Mynds et Client */}
                {(activeTab === 'Mynds' || activeTab === 'Client') && (
                <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <Filter size={18} color="var(--text-muted)" />
                            <select
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-main)', fontSize: '13px', fontWeight: '700', outline: 'none', cursor: 'pointer' }}
                            >
                                {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                            <select
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-main)', fontSize: '13px', fontWeight: '600', outline: 'none', cursor: 'pointer' }}
                            >
                                <option value="all">Tous les mois</option>
                                {['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'].map((month, idx) => (
                                    <option key={idx} value={idx}>{month}</option>
                                ))}
                            </select>
                            {activeTab === 'Client' && (
                            <select
                                value={selectedClient}
                                onChange={(e) => setSelectedClient(e.target.value)}
                                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-main)', fontSize: '13px', fontWeight: '600', outline: 'none', cursor: 'pointer', maxWidth: '200px' }}
                            >
                                <option value="all">Tous les clients</option>
                                {clients.filter(c => c.etatClient === 'Actif').map(c => (
                                    <option key={c.id} value={c.enseigne}>{c.enseigne}</option>
                                ))}
                            </select>
                            )}
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '12px', border: 'none', background: 'var(--text-main)', color: 'white', cursor: 'pointer', fontWeight: '700', fontSize: '13px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                            <Printer size={16} /> Imprimer (PDF)
                        </button>
                    </div>
                </div>
                )}
            </div>

            {/* TAB: Employé */}
            {activeTab === 'Employé' && (
                <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border-color)', marginBottom: '40px' }}>
                    <Briefcase size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
                    <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>Rapport par Employé</h3>
                    <p style={{ fontSize: '14px', maxWidth: '400px', margin: '0 auto' }}>
                        Cette section affichera bientôt les statistiques RH et les indicateurs de performance des membres de votre équipe.
                    </p>
                </div>
            )}

            {/* TAB: Organigramme */}
            {activeTab === 'Organigramme' && (
                <div style={{ marginBottom: '40px' }}>
                    <CalculsOrganigramme />
                </div>
            )}

            {/* TAB: Mynds / Client — DOCUMENT OFFICIEL */}
            {(activeTab === 'Mynds' || activeTab === 'Client') && (
            <>
            <div className="printable-report" style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '24px',
                color: 'var(--text-main)'
            }}>
`;

// Now we need to extract the report BODY content (from EN-TÊTE to FOOTER)
// We look for "EN-TÊTE DU RAPPORT" section in original and grab until just before the style tag
const enTeteMarker = '{/* EN-TÊTE DU RAPPORT */}';
const enTeteStart = content.indexOf(enTeteMarker);
const footerEnd = content.indexOf("</div>", content.indexOf("Généré électroniquement"));

if (enTeteStart === -1 || footerEnd === -1) {
    console.error('Could not find report body markers!');
    process.exit(1);
}

// Get content from EN-TÊTE marker to end of footer div (inclusive)
const reportBody = content.substring(enTeteStart, footerEnd + 6); // +6 for "</div>"

const closingBlock = `
            </div>

            {/* CSS pour l'impression */}
            <style>{\`
                @media print {
                    .no-print, .sidebar, header, nav, button {
                        display: none !important;
                    }
                    @page {
                        margin: 1.5cm;
                        size: A4 landscape;
                    }
                    body {
                        background: white !important;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    .page {
                        padding: 0 !important;
                        margin: 0 !important;
                        margin-left: -280px !important;
                        width: 100vw !important;
                    }
                    .printable-report {
                        box-shadow: none !important;
                        border: none !important;
                        max-width: 100% !important;
                        padding: 0 !important;
                    }
                }
            \`}</style>
            </>
            )}
        </div>
    );
};

`;

const finalContent = beforeReturn + returnBlock + '                ' + reportBody + '\n' + closingBlock + afterExport + '\n';

fs.writeFileSync(filePath, finalContent, 'utf-8');
console.log('JSX return block rebuilt cleanly!');
