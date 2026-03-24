import sys

file_path = 'd:/Mynds Finance/financial-dashboard/src/pages/FinancePage.jsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add state variable
state_var = '    const [showActiveClients, setShowActiveClients] = useState(false);\n'
if state_var not in content:
    content = content.replace('    const [transactions, setTransactions] = useState([]);\n', 
                              '    const [transactions, setTransactions] = useState([]);\n' + state_var)

# 2. Extract Table and remove from old location
start_marker = '{/* Table des Projets Sauvegardés */}'
end_marker = '{/* Side-by-Side Tracking Tables */}'

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx != -1 and end_idx != -1:
    # Grab the whole block including the start_marker, up to exactly before end_marker
    table_block = content[start_idx:end_idx].strip() + '\n\n                    '
    
    # Remove from content
    content = content[:start_idx] + content[end_idx:]

    # 3. Modify table to be collapsible
    old_header = r'''<div style={{ padding: '6px 12px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-main)' }}>
                            <h3 style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-main)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Détail des Clients Actifs</h3>
                        </div>'''
    
    new_header = r'''<div 
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
                        {showActiveClients && ('''

    table_block = table_block.replace(old_header, new_header)

    # Find the matching closing div of the table_block
    # table_block ends with: </div>\n                    </div>\n\n                    
    table_block = table_block.rstrip()
    if table_block.endswith('</div>\n                    </div>'):
        # Just insert the closing parenthesis for the react conditional render
        table_block = table_block[:-6] + '    )}\n                    </div>'
    
    # Add newlines at the end for spacing
    table_block += '\n\n                    '

    # 4. Insert before Activité Section
    insert_marker = '{/* Activité Section (Engagement / Facturation) */}'
    insert_idx = content.find(insert_marker)
    
    if insert_idx != -1:
        content = content[:insert_idx] + table_block + content[insert_idx:]

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("SUCCESS")
