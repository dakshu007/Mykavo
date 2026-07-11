-- Public status page (share a live status page with clients). Reuses the
-- badge's opaque publicToken as the URL identifier; this flag gates the
-- /status/[token] route independently of the badge. Disabling keeps the
-- token so re-enabling restores the same URL.

-- AlterTable
ALTER TABLE "website" ADD COLUMN "statusPageEnabled" BOOLEAN NOT NULL DEFAULT false;
