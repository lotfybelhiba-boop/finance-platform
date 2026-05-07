/**
 * =============================================================
 *  AUDIT PHASE 3 — Vérification des Calculs Financiers
 *  MODE: LECTURE SEULE (aucune modification)
 * =============================================================
 *  Ce script vérifie :
 *  - Recalcul de totalHT depuis les lignes de facture
 *  - Recalcul de la TVA (19% par défaut)
 *  - Recalcul de totalTTC = totalHT + TVA + timbre
 *  - Cohérence montant vs totalTTC
 *  - Cohérence montantPaye vs statut (Paid/Pending)
 *  - Marges nettes des clients vs coûts
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
const DIM = '\x1b[2m';

const OK = `${GREEN}✔${RESET}`;
const WARN = `${YELLOW}⚠${RESET}`;
const FAIL = `${RED}✘${RESET}`;

let totalWarnings = 0;
let totalErrors = 0;

function warn(msg) { totalWarnings++; console.log(`  ${WARN} ${msg}`); }
function fail(msg) { totalErrors++; console.log(`  ${FAIL} ${RED}${msg}${RESET}`); }
function ok(msg) { console.log(`  ${OK} ${msg}`); }
function header(msg) { console.log(`\n${CYAN}${BOLD}═══ ${msg} ═══${RESET}`); }

function parseNum(val) {
  if (val === null || val === undefined || val === '') return 0;
  const cleaned = String(val).replace(/[^\d.-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

const TOLERANCE = 0.02; // 2 centimes de tolérance pour les arrondis

function closeEnough(a, b) {
  return Math.abs(a - b) <= TOLERANCE;
}

// ─── 1. Invoice Totals Recalculation ─────────────────────────
async function auditInvoiceTotals() {
  header('1. RECALCUL DES TOTAUX DE FACTURES');

  const invoices = await prisma.invoice.findMany({
    include: { lines: true },
    where: {
      statut: { notIn: ['Annulée', 'Cancelled'] }
    }
  });

  let checkedCount = 0;
  let htMismatch = 0;
  let tvaMismatch = 0;
  let ttcMismatch = 0;
  let montantMismatch = 0;

  for (const inv of invoices) {
    checkedCount++;

    // --- Recalculate totalHT from lines ---
    let calculatedHT = 0;
    for (const line of inv.lines) {
      // Each line: prix (unit price) × qte = total for that line
      const lineTotal = parseNum(line.total) || (parseNum(line.prix) * (line.qte || 1));
      calculatedHT += lineTotal;
    }

    const storedHT = parseNum(inv.totalHT);
    const storedSousTotalHT = parseNum(inv.sousTotalHT);
    const storedTVA = parseNum(inv.tva);
    const storedTTC = parseNum(inv.totalTTC);
    const storedMontant = parseNum(inv.montant);
    const timbre = parseNum(inv.timbre);
    const isExonore = inv.isExonore === true;

    // Compare HT
    // Use sousTotalHT if available as the pre-extra base, otherwise compare with storedHT
    const referenceHT = storedHT || storedSousTotalHT;
    
    if (inv.lines.length > 0 && !closeEnough(calculatedHT, referenceHT) && referenceHT > 0) {
      htMismatch++;
      if (htMismatch <= 15) {
        warn(`Facture ${inv.id} ("${inv.clientName}"): HT stocké=${referenceHT.toFixed(3)} ≠ HT calculé depuis lignes=${calculatedHT.toFixed(3)} (Δ=${Math.abs(referenceHT - calculatedHT).toFixed(3)})`);
      }
    }

    // --- Recalculate TVA ---
    const expectedTVARate = isExonore ? 0 : 0.19;
    const expectedTVA = referenceHT * expectedTVARate;
    
    if (referenceHT > 0 && !closeEnough(storedTVA, expectedTVA) && storedTVA > 0) {
      tvaMismatch++;
      if (tvaMismatch <= 10) {
        warn(`Facture ${inv.id}: TVA stockée=${storedTVA.toFixed(3)} ≠ TVA attendue (${(expectedTVARate*100)}% de ${referenceHT.toFixed(3)})=${expectedTVA.toFixed(3)}`);
      }
    }

    // --- Recalculate TTC ---
    const expectedTTC = referenceHT + storedTVA + timbre;
    if (referenceHT > 0 && storedTTC > 0 && !closeEnough(storedTTC, expectedTTC)) {
      ttcMismatch++;
      if (ttcMismatch <= 10) {
        warn(`Facture ${inv.id}: TTC stocké=${storedTTC.toFixed(3)} ≠ TTC calculé (HT+TVA+timbre)=${expectedTTC.toFixed(3)} (Δ=${Math.abs(storedTTC - expectedTTC).toFixed(3)})`);
      }
    }

    // --- Montant vs TTC ---
    if (storedMontant > 0 && storedTTC > 0 && !closeEnough(storedMontant, storedTTC)) {
      montantMismatch++;
      if (montantMismatch <= 10) {
        warn(`Facture ${inv.id}: montant=${storedMontant.toFixed(3)} ≠ totalTTC=${storedTTC.toFixed(3)}`);
      }
    }
  }

  // Summary
  console.log(`\n  ${DIM}Factures vérifiées: ${checkedCount}${RESET}`);
  
  if (htMismatch === 0) ok('Tous les totalHT sont cohérents avec les lignes.');
  else warn(`${htMismatch} facture(s) avec écart totalHT.`);

  if (tvaMismatch === 0) ok('Toutes les TVA sont correctement calculées.');
  else warn(`${tvaMismatch} facture(s) avec écart TVA.`);

  if (ttcMismatch === 0) ok('Tous les totalTTC sont cohérents (HT + TVA + timbre).');
  else warn(`${ttcMismatch} facture(s) avec écart TTC.`);

  if (montantMismatch === 0) ok('Tous les montants sont cohérents avec totalTTC.');
  else warn(`${montantMismatch} facture(s) avec écart montant/TTC.`);
}

// ─── 2. Payment Status Coherence ─────────────────────────────
async function auditPaymentStatus() {
  header('2. COHÉRENCE STATUT DE PAIEMENT');

  const invoices = await prisma.invoice.findMany({
    select: {
      id: true, clientName: true, statut: true,
      montant: true, montantPaye: true, paiements: true
    }
  });

  let statusIssues = 0;

  for (const inv of invoices) {
    const montant = parseNum(inv.montant);
    const paye = parseNum(inv.montantPaye);

    // If statut is "Paid" but montantPaye is 0 or much less than montant
    if ((inv.statut === 'Paid' || inv.statut === 'Payée') && montant > 0 && paye < montant * 0.5) {
      statusIssues++;
      if (statusIssues <= 10) {
        warn(`Facture ${inv.id} ("${inv.clientName}"): statut=${inv.statut} mais montantPaye=${paye.toFixed(3)} vs montant=${montant.toFixed(3)}`);
      }
    }

    // If statut is "Pending" but montantPaye >= montant (fully paid but still pending)
    if ((inv.statut === 'Pending' || inv.statut === 'En attente') && montant > 0 && paye >= montant) {
      statusIssues++;
      if (statusIssues <= 10) {
        warn(`Facture ${inv.id} ("${inv.clientName}"): statut=${inv.statut} mais entièrement payée (paye=${paye.toFixed(3)} >= montant=${montant.toFixed(3)})`);
      }
    }
  }

  if (statusIssues === 0) {
    ok(`Tous les statuts de paiement sont cohérents sur ${invoices.length} factures.`);
  } else {
    warn(`${statusIssues} incohérence(s) statut/paiement au total.`);
  }
}

// ─── 3. Line-Level Calculation ───────────────────────────────
async function auditLineCalculations() {
  header('3. CALCULS AU NIVEAU DES LIGNES');

  const lines = await prisma.invoiceLine.findMany({
    select: { id: true, invoiceId: true, desc: true, prix: true, qte: true, total: true }
  });

  let lineIssues = 0;

  for (const line of lines) {
    const prix = parseNum(line.prix);
    const qte = line.qte || 1;
    const expectedTotal = prix * qte;
    const storedTotal = parseNum(line.total);

    if (prix > 0 && storedTotal > 0 && !closeEnough(expectedTotal, storedTotal)) {
      lineIssues++;
      if (lineIssues <= 15) {
        warn(`Ligne #${line.id} (facture ${line.invoiceId}): prix=${prix} × qte=${qte} = ${expectedTotal.toFixed(3)} ≠ total stocké=${storedTotal.toFixed(3)}`);
      }
    }
  }

  if (lineIssues === 0) {
    ok(`Tous les calculs de lignes sont corrects sur ${lines.length} lignes.`);
  } else {
    warn(`${lineIssues} ligne(s) avec écart de calcul.`);
  }
}

// ─── 4. Client Margin vs Costs ───────────────────────────────
async function auditClientMargins() {
  header('4. MARGES NETTES DES CLIENTS');

  const clients = await prisma.client.findMany({
    where: { etatClient: 'Actif' },
    include: {
      servicesRecurrents: true,
      projectCosts: true,
    }
  });

  let marginIssues = 0;

  for (const client of clients) {
    const montantMensuel = parseNum(client.montantMensuel);
    const totalCosts = parseNum(client.totalCosts);
    const netMargin = parseNum(client.netMargin);

    // Recalculate totalCosts from projectCosts
    let calculatedCosts = 0;
    for (const cost of client.projectCosts) {
      const montant = parseNum(cost.montant);
      calculatedCosts += montant;
    }

    if (totalCosts > 0 && calculatedCosts > 0 && !closeEnough(totalCosts, calculatedCosts)) {
      marginIssues++;
      if (marginIssues <= 10) {
        warn(`Client "${client.enseigne}": totalCosts stocké=${totalCosts.toFixed(3)} ≠ somme projectCosts=${calculatedCosts.toFixed(3)}`);
      }
    }

    // Recalculate netMargin = montantMensuel - totalCosts
    if (montantMensuel > 0 && totalCosts > 0) {
      const expectedMargin = montantMensuel - totalCosts;
      if (!closeEnough(netMargin, expectedMargin)) {
        marginIssues++;
        if (marginIssues <= 10) {
          warn(`Client "${client.enseigne}": netMargin=${netMargin.toFixed(3)} ≠ attendu (${montantMensuel}-${totalCosts})=${expectedMargin.toFixed(3)}`);
        }
      }
    }

    // Recalculate montantMensuel from servicesRecurrents
    let calculatedMontant = 0;
    for (const svc of client.servicesRecurrents) {
      calculatedMontant += parseNum(svc.prix);
    }

    if (montantMensuel > 0 && calculatedMontant > 0 && !closeEnough(montantMensuel, calculatedMontant)) {
      marginIssues++;
      if (marginIssues <= 10) {
        warn(`Client "${client.enseigne}": montantMensuel=${montantMensuel.toFixed(3)} ≠ somme services=${calculatedMontant.toFixed(3)}`);
      }
    }
  }

  if (marginIssues === 0) {
    ok(`Toutes les marges clients sont cohérentes sur ${clients.length} clients actifs.`);
  } else {
    warn(`${marginIssues} incohérence(s) de marge/coût au total.`);
  }
}

// ─── 5. BankTransaction Amount Coherence ─────────────────────
async function auditBankAmounts() {
  header('5. TRANSACTIONS BANCAIRES — MONTANTS');

  const transactions = await prisma.bankTransaction.findMany({
    select: { id: true, desc: true, amount: true, type: true, date: true, clientId: true }
  });

  let negativeAmounts = 0;
  let suspiciouslyLarge = 0;

  for (const tx of transactions) {
    const amount = parseNum(tx.amount);

    // Check for negative amounts in "Encaissement" type (should be positive)
    if (tx.type === 'Encaissement' && amount < 0) {
      negativeAmounts++;
      if (negativeAmounts <= 5) {
        warn(`Transaction #${tx.id} ("${tx.desc}", ${tx.date}): type=Encaissement mais montant négatif=${amount}`);
      }
    }

    // Flag suspiciously large amounts (> 100k)
    if (Math.abs(amount) > 100000) {
      suspiciouslyLarge++;
      if (suspiciouslyLarge <= 5) {
        warn(`Transaction #${tx.id} ("${tx.desc}", ${tx.date}): montant inhabituellement élevé=${amount.toFixed(3)}`);
      }
    }
  }

  if (negativeAmounts === 0) {
    ok('Aucun encaissement avec montant négatif.');
  }
  if (suspiciouslyLarge === 0) {
    ok('Aucun montant anormalement élevé (> 100k).');
  }

  // Cross-reference: for "Encaissement" linked to a client, check if there's a matching invoice
  const encaissements = transactions.filter(t => t.type === 'Encaissement' && t.clientId);
  const invoices = await prisma.invoice.findMany({
    where: { statut: { in: ['Paid', 'Payée', 'Partially Paid'] } },
    select: { id: true, clientId: true, montant: true }
  });
  
  const paidInvoiceClientIds = new Set(invoices.filter(i => i.clientId).map(i => i.clientId));
  let encaissementWithoutInvoice = 0;
  
  for (const enc of encaissements) {
    if (!paidInvoiceClientIds.has(enc.clientId)) {
      encaissementWithoutInvoice++;
      if (encaissementWithoutInvoice <= 5) {
        warn(`Encaissement #${enc.id} pour client "${enc.clientId}" (${enc.date}, ${parseNum(enc.amount).toFixed(3)} TND) — aucune facture payée trouvée pour ce client.`);
      }
    }
  }

  if (encaissementWithoutInvoice === 0 && encaissements.length > 0) {
    ok(`Tous les ${encaissements.length} encaissements sont cohérents avec des factures payées.`);
  } else if (encaissementWithoutInvoice > 0) {
    warn(`${encaissementWithoutInvoice} encaissement(s) sans facture payée correspondante.`);
  }
}

// ─── 6. Overall Financial Summary ────────────────────────────
async function financialSummary() {
  header('6. RÉSUMÉ FINANCIER GLOBAL');

  // Total invoiced
  const invoices = await prisma.invoice.findMany({
    where: { statut: { notIn: ['Annulée', 'Cancelled'] } },
    select: { montant: true, montantPaye: true, statut: true }
  });

  let totalInvoiced = 0;
  let totalPaid = 0;
  let countPaid = 0;
  let countPending = 0;
  let countPartial = 0;

  for (const inv of invoices) {
    totalInvoiced += parseNum(inv.montant);
    totalPaid += parseNum(inv.montantPaye);

    if (inv.statut === 'Paid' || inv.statut === 'Payée') countPaid++;
    else if (inv.statut === 'Pending' || inv.statut === 'En attente') countPending++;
    else if (inv.statut === 'Partially Paid') countPartial++;
  }

  // Total bank encaissements
  const encaissements = await prisma.bankTransaction.findMany({
    where: { type: 'Encaissement' },
    select: { amount: true }
  });
  const totalEncaissements = encaissements.reduce((s, t) => s + parseNum(t.amount), 0);

  // Total bank charges
  const charges = await prisma.bankTransaction.findMany({
    where: { type: { in: ['Charge', 'Décaissement'] } },
    select: { amount: true }
  });
  const totalCharges = charges.reduce((s, t) => s + parseNum(t.amount), 0);

  console.log(`\n  ┌────────────────────────────────────┬────────────────┐`);
  console.log(`  │ Indicateur                         │ Valeur         │`);
  console.log(`  ├────────────────────────────────────┼────────────────┤`);
  console.log(`  │ Total facturé (hors annulées)      │ ${String(totalInvoiced.toFixed(3) + ' TND').padStart(14)} │`);
  console.log(`  │ Total payé (montantPaye)           │ ${String(totalPaid.toFixed(3) + ' TND').padStart(14)} │`);
  console.log(`  │ Total encaissements banque         │ ${String(totalEncaissements.toFixed(3) + ' TND').padStart(14)} │`);
  console.log(`  │ Total charges banque               │ ${String(totalCharges.toFixed(3) + ' TND').padStart(14)} │`);
  console.log(`  │ Factures payées                    │ ${String(countPaid).padStart(14)} │`);
  console.log(`  │ Factures en attente                │ ${String(countPending).padStart(14)} │`);
  console.log(`  │ Factures partiellement payées      │ ${String(countPartial).padStart(14)} │`);
  console.log(`  └────────────────────────────────────┴────────────────┘`);

  // Coherence: totalPaid should be close to totalEncaissements
  const paymentDiff = Math.abs(totalPaid - totalEncaissements);
  if (paymentDiff > 100) { // More than 100 TND difference
    warn(`Écart significatif entre montantPaye total (${totalPaid.toFixed(3)}) et encaissements banque (${totalEncaissements.toFixed(3)}): Δ=${paymentDiff.toFixed(3)} TND`);
  } else if (totalEncaissements > 0) {
    ok(`Montant payé et encaissements bancaires sont cohérents (Δ=${paymentDiff.toFixed(3)} TND).`);
  }
}

// ─── Main ─────────────────────────────────────────────────────
async function main() {
  console.log(`\n${BOLD}╔══════════════════════════════════════════════════════════╗${RESET}`);
  console.log(`${BOLD}║  AUDIT POST-MIGRATION — Phase 3: Calculs Financiers     ║${RESET}`);
  console.log(`${BOLD}║  Mode: LECTURE SEULE (aucune modification)               ║${RESET}`);
  console.log(`${BOLD}║  Date: ${new Date().toLocaleString('fr-FR')}                      ║${RESET}`);
  console.log(`${BOLD}╚══════════════════════════════════════════════════════════╝${RESET}\n`);

  await auditInvoiceTotals();
  await auditPaymentStatus();
  await auditLineCalculations();
  await auditClientMargins();
  await auditBankAmounts();
  await financialSummary();

  // ─── Summary ────────────────────────────────────────────────
  header('RÉSUMÉ PHASE 3');
  console.log(`  Erreurs critiques : ${totalErrors > 0 ? RED + totalErrors + RESET : GREEN + '0' + RESET}`);
  console.log(`  Avertissements    : ${totalWarnings > 0 ? YELLOW + totalWarnings + RESET : GREEN + '0' + RESET}`);

  if (totalErrors === 0 && totalWarnings === 0) {
    console.log(`\n  ${GREEN}${BOLD}🎉 Phase 3 passée avec succès — tous les calculs sont intacts !${RESET}\n`);
  } else if (totalErrors === 0) {
    console.log(`\n  ${YELLOW}${BOLD}⚡ Phase 3 terminée avec ${totalWarnings} avertissement(s) à vérifier.${RESET}\n`);
  } else {
    console.log(`\n  ${RED}${BOLD}🚨 Phase 3 terminée avec ${totalErrors} erreur(s) critique(s) dans les calculs !${RESET}\n`);
  }
}

main()
  .catch(e => { console.error('FATAL:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
