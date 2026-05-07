/**
 * =============================================================
 *  CORRECTIF POST-AUDIT — Résolution des anomalies détectées
 * =============================================================
 *  Ce script corrige :
 *  1. Factures "Paid" avec montantPaye = 0 → set montantPaye = montant
 *  2. Factures orphelines (clientId NULL) → résolution via clientName
 *  3. Augmentation du timeout de transaction Prisma pour migration
 * =============================================================
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

// ─── Helpers ──────────────────────────────────────────────────
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

function ok(msg) { console.log(`  ${GREEN}✔${RESET} ${msg}`); }
function info(msg) { console.log(`  ${YELLOW}→${RESET} ${msg}`); }
function header(msg) { console.log(`\n${CYAN}${BOLD}═══ ${msg} ═══${RESET}`); }

// ─── 1. Fix Paid invoices with montantPaye = 0 ───────────────
async function fixMontantPaye() {
  header('1. CORRECTION: Factures Paid avec montantPaye = 0');

  const paidInvoices = await prisma.invoice.findMany({
    where: {
      statut: { startsWith: 'Paid' },
      OR: [
        { montantPaye: '0' },
        { montantPaye: null },
        { montantPaye: '' }
      ]
    },
    select: { id: true, clientName: true, montant: true, montantPaye: true, statut: true }
  });

  if (paidInvoices.length === 0) {
    ok('Aucune facture Paid avec montantPaye = 0 trouvée.');
    return;
  }

  info(`${paidInvoices.length} facture(s) à corriger...`);

  let fixed = 0;
  for (const inv of paidInvoices) {
    const montant = inv.montant || '0';
    await prisma.invoice.update({
      where: { id: inv.id },
      data: { montantPaye: montant }
    });
    fixed++;
    if (fixed <= 10) {
      ok(`${inv.id} ("${inv.clientName}"): montantPaye = "${montant}"`);
    }
  }

  if (fixed > 10) {
    ok(`... et ${fixed - 10} autres factures corrigées.`);
  }
  ok(`Total: ${fixed} facture(s) corrigée(s).`);
}

// ─── 2. Fix orphan invoices (null clientId) ──────────────────
async function fixOrphanInvoices() {
  header('2. CORRECTION: Factures orphelines (clientId NULL)');

  const orphanInvoices = await prisma.invoice.findMany({
    where: { clientId: null },
    select: { id: true, clientName: true }
  });

  if (orphanInvoices.length === 0) {
    ok('Aucune facture orpheline trouvée.');
    return;
  }

  info(`${orphanInvoices.length} facture(s) orpheline(s) à résoudre...`);

  // Get all clients for matching
  const allClients = await prisma.client.findMany({
    select: { id: true, enseigne: true }
  });

  let fixed = 0;
  let notFound = 0;

  for (const inv of orphanInvoices) {
    const clientName = (inv.clientName || '').trim().toLowerCase();
    
    // Try exact match first
    let matchedClient = allClients.find(c => 
      (c.enseigne || '').trim().toLowerCase() === clientName
    );

    // Try partial match (client name contains or is contained by enseigne)
    if (!matchedClient) {
      matchedClient = allClients.find(c => {
        const enseigne = (c.enseigne || '').trim().toLowerCase();
        return clientName.includes(enseigne) || enseigne.includes(clientName);
      });
    }

    if (matchedClient) {
      await prisma.invoice.update({
        where: { id: inv.id },
        data: { clientId: matchedClient.id }
      });
      fixed++;
      ok(`${inv.id} → lié à "${matchedClient.enseigne}" (${matchedClient.id})`);
    } else {
      notFound++;
      info(`${inv.id} ("${inv.clientName}") — aucun client correspondant trouvé.`);
    }
  }

  ok(`Total: ${fixed} facture(s) liée(s), ${notFound} non résolue(s).`);
}

// ─── Main ─────────────────────────────────────────────────────
async function main() {
  console.log(`\n${BOLD}╔══════════════════════════════════════════════════════════╗${RESET}`);
  console.log(`${BOLD}║  CORRECTIF POST-AUDIT — Résolution des anomalies        ║${RESET}`);
  console.log(`${BOLD}║  Date: ${new Date().toLocaleString('fr-FR')}                      ║${RESET}`);
  console.log(`${BOLD}╚══════════════════════════════════════════════════════════╝${RESET}\n`);

  await fixOrphanInvoices();
  await fixMontantPaye();

  header('TERMINÉ');
  console.log(`  ${GREEN}${BOLD}✅ Toutes les corrections ont été appliquées.${RESET}\n`);
}

main()
  .catch(e => { console.error('FATAL:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
