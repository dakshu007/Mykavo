-- Admin > Automations: editable settings for the automated emails, and a log
-- of which automation sent which Notification. Two new tables only, so the
-- site and worker keep working before this is applied (they fall back to the
-- shipped wording and to matching on subjects).

CREATE TABLE "email_automation" (
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

CREATE TABLE "email_automation_send" (
    "id" TEXT NOT NULL,
    "automationKey" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "isTest" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_automation_send_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "email_automation_send_notificationId_key" ON "email_automation_send"("notificationId");

CREATE INDEX "email_automation_send_automationKey_createdAt_idx" ON "email_automation_send"("automationKey", "createdAt" DESC);

ALTER TABLE "email_automation_send" ADD CONSTRAINT "email_automation_send_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "notification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RLS, matching every other table (see apps/worker/src/scripts/enable-rls.ts).
ALTER TABLE "email_automation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "email_automation_send" ENABLE ROW LEVEL SECURITY;
