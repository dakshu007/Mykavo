-- Push notifications (spec §27). Until now MyKavo could only reach a user by
-- email: the person who needs to know a checkout button vanished is usually
-- not at a desk.
--
-- A device belongs to the USER, not a workspace - one handset should alert its
-- owner about every workspace they belong to, and membership can change
-- without re-registering the phone.

ALTER TYPE "NotificationChannelType" ADD VALUE IF NOT EXISTS 'PUSH';

CREATE TABLE IF NOT EXISTS "push_device" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "deviceName" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "disabledReason" TEXT,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastNotifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "push_device_pkey" PRIMARY KEY ("id")
);

-- Expo issues one token per app install, so a token identifies a device
-- exactly. Re-registering the same handset must update the row, not add one.
CREATE UNIQUE INDEX IF NOT EXISTS "push_device_token_key" ON "push_device" ("token");
CREATE INDEX IF NOT EXISTS "push_device_userId_idx" ON "push_device" ("userId");
CREATE INDEX IF NOT EXISTS "push_device_enabled_idx" ON "push_device" ("enabled");

DO $$
BEGIN
  ALTER TABLE "push_device"
    ADD CONSTRAINT "push_device_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
