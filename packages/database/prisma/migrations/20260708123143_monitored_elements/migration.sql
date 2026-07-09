-- CreateEnum
CREATE TYPE "MonitoredElementImportance" AS ENUM ('NORMAL', 'IMPORTANT', 'CRITICAL');

-- CreateTable
CREATE TABLE "monitored_element" (
    "id" TEXT NOT NULL,
    "monitoredPageId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "selector" TEXT NOT NULL,
    "expectedExistence" BOOLEAN NOT NULL DEFAULT true,
    "expectedVisibility" BOOLEAN NOT NULL DEFAULT true,
    "expectedText" TEXT,
    "expectedHref" TEXT,
    "importance" "MonitoredElementImportance" NOT NULL DEFAULT 'IMPORTANT',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monitored_element_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monitored_element_result" (
    "id" TEXT NOT NULL,
    "pageSnapshotId" TEXT NOT NULL,
    "monitoredElementId" TEXT,
    "name" TEXT NOT NULL,
    "selector" TEXT NOT NULL,
    "importance" "MonitoredElementImportance" NOT NULL,
    "expectedExistence" BOOLEAN NOT NULL,
    "expectedVisibility" BOOLEAN NOT NULL,
    "expectedText" TEXT,
    "expectedHref" TEXT,
    "exists" BOOLEAN NOT NULL,
    "visible" BOOLEAN NOT NULL,
    "text" TEXT,
    "href" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "monitored_element_result_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "monitored_element_monitoredPageId_idx" ON "monitored_element"("monitoredPageId");

-- CreateIndex
CREATE INDEX "monitored_element_result_pageSnapshotId_idx" ON "monitored_element_result"("pageSnapshotId");

-- CreateIndex
CREATE INDEX "monitored_element_result_monitoredElementId_idx" ON "monitored_element_result"("monitoredElementId");

-- AddForeignKey
ALTER TABLE "monitored_element" ADD CONSTRAINT "monitored_element_monitoredPageId_fkey" FOREIGN KEY ("monitoredPageId") REFERENCES "monitored_page"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monitored_element_result" ADD CONSTRAINT "monitored_element_result_pageSnapshotId_fkey" FOREIGN KEY ("pageSnapshotId") REFERENCES "page_snapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monitored_element_result" ADD CONSTRAINT "monitored_element_result_monitoredElementId_fkey" FOREIGN KEY ("monitoredElementId") REFERENCES "monitored_element"("id") ON DELETE SET NULL ON UPDATE CASCADE;
