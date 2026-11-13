-- Search Console rows by query AND page, for striking distance keywords.
-- Additive only: one new table.
CREATE TABLE IF NOT EXISTS "gsc_query_page" (
    "id" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "page" TEXT NOT NULL,
    "clicks" INTEGER NOT NULL,
    "impressions" INTEGER NOT NULL,
    "ctr" DOUBLE PRECISION NOT NULL,
    "position" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "gsc_query_page_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "gsc_query_page_websiteId_query_page_key" ON "gsc_query_page"("websiteId", "query", "page");
CREATE INDEX IF NOT EXISTS "gsc_query_page_websiteId_position_idx" ON "gsc_query_page"("websiteId", "position");

DO $$ BEGIN
  ALTER TABLE "gsc_query_page" ADD CONSTRAINT "gsc_query_page_websiteId_fkey"
    FOREIGN KEY ("websiteId") REFERENCES "website"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- RLS, matching every other table (see apps/worker/src/scripts/enable-rls.ts).
ALTER TABLE "gsc_query_page" ENABLE ROW LEVEL SECURITY;
