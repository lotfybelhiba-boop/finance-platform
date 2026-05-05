import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkClientDuplicates() {
  const clients = await prisma.client.findMany();
  const seen = new Map();
  const toDelete = [];

  for (const c of clients) {
    const key = c.enseigne.toLowerCase().trim();
    if (seen.has(key)) {
       toDelete.push(c.id);
    } else {
       seen.set(key, c);
    }
  }

  console.log(`Duplicate clients found: ${toDelete.length}`);
  if (toDelete.length > 0) {
      console.log('Duplicates IDs:', toDelete);
  }
}

checkClientDuplicates().catch(console.error).finally(() => prisma.$disconnect());
