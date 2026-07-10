-- Maintenance windows + embeddable status badge (spec §25).
-- muteAlertsUntil: alerts suppressed while this is in the future; change
-- events and health incidents are still recorded. Null or past = not muted.
-- publicToken: opaque badge identifier — website ids are never exposed
-- publicly. Disabling the badge keeps the token (badgeEnabled gates access).

-- AlterTable
ALTER TABLE "website" ADD COLUMN     "muteAlertsUntil" TIMESTAMP(3),
ADD COLUMN     "badgeEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "publicToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "website_publicToken_key" ON "website"("publicToken");
