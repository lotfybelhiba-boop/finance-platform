-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "clientAdresse" TEXT,
ADD COLUMN     "clientMF" TEXT,
ADD COLUMN     "conditions" TEXT,
ADD COLUMN     "coutExtra" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "echeance" TEXT,
ADD COLUMN     "isExonore" BOOLEAN DEFAULT false,
ADD COLUMN     "manualId" BOOLEAN DEFAULT false,
ADD COLUMN     "ressourceExtra" TEXT,
ADD COLUMN     "sousTotalHT" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "timbre" DOUBLE PRECISION DEFAULT 0;

-- AlterTable
ALTER TABLE "InvoiceLine" ADD COLUMN     "prix" DOUBLE PRECISION;
