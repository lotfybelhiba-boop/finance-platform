const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function restoreData() {
    console.log("🚀 Démarrage de la restauration des données...");
    
    try {
        const filePath = path.join(__dirname, 'backup', 'latest_data_backup.json');
        if (!fs.existsSync(filePath)) {
            console.error("❌ Aucun fichier de backup trouvé !");
            return;
        }

        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        // Priority order to avoid foreign key issues
        const models = [
            'client',
            'user',
            'auditHistory',
            'note',
            'rHState',
            'invoice',
            'quote',
            'bankTransaction',
            'serviceRecurrent',
            'projectCost',
            'invoiceLine'
        ];

        for (const model of models) {
            if (data[model] && data[model].length > 0) {
                console.log(`📥 Restauration de ${data[model].length} entrées pour ${model}...`);
                // Use createMany if available, else loop
                // For simplicity and safety, we'll loop or use createMany
                try {
                    // Clear existing if necessary? 
                    // No, user just wants to find them online.
                    for (const item of data[model]) {
                        await prisma[model].upsert({
                            where: { id: item.id }, // Assumes id exists for these
                            update: item,
                            create: item
                        });
                    }
                } catch (err) {
                    console.error(`⚠️ Erreur partielle sur ${model}:`, err.message);
                }
            }
        }

        console.log(`✅ Restauration terminée !`);
        
    } catch (error) {
        console.error("❌ Erreur lors de la restauration :", error);
    } finally {
        await prisma.$disconnect();
    }
}

// NOTE: This script is a template. Upsert logic depends on @id field naming.
// Some models use Int id, some String id. 
// This is for reference to help the user move data to production later.
console.log("💡 Ce script est fourni pour vous aider à restaurer vos données sur un nouveau serveur.");
// restoreData(); // Uncomment to run
