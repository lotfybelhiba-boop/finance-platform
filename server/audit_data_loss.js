/**
 * =============================================================
 *  AUDIT PHASE 1 — Vérification de l'intégrité des données
 *  MODE: LECTURE SEULE (aucune modification)
 * =============================================================
 *  Ce script vérifie :
 *  - Le volume de chaque table (comptage)
 *  - Les doublons potentiels
 *  - Les champs critiques null ou vides de manière suspecte
 *  - Les valeurs numériques stockées en String qui pourraient
 *    être corrompues
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

// ─── 1. Volume Counts ────────────────────────────────────────
async function auditVolumes() {
  header('1. VOLUMÉTRIE DES TABLES');

  const counts = {
    'Client':            await prisma.client.count(),
    'ServiceRecurrent':  await prisma.serviceRecurrent.count(),
    'ProjectCost':       await prisma.projectCost.count(),
    'Invoice':           await prisma.invoice.count(),
    'InvoiceLine':       await prisma.invoiceLine.count(),
    'BankTransaction':   await prisma.bankTransaction.count(),
    'RHState':           await prisma.rHState.count(),
    'AuditHistory':      await prisma.auditHistory.count(),
    'User':              await prisma.user.count(),
    'Quote':             await prisma.quote.count(),
    'Note':              await prisma.note.count(),
  };

  console.log('\n  ┌─────────────────────┬──────────┐');
  console.log('  │ Table               │ Lignes   │');
  console.log('  ├─────────────────────┼──────────┤');
  for (const [table, count] of Object.entries(counts)) {
    const padTable = table.padEnd(19);
    const padCount = String(count).padStart(8);
    const color = count === 0 ? YELLOW : '';
    const reset = count === 0 ? RESET : '';
    console.log(`  │ ${color}${padTable}${reset} │ ${color}${padCount}${reset} │`);
  }
  console.log('  └─────────────────────┴──────────┘');

  // Flag empty tables (except User/Note which may be intentionally empty)
  for (const [table, count] of Object.entries(counts)) {
    if (count === 0 && !['User', 'Note', 'AuditHistory'].includes(table)) {
      warn(`Table "${table}" est vide — vérifier si c'est attendu.`);
    }
  }

  return counts;
}

// ─── 2. Duplicate Detection ──────────────────────────────────
async function auditDuplicates() {
  header('2. DÉTECTION DES DOUBLONS');

  // 2a. Clients with same "enseigne"
  const clients = await prisma.client.findMany({ select: { id: true, enseigne: true } });
  const enseigneMap = {};
  for (const c of clients) {
    const key = (c.enseigne || '').trim().toLowerCase();
    if (!enseigneMap[key]) enseigneMap[key] = [];
    enseigneMap[key].push(c.id);
  }
  const dupClients = Object.entries(enseigneMap).filter(([, ids]) => ids.length > 1);
  if (dupClients.length > 0) {
    for (const [enseigne, ids] of dupClients) {
      warn(`Client doublon potentiel: "${enseigne}" → IDs: ${ids.join(', ')}`);
    }
  } else {
    ok('Aucun doublon de clients (par enseigne) détecté.');
  }

  // 2b. Invoices with same composite key (clientName + dateEmi + montant)
  const invoices = await prisma.invoice.findMany({
    select: { id: true, clientName: true, dateEmi: true, montant: true }
  });
  const invMap = {};
  for (const inv of invoices) {
    const key = `${(inv.clientName || '').trim()}_${inv.dateEmi}_${inv.montant}`;
    if (!invMap[key]) invMap[key] = [];
    invMap[key].push(inv.id);
  }
  const dupInvoices = Object.entries(invMap).filter(([, ids]) => ids.length > 1);
  if (dupInvoices.length > 0) {
    for (const [key, ids] of dupInvoices) {
      warn(`Facture doublon potentiel: "${key}" → IDs: ${ids.join(', ')}`);
    }
  } else {
    ok('Aucun doublon de factures détecté.');
  }

  // 2c. RHState duplicates (same employee + month + year)
  const rhStates = await prisma.rHState.findMany({
    select: { id: true, employeeName: true, month: true, year: true }
  });
  const rhMap = {};
  for (const rh of rhStates) {
    const key = `${(rh.employeeName || '').trim()}_${rh.month}_${rh.year}`;
    if (!rhMap[key]) rhMap[key] = [];
    rhMap[key].push(rh.id);
  }
  const dupRH = Object.entries(rhMap).filter(([, ids]) => ids.length > 1);
  if (dupRH.length > 0) {
    for (const [key, ids] of dupRH) {
      warn(`RHState doublon potentiel: "${key}" → IDs: ${ids.join(', ')}`);
    }
  } else {
    ok('Aucun doublon RH détecté.');
  }
}

// ─── 3. Critical Null / Empty Fields ─────────────────────────
async function auditNulls() {
  header('3. CHAMPS CRITIQUES NULL OU VIDES');

  // 3a. Clients without enseigne
  const clientsNoEnseigne = await prisma.client.findMany({
    where: { OR: [{ enseigne: '' }, { enseigne: 'Inconnu' }] },
    select: { id: true, enseigne: true }
  });
  if (clientsNoEnseigne.length > 0) {
    warn(`${clientsNoEnseigne.length} client(s) avec enseigne vide ou "Inconnu": ${clientsNoEnseigne.map(c => c.id).join(', ')}`);
  } else {
    ok('Tous les clients ont une enseigne valide.');
  }

  // 3b. Invoices without clientName
  const invNoClient = await prisma.invoice.findMany({
    where: { OR: [{ clientName: null }, { clientName: '' }, { clientName: 'Inconnu' }] },
    select: { id: true, clientName: true }
  });
  if (invNoClient.length > 0) {
    warn(`${invNoClient.length} facture(s) sans clientName valide: ${invNoClient.slice(0, 10).map(i => i.id).join(', ')}${invNoClient.length > 10 ? '...' : ''}`);
  } else {
    ok('Toutes les factures ont un clientName valide.');
  }

  // 3c. Invoices with null/zero montant
  const invNoMontant = await prisma.invoice.findMany({
    where: { OR: [{ montant: null }, { montant: '0' }, { montant: '' }] },
    select: { id: true, clientName: true, montant: true, statut: true }
  });
  if (invNoMontant.length > 0) {
    // Filter out cancelled invoices — they might legitimately have 0
    const nonCancelled = invNoMontant.filter(i => i.statut !== 'Annulée' && i.statut !== 'Cancelled');
    if (nonCancelled.length > 0) {
      warn(`${nonCancelled.length} facture(s) non-annulée(s) avec montant null/zéro: ${nonCancelled.slice(0, 10).map(i => `${i.id} (${i.clientName})`).join(', ')}`);
    } else {
      ok('Factures avec montant zéro sont toutes annulées (attendu).');
    }
  } else {
    ok('Toutes les factures ont un montant valide.');
  }

  // 3d. Invoices without dateEmi
  const invNoDate = await prisma.invoice.findMany({
    where: { OR: [{ dateEmi: null }, { dateEmi: '' }] },
    select: { id: true, clientName: true }
  });
  if (invNoDate.length > 0) {
    warn(`${invNoDate.length} facture(s) sans date d'émission: ${invNoDate.slice(0, 10).map(i => i.id).join(', ')}`);
  } else {
    ok('Toutes les factures ont une date d\'émission.');
  }

  // 3e. BankTransactions without amount
  const txNoAmount = await prisma.bankTransaction.findMany({
    where: { OR: [{ amount: null }, { amount: 0 }] },
    select: { id: true, desc: true, date: true }
  });
  if (txNoAmount.length > 0) {
    warn(`${txNoAmount.length} transaction(s) bancaire(s) avec montant null/zéro: ${txNoAmount.slice(0, 5).map(t => `#${t.id} "${t.desc || '(no desc)'}"`).join(', ')}`);
  } else {
    ok('Toutes les transactions bancaires ont un montant valide.');
  }

  // 3f. RHState without employeeName or amount
  const rhNoName = await prisma.rHState.findMany({
    where: { OR: [{ employeeName: null }, { employeeName: '' }] },
    select: { id: true }
  });
  if (rhNoName.length > 0) {
    warn(`${rhNoName.length} entrée(s) RH sans nom d'employé.`);
  } else {
    ok('Toutes les entrées RH ont un nom d\'employé.');
  }

  const rhNoAmount = await prisma.rHState.findMany({
    where: { OR: [{ amount: null }, { amount: 0 }] },
    select: { id: true, employeeName: true }
  });
  if (rhNoAmount.length > 0) {
    warn(`${rhNoAmount.length} entrée(s) RH avec montant null/zéro.`);
  } else {
    ok('Toutes les entrées RH ont un montant valide.');
  }
}

// ─── 4. String-encoded numeric fields sanity ─────────────────
async function auditStringNumbers() {
  header('4. VÉRIFICATION DES CHAMPS NUMÉRIQUES EN STRING');

  // Check invoice montant, totalHT, totalTTC, tva fields are parsable
  const invoices = await prisma.invoice.findMany({
    select: { id: true, clientName: true, montant: true, totalHT: true, totalTTC: true, tva: true, montantPaye: true }
  });

  let badNumbers = [];
  for (const inv of invoices) {
    for (const field of ['montant', 'totalHT', 'totalTTC', 'tva', 'montantPaye']) {
      const val = inv[field];
      if (val !== null && val !== undefined && val !== '') {
        const parsed = parseFloat(String(val).replace(/[^\d.-]/g, ''));
        if (isNaN(parsed)) {
          badNumbers.push({ id: inv.id, field, value: val });
        }
      }
    }
  }

  if (badNumbers.length > 0) {
    for (const b of badNumbers) {
      fail(`Facture ${b.id}: champ "${b.field}" non-parsable = "${b.value}"`);
    }
  } else {
    ok(`Tous les champs numériques des ${invoices.length} factures sont parsables.`);
  }

  // Check client montantMensuel, totalCosts, netMargin
  const clients = await prisma.client.findMany({
    select: { id: true, enseigne: true, montantMensuel: true, totalCosts: true, netMargin: true }
  });

  let badClientNumbers = [];
  for (const c of clients) {
    for (const field of ['montantMensuel', 'totalCosts', 'netMargin']) {
      const val = c[field];
      if (val !== null && val !== undefined) {
        if (typeof val !== 'number' || isNaN(val)) {
          badClientNumbers.push({ id: c.id, enseigne: c.enseigne, field, value: val });
        }
      }
    }
  }

  if (badClientNumbers.length > 0) {
    for (const b of badClientNumbers) {
      fail(`Client ${b.enseigne} (${b.id}): champ "${b.field}" invalide = "${b.value}"`);
    }
  } else {
    ok(`Tous les champs numériques des ${clients.length} clients sont valides.`);
  }

  // Check InvoiceLine total, prix
  const lines = await prisma.invoiceLine.findMany({
    select: { id: true, invoiceId: true, total: true, prix: true }
  });

  let badLines = [];
  for (const l of lines) {
    for (const field of ['total', 'prix']) {
      const val = l[field];
      if (val !== null && val !== undefined) {
        if (typeof val !== 'number' || isNaN(val)) {
          badLines.push({ id: l.id, invoiceId: l.invoiceId, field, value: val });
        }
      }
    }
  }

  if (badLines.length > 0) {
    for (const b of badLines) {
      fail(`InvoiceLine #${b.id} (facture ${b.invoiceId}): champ "${b.field}" invalide = "${b.value}"`);
    }
  } else {
    ok(`Tous les champs numériques des ${lines.length} lignes de facture sont valides.`);
  }
}

// ─── 5. Clients MF (Matricule Fiscale) ──────────────────────
async function auditMF() {
  header('5. MATRICULE FISCALE (MF) DES CLIENTS');

  const clients = await prisma.client.findMany({
    where: { etatClient: 'Actif' },
    select: { id: true, enseigne: true, mf: true }
  });

  const noMF = clients.filter(c => !c.mf || c.mf.trim() === '');
  if (noMF.length > 0) {
    for (const c of noMF) {
      warn(`Client actif sans MF: "${c.enseigne}" (${c.id})`);
    }
  } else {
    ok(`Tous les ${clients.length} clients actifs ont un MF renseigné.`);
  }
}

// ─── Main ─────────────────────────────────────────────────────
async function main() {
  console.log(`\n${BOLD}╔══════════════════════════════════════════════════════════╗${RESET}`);
  console.log(`${BOLD}║  AUDIT POST-MIGRATION — Phase 1: Intégrité des Données  ║${RESET}`);
  console.log(`${BOLD}║  Mode: LECTURE SEULE (aucune modification)               ║${RESET}`);
  console.log(`${BOLD}║  Date: ${new Date().toLocaleString('fr-FR')}                      ║${RESET}`);
  console.log(`${BOLD}╚══════════════════════════════════════════════════════════╝${RESET}\n`);

  await auditVolumes();
  await auditDuplicates();
  await auditNulls();
  await auditStringNumbers();
  await auditMF();

  // ─── Summary ────────────────────────────────────────────────
  header('RÉSUMÉ PHASE 1');
  console.log(`  Erreurs critiques : ${totalErrors > 0 ? RED + totalErrors + RESET : GREEN + '0' + RESET}`);
  console.log(`  Avertissements    : ${totalWarnings > 0 ? YELLOW + totalWarnings + RESET : GREEN + '0' + RESET}`);

  if (totalErrors === 0 && totalWarnings === 0) {
    console.log(`\n  ${GREEN}${BOLD}🎉 Phase 1 passée avec succès — aucune anomalie détectée !${RESET}\n`);
  } else if (totalErrors === 0) {
    console.log(`\n  ${YELLOW}${BOLD}⚡ Phase 1 terminée avec ${totalWarnings} avertissement(s) à vérifier.${RESET}\n`);
  } else {
    console.log(`\n  ${RED}${BOLD}🚨 Phase 1 terminée avec ${totalErrors} erreur(s) critique(s) !${RESET}\n`);
  }
}

main()
  .catch(e => { console.error('FATAL:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
