import fs from "fs";

const filePath = "d:/Mynds Finance/financial-dashboard/src/pages/FinancePage.jsx";
let content = fs.readFileSync(filePath, "utf-8");

// State
if (!content.includes("showActiveClients")) {
    content = content.replace(
        "const [transactions, setTransactions] = useState([]);",
        "const [transactions, setTransactions] = useState([]);\n    const [showActiveClients, setShowActiveClients] = useState(false);"
    );
}

// Markers
const startM = "{/* Table des Projets Sauvegardés */}";
const endM = "{/* Side-by-Side Tracking Tables */}";

const idx1 = content.indexOf(startM);
const idx2 = content.indexOf(endM);

if (idx1 !== -1 && idx2 !== -1) {
    let block = content.substring(idx1, idx2);
    content = content.substring(0, idx1) + content.substring(idx2);

    // Make the header interactive
    const oldHeaderStart = "<div style={{ padding: \"6px 12px\", borderBottom: \"1px solid var(--border-color)\", background: \"var(--bg-main)\" }}>";
    const headerBlockEnd = "Détail des Clients Actifs</h3>\\n                        </div>";
    
    // We'll replace it via Regex to avoid nested quote issues
    const headerRegex = /<div style={{ padding: '6px 12px', borderBottom: '1px solid var\(--border-color\)', background: 'var\(--bg-main\)' }}>[\s\S]*?Détail des Clients Actifs<\/h3>\s*<\/div>/g;
    
    const newHeader = `<div 
                            onClick={() => setShowActiveClients(!showActiveClients)}
                            style={{ padding: '12px 16px', borderBottom: showActiveClients ? '1px solid var(--border-color)' : 'none', background: 'var(--bg-main)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', transition: 'background 0.2s' }}
                            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.02)'}
                            onMouseOut={(e) => e.currentTarget.style.background = 'var(--bg-main)'}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ background: 'var(--accent-gold)', width: '4px', height: '14px', borderRadius: '4px' }}></div>
                                <h3 style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-main)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Détail des Clients Actifs</h3>
                            </div>
                            <div style={{ transform: showActiveClients ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s', color: 'var(--text-muted)' }}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                            </div>
                        </div>
                        {showActiveClients && (`;
    
    block = block.replace(headerRegex, newHeader);
    
    // Close the JSX condition at the end of the block
    const divEnds = block.lastIndexOf("</div>");
    if (divEnds !== -1) {
        block = block.substring(0, divEnds) + "                        )}\n" + "                    </div>\n\n                    ";
    }

    const insertM = "{/* Activité Section (Engagement / Facturation) */}";
    const insIdx = content.indexOf(insertM);
    if (insIdx !== -1) {
        content = content.substring(0, insIdx) + block + content.substring(insIdx);
    }
}

fs.writeFileSync(filePath, content, "utf-8");
console.log("Refactored JSX successfully!");
