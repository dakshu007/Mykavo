-- CreateEnum
CREATE TYPE "PerformanceAuditStatus" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "performance_audit" (
    "id" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "status" "PerformanceAuditStatus" NOT NULL DEFAULT 'QUEUED',
    "performanceScore" INTEGER,
    "accessibilityScore" INTEGER,
    "bestPracticesScore" INTEGER,
    "seoScore" INTEGER,
    "lcpMs" INTEGER,
    "fcpMs" INTEGER,
    "tbtMs" INTEGER,
    "ttiMs" INTEGER,
    "speedIndexMs" INTEGER,
    "cls" DOUBLE PRECISION,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "performance_audit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "performance_audit_websiteId_createdAt_idx" ON "performance_audit"("websiteId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "performance_audit" ADD CONSTRAINT "performance_audit_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "website"("id") ON DELETE CASCADE ON UPDATE CASCADE;
