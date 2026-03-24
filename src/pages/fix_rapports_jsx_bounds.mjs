import fs from 'fs';

const filePath = 'd:/Mynds Finance/financial-dashboard/src/pages/RapportsPage.jsx';
let content = fs.readFileSync(filePath, 'utf-8');

// The first script might have left a stranded conditional opening : {(activeTab === 'Mynds' || activeTab === 'Client') && (
// Let's remove any instances of it to start fresh with our boundaries
content = content.replace(/\{\(activeTab === 'Mynds' \|\| activeTab === 'Client'\) && \(\s*/g, '');

// 1. Wrap the card inside `no-print`
content = content.replace(
    /<div className="card" style=\{\{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var\(--card-bg\)', border: '1px solid var\(--border-color\)', borderRadius: '16px', padding: '20px' \}\}>/g,
    `{(activeTab === 'Mynds' || activeTab === 'Client') && (\n                <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '20px' }}>`
);

// Close it at the end of the `no-print` block
// We do a regex replace to safely target the closing of no-print
content = content.replace(
    /<\/button>\s*<\/div>\s*<\/div>\s*<\/div>/g,
    `</button>\n                    </div>\n                </div>\n                )}\n            </div>`
);

// 2. Wrap the Printable block AND add the Employé/Organigramme empty states
const printableTarget = "{/* DOCUMENT OFFICIEL A IMPRIMER */}";
if (content.includes(printableTarget)) {
    content = content.replace(printableTarget, 
`           {activeTab === 'Employé' && (
                <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border-color)', marginBottom: '40px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>Rapport par Employé</h3>
                    <p style={{ fontSize: '14px', maxWidth: '400px', margin: '0 auto' }}>
                        Cette section affichera bientôt les statistiques RH et les indicateurs de performance des membres de votre équipe.
                    </p>
                </div>
            )}

            {activeTab === 'Organigramme' && (
                <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border-color)', marginBottom: '40px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>Organigramme de l'Agence</h3>
                    <p style={{ fontSize: '14px', maxWidth: '400px', margin: '0 auto' }}>
                        Cette section affichera la hiérarchie et la structure organisationnelle de MYNDS.
                    </p>
                </div>
            )}

            {(activeTab === 'Mynds' || activeTab === 'Client') && (
                <>
                {/* DOCUMENT OFFICIEL A IMPRIMER */}`
    );
}

// Close the second conditional at the very end of the component
content = content.replace(
    /<\/style>\s*<\/div>\s*\);\s*\};\s*export default RapportsPage;/g,
    `</style>\n                </>\n            )}\n        </div>\n    );\n};\nexport default RapportsPage;`
);

fs.writeFileSync(filePath, content, 'utf-8');
console.log('JSX structure patched perfectly.');
