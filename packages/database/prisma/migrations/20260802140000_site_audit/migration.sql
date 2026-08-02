-- Site Audit: Ahrefs-style technical SEO crawl. One row per run; issue
-- groups stored as compact JSONB (URL samples capped) so audits stay small.

-- CreateEnum
CREATE TYPE "SiteAuditStatus" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "site_audit" (
    "id" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "status" "SiteAuditStatus" NOT NULL DEFAULT 'QUEUED',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "pagesCrawled" INTEGER NOT NULL DEFAULT 0,
    "urlsDiscovered" INTEGER NOT NULL DEFAULT 0,
    "healthScore" INTEGER,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "warningCount" INTEGER NOT NULL DEFAULT 0,
    "noticeCount" INTEGER NOT NULL DEFAULT 0,
    "pagesWithErrors" INTEGER NOT NULL DEFAULT 0,
    "stoppedReason" TEXT,
    "issues" JSONB,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "site_audit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "site_audit_websiteId_createdAt_idx" ON "site_audit"("websiteId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "site_audit" ADD CONSTRAINT "site_audit_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "website"("id") ON DELETE CASCADE ON UPDATE CASCADE;
