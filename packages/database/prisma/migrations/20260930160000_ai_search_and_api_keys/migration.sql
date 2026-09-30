-- AI search monitoring and the MCP server.
--
-- 1. llms.txt observation per scan (site_meta_snapshot). Nullable columns;
--    until they exist the worker simply does not record llms.txt.
-- 2. api_key: workspace API keys for the MCP server (/api/mcp). Only a
--    SHA-256 hash of each key is stored; the key itself is shown once.

-- AlterTable
ALTER TABLE "site_meta_snapshot" ADD COLUMN IF NOT EXISTS "llmsTxtStatus" INTEGER;
ALTER TABLE "site_meta_snapshot" ADD COLUMN IF NOT EXISTS "llmsTxtHash" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "api_key" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "api_key_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "api_key_keyHash_key" ON "api_key"("keyHash");
CREATE INDEX IF NOT EXISTS "api_key_workspaceId_idx" ON "api_key"("workspaceId");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "api_key" ADD CONSTRAINT "api_key_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- RLS, matching every other table (see apps/worker/src/scripts/enable-rls.ts).
ALTER TABLE "api_key" ENABLE ROW LEVEL SECURITY;
