import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';

export default function emailPlugin() {
  return {
    name: 'vite-plugin-email-sender',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url === '/api/send-invoice' && req.method === 'POST') {
          // Load env variables
          dotenv.config({ path: path.resolve(process.cwd(), '.env') });
          
          let body = '';
          req.on('data', chunk => {
            body += chunk.toString();
          });
          
          req.on('end', async () => {
            try {
              const { to, subject, text, pdfBase64, filename } = JSON.parse(body);

              const gmailUser = process.env.VITE_GMAIL_USER || 'lotfybelhiba@gmail.com';
              const gmailPass = process.env.GMAIL_APP_PASSWORD;

              if (!gmailPass || gmailPass === 'votre_mot_de_passe_ici') {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                return res.end(JSON.stringify({ error: "Configuration manquante : GMAIL_APP_PASSWORD non défini dans le fichier .env" }));
              }

              const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                  user: gmailUser,
                  pass: gmailPass
                }
              });

              // Clean base64 string
              const contentBase64 = pdfBase64.includes('base64,') ? pdfBase64.split('base64,')[1] : pdfBase64;

              const mailOptions = {
                from: `"Mynds Team" <${gmailUser}>`,
                to,
                subject,
                text,
                attachments: [
                  {
                    filename: filename || 'Facture.pdf',
                    content: contentBase64,
                    encoding: 'base64'
                  }
                ]
              };

              await transporter.sendMail(mailOptions);
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true }));
            } catch (error) {
              console.error("Email sending failed:", error);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: "Erreur d'envoi SMTP : " + error.message }));
            }
          });
        } else {
          next();
        }
      });
    }
  };
}
