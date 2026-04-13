const fs = require('fs');
const filePath = 'd:/Mynds Finance/financial-dashboard/src/pages/FinancePage.jsx';

let content = fs.readFileSync(filePath, 'utf-8');

// 1. Add state variable
const stateHookPos = content.indexOf('const [transactions, setTransactions] = useState([]);');
if (stateHookPos !== -1) {
    const endOfLine = content.indexOf('\n', stateHookPos);
    content = content.slice(0, endOfLine + 1) + '    const [showActiveClients, setShowActiveClients] = useState(false);\n' + content.slice(endOfLine + 1);
}

// 2. Extract Table Content
const startMarker = '{/* Table des Projets Sauvegardés */}';
const targetHeader = '<h3 style={{ fontSize: \\'10px\\', fontWeight: \\'800\\', color: \\'var(--text-main)\\', margin: 0, textTransform: \\'uppercase\\', letterSpacing: \\'0.5px\\' }}>Détail des Clients Actifs</h3>';

const tableStartPos = content.indexOf(startMarker);
if (tableStartPos !== -1) {
    const tableEndPos = content.indexOf('{/* Side-by-Side Tracking Tables */}', tableStartPos);
    if (tableEndPos !== -1) {
        let tableSection = content.slice(tableStartPos, tableEndPos);
        
        // Remove it from current location
        content = content.slice(0, tableStartPos) + content.slice(tableEndPos);

        // Modify table section to be collapsible
        // Replace header div
        const headerDivStart = tableSection.indexOf('<div style={{ padding: \\'6px 12px\\', borderBottom: \\'1px solid var(--border-color)\\', background: \\'var(--bg-main)\\' }}>');
        const headerDivEnd = tableSection.indexOf('</div>', headerDivStart) + 6;
        
        const newHeader = `
                        <div 
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
                        {showActiveClients && (
`;
        
        tableSection = tableSection.slice(0, headerDivStart) + newHeader + tableSection.slice(headerDivEnd);
        
        // Add closing tag before the last </div>
        const lastDivClose = tableSection.lastIndexOf('</div>');
        tableSection = tableSection.slice(0, lastDivClose) + '                        )}\n' + tableSection.slice(lastDivClose);

        // 3. Insert before Activité Section
        const insertMarker = '{/* Activité Section (Engagement / Facturation) */}';
        const insertPos = content.indexOf(insertMarker);
        if (insertPos !== -1) {
            content = content.slice(0, insertPos) + tableSection + content.slice(insertPos);
        }
    }
}

fs.writeFileSync(filePath, content, 'utf-8');
console.log("FinancePage Reordered!");
