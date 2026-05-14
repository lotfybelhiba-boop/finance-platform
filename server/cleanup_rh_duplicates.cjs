const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanupRH() {
    console.log("🚀 Démarrage du nettoyage des doublons RH...");

    try {
        // 1. Nettoyage de RHState (Historique des paiements)
        // Doublon = Même nom, même mois, même année
        const rhStates = await prisma.rHState.findMany();
        const seenStates = new Map();
        const statesToDelete = [];

        for (const s of rhStates) {
            const key = `${s.employeeName}_${s.month}_${s.year}`.toLowerCase().trim();
            if (seenStates.has(key)) {
                statesToDelete.push(s.id);
            } else {
                seenStates.set(key, s.id);
            }
        }

        if (statesToDelete.length > 0) {
            console.log(`🧹 Suppression de ${statesToDelete.length} doublons dans RHState...`);
            await prisma.rHState.deleteMany({
                where: { id: { in: statesToDelete } }
            });
        } else {
            console.log("✅ Aucun doublon trouvé dans RHState.");
        }

        // 2. Nettoyage de ProjectCost (Affectations clients)
        // Doublon = Même nom, même client, même montant, mêmes dates
        const projectCosts = await prisma.projectCost.findMany();
        const seenCosts = new Map();
        const costsToDelete = [];

        for (const c of projectCosts) {
            const key = `${c.clientId}_${c.nom}_${c.montant}_${c.dateDebut}_${c.dateFin}`.toLowerCase().trim();
            if (seenCosts.has(key)) {
                costsToDelete.push(c.id);
            } else {
                seenCosts.set(key, c.id);
            }
        }

        if (costsToDelete.length > 0) {
            console.log(`🧹 Suppression de ${costsToDelete.length} doublons dans ProjectCost...`);
            await prisma.projectCost.deleteMany({
                where: { id: { in: costsToDelete } }
            });
        } else {
            console.log("✅ Aucun doublon trouvé dans ProjectCost.");
        }

        console.log("✨ Nettoyage terminé !");

    } catch (error) {
        console.error("❌ Erreur lors du nettoyage :", error);
    } finally {
        await prisma.$disconnect();
    }
}

cleanupRH();
