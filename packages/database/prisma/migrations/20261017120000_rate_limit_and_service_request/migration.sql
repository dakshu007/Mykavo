-- Shared rate-limit counters for Better Auth, and service (fix) requests.
CREATE TABLE IF NOT EXISTS "rate_limit" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "lastRequest" BIGINT NOT NULL,
    CONSTRAINT "rate_limit_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "rate_limit_key_key" ON "rate_limit"("key");

CREATE TABLE IF NOT EXISTS "service_request" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "websiteUrl" TEXT NOT NULL,
    "platform" TEXT,
    "urgency" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "changeEventId" TEXT,
    "userId" TEXT,
    "workspaceId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "service_request_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "service_request_createdAt_idx" ON "service_request"("createdAt");

-- Same as every table: no access through Supabase's public API.
ALTER TABLE "rate_limit" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "service_request" ENABLE ROW LEVEL SECURITY;
