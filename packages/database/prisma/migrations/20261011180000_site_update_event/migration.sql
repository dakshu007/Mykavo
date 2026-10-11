-- WordPress updates reported by the MyKavo plugin, kept on every plan.
--
-- Until now a Free plan update report started no check and was not stored,
-- so mykavo.app showed nothing. Each report is now one row, with the check
-- it started (scanId) or why none ran (reason).
--
-- Additive and idempotent: safe to run more than once.

CREATE TABLE IF NOT EXISTS "site_update_event" (
    "id" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "items" JSONB NOT NULL,
    "scanId" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "site_update_event_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "site_update_event_websiteId_createdAt_idx"
    ON "site_update_event"("websiteId", "createdAt" DESC);

DO $$ BEGIN
    ALTER TABLE "site_update_event"
        ADD CONSTRAINT "site_update_event_websiteId_fkey"
        FOREIGN KEY ("websiteId") REFERENCES "website"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- RLS, matching every other table (see apps/worker/src/scripts/enable-rls.ts).
ALTER TABLE "site_update_event" ENABLE ROW LEVEL SECURITY;
