-- Google Search Console integration: one encrypted connection per website,
-- daily totals for charts, and top dimension rows for two 28-day periods.

-- CreateEnum
CREATE TYPE "GscDimension" AS ENUM ('QUERY', 'PAGE', 'COUNTRY', 'DEVICE', 'APPEARANCE');
CREATE TYPE "GscPeriod" AS ENUM ('CURRENT', 'PREVIOUS');

-- CreateTable
CREATE TABLE "gsc_connection" (
    "id" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "connectedById" TEXT NOT NULL,
    "googleEmail" TEXT,
    "property" TEXT,
    "accessTokenEnc" TEXT NOT NULL,
    "refreshTokenEnc" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastSyncAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "gsc_connection_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "gsc_connection_websiteId_key" ON "gsc_connection"("websiteId");
ALTER TABLE "gsc_connection" ADD CONSTRAINT "gsc_connection_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "website"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "gsc_daily" (
    "id" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "clicks" INTEGER NOT NULL,
    "impressions" INTEGER NOT NULL,
    "ctr" DOUBLE PRECISION NOT NULL,
    "position" DOUBLE PRECISION NOT NULL,
    CONSTRAINT "gsc_daily_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "gsc_daily_websiteId_date_key" ON "gsc_daily"("websiteId", "date");
ALTER TABLE "gsc_daily" ADD CONSTRAINT "gsc_daily_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "website"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "gsc_dimension_row" (
    "id" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "dimension" "GscDimension" NOT NULL,
    "period" "GscPeriod" NOT NULL,
    "key" TEXT NOT NULL,
    "clicks" INTEGER NOT NULL,
    "impressions" INTEGER NOT NULL,
    "ctr" DOUBLE PRECISION NOT NULL,
    "position" DOUBLE PRECISION NOT NULL,
    CONSTRAINT "gsc_dimension_row_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "gsc_dimension_row_websiteId_dimension_period_key_key" ON "gsc_dimension_row"("websiteId", "dimension", "period", "key");
CREATE INDEX "gsc_dimension_row_websiteId_dimension_period_idx" ON "gsc_dimension_row"("websiteId", "dimension", "period");
ALTER TABLE "gsc_dimension_row" ADD CONSTRAINT "gsc_dimension_row_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "website"("id") ON DELETE CASCADE ON UPDATE CASCADE;
