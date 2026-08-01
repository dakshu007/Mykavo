-- Scheduled client report delivery (Pro): MyKavo emails each website's
-- branded /r/[token] report to configured client recipients on a weekly or
-- monthly cadence. A daily worker sweep selects due websites using
-- clientReportLastSentAt as the dedupe marker.

-- CreateEnum
CREATE TYPE "ClientReportCadence" AS ENUM ('OFF', 'WEEKLY', 'MONTHLY');

-- AlterTable
ALTER TABLE "website" ADD COLUMN "reportCadence" "ClientReportCadence" NOT NULL DEFAULT 'OFF';
ALTER TABLE "website" ADD COLUMN "reportRecipients" JSONB;
ALTER TABLE "website" ADD COLUMN "clientReportLastSentAt" TIMESTAMP(3);
