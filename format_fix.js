const fs = require('fs');
const files = ['FacturesPage.jsx', 'DevisPage.jsx', 'RapportsPage.jsx', 'HistoriquePage.jsx', 'ConfigPage.jsx', 'BanquePage.jsx', 'CalculPage.jsx', 'ClientsPage.jsx', 'DashboardPage.jsx'];

files.forEach(f => {
    const p = './src/pages/' + f;
    if (fs.existsSync(p)) {
        let content = fs.readFileSync(p, 'utf8');
        let initialContent = content;

        if (!content.includes('formatMoney(')) return;

        if (!content.includes('const formatNumber = ') && content.includes('const formatMoney = ')) {
            content = content.replace(/(const formatMoney = [^;]+;(\s*\}|)[ \t]*\n)/, "$1    const formatNumber = (amount) => new Intl.NumberFormat('fr-TN', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(amount);\n");
        }

        let parts = content.split('<td');
        for (let i = 1; i < parts.length; i++) {
            let subParts = parts[i].split('</td>');
            if (subParts.length > 1) {
                let cellContent = subParts[0];
                if (cellContent.includes('formatMoney(')) {
                    let isTotal = false;
                    if (cellContent.includes('borderTop: \\'2px') || cellContent.includes('reduce')) {
                        isTotal = true;
                    }
                    if (!isTotal) {
                        subParts[0] = cellContent.replace(/formatMoney\(/g, 'formatNumber(');
                    }
                }
            }
            parts[i] = subParts.join('</td>');
        }
        content = parts.join('<td');

        if (f === 'DashboardPage.jsx') {
            content = content.replace(/\{formatMoney\(f\.montant\)\}/g, '{formatNumber(f.montant)}');
            content = content.replace(/\{formatMoney\(c\.montantMensuel\)\}/g, '{formatNumber(c.montantMensuel)}');
        }
        if (f === 'FacturesPage.jsx') {
            content = content.replace(/\{formatMoney\(inv\.montantMensuel\)\}/g, '{formatNumber(inv.montantMensuel)}');
            content = content.replace(/\{formatMoney\(amountRemaining\)\}/g, '{formatNumber(amountRemaining)}');
            content = content.replace(/\{formatMoney\(amountOwed\)\}/g, '{formatNumber(amountOwed)}');
        }
        
        if (content !== initialContent) {
            fs.writeFileSync(p, content, 'utf8');
            console.log('Fixed:', f);
        }
    }
});
