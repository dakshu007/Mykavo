-- CreateEnum
CREATE TYPE "ScanStatus" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'PARTIAL', 'FAILED');

-- CreateEnum
CREATE TYPE "ScanTriggerType" AS ENUM ('BASELINE', 'SCHEDULED', 'MANUAL');

-- CreateEnum
CREATE TYPE "LinkType" AS ENUM ('INTERNAL', 'EXTERNAL');

-- CreateTable
CREATE TABLE "scan" (
    "id" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "status" "ScanStatus" NOT NULL DEFAULT 'QUEUED',
    "triggerType" "ScanTriggerType" NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "pagesRequested" INTEGER NOT NULL DEFAULT 0,
    "pagesScanned" INTEGER NOT NULL DEFAULT 0,
    "pagesFailed" INTEGER NOT NULL DEFAULT 0,
    "changesDetected" INTEGER NOT NULL DEFAULT 0,
    "highestSeverity" TEXT,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "page_snapshot" (
    "id" TEXT NOT NULL,
    "scanId" TEXT NOT NULL,
    "monitoredPageId" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "finalUrl" TEXT,
    "httpStatus" INTEGER,
    "responseTimeMs" INTEGER,
    "htmlHash" TEXT,
    "domHash" TEXT,
    "textHash" TEXT,
    "screenshotStorageKey" TEXT,
    "screenshotHash" TEXT,
    "visualDifferencePercentage" DOUBLE PRECISION,
    "title" TEXT,
    "metaDescription" TEXT,
    "canonicalUrl" TEXT,
    "robotsMeta" TEXT,
    "h1Values" JSONB,
    "structuredDataHash" TEXT,
    "pageWeightBytes" INTEGER,
    "requestCount" INTEGER,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "page_snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "page_link" (
    "id" TEXT NOT NULL,
    "pageSnapshotId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "normalizedUrl" TEXT NOT NULL,
    "linkType" "LinkType" NOT NULL,
    "statusCode" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "page_link_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "page_script" (
    "id" TEXT NOT NULL,
    "pageSnapshotId" TEXT NOT NULL,
    "src" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "scriptHash" TEXT,
    "isThirdParty" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "page_script_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "scan_websiteId_createdAt_idx" ON "scan"("websiteId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "page_snapshot_monitoredPageId_createdAt_idx" ON "page_snapshot"("monitoredPageId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "page_snapshot_scanId_monitoredPageId_key" ON "page_snapshot"("scanId", "monitoredPageId");

-- CreateIndex
CREATE INDEX "page_link_pageSnapshotId_idx" ON "page_link"("pageSnapshotId");

-- CreateIndex
CREATE INDEX "page_script_pageSnapshotId_idx" ON "page_script"("pageSnapshotId");

-- AddForeignKey
ALTER TABLE "scan" ADD CONSTRAINT "scan_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "website"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "page_snapshot" ADD CONSTRAINT "page_snapshot_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "scan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "page_snapshot" ADD CONSTRAINT "page_snapshot_monitoredPageId_fkey" FOREIGN KEY ("monitoredPageId") REFERENCES "monitored_page"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "page_link" ADD CONSTRAINT "page_link_pageSnapshotId_fkey" FOREIGN KEY ("pageSnapshotId") REFERENCES "page_snapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "page_script" ADD CONSTRAINT "page_script_pageSnapshotId_fkey" FOREIGN KEY ("pageSnapshotId") REFERENCES "page_snapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
