import fs from "fs";

const filePath = "d:/Mynds Finance/financial-dashboard/src/pages/FinancePage.jsx";
let content = fs.readFileSync(filePath, "utf-8");

// 1. Exclude 'Perso'
const persoRegex = /transactionsForYear\.forEach\(t => \{\s*const d = new Date\(t\.date\);\s*if \(\!isNaN\(d\.getTime\(\)\)\) \{/;
if (persoRegex.test(content)) {
    content = content.replace(persoRegex, 
        "transactionsForYear.forEach(t => {\n        const d = new Date(t.date);\n        if (!isNaN(d.getTime()) && t.category !== 'Perso') {"
    );
}

// 2. Add title tooltip
const titleRegex = /<h3 style=\{\{ fontSize: '13px', fontWeight: '800', color: 'var\(--text-main\)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' \}\}>Activité Mensuelle \(Productivité Facturée\)<\/h3>/;
if (titleRegex.test(content)) {
    content = content.replace(titleRegex, 
        `<h3 style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-main)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px', cursor: 'help' }} title="Note : Les charges personnelles de Lotfi ne sont pas incluses dans les calculs d'activité (Seuls les frais professionnels de l'agence sont comptés).">Activité Mensuelle (Productivité Facturée)</h3>`
    );
}

// 3. Add row at the end of Activity Table
const endTableRegex = /(<td[^>]*>Bénéfice Réel \(Encaissé\)<\/td>[\s\S]*?)<\/tbody>/;
if (endTableRegex.test(content) && !content.includes("Reste à Encaisser")) {
    const rowCode = `
                                    <tr>
                                        <td style={{ padding: '4px 8px', fontSize: '10px', fontWeight: '900', color: '#ef4444', textAlign: 'left', borderTop: '2px dotted var(--border-color)', opacity: 0.8 }} title="Montant restant à recevoir sur le C.A. Facturé (Impayés ou En attente)">Reste à Encaisser</td>
                                        {monthlyCAFacture.map((ca, idx) => {
                                            const rest = ca - monthlyCARealise[idx];
                                            const hasActivity = ca > 0;
                                            return (
                                                <td key={\`rest-\${idx}\`} style={{ padding: '6px', background: 'transparent', borderRadius: '6px', borderTop: '2px dotted var(--border-color)' }}>
                                                    <div style={{ fontSize: '11px', fontWeight: '900', color: hasActivity && rest > 0 ? '#ef4444' : 'var(--text-muted)' }}>
                                                        {hasActivity && rest > 0 ? formatNumber(rest) : '-'}
                                                    </div>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                </tbody>`;
                                
    content = content.replace(endTableRegex, "$1" + rowCode);
}

fs.writeFileSync(filePath, content, "utf-8");
console.log("Chart refactoring complete!");
