import fs from 'fs';

const filePath = 'd:/Mynds Finance/financial-dashboard/src/pages/RapportsPage.jsx';
let content = fs.readFileSync(filePath, 'utf-8');

// 1. Add Icons
content = content.replace(
    "import { Download, Printer, Filter, Building2, Calendar, FileText, CheckCircle2 } from 'lucide-react';",
    "import { Download, Printer, Filter, Building2, Calendar, FileText, CheckCircle2, Users, Briefcase, Network } from 'lucide-react';"
);

// 2. Add State
content = content.replace(
    "const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());",
    "const [activeTab, setActiveTab] = useState('Mynds');\n    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());"
);

// 3. Add Submenu
const submenuCode = `
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

                {(activeTab === 'Mynds' || activeTab === 'Client') && (
`;
content = content.replace(
    '<div className="card" style={{ display: \'flex\', justifyContent: \'space-between\', alignItems: \'center\', background: \'var(--card-bg)\', border: \'1px solid var(--border-color)\', borderRadius: \'16px\', padding: \'20px\' }}>',
    submenuCode + '\n<div className="card" style={{ display: \'flex\', justifyContent: \'space-between\', alignItems: \'center\', background: \'var(--card-bg)\', border: \'1px solid var(--border-color)\', borderRadius: \'16px\', padding: \'20px\' }}>'
);

// 4. Client Selector Conditional
content = content.replace(
    "{/* Choix Client */}",
    "{/* Choix Client */}\n                            {activeTab === 'Client' && ("
);
content = content.replace(
    "</select>\n                        </div>\n                    </div>\n\n                    <div style={{ display: 'flex', gap: '12px' }}>",
    "</select>\n                            )}\n                        </div>\n                    </div>\n\n                    <div style={{ display: 'flex', gap: '12px' }}>"
);

// 5. Wrap Controls End
content = content.replace(
    "                </div>\n            </div>\n\n            {/* DOCUMENT OFFICIEL A IMPRIMER */}",
    "                </div>\n                )}\n            </div>\n\n" + 
    `            {activeTab === 'Employé' && (
                <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border-color)' }}>
                    <Briefcase size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
                    <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>Rapport par Employé</h3>
                    <p style={{ fontSize: '14px', maxWidth: '400px', margin: '0 auto' }}>
                        Cette section est en cours de développement. Elle affichera bientôt les statistiques RH et les indicateurs de performance des membres de votre équipe.
                    </p>
                </div>
            )}

            {activeTab === 'Organigramme' && (
                <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border-color)' }}>
                    <Network size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
                    <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>Organigramme de l'Agence</h3>
                    <p style={{ fontSize: '14px', maxWidth: '400px', margin: '0 auto' }}>
                        Cette section est en cours de développement. Elle affichera la hiérarchie et la structure organisationnelle de MYNDS.
                    </p>
                </div>
            )}
` +
    "            {/* DOCUMENT OFFICIEL A IMPRIMER */}\n            {(activeTab === 'Mynds' || activeTab === 'Client') && (\n"
);

// 6. Close Wrapper at the end of the printable part
content = content.replace(
    "            </div>\n\n            {/* CSS pour l'impression */}",
    "            </div>\n            )}\n\n            {/* CSS pour l'impression */}"
);

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Submenu injected successfully!');
