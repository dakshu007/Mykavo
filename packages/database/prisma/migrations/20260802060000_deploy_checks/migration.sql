-- Post-deploy verification checks: a secret per-website hook URL that CI or
-- a deploy notification hits after a release; MyKavo scans immediately,
-- compares against the approved baseline, and sends a verdict. DEPLOY scans
-- flow through the existing comparison + notification pipeline.

-- AlterEnum (PG 12+: allowed in a transaction as long as the new value is
-- not used in the same transaction - this migration only adds it).
ALTER TYPE "ScanTriggerType" ADD VALUE 'DEPLOY';

-- AlterTable
ALTER TABLE "website" ADD COLUMN "deployHookEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "website" ADD COLUMN "deployToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "website_deployToken_key" ON "website"("deployToken");

-- AlterTable
ALTER TABLE "scan" ADD COLUMN "note" TEXT;
