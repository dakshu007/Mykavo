-- Durable AI spend ledger. Additive only: a new table, no changes to existing ones.
CREATE TABLE IF NOT EXISTS "ai_usage" (
    "id" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "websiteId" TEXT,
    "model" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL,
    "outputTokens" INTEGER NOT NULL,
    "costMicroUsd" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_usage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ai_usage_createdAt_idx" ON "ai_usage"("createdAt");
CREATE INDEX IF NOT EXISTS "ai_usage_workspaceId_feature_createdAt_idx" ON "ai_usage"("workspaceId", "feature", "createdAt");

-- Backfill every call already on the books. The ai_insight id is reused, so
-- running this again inserts nothing twice.
INSERT INTO "ai_usage" ("id", "feature", "outcome", "workspaceId", "websiteId", "model", "inputTokens", "outputTokens", "costMicroUsd", "createdAt")
SELECT
    i."id",
    CASE WHEN i."kind" = 'failed' THEN 'unknown' ELSE i."kind" END,
    CASE WHEN i."kind" = 'failed' THEN 'unusable' ELSE 'ok' END,
    i."workspaceId",
    i."websiteId",
    i."model",
    i."inputTokens",
    i."outputTokens",
    i."costMicroUsd",
    i."createdAt"
FROM "ai_insight" i
ON CONFLICT ("id") DO NOTHING;

-- RLS, matching every other table (see apps/worker/src/scripts/enable-rls.ts).
ALTER TABLE "ai_usage" ENABLE ROW LEVEL SECURITY;
