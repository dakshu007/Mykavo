-- "Email me a free site audit" leads from the homepage. Additive and idempotent.
CREATE TABLE IF NOT EXISTS "audit_lead" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "host" TEXT NOT NULL,
    "ipHash" TEXT,
    "status" "SiteAuditStatus" NOT NULL DEFAULT 'QUEUED',
    "pagesCrawled" INTEGER NOT NULL DEFAULT 0,
    "healthScore" INTEGER,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "warningCount" INTEGER NOT NULL DEFAULT 0,
    "noticeCount" INTEGER NOT NULL DEFAULT 0,
    "emailedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    CONSTRAINT "audit_lead_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "audit_lead_email_createdAt_idx" ON "audit_lead"("email", "createdAt");
CREATE INDEX IF NOT EXISTS "audit_lead_ipHash_createdAt_idx" ON "audit_lead"("ipHash", "createdAt");
CREATE INDEX IF NOT EXISTS "audit_lead_host_createdAt_idx" ON "audit_lead"("host", "createdAt");
CREATE INDEX IF NOT EXISTS "audit_lead_status_createdAt_idx" ON "audit_lead"("status", "createdAt");
-- Closes the PostgREST anon API surface, like every other public table.
ALTER TABLE "audit_lead" ENABLE ROW LEVEL SECURITY;
