import fs from 'fs';

const filePath = 'd:/Mynds Finance/financial-dashboard/src/pages/RapportsPage.jsx';
let content = fs.readFileSync(filePath, 'utf-8');

// Replace the missing closing bracket for the Client tab conditional.
// We use regex to handle any \r\n vs \n whitespace issues perfectly.
const regex = /<\/select>\s*<\/div>\s*<\/div>\s*<div style=\{\{ display: 'flex', gap: '12px' \}\}>/g;

if (regex.test(content)) {
    content = content.replace(regex, 
`</select>
                            )}
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px' }}>`
    );
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log("Successfully fixed the JSX error!");
} else {
    // Check if it was already fixed
    if (content.includes(")}")) {
        console.log("Already fixed maybe?");
    } else {
        console.error("Regex did not match!");
    }
}
