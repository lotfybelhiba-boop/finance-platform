import * as ReactDOMServer from 'react-dom/server';
import React from 'react';
import PrintableDocument from '../components/PrintableDocument';

export const generateDocumentPDF = async (data, type = 'FACTURE') => {
    // 1. Dynamic import of html2pdf to prevent Vite build crashes
    const html2pdf = (await import('html2pdf.js')).default;

    // 2. Render the React component to an HTML string
    const componentHtml = ReactDOMServer.renderToString(
        <PrintableDocument data={data} type={type} />
    );

    // 3. Create a temporary container
    const container = document.createElement('div');
    container.innerHTML = componentHtml;
    container.style.position = 'absolute';
    container.style.top = '-9999px';
    document.body.appendChild(container);

    // 4. Configure html2pdf
    const opt = {
        margin: 0,
        filename: `${type}_${data.id || 'export'}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'px', format: [794, 1123], orientation: 'portrait' }
    };

    // 5. Generate and save
    try {
        await html2pdf().set(opt).from(container.firstChild).save();
    } finally {
        // 6. Cleanup
        document.body.removeChild(container);
    }
};
