-- MCP OAuth (ChatGPT / Claude connectors) and MCP usage. Additive and
-- idempotent: new tables only, safe to run more than once.
--
-- oauth_client  apps registered through dynamic client registration
-- oauth_grant   a person's approval of one app for one workspace
-- oauth_code    single-use authorization codes (hash only, 10 minutes)
-- oauth_token   access + rotating refresh tokens (hashes only)
-- mcp_usage     MCP tool calls per workspace per UTC day (daily cap)

-- CreateTable
CREATE TABLE IF NOT EXISTS "oauth_client" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "redirectUris" TEXT[],
    "secretHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oauth_client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "oauth_grant" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "oauth_grant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "oauth_code" (
    "codeHash" TEXT NOT NULL,
    "grantId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "redirectUri" TEXT NOT NULL,
    "codeChallenge" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oauth_code_pkey" PRIMARY KEY ("codeHash")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "oauth_token" (
    "id" TEXT NOT NULL,
    "grantId" TEXT NOT NULL,
    "accessHash" TEXT NOT NULL,
    "refreshHash" TEXT NOT NULL,
    "accessExpiresAt" TIMESTAMP(3) NOT NULL,
    "refreshExpiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oauth_token_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "mcp_usage" (
    "workspaceId" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "calls" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "mcp_usage_pkey" PRIMARY KEY ("workspaceId","day")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "oauth_grant_workspaceId_idx" ON "oauth_grant"("workspaceId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "oauth_grant_userId_idx" ON "oauth_grant"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "oauth_grant_clientId_idx" ON "oauth_grant"("clientId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "oauth_code_grantId_idx" ON "oauth_code"("grantId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "oauth_code_clientId_idx" ON "oauth_code"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "oauth_token_accessHash_key" ON "oauth_token"("accessHash");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "oauth_token_refreshHash_key" ON "oauth_token"("refreshHash");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "oauth_token_grantId_idx" ON "oauth_token"("grantId");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "oauth_grant" ADD CONSTRAINT "oauth_grant_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "oauth_client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "oauth_grant" ADD CONSTRAINT "oauth_grant_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "oauth_grant" ADD CONSTRAINT "oauth_grant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "oauth_code" ADD CONSTRAINT "oauth_code_grantId_fkey" FOREIGN KEY ("grantId") REFERENCES "oauth_grant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "oauth_code" ADD CONSTRAINT "oauth_code_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "oauth_client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "oauth_token" ADD CONSTRAINT "oauth_token_grantId_fkey" FOREIGN KEY ("grantId") REFERENCES "oauth_grant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "mcp_usage" ADD CONSTRAINT "mcp_usage_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- RLS, matching every other table (see apps/worker/src/scripts/enable-rls.ts).
ALTER TABLE "oauth_client" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "oauth_grant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "oauth_code" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "oauth_token" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "mcp_usage" ENABLE ROW LEVEL SECURITY;
