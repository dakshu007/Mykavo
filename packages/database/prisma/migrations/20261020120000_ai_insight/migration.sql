-- AI-written change explanations and weekly summaries (lib/ai). Additive and
-- idempotent: safe to re-run.

CREATE TABLE IF NOT EXISTS "ai_insight" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "changeEventId" TEXT,
    "websiteId" TEXT,
    "periodStart" TIMESTAMP(3),
    "content" JSONB NOT NULL,
    "model" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL,
    "outputTokens" INTEGER NOT NULL,
    "costMicroUsd" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ai_insight_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ai_insight_workspaceId_createdAt_idx" ON "ai_insight"("workspaceId", "createdAt");
CREATE INDEX IF NOT EXISTS "ai_insight_createdAt_idx" ON "ai_insight"("createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "ai_insight_kind_changeEventId_key" ON "ai_insight"("kind", "changeEventId");
CREATE UNIQUE INDEX IF NOT EXISTS "ai_insight_kind_websiteId_periodStart_key" ON "ai_insight"("kind", "websiteId", "periodStart");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_insight_changeEventId_fkey') THEN
    ALTER TABLE "ai_insight" ADD CONSTRAINT "ai_insight_changeEventId_fkey" FOREIGN KEY ("changeEventId") REFERENCES "change_event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_insight_websiteId_fkey') THEN
    ALTER TABLE "ai_insight" ADD CONSTRAINT "ai_insight_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "website"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Server-only table: no PostgREST access.
ALTER TABLE "ai_insight" ENABLE ROW LEVEL SECURITY;
