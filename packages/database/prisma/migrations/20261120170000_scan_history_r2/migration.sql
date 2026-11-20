-- Scan links and scripts move to object storage; the snapshot keeps counts
-- and the broken internal links. Nullable columns: no table rewrite.
ALTER TABLE "page_snapshot" ADD COLUMN "linkCount" INTEGER;
ALTER TABLE "page_snapshot" ADD COLUMN "scriptCount" INTEGER;
ALTER TABLE "page_snapshot" ADD COLUMN "brokenLinks" JSONB;
