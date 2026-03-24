import fs from 'fs';

const filePath = 'd:/Mynds Finance/financial-dashboard/src/pages/RapportsPage.jsx';
let content = fs.readFileSync(filePath, 'utf-8');

if (!content.includes('import CalculsOrganigramme')) {
    content = content.replace(
        "import { getBankTransactions, getFactures, getClients } from '../services/storageService';",
        "import { getBankTransactions, getFactures, getClients } from '../services/storageService';\nimport CalculsOrganigramme from '../components/CalculsOrganigramme';"
    );
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log('Import injected!');
} else {
    console.log('Import already exists.');
}
