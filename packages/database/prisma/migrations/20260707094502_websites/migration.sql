-- CreateEnum
CREATE TYPE "WebsiteStatus" AS ENUM ('PENDING', 'DISCOVERING', 'BASELINING', 'ACTIVE', 'PAUSED', 'ERROR');

-- CreateEnum
CREATE TYPE "ScanFrequency" AS ENUM ('WEEKLY', 'DAILY');

-- CreateTable
CREATE TABLE "website" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "normalizedUrl" TEXT NOT NULL,
    "status" "WebsiteStatus" NOT NULL DEFAULT 'PENDING',
    "scanFrequency" "ScanFrequency" NOT NULL DEFAULT 'WEEKLY',
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "lastScanAt" TIMESTAMP(3),
    "nextScanAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "website_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monitored_page" (
    "id" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "normalizedUrl" TEXT NOT NULL,
    "name" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monitored_page_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "website_workspaceId_idx" ON "website"("workspaceId");

-- CreateIndex
CREATE INDEX "website_status_nextScanAt_idx" ON "website"("status", "nextScanAt");

-- CreateIndex
CREATE UNIQUE INDEX "website_workspaceId_normalizedUrl_key" ON "website"("workspaceId", "normalizedUrl");

-- CreateIndex
CREATE INDEX "monitored_page_websiteId_idx" ON "monitored_page"("websiteId");

-- CreateIndex
CREATE UNIQUE INDEX "monitored_page_websiteId_normalizedUrl_key" ON "monitored_page"("websiteId", "normalizedUrl");

-- AddForeignKey
ALTER TABLE "website" ADD CONSTRAINT "website_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monitored_page" ADD CONSTRAINT "monitored_page_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "website"("id") ON DELETE CASCADE ON UPDATE CASCADE;
