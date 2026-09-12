-- Plugin & theme update attribution.
--
-- Adds the platform fingerprint to each page snapshot (which plugins, theme and
-- core version the page was built on at scan time) and a change category for
-- the events derived from comparing two of them.

ALTER TYPE "ChangeCategory" ADD VALUE IF NOT EXISTS 'PLATFORM';

ALTER TABLE "page_snapshot" ADD COLUMN IF NOT EXISTS "platformFingerprint" JSONB;
