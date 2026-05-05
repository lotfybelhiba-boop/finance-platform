import * as ReactDOMServer from 'react-dom/server';
import React from 'react';
import A4InvoiceDocument from '../components/A4InvoiceDocument';

/**
 * Generates a high-quality PDF from the A4InvoiceDocument component.
 * Uses html2pdf.js for client-side generation.
 */
export const generateDocumentPDF = async (facture, type = 'FACTURE') => {
    // 1. Dynamic import of html2pdf
    const html2pdf = (await import('html2pdf.js')).default;

    // 2. Render HTML string directly.
    // This allows background generation anywhere.
    let componentHtml = ReactDOMServer.renderToString(
        <A4InvoiceDocument facture={facture} />
    );
    
    // CRITICAL FIX: html2canvas (used by html2pdf) crashes and produces a blank page
    // if it encounters a relative image path (like "/logo-dark.png") inside an isolated iframe.
    // We MUST force absolute URLs before passing the HTML string to html2pdf.
    const baseUrl = window.location.origin;
    componentHtml = componentHtml.replaceAll('src="/logo-dark.png"', `src="${baseUrl}/logo-dark.png"`);
    componentHtml = componentHtml.replaceAll('src="/stamp-mynds.png"', `src="${baseUrl}/stamp-mynds.png"`);

    // 3. Strict physical wrapper
    const printHTML = `
        <div style="width: 210mm; min-height: 297mm; background: #ffffff; padding: 0; margin: 0; position: relative;">
            ${componentHtml}
        </div>
    `;

    // 4. Filename
    const dateEmi = facture.dateEmi || new Date().toISOString().split('T')[0];
    const clientName = (facture.client || 'Client').replace(/[^a-zA-Z0-9\u00C0-\u024F]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
    const invoiceNum = (facture.id || 'EXPORT').replace(/[^a-zA-Z0-9\-]/g, '_');
    const filename = `${clientName}_${invoiceNum}_${dateEmi}.pdf`;

    // 5. Config
    const opt = {
        margin: 0,
        filename: filename,
        image: { type: 'jpeg', quality: 1.0 },
        html2canvas: { 
            scale: 2, 
            useCORS: true,
            logging: false,
            width: 794,       // 210mm at 96dpi
            windowWidth: 794  // Force single A4 width, prevents overflow capture
        },
        jsPDF: { 
            unit: 'mm', 
            format: 'a4', 
            orientation: 'portrait'
        },
        pagebreak: { mode: 'avoid-all' }  // Never split — kills the blank 2nd page
    };

    // 6. Generate perfectly from string without any DOM interference
    try {
        await html2pdf().set(opt).from(printHTML).save();
    } catch (err) {
        console.error("PDF Generation Error:", err);
        throw err;
    }
};

/**
 * Generates the PDF and returns it as a Base64 string for email sending.
 */
export const generateDocumentBase64 = async (facture, type = 'FACTURE') => {
    const html2pdf = (await import('html2pdf.js')).default;
    let componentHtml = ReactDOMServer.renderToString(
        <A4InvoiceDocument facture={facture} />
    );
    
    const baseUrl = window.location.origin;
    componentHtml = componentHtml.replaceAll('src="/logo-dark.png"', `src="${baseUrl}/logo-dark.png"`);
    componentHtml = componentHtml.replaceAll('src="/stamp-mynds.png"', `src="${baseUrl}/stamp-mynds.png"`);

    const printHTML = `
        <div style="width: 210mm; min-height: 297mm; background: #ffffff; padding: 0; margin: 0; position: relative;">
            ${componentHtml}
        </div>
    `;

    const opt = {
        margin: 0,
        image: { type: 'jpeg', quality: 1.0 },
        html2canvas: { 
            scale: 2, 
            useCORS: true, 
            logging: false,
            width: 794,
            windowWidth: 794
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: 'avoid-all' }
    };

    try {
        const worker = html2pdf().set(opt).from(printHTML);
        const pdfBase64 = await worker.output('datauristring');
        return pdfBase64; // This is a data URI, we'll strip it in the plugin or here.
    } catch (err) {
        console.error("PDF Base64 Generation Error:", err);
        throw err;
    }
};
