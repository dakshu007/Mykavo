-- Unsubscribes from the lifecycle / offer emails (Day 3, 6, 10). A new table,
-- so nothing else changes and the site keeps working before this is applied;
-- until it exists the lifecycle emails simply do not send (they fail closed).

CREATE TABLE "email_opt_out" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_opt_out_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "email_opt_out_email_key" ON "email_opt_out"("email");

-- RLS, matching every other table (see apps/worker/src/scripts/enable-rls.ts).
ALTER TABLE "email_opt_out" ENABLE ROW LEVEL SECURITY;
