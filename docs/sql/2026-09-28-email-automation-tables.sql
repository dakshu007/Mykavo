-- MyKavo: every table the email features added on 2026-09-28, in one go.
-- Paste into Supabase > SQL Editor and run. Safe to run more than once:
-- anything that already exists is skipped, and each migration is recorded
-- in _prisma_migrations only if it is not there yet.
--
--   20260928090000_email_opt_out       unsubscribes
--   20260928120000_email_automations   Admin > Automations settings + send log
--   20260928160000_automation_flows    Automation Tool flows
--   20260929090000_brevo_sync_run      Brevo contact sync log

-- 1. Unsubscribes ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "email_opt_out" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "email_opt_out_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "email_opt_out_email_key" ON "email_opt_out"("email");
ALTER TABLE "email_opt_out" ENABLE ROW LEVEL SECURITY;

-- 2. Automations settings and send log ---------------------------------------
CREATE TABLE IF NOT EXISTS "email_automation" (
    "key" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "subject" TEXT,
    "heading" TEXT,
    "intro" TEXT,
    "buttonLabel" TEXT,
    "sendOnDay" INTEGER,
    "offerCode" TEXT,
    "offerPercent" INTEGER,
    "updatedByEmail" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "email_automation_pkey" PRIMARY KEY ("key")
);
CREATE TABLE IF NOT EXISTS "email_automation_send" (
    "id" TEXT NOT NULL,
    "automationKey" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "isTest" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "email_automation_send_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "email_automation_send_notificationId_key" ON "email_automation_send"("notificationId");
CREATE INDEX IF NOT EXISTS "email_automation_send_automationKey_createdAt_idx" ON "email_automation_send"("automationKey", "createdAt" DESC);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'email_automation_send_notificationId_fkey') THEN
    ALTER TABLE "email_automation_send" ADD CONSTRAINT "email_automation_send_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "notification"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
ALTER TABLE "email_automation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "email_automation_send" ENABLE ROW LEVEL SECURITY;

-- 3. Automation Tool flows ---------------------------------------------------
CREATE TABLE IF NOT EXISTS "automation_flow" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "trigger" TEXT NOT NULL,
    "definition" JSONB NOT NULL,
    "activatedAt" TIMESTAMP(3),
    "createdByEmail" TEXT,
    "updatedByEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "automation_flow_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "automation_flow_run" (
    "id" TEXT NOT NULL,
    "flowId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "currentStepId" TEXT,
    "nextRunAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "stopReason" TEXT,
    CONSTRAINT "automation_flow_run_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "automation_flow_event" (
    "id" TEXT NOT NULL,
    "flowId" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "stepId" TEXT,
    "kind" TEXT NOT NULL,
    "detail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "automation_flow_event_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "automation_flow_run_status_nextRunAt_idx" ON "automation_flow_run"("status", "nextRunAt");
CREATE UNIQUE INDEX IF NOT EXISTS "automation_flow_run_flowId_userId_key" ON "automation_flow_run"("flowId", "userId");
CREATE INDEX IF NOT EXISTS "automation_flow_event_flowId_createdAt_idx" ON "automation_flow_event"("flowId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "automation_flow_event_flowId_stepId_kind_idx" ON "automation_flow_event"("flowId", "stepId", "kind");
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'automation_flow_run_flowId_fkey') THEN
    ALTER TABLE "automation_flow_run" ADD CONSTRAINT "automation_flow_run_flowId_fkey" FOREIGN KEY ("flowId") REFERENCES "automation_flow"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'automation_flow_run_userId_fkey') THEN
    ALTER TABLE "automation_flow_run" ADD CONSTRAINT "automation_flow_run_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'automation_flow_event_flowId_fkey') THEN
    ALTER TABLE "automation_flow_event" ADD CONSTRAINT "automation_flow_event_flowId_fkey" FOREIGN KEY ("flowId") REFERENCES "automation_flow"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
ALTER TABLE "automation_flow" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "automation_flow_run" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "automation_flow_event" ENABLE ROW LEVEL SECURITY;

-- 4. Brevo sync log ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS "brevo_sync_run" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RUNNING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "contacts" INTEGER NOT NULL DEFAULT 0,
    "blocklisted" INTEGER NOT NULL DEFAULT 0,
    "removed" INTEGER NOT NULL DEFAULT 0,
    "pulledUnsubscribes" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "requestedByEmail" TEXT,
    CONSTRAINT "brevo_sync_run_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "brevo_sync_run_startedAt_idx" ON "brevo_sync_run"("startedAt" DESC);
ALTER TABLE "brevo_sync_run" ENABLE ROW LEVEL SECURITY;

-- Record the migrations (only the ones not recorded yet) --------------------
INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
SELECT gen_random_uuid()::text, m.checksum, now(), m.name, NULL, NULL, now(), 1
FROM (VALUES
  ('20260928090000_email_opt_out',     '90b886746dcfe4b33b83239c6d18c29813540fc4b22ec5cc7d66ff5d0bcad53b'),
  ('20260928120000_email_automations', '6a1907d99259423fa44214dddd40e6967d4e592609749192630f8876c9442ae3'),
  ('20260928160000_automation_flows',  'd2a9657154366e58c25d10ad13ab3e55a6ea0938cd3f1d51f4a54ca8a06767d9'),
  ('20260929090000_brevo_sync_run',    '9581598b0d7b6f30dd1ad821a95abeba0b3a4c2273c6edf2de60e442f4e7bb35')
) AS m(name, checksum)
WHERE NOT EXISTS (SELECT 1 FROM "_prisma_migrations" p WHERE p.migration_name = m.name);
