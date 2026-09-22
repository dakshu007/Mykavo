-- Android app access requests.
--
-- The app is not on a store yet, so access is granted by hand: a visitor asks
-- from the marketing site, the operator approves, and only then does a
-- download appear in that person's dashboard.
--
-- Keyed by email rather than by user: people request before they have an
-- account, and the address is what links the request to a login afterwards.

CREATE TYPE "AppAccessStatus" AS ENUM ('PENDING', 'APPROVED', 'DECLINED');

CREATE TABLE "app_access_request" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "status" "AppAccessStatus" NOT NULL DEFAULT 'PENDING',
    "source" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),
    "decidedByUserId" TEXT,
    "approvalEmailSentAt" TIMESTAMP(3),
    "firstDownloadAt" TIMESTAMP(3),
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_access_request_pkey" PRIMARY KEY ("id")
);

-- One live request per address: a second submission updates the existing row
-- rather than queueing a duplicate for the operator to decide twice.
CREATE UNIQUE INDEX "app_access_request_email_key" ON "app_access_request"("email");

CREATE INDEX "app_access_request_status_requestedAt_idx"
    ON "app_access_request"("status", "requestedAt" DESC);

-- SetNull, not Cascade: if the admin who approved a request is ever deleted,
-- the request and its approval must survive. Losing somebody's app access
-- because a colleague's account was removed would be absurd.
ALTER TABLE "app_access_request"
    ADD CONSTRAINT "app_access_request_decidedByUserId_fkey"
    FOREIGN KEY ("decidedByUserId") REFERENCES "user"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- RLS, matching every other table (see apps/worker/src/scripts/enable-rls.ts).
-- Prisma connects as the table owner and owners bypass RLS; this closes
-- Supabase's auto-generated PostgREST surface for the new table. Set here as
-- well as by the script so a forgotten script run is not a data exposure.
ALTER TABLE "app_access_request" ENABLE ROW LEVEL SECURITY;
