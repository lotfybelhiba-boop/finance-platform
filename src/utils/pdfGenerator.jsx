import * as ReactDOMServer from 'react-dom/server';
import React from 'react';
import A4InvoiceDocument from '../components/A4InvoiceDocument';

/**
 * Generates a high-quality PDF from the A4InvoiceDocument component.
 * Uses html2pdf.js for client-side generation.
 */
export const generateDocumentPDF = async (facture, type = 'FACTURE') => {
    // 1. Dynamic import of html2pdf to prevent build issues
    const html2pdf = (await import('html2pdf.js')).default;

    // 2. Render the React component to an HTML string
    const componentHtml = ReactDOMServer.renderToString(
        <A4InvoiceDocument facture={facture} />
    );

    // 3. Create a temporary container
    const container = document.createElement('div');
    container.innerHTML = componentHtml;
    container.style.position = 'absolute';
    container.style.top = '-9999px';
    container.style.left = '-9999px';
    document.body.appendChild(container);

    // 4. Construct the filename: Facture_MYNDS_YYYY-MM_NUMERO.pdf
    const dateEmi = facture.dateEmi || new Date().toISOString().split('T')[0];
    const yearMonth = dateEmi.substring(0, 7); // YYYY-MM
    const filename = `Facture_MYNDS_${yearMonth}_${facture.id || 'EXPORT'}.pdf`;

    // 5. Configure html2pdf for strict A4
    // 210mm x 297mm -> roughly 794px x 1123px at 96dpi
    const opt = {
        margin: 0,
        filename: filename,
        image: { type: 'jpeg', quality: 1.0 },
        html2canvas: { 
            scale: 2, 
            useCORS: true,
            letterRendering: true,
            logging: false
        },
        jsPDF: { 
            unit: 'mm', 
            format: 'a4', 
            orientation: 'portrait',
            compress: true
        }
    };

    // 6. Generate and save
    try {
        await html2pdf().set(opt).from(container.firstChild).save();
    } catch (err) {
        console.error("PDF Generation Error:", err);
        throw err;
    } finally {
        // 7. Cleanup
        document.body.removeChild(container);
    }
};
