-- CreateTable
CREATE TABLE "Quote" (
    "id" TEXT NOT NULL,
    "clientId" TEXT,
    "clientName" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'Draft',
    "montant" DOUBLE PRECISION DEFAULT 0,
    "dateEmi" TEXT,
    "valideJusquau" TEXT,
    "notes" TEXT,
    "lines" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Note" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "color" TEXT,
    "x" DOUBLE PRECISION DEFAULT 0,
    "y" DOUBLE PRECISION DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
