-- "Update available" emails for the WordPress plugin and the Android app:
-- releases (from WordPress.org or an admin) and who was told about which.
-- Until these tables exist the worker skips update emails and the admin
-- panel says the migration is needed.

-- CreateTable
CREATE TABLE IF NOT EXISTS "product_release" (
    "id" TEXT NOT NULL,
    "product" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "notes" JSONB NOT NULL DEFAULT '[]',
    "source" TEXT NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sendRequestedAt" TIMESTAMP(3),
    "requestedByEmail" TEXT,

    CONSTRAINT "product_release_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "product_update_notice" (
    "id" TEXT NOT NULL,
    "product" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "notificationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_update_notice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "product_release_product_version_key" ON "product_release"("product", "version");
CREATE UNIQUE INDEX IF NOT EXISTS "product_update_notice_product_version_userId_key" ON "product_update_notice"("product", "version", "userId");
CREATE INDEX IF NOT EXISTS "product_update_notice_userId_createdAt_idx" ON "product_update_notice"("userId", "createdAt");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "product_update_notice" ADD CONSTRAINT "product_update_notice_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- RLS, matching every other table (see apps/worker/src/scripts/enable-rls.ts).
ALTER TABLE "product_release" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "product_update_notice" ENABLE ROW LEVEL SECURITY;
