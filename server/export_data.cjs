const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function exportData() {
    console.log("🚀 Démarrage de l'exportation des données...");
    
    try {
        const data = {};
        
        // Prisma model mapping can be tricky with acronyms like RH
        // We'll check the keys of the prisma client directly
        const clientKeys = Object.keys(prisma).filter(key => !key.startsWith('_') && !key.startsWith('$'));
        console.log("🔍 Modèles détectés:", clientKeys.join(', '));

        for (const model of clientKeys) {
            try {
                console.log(`📦 Exportation du modèle : ${model}...`);
                data[model] = await prisma[model].findMany();
            } catch (err) {
                console.error(`❌ Erreur sur le modèle ${model}:`, err.message);
            }
        }

        data.exportedAt = new Date().toISOString();

        const backupDir = path.join(__dirname, 'backup');
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir);
        }

        const filePath = path.join(backupDir, 'latest_data_backup.json');
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

        console.log(`✅ Exportation terminée avec succès !`);
        console.log(`📁 Fichier : ${filePath}`);
        
    } catch (error) {
        console.error("❌ Erreur critique lors de l'exportation :", error);
    } finally {
        await prisma.$disconnect();
    }
}

exportData();
