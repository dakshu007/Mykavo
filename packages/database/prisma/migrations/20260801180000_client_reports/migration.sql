-- White-label client reports (spec §37 "Client-ready reports" / "White-label
-- reports"): a public, revocable report link per website plus workspace-level
-- agency branding. The report token is separate from publicToken so
-- regenerating a report link never breaks the badge/status page URLs.

-- AlterTable
ALTER TABLE "website" ADD COLUMN "reportEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "website" ADD COLUMN "reportToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "website_reportToken_key" ON "website"("reportToken");

-- AlterTable
ALTER TABLE "workspace" ADD COLUMN "brandName" TEXT;
ALTER TABLE "workspace" ADD COLUMN "brandLogoUrl" TEXT;
ALTER TABLE "workspace" ADD COLUMN "brandColor" TEXT;
