-- CreateEnum
CREATE TYPE "HealthIncidentKind" AS ENUM ('DOWN', 'SSL_EXPIRING');

-- CreateTable
CREATE TABLE "health_check" (
    "id" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "up" BOOLEAN NOT NULL,
    "httpStatus" INTEGER,
    "responseTimeMs" INTEGER,
    "sslValidTo" TIMESTAMP(3),
    "errorCode" TEXT,

    CONSTRAINT "health_check_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_incident" (
    "id" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "kind" "HealthIncidentKind" NOT NULL,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "lastNotifiedAt" TIMESTAMP(3),
    "detail" TEXT,

    CONSTRAINT "health_incident_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "health_check_websiteId_checkedAt_idx" ON "health_check"("websiteId", "checkedAt" DESC);

-- CreateIndex
CREATE INDEX "health_incident_websiteId_resolvedAt_idx" ON "health_incident"("websiteId", "resolvedAt");

-- AddForeignKey
ALTER TABLE "health_check" ADD CONSTRAINT "health_check_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "website"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_incident" ADD CONSTRAINT "health_incident_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "website"("id") ON DELETE CASCADE ON UPDATE CASCADE;
