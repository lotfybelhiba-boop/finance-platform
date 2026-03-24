import fs from 'fs';

const path = 'src/pages/FacturesPage.jsx';
const content = fs.readFileSync(path, 'utf8');

const splitIndex = content.indexOf('facture={fac');

if (splitIndex === -1) {
    console.log("Could not find the split point.");
    process.exit(1);
}

const cleanStart = content.slice(0, splitIndex);

const missingMiddle = `facture={factures.find(f => f.id === paymentModalInfo.id)}
                />
            )}

`;

const correctEnding = fs.readFileSync('correctEnding.txt', 'utf8');

fs.writeFileSync(path, cleanStart + missingMiddle + correctEnding, 'utf8');
console.log("FacturesPage.jsx fixed completely.");
