-- Admin tracking: per-user daily activity by channel, and discrete activity
-- events (dashboard page views, Android app opens and screens, WordPress
-- connect attempts). Until these exist, recording is skipped silently and
-- the Tracking pages show what other tables already know.

-- CreateTable
CREATE TABLE IF NOT EXISTS "user_activity_day" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "channel" TEXT NOT NULL,
    "pings" INTEGER NOT NULL DEFAULT 1,
    "firstAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_activity_day_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "activity_event" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT,
    "channel" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "path" TEXT,
    "label" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "user_activity_day_userId_day_channel_key" ON "user_activity_day"("userId", "day", "channel");
CREATE INDEX IF NOT EXISTS "user_activity_day_day_idx" ON "user_activity_day"("day");
CREATE INDEX IF NOT EXISTS "activity_event_userId_createdAt_idx" ON "activity_event"("userId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "activity_event_type_createdAt_idx" ON "activity_event"("type", "createdAt" DESC);

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "user_activity_day" ADD CONSTRAINT "user_activity_day_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "activity_event" ADD CONSTRAINT "activity_event_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- RLS, matching every other table (see apps/worker/src/scripts/enable-rls.ts).
ALTER TABLE "user_activity_day" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "activity_event" ENABLE ROW LEVEL SECURITY;
