-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "enseigne" TEXT NOT NULL,
    "projet" TEXT,
    "secteur" TEXT,
    "etatClient" TEXT NOT NULL DEFAULT 'Actif',
    "charge" TEXT,
    "dateDebut" TEXT,
    "dateFin" TEXT,
    "mf" TEXT,
    "mail" TEXT,
    "telephone" TEXT,
    "adresse" TEXT,
    "web" TEXT,
    "regime" TEXT NOT NULL DEFAULT 'Abonnement',
    "montantMensuel" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "jourPaiement" INTEGER,
    "jourCycle" INTEGER DEFAULT 1,
    "modeCycle" TEXT DEFAULT 'Mois civil',
    "sousTVA" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceRecurrent" (
    "id" SERIAL NOT NULL,
    "desc" TEXT NOT NULL,
    "prix" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "clientId" TEXT NOT NULL,

    CONSTRAINT "ServiceRecurrent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectCost" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "montant" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "clientId" TEXT NOT NULL,

    CONSTRAINT "ProjectCost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "clientId" TEXT,
    "clientName" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'Pending',
    "montant" DOUBLE PRECISION NOT NULL,
    "montantPaye" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dateEmi" TEXT,
    "datePaiement" TEXT,
    "periodeDebut" TEXT,
    "periodeFin" TEXT,
    "compteEncaissement" TEXT DEFAULT 'BIAT',
    "isPaper" BOOLEAN NOT NULL DEFAULT false,
    "isExtra" BOOLEAN NOT NULL DEFAULT false,
    "targetMonth" INTEGER,
    "targetYear" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceLine" (
    "id" SERIAL NOT NULL,
    "desc" TEXT NOT NULL,
    "montant" DOUBLE PRECISION NOT NULL,
    "invoiceId" TEXT NOT NULL,

    CONSTRAINT "InvoiceLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankTransaction" (
    "id" SERIAL NOT NULL,
    "date" TEXT NOT NULL,
    "desc" TEXT NOT NULL,
    "bank" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "category" TEXT,
    "chargeType" TEXT,
    "chargeNature" TEXT,
    "serviceMonth" TEXT,
    "paymentDate" TEXT,
    "clientId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BankTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RHState" (
    "id" TEXT NOT NULL,
    "employeeName" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "amount" DOUBLE PRECISION NOT NULL,
    "bank" TEXT,
    "datePaid" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RHState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditHistory" (
    "key" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,

    CONSTRAINT "AuditHistory_pkey" PRIMARY KEY ("key")
);

-- AddForeignKey
ALTER TABLE "ServiceRecurrent" ADD CONSTRAINT "ServiceRecurrent_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectCost" ADD CONSTRAINT "ProjectCost_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceLine" ADD CONSTRAINT "InvoiceLine_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankTransaction" ADD CONSTRAINT "BankTransaction_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
