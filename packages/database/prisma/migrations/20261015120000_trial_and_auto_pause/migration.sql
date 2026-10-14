-- 14-day Pro trials, and websites MyKavo pauses by itself (abandoned Free
-- workspaces, and sites over the limit when a trial ends).
--
-- Additive and idempotent: safe to run more than once.

CREATE TABLE IF NOT EXISTS "workspace_trial" (
    "workspaceId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "source" TEXT NOT NULL,
    "reminderSentAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "endedEmailAt" TIMESTAMP(3),

    CONSTRAINT "workspace_trial_pkey" PRIMARY KEY ("workspaceId")
);

CREATE INDEX IF NOT EXISTS "workspace_trial_endsAt_idx" ON "workspace_trial"("endsAt");

DO $$ BEGIN
    ALTER TABLE "workspace_trial"
        ADD CONSTRAINT "workspace_trial_workspaceId_fkey"
        FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "website_auto_pause" (
    "websiteId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "pausedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notifiedAt" TIMESTAMP(3),

    CONSTRAINT "website_auto_pause_pkey" PRIMARY KEY ("websiteId")
);

CREATE INDEX IF NOT EXISTS "website_auto_pause_workspaceId_idx" ON "website_auto_pause"("workspaceId");
CREATE INDEX IF NOT EXISTS "website_auto_pause_reason_pausedAt_idx" ON "website_auto_pause"("reason", "pausedAt");

DO $$ BEGIN
    ALTER TABLE "website_auto_pause"
        ADD CONSTRAINT "website_auto_pause_websiteId_fkey"
        FOREIGN KEY ("websiteId") REFERENCES "website"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- RLS, matching every other table (see apps/worker/src/scripts/enable-rls.ts).
ALTER TABLE "workspace_trial" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "website_auto_pause" ENABLE ROW LEVEL SECURITY;
