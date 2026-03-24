import writtenNumber from 'written-number';

export function numberToFrenchText(amount) {
    if (isNaN(amount) || amount < 0) return '';

    // TND format: 3 decimals max
    const fixedAmount = Number(amount).toFixed(3);
    const [dinars, millimes] = fixedAmount.split('.');

    const d = parseInt(dinars, 10);
    const m = parseInt(millimes, 10);

    let text = '';

    if (d === 0 && m === 0) {
        return "Zéro Dinar";
    }

    if (d > 0) {
        let dinarStr = writtenNumber(d, { lang: 'fr' });
        text += dinarStr + (d > 1 ? ' Dinars' : ' Dinar');
    }

    if (m > 0) {
        if (text !== '') {
            text += ' et ';
        }

        let millimeStr = writtenNumber(m, { lang: 'fr' });
        text += millimeStr + (m > 1 ? ' Millimes' : ' Millime');
    }

    // Capitalize first letter
    if (text.length > 0) {
        text = text.charAt(0).toUpperCase() + text.slice(1);
    }

    return text;
}
