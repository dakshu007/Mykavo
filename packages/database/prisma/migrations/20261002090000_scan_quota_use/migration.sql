-- Plan quotas that must survive deleting a website: today, baseline scans
-- per rolling 24 hours (Free: 2), so deleting and re-adding a site is not a
-- free re-scan. Until this table exists the quota is not enforced (the web
-- app logs a warning) and nothing else changes.

-- CreateTable
CREATE TABLE IF NOT EXISTS "scan_quota_use" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "scanId" TEXT,
    "kind" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scan_quota_use_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "scan_quota_use_workspaceId_kind_createdAt_idx" ON "scan_quota_use"("workspaceId", "kind", "createdAt");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "scan_quota_use" ADD CONSTRAINT "scan_quota_use_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "scan_quota_use" ADD CONSTRAINT "scan_quota_use_scanId_fkey"
    FOREIGN KEY ("scanId") REFERENCES "scan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- RLS, matching every other table (see apps/worker/src/scripts/enable-rls.ts).
ALTER TABLE "scan_quota_use" ENABLE ROW LEVEL SECURITY;
