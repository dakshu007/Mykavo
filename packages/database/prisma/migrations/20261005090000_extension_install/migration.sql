-- Chrome extension acquisition funnel: one row per install, counters and
-- milestones only (no URLs, hostnames or page content). Until this table
-- exists the extension's usage pings are dropped quietly and the admin
-- funnel shows as empty.

-- CreateTable
CREATE TABLE IF NOT EXISTS "extension_install" (
    "id" TEXT NOT NULL,
    "version" TEXT,
    "installedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "opens" INTEGER NOT NULL DEFAULT 0,
    "pageChecks" INTEGER NOT NULL DEFAULT 0,
    "monitorClicks" INTEGER NOT NULL DEFAULT 0,
    "dashboardOpens" INTEGER NOT NULL DEFAULT 0,
    "scansTriggered" INTEGER NOT NULL DEFAULT 0,
    "connectStartedAt" TIMESTAMP(3),
    "authStartedAt" TIMESTAMP(3),
    "signedUpAt" TIMESTAMP(3),
    "connectedAt" TIMESTAMP(3),
    "existingUser" BOOLEAN,
    "userId" TEXT,

    CONSTRAINT "extension_install_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "extension_install_installedAt_idx" ON "extension_install"("installedAt");
CREATE INDEX IF NOT EXISTS "extension_install_userId_idx" ON "extension_install"("userId");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "extension_install" ADD CONSTRAINT "extension_install_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
