-- Site-level SEO monitoring: robots.txt + sitemap captures (one per scan).
-- Also makes change_event.monitoredPageId nullable — site-wide changes
-- (robots.txt / sitemap regressions) belong to the website, not a page.

-- AlterTable
ALTER TABLE "change_event" ALTER COLUMN "monitoredPageId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "site_meta_snapshot" (
    "id" TEXT NOT NULL,
    "scanId" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "robotsTxtStatus" INTEGER,
    "robotsTxtContent" TEXT,
    "robotsTxtHash" TEXT,
    "sitemapUrl" TEXT,
    "sitemapStatus" INTEGER,
    "sitemapUrlCount" INTEGER,
    "sitemapHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "site_meta_snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "site_meta_snapshot_scanId_key" ON "site_meta_snapshot"("scanId");

-- CreateIndex
CREATE INDEX "site_meta_snapshot_websiteId_createdAt_idx" ON "site_meta_snapshot"("websiteId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "site_meta_snapshot" ADD CONSTRAINT "site_meta_snapshot_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "scan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_meta_snapshot" ADD CONSTRAINT "site_meta_snapshot_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "website"("id") ON DELETE CASCADE ON UPDATE CASCADE;
