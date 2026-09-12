-- Detected technology stack per page snapshot: CMS, framework, host, analytics,
-- payments, support tooling. Unlike platformFingerprint this is populated for
-- every site, not only WordPress ones.

ALTER TABLE "page_snapshot" ADD COLUMN IF NOT EXISTS "technologies" JSONB;
