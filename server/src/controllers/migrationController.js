import prisma from '../services/prisma.js';

export const importData = async (req, res) => {
  const { clients, factures, bankTransactions, rhStates, auditHistory, quotes, notes } = req.body;

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Import Clients
      if (clients && clients.length > 0) {
        const allowedClientFields = [
          'id', 'enseigne', 'logo', 'projet', 'secteur', 'etatClient', 'charge', 
          'nomFinancier', 'emailFinancier', 'dateDebut', 'dateFin', 'mf', 'mail', 
          'telephone', 'adresse', 'web', 'bonCommande', 'regime', 'montantMensuel', 
          'jourPaiement', 'jourCycle', 'modeCycle', 'delaiPaiement', 'dureeMois', 
          'montantTotal', 'datePaiement', 'totalCosts', 'netMargin', 'dureeService', 
          'employeAssocie', 'option15Jours', 'sousTVA'
        ];

        for (const c of clients) {
          const { servicesRecurrents, projectCosts, ...cData } = c;
          
          // Sanitize numeric fields
          const sanitized = {
            id: c.id,
            enseigne: c.enseigne || "Inconnu",
            montantMensuel: c.montantMensuel ? parseFloat(String(c.montantMensuel).replace(/[^\d.-]/g, '')) : 0,
            totalCosts: c.totalCosts ? parseFloat(String(c.totalCosts).replace(/[^\d.-]/g, '')) : 0,
            netMargin: c.netMargin ? parseFloat(String(c.netMargin).replace(/[^\d.-]/g, '')) : 0,
            jourPaiement: c.jourPaiement ? parseInt(c.jourPaiement, 10) : null,
            jourCycle: c.jourCycle ? parseInt(c.jourCycle, 10) : 1,
          };

          allowedClientFields.forEach(field => {
             if (c[field] !== undefined && sanitized[field] === undefined) {
               sanitized[field] = c[field];
             }
          });

          await tx.client.upsert({
            where: { id: c.id },
            update: {
              ...sanitized,
              servicesRecurrents: {
                deleteMany: {},
                create: (servicesRecurrents || []).map(({ id, ...s }) => ({
                    desc: s.desc || "",
                    prix: s.prix ? String(s.prix) : "0"
                }))
              },
              projectCosts: {
                deleteMany: {},
                create: (projectCosts || []).map(({ id, ...p }) => ({
                    nom: p.nom || "",
                    specialite: p.specialite || "",
                    montant: p.montant ? String(p.montant) : "0",
                    dateDebut: p.dateDebut || "",
                    dateFin: p.dateFin || "",
                    recurrence: p.recurrence || ""
                }))
              }
            },
            create: {
              ...sanitized,
              servicesRecurrents: {
                create: (servicesRecurrents || []).map(({ id, ...s }) => ({
                    desc: s.desc || "",
                    prix: s.prix ? String(s.prix) : "0"
                }))
              },
              projectCosts: {
                create: (projectCosts || []).map(({ id, ...p }) => ({
                    nom: p.nom || "",
                    specialite: p.specialite || "",
                    montant: p.montant ? String(p.montant) : "0",
                    dateDebut: p.dateDebut || "",
                    dateFin: p.dateFin || "",
                    recurrence: p.recurrence || ""
                }))
              }
            }
          });
        }
      }

      // 2. Import Invoices (with deduplication)
      if (factures && factures.length > 0) {
        const seenInvoices = new Set();
        const uniqueFactures = factures.filter(f => {
            const key = `${f.client}_${f.dateEmi}_${f.montant}`;
            if (seenInvoices.has(key)) return false;
            seenInvoices.add(key);
            return true;
        });

        for (const f of uniqueFactures) {
          try {
            const { lines, lignes, client, clientName, totalHT, totalTTC, tva, montant, montantPaye, history, ...fData } = f;
            
            const rawLines = lines || lignes || [];
            
            // Whitelist supported fields to avoid "Unknown argument" errors
            const allowedFields = [
              'id', 'clientId', 'clientName', 'clientMF', 'clientAdresse', 'statut', 
              'montant', 'montantPaye', 'totalHT', 'totalTTC', 'tva', 'dateEmi', 
              'dateEcheance', 'echeance', 'datePaiement', 'periodeDebut', 'periodeFin', 
              'compteEncaissement', 'isPaper', 'isExtra', 'isExonore', 'targetMonth', 
              'targetYear', 'notes', 'conditions', 'coutExtra', 'ressourceExtra', 
              'manualId', 'sousTotalHT', 'timbre', 'paiements', 'history'
            ];

            const allClientIds = (clients || []).map(c => c.id);
            const validClientId = (fData.clientId && allClientIds.includes(fData.clientId)) ? fData.clientId : null;

            const sanitizedF = {
              clientId: validClientId,
              clientName: clientName || client || 'Inconnu',
              totalHT: totalHT ? String(totalHT) : "0",
              totalTTC: totalTTC ? String(totalTTC) : "0",
              tva: tva ? String(tva) : "0",
              montant: montant ? String(montant) : "0",
              montantPaye: montantPaye ? String(montantPaye) : "0",
              history: history ? JSON.parse(JSON.stringify(history)) : [],
              paiements: f.paiements ? JSON.parse(JSON.stringify(f.paiements)) : [],
            };

            // Copy other allowed fields from fData
            allowedFields.forEach(field => {
              if (f[field] !== undefined && sanitizedF[field] === undefined) {
                sanitizedF[field] = f[field];
              }
            });

            await tx.invoice.upsert({
              where: { id: String(f.id) },
              update: {
                ...sanitizedF,
                lines: {
                  deleteMany: {},
                  create: rawLines.map(({ id, ...l }) => ({
                      desc: l.desc || "",
                      basePrice: l.basePrice ? String(l.basePrice) : "0",
                      qte: l.qte ? parseInt(l.qte, 10) : 1,
                      tva: l.tva ? String(l.tva) : "0",
                      total: l.total ? parseFloat(String(l.total).replace(/[^\d.-]/g, '')) : 0,
                      prix: l.prix ? parseFloat(String(l.prix).replace(/[^\d.-]/g, '')) : 0,
                      montant: l.montant ? String(l.montant) : "0"
                  }))
                }
              },
              create: {
                ...sanitizedF,
                lines: {
                  create: rawLines.map(({ id, ...l }) => ({
                      desc: l.desc || "",
                      basePrice: l.basePrice ? String(l.basePrice) : "0",
                      qte: l.qte ? parseInt(l.qte, 10) : 1,
                      tva: l.tva ? String(l.tva) : "0",
                      total: l.total ? parseFloat(String(l.total).replace(/[^\d.-]/g, '')) : 0,
                      prix: l.prix ? parseFloat(String(l.prix).replace(/[^\d.-]/g, '')) : 0,
                      montant: l.montant ? String(l.montant) : "0"
                  }))
                }
              }
            });
          } catch (e) {
            console.error(`Failed to upsert invoice ${f.id}:`, e.message);
            throw e; // rethrow to rollback transaction
          }
        }
      }

      // 3. Import Bank Transactions
      if (bankTransactions && bankTransactions.length > 0) {
        const allowedBankFields = [
          'date', 'desc', 'bank', 'type', 'amount', 'category', 'chargeType', 
          'chargeNature', 'serviceMonth', 'paymentDate', 'clientId', 'isNonDeclare'
        ];
        
        const allClientIds = (clients || []).map(c => c.id);
        await tx.bankTransaction.deleteMany({});
        await tx.bankTransaction.createMany({
          data: bankTransactions.map((t) => {
            const sanitizedT = {
              desc: t.desc || t.libelle || "",
              bank: t.bank || t.banque || "",
              amount: t.amount !== undefined ? parseFloat(String(t.amount).replace(/[^\d.-]/g, '')) : (t.montant ? parseFloat(String(t.montant).replace(/[^\d.-]/g, '')) : 0),
              clientId: (t.clientId && allClientIds.includes(t.clientId)) ? t.clientId : null
            };
            
            allowedBankFields.forEach(field => {
              if (t[field] !== undefined && sanitizedT[field] === undefined) {
                sanitizedT[field] = t[field];
              }
            });
            
            return sanitizedT;
          })
        });
      }

      // 4. Import RH States
      if (rhStates && rhStates.length > 0) {
        const allowedRHFields = [
          'id', 'employeeName', 'month', 'year', 'status', 'amount', 'bank', 'datePaid'
        ];
        for (const s of rhStates) {
           const { id, ...sData } = s;
           const sanitizedS = {
             id: String(id),
             amount: s.amount ? parseFloat(String(s.amount).replace(/[^\d.-]/g, '')) : 0,
           };
           
           allowedRHFields.forEach(field => {
             if (s[field] !== undefined && sanitizedS[field] === undefined) {
               sanitizedS[field] = s[field];
             }
           });

           await tx.rhState.upsert({
             where: { id: sanitizedS.id },
             update: sanitizedS,
             create: sanitizedS
           });
        }
      }

      // 5. Import Quotes (Devis)
      if (quotes && quotes.length > 0) {
        const allClientIds = (clients || []).map(c => c.id);
        for (const q of quotes) {
          const sanitizedQ = {
            id: String(q.id),
            clientId: (q.clientId && allClientIds.includes(q.clientId)) ? q.clientId : null,
            clientName: q.clientName || q.client || "Inconnu",
            statut: q.statut || "Draft",
            montant: q.montant ? parseFloat(String(q.montant).replace(/[^\d.-]/g, '')) : 0,
            dateEmi: q.dateEmi || "",
            valideJusquau: q.valideJusquau || q.echeance || "",
            notes: q.notes || "",
            lines: q.lines ? JSON.parse(JSON.stringify(q.lines)) : []
          };
          await tx.quote.upsert({
            where: { id: sanitizedQ.id },
            update: sanitizedQ,
            create: sanitizedQ
          });
        }
      }

      // 6. Import Notes
      if (notes && notes.length > 0) {
        await tx.note.deleteMany({});
        await tx.note.createMany({
          data: notes.map(n => ({
            id: String(n.id || Date.now() + Math.random()),
            content: n.content || "",
            color: n.color || "yellow",
            x: parseFloat(n.x) || 0,
            y: parseFloat(n.y) || 0
          }))
        });
      }

      // 5. Import Audit History
      if (auditHistory) {
        for (const [key, val] of Object.entries(auditHistory)) {
          await tx.auditHistory.upsert({
            where: { key },
            update: { status: val.status || val, reason: val.reason },
            create: { key, status: val.status || val, reason: val.reason }
          });
        }
      }

      return { success: true };
    });

    res.json(result);
  } catch (error) {
    console.error("Migration Error:", error);
    res.status(500).json({ 
      error: error.message,
      stack: error.stack,
      item: error.item // if we set it
    });
  }
};
