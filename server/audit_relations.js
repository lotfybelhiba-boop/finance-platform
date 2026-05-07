/**
 * =============================================================
 *  AUDIT PHASE 2 — Vérification des Relations
 *  MODE: LECTURE SEULE (aucune modification)
 * =============================================================
 *  Ce script vérifie :
 *  - Invoice → Client (clientId pointe vers un Client existant)
 *  - InvoiceLine → Invoice (invoiceId valide)
 *  - ServiceRecurrent → Client (clientId valide)
 *  - ProjectCost → Client (clientId valide)
 *  - BankTransaction → Client (clientId valide si non-null)
 *  - Quote → Client (clientId valide si non-null)
 *  - Cohérence clientName vs Client.enseigne
 * =============================================================
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

// ─── Helpers ──────────────────────────────────────────────────
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

const OK = `${GREEN}✔${RESET}`;
const WARN = `${YELLOW}⚠${RESET}`;
const FAIL = `${RED}✘${RESET}`;

let totalWarnings = 0;
let totalErrors = 0;

function warn(msg) { totalWarnings++; console.log(`  ${WARN} ${msg}`); }
function fail(msg) { totalErrors++; console.log(`  ${FAIL} ${RED}${msg}${RESET}`); }
function ok(msg) { console.log(`  ${OK} ${msg}`); }
function header(msg) { console.log(`\n${CYAN}${BOLD}═══ ${msg} ═══${RESET}`); }

// ─── 1. Invoice → Client ─────────────────────────────────────
async function auditInvoiceClientRelation() {
  header('1. RELATION Invoice → Client');

  const invoices = await prisma.invoice.findMany({
    select: { id: true, clientId: true, clientName: true }
  });

  const clientIds = new Set(
    (await prisma.client.findMany({ select: { id: true } })).map(c => c.id)
  );

  let orphanCount = 0;
  let nullClientId = 0;

  for (const inv of invoices) {
    if (!inv.clientId) {
      nullClientId++;
      warn(`Facture ${inv.id} ("${inv.clientName}") : clientId est NULL — pas de lien vers Client.`);
    } else if (!clientIds.has(inv.clientId)) {
      orphanCount++;
      fail(`Facture ${inv.id} ("${inv.clientName}") : clientId="${inv.clientId}" ne correspond à aucun Client existant !`);
    }
  }

  if (orphanCount === 0 && nullClientId === 0) {
    ok(`Toutes les ${invoices.length} factures sont correctement liées à un client.`);
  } else {
    if (orphanCount > 0) fail(`${orphanCount} facture(s) orpheline(s) détectée(s) !`);
    if (nullClientId > 0) warn(`${nullClientId} facture(s) avec clientId NULL.`);
  }
}

// ─── 2. InvoiceLine → Invoice ────────────────────────────────
async function auditInvoiceLineRelation() {
  header('2. RELATION InvoiceLine → Invoice');

  const lines = await prisma.invoiceLine.findMany({
    select: { id: true, invoiceId: true, desc: true }
  });

  const invoiceIds = new Set(
    (await prisma.invoice.findMany({ select: { id: true } })).map(i => i.id)
  );

  let orphanCount = 0;
  for (const line of lines) {
    if (!invoiceIds.has(line.invoiceId)) {
      orphanCount++;
      fail(`InvoiceLine #${line.id} ("${line.desc || '?'}") : invoiceId="${line.invoiceId}" ne correspond à aucune facture !`);
    }
  }

  if (orphanCount === 0) {
    ok(`Toutes les ${lines.length} lignes de facture sont correctement liées.`);
  } else {
    fail(`${orphanCount} ligne(s) de facture orpheline(s) !`);
  }

  // Check invoices without lines
  const invoicesWithLines = new Set(lines.map(l => l.invoiceId));
  const invoicesAll = await prisma.invoice.findMany({
    select: { id: true, clientName: true, statut: true }
  });
  const invoicesNoLines = invoicesAll.filter(i => !invoicesWithLines.has(i.id));
  if (invoicesNoLines.length > 0) {
    for (const inv of invoicesNoLines.slice(0, 10)) {
      warn(`Facture ${inv.id} ("${inv.clientName}", statut=${inv.statut}) n'a aucune ligne.`);
    }
    if (invoicesNoLines.length > 10) {
      warn(`... et ${invoicesNoLines.length - 10} autres factures sans lignes.`);
    }
  } else {
    ok('Toutes les factures ont au moins une ligne.');
  }
}

// ─── 3. ServiceRecurrent → Client ────────────────────────────
async function auditServiceRecurrentRelation() {
  header('3. RELATION ServiceRecurrent → Client');

  const services = await prisma.serviceRecurrent.findMany({
    select: { id: true, clientId: true, desc: true }
  });

  const clientIds = new Set(
    (await prisma.client.findMany({ select: { id: true } })).map(c => c.id)
  );

  let orphanCount = 0;
  for (const svc of services) {
    if (!clientIds.has(svc.clientId)) {
      orphanCount++;
      fail(`ServiceRecurrent #${svc.id} ("${svc.desc || '?'}") : clientId="${svc.clientId}" n'existe pas !`);
    }
  }

  if (orphanCount === 0) {
    ok(`Tous les ${services.length} services récurrents sont correctement liés.`);
  } else {
    fail(`${orphanCount} service(s) récurrent(s) orphelin(s) !`);
  }
}

// ─── 4. ProjectCost → Client ─────────────────────────────────
async function auditProjectCostRelation() {
  header('4. RELATION ProjectCost → Client');

  const costs = await prisma.projectCost.findMany({
    select: { id: true, clientId: true, nom: true }
  });

  const clientIds = new Set(
    (await prisma.client.findMany({ select: { id: true } })).map(c => c.id)
  );

  let orphanCount = 0;
  for (const cost of costs) {
    if (!clientIds.has(cost.clientId)) {
      orphanCount++;
      fail(`ProjectCost #${cost.id} ("${cost.nom || '?'}") : clientId="${cost.clientId}" n'existe pas !`);
    }
  }

  if (orphanCount === 0) {
    ok(`Tous les ${costs.length} coûts projets sont correctement liés.`);
  } else {
    fail(`${orphanCount} coût(s) projet(s) orphelin(s) !`);
  }
}

// ─── 5. BankTransaction → Client ─────────────────────────────
async function auditBankTransactionRelation() {
  header('5. RELATION BankTransaction → Client');

  const transactions = await prisma.bankTransaction.findMany({
    select: { id: true, clientId: true, desc: true, date: true, amount: true }
  });

  const clientIds = new Set(
    (await prisma.client.findMany({ select: { id: true } })).map(c => c.id)
  );

  let orphanCount = 0;
  let nullClientId = 0;
  let linkedOk = 0;

  for (const tx of transactions) {
    if (!tx.clientId) {
      nullClientId++;
    } else if (!clientIds.has(tx.clientId)) {
      orphanCount++;
      fail(`BankTransaction #${tx.id} ("${tx.desc || '?'}", ${tx.date}) : clientId="${tx.clientId}" n'existe pas !`);
    } else {
      linkedOk++;
    }
  }

  ok(`${linkedOk} transaction(s) correctement liées à un client.`);
  if (nullClientId > 0) {
    console.log(`  ℹ️  ${nullClientId} transaction(s) sans clientId (peut être normal pour les charges générales).`);
  }
  if (orphanCount > 0) {
    fail(`${orphanCount} transaction(s) bancaire(s) orpheline(s) !`);
  }
}

// ─── 6. Quote → Client ───────────────────────────────────────
async function auditQuoteRelation() {
  header('6. RELATION Quote → Client');

  const quotes = await prisma.quote.findMany({
    select: { id: true, clientId: true, clientName: true }
  });

  if (quotes.length === 0) {
    console.log('  ℹ️  Aucun devis en base — vérification non applicable.');
    return;
  }

  const clientIds = new Set(
    (await prisma.client.findMany({ select: { id: true } })).map(c => c.id)
  );

  let orphanCount = 0;
  for (const q of quotes) {
    if (q.clientId && !clientIds.has(q.clientId)) {
      orphanCount++;
      fail(`Quote ${q.id} ("${q.clientName}") : clientId="${q.clientId}" n'existe pas !`);
    }
  }

  if (orphanCount === 0) {
    ok(`Tous les ${quotes.length} devis sont correctement liés.`);
  }
}

// ─── 7. ClientName Coherence ─────────────────────────────────
async function auditClientNameCoherence() {
  header('7. COHÉRENCE clientName vs Client.enseigne');

  const invoices = await prisma.invoice.findMany({
    where: { clientId: { not: null } },
    select: { id: true, clientId: true, clientName: true },
  });

  const clients = await prisma.client.findMany({
    select: { id: true, enseigne: true }
  });

  const clientMap = Object.fromEntries(clients.map(c => [c.id, c.enseigne]));

  let mismatchCount = 0;
  for (const inv of invoices) {
    if (inv.clientId && clientMap[inv.clientId]) {
      const expected = clientMap[inv.clientId].trim().toLowerCase();
      const actual = (inv.clientName || '').trim().toLowerCase();
      if (actual !== expected && actual !== '' && expected !== '') {
        mismatchCount++;
        if (mismatchCount <= 10) {
          warn(`Facture ${inv.id}: clientName="${inv.clientName}" ≠ enseigne="${clientMap[inv.clientId]}"`);
        }
      }
    }
  }

  if (mismatchCount > 10) {
    warn(`... et ${mismatchCount - 10} autres incohérences clientName/enseigne.`);
  }
  if (mismatchCount === 0) {
    ok(`Tous les clientName sont cohérents avec les enseignes.`);
  } else {
    warn(`${mismatchCount} incohérence(s) clientName/enseigne au total.`);
  }
}

// ─── Main ─────────────────────────────────────────────────────
async function main() {
  console.log(`\n${BOLD}╔══════════════════════════════════════════════════════════╗${RESET}`);
  console.log(`${BOLD}║  AUDIT POST-MIGRATION — Phase 2: Relations              ║${RESET}`);
  console.log(`${BOLD}║  Mode: LECTURE SEULE (aucune modification)               ║${RESET}`);
  console.log(`${BOLD}║  Date: ${new Date().toLocaleString('fr-FR')}                      ║${RESET}`);
  console.log(`${BOLD}╚══════════════════════════════════════════════════════════╝${RESET}\n`);

  await auditInvoiceClientRelation();
  await auditInvoiceLineRelation();
  await auditServiceRecurrentRelation();
  await auditProjectCostRelation();
  await auditBankTransactionRelation();
  await auditQuoteRelation();
  await auditClientNameCoherence();

  // ─── Summary ────────────────────────────────────────────────
  header('RÉSUMÉ PHASE 2');
  console.log(`  Erreurs critiques : ${totalErrors > 0 ? RED + totalErrors + RESET : GREEN + '0' + RESET}`);
  console.log(`  Avertissements    : ${totalWarnings > 0 ? YELLOW + totalWarnings + RESET : GREEN + '0' + RESET}`);

  if (totalErrors === 0 && totalWarnings === 0) {
    console.log(`\n  ${GREEN}${BOLD}🎉 Phase 2 passée avec succès — toutes les relations sont intactes !${RESET}\n`);
  } else if (totalErrors === 0) {
    console.log(`\n  ${YELLOW}${BOLD}⚡ Phase 2 terminée avec ${totalWarnings} avertissement(s) à vérifier.${RESET}\n`);
  } else {
    console.log(`\n  ${RED}${BOLD}🚨 Phase 2 terminée avec ${totalErrors} relation(s) cassée(s) !${RESET}\n`);
  }
}

main()
  .catch(e => { console.error('FATAL:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
