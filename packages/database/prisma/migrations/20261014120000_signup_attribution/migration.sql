-- Where each new account came from: first landing page, referring site and
-- the last call to action clicked. One row per user, written once.
--
-- Additive and idempotent: safe to run more than once.

CREATE TABLE IF NOT EXISTS "signup_attribution" (
    "userId" TEXT NOT NULL,
    "landing" TEXT NOT NULL,
    "referrer" TEXT NOT NULL DEFAULT '',
    "cta" TEXT,
    "method" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "signup_attribution_pkey" PRIMARY KEY ("userId")
);

CREATE INDEX IF NOT EXISTS "signup_attribution_createdAt_idx"
    ON "signup_attribution"("createdAt" DESC);

-- RLS, matching every other table (see apps/worker/src/scripts/enable-rls.ts).
ALTER TABLE "signup_attribution" ENABLE ROW LEVEL SECURITY;
