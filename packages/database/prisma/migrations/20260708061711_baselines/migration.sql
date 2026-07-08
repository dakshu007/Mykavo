-- CreateEnum
CREATE TYPE "BaselineStatus" AS ENUM ('ACTIVE', 'SUPERSEDED');

-- CreateTable
CREATE TABLE "baseline" (
    "id" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "monitoredPageId" TEXT NOT NULL,
    "pageSnapshotId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "BaselineStatus" NOT NULL DEFAULT 'ACTIVE',
    "approvedByUserId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "baseline_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "baseline_websiteId_idx" ON "baseline"("websiteId");

-- CreateIndex
CREATE INDEX "baseline_monitoredPageId_status_idx" ON "baseline"("monitoredPageId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "baseline_monitoredPageId_version_key" ON "baseline"("monitoredPageId", "version");

-- AddForeignKey
ALTER TABLE "baseline" ADD CONSTRAINT "baseline_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "website"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "baseline" ADD CONSTRAINT "baseline_monitoredPageId_fkey" FOREIGN KEY ("monitoredPageId") REFERENCES "monitored_page"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "baseline" ADD CONSTRAINT "baseline_pageSnapshotId_fkey" FOREIGN KEY ("pageSnapshotId") REFERENCES "page_snapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "baseline" ADD CONSTRAINT "baseline_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Enforce exactly one ACTIVE baseline per monitored page (spec §10, DATABASE_SCHEMA.md).
-- Partial unique index — not expressible in the Prisma schema, added manually.
CREATE UNIQUE INDEX "baseline_one_active_per_page"
  ON "baseline"("monitoredPageId")
  WHERE status = 'ACTIVE';
