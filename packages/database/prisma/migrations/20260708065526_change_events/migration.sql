-- CreateEnum
CREATE TYPE "ChangeCategory" AS ENUM ('AVAILABILITY', 'VISUAL', 'SEO', 'CONTENT', 'LINKS', 'SCRIPT', 'PERFORMANCE', 'CONVERSION');

-- CreateEnum
CREATE TYPE "ChangeSeverity" AS ENUM ('INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ChangeStatus" AS ENUM ('NEW', 'REVIEWED', 'APPROVED', 'RESOLVED', 'IGNORED');

-- CreateTable
CREATE TABLE "change_event" (
    "id" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "monitoredPageId" TEXT NOT NULL,
    "previousSnapshotId" TEXT,
    "currentSnapshotId" TEXT,
    "scanId" TEXT NOT NULL,
    "category" "ChangeCategory" NOT NULL,
    "changeType" TEXT NOT NULL,
    "severity" "ChangeSeverity" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "previousValue" TEXT,
    "currentValue" TEXT,
    "metadata" JSONB,
    "status" "ChangeStatus" NOT NULL DEFAULT 'NEW',
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "change_event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "change_event_websiteId_status_severity_idx" ON "change_event"("websiteId", "status", "severity");

-- CreateIndex
CREATE INDEX "change_event_monitoredPageId_idx" ON "change_event"("monitoredPageId");

-- CreateIndex
CREATE INDEX "change_event_scanId_idx" ON "change_event"("scanId");

-- CreateIndex
CREATE INDEX "change_event_detectedAt_idx" ON "change_event"("detectedAt" DESC);

-- AddForeignKey
ALTER TABLE "change_event" ADD CONSTRAINT "change_event_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "website"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "change_event" ADD CONSTRAINT "change_event_monitoredPageId_fkey" FOREIGN KEY ("monitoredPageId") REFERENCES "monitored_page"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "change_event" ADD CONSTRAINT "change_event_previousSnapshotId_fkey" FOREIGN KEY ("previousSnapshotId") REFERENCES "page_snapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "change_event" ADD CONSTRAINT "change_event_currentSnapshotId_fkey" FOREIGN KEY ("currentSnapshotId") REFERENCES "page_snapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "change_event" ADD CONSTRAINT "change_event_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "scan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
