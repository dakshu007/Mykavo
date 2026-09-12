-- Domain registration facts read over RDAP, so MyKavo can warn before a domain
-- lapses. An expired domain takes the site AND its email down at once, and no
-- monitoring tool warns about it.

ALTER TABLE "website" ADD COLUMN IF NOT EXISTS "domainName" TEXT;
ALTER TABLE "website" ADD COLUMN IF NOT EXISTS "domainExpiresAt" TIMESTAMP(3);
ALTER TABLE "website" ADD COLUMN IF NOT EXISTS "domainRegistrar" TEXT;
ALTER TABLE "website" ADD COLUMN IF NOT EXISTS "domainStatuses" JSONB;
ALTER TABLE "website" ADD COLUMN IF NOT EXISTS "domainCheckedAt" TIMESTAMP(3);
ALTER TABLE "website" ADD COLUMN IF NOT EXISTS "domainLookupError" TEXT;

-- Finding the domains due a refresh must not scan the table.
CREATE INDEX IF NOT EXISTS "website_domainCheckedAt_idx" ON "website" ("domainCheckedAt");
