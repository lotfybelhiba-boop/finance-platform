import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

async function restore() {
    try {
        console.log('Début de la restauration à partir de la sauvegarde...');
        
        const backupPath = path.join(__dirname, 'backup', 'latest_data_backup.json');
        if (!fs.existsSync(backupPath)) {
            console.error('Erreur: Fichier de sauvegarde introuvable :', backupPath);
            process.exit(1);
        }

        const rawData = fs.readFileSync(backupPath, 'utf8');
        const data = JSON.parse(rawData);

        console.log('Fichier lu avec succès. Nettoyage de la base de données actuelle...');

        // IMPORTANT: L'ordre de suppression est critique (contraintes de clés étrangères)
        await prisma.auditHistory.deleteMany();
        await prisma.bankTransaction.deleteMany();
        await prisma.invoiceLine.deleteMany();
        await prisma.invoice.deleteMany();
        await prisma.quote.deleteMany();
        await prisma.projectCost.deleteMany();
        await prisma.serviceRecurrent.deleteMany();
        await prisma.client.deleteMany();
        await prisma.rHState.deleteMany();
        await prisma.note.deleteMany();
        await prisma.user.deleteMany();

        console.log('Base de données nettoyée. Insertion des données...');

        // Restauration des tables principales sans clés étrangères d'abord
        if (data.user && data.user.length > 0) {
            await prisma.user.createMany({ data: data.user });
            console.log(`✅ Restauré: ${data.user.length} utilisateurs`);
        }
        
        if (data.client && data.client.length > 0) {
            await prisma.client.createMany({ data: data.client });
            console.log(`✅ Restauré: ${data.client.length} clients`);
        }
        
        if (data.rHState && data.rHState.length > 0) {
            await prisma.rHState.createMany({ data: data.rHState });
            console.log(`✅ Restauré: ${data.rHState.length} employés (RH)`);
        }
        
        if (data.note && data.note.length > 0) {
            await prisma.note.createMany({ data: data.note });
            console.log(`✅ Restauré: ${data.note.length} notes`);
        }

        // Restauration des tables avec dépendances (Client)
        if (data.serviceRecurrent && data.serviceRecurrent.length > 0) {
            await prisma.serviceRecurrent.createMany({ data: data.serviceRecurrent });
            console.log(`✅ Restauré: ${data.serviceRecurrent.length} services récurrents`);
        }
        
        if (data.projectCost && data.projectCost.length > 0) {
            await prisma.projectCost.createMany({ data: data.projectCost });
            console.log(`✅ Restauré: ${data.projectCost.length} coûts de projet`);
        }

        if (data.invoice && data.invoice.length > 0) {
            await prisma.invoice.createMany({ data: data.invoice });
            console.log(`✅ Restauré: ${data.invoice.length} factures`);
        }

        if (data.invoiceLine && data.invoiceLine.length > 0) {
            await prisma.invoiceLine.createMany({ data: data.invoiceLine });
            console.log(`✅ Restauré: ${data.invoiceLine.length} lignes de factures`);
        }

        if (data.quote && data.quote.length > 0) {
            await prisma.quote.createMany({ data: data.quote });
            console.log(`✅ Restauré: ${data.quote.length} devis`);
        }

        if (data.bankTransaction && data.bankTransaction.length > 0) {
            await prisma.bankTransaction.createMany({ data: data.bankTransaction });
            console.log(`✅ Restauré: ${data.bankTransaction.length} transactions bancaires`);
        }

        if (data.auditHistory && data.auditHistory.length > 0) {
            await prisma.auditHistory.createMany({ data: data.auditHistory });
            console.log(`✅ Restauré: ${data.auditHistory.length} historiques d'audit`);
        }

        console.log('🎉 Restauration terminée avec succès !');

    } catch (error) {
        console.error('Erreur fatale lors de la restauration :', error);
    } finally {
        await prisma.$disconnect();
    }
}

restore();
