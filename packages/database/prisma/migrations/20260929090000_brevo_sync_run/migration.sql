-- Brevo contact sync log (Admin > Email marketing). A new table only; until
-- it exists the sync still runs, it just is not logged.

-- CreateTable
CREATE TABLE "brevo_sync_run" (
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

-- CreateIndex
CREATE INDEX "brevo_sync_run_startedAt_idx" ON "brevo_sync_run"("startedAt" DESC);


-- RLS, matching every other table (see apps/worker/src/scripts/enable-rls.ts).
ALTER TABLE "brevo_sync_run" ENABLE ROW LEVEL SECURITY;
