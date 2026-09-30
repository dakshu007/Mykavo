-- AI crawler visits, counted by the MyKavo WordPress plugin (1.1.0+) and
-- sent once a day: one row per website, UTC day and crawler. Until this
-- table exists the ingest route answers 503 and the plugin retries tomorrow.

-- CreateTable
CREATE TABLE IF NOT EXISTS "ai_crawler_visit" (
    "id" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "agent" TEXT NOT NULL,
    "hits" INTEGER NOT NULL,
    "errors" INTEGER NOT NULL DEFAULT 0,
    "topPaths" JSONB NOT NULL DEFAULT '[]',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_crawler_visit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ai_crawler_visit_websiteId_day_agent_key" ON "ai_crawler_visit"("websiteId", "day", "agent");
CREATE INDEX IF NOT EXISTS "ai_crawler_visit_websiteId_day_idx" ON "ai_crawler_visit"("websiteId", "day");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "ai_crawler_visit" ADD CONSTRAINT "ai_crawler_visit_websiteId_fkey"
    FOREIGN KEY ("websiteId") REFERENCES "website"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- RLS, matching every other table (see apps/worker/src/scripts/enable-rls.ts).
ALTER TABLE "ai_crawler_visit" ENABLE ROW LEVEL SECURITY;
