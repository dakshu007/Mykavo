-- WordPress plugin 1.3.0 paid features (served by MyKavo, shown by the plugin):
--
--   * wp_plugin_inventory: the plugins installed on each connected WordPress
--     site, uploaded daily, with what WordPress.org says about each one
--     (Plugin Health: closed, or not updated in two years).
--   * site_connection.settings: settings MyKavo keeps for the plugin, such as
--     the automatic update window.
--   * ai_crawler_alert: de-duplication for AI crawler alert emails.
--
-- Additive and idempotent: safe to run more than once.

-- Plugin inventory
CREATE TABLE IF NOT EXISTS "wp_plugin_inventory" (
    "id" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "wporgStatus" TEXT NOT NULL DEFAULT 'unknown',
    "lastUpdated" DATE,
    "reason" TEXT,
    "checkedAt" TIMESTAMP(3),
    "alertedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wp_plugin_inventory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "wp_plugin_inventory_websiteId_slug_key"
    ON "wp_plugin_inventory"("websiteId", "slug");
CREATE INDEX IF NOT EXISTS "wp_plugin_inventory_checkedAt_idx"
    ON "wp_plugin_inventory"("checkedAt");

DO $$ BEGIN
    ALTER TABLE "wp_plugin_inventory"
        ADD CONSTRAINT "wp_plugin_inventory_websiteId_fkey"
        FOREIGN KEY ("websiteId") REFERENCES "website"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Site settings for the plugin
ALTER TABLE "site_connection" ADD COLUMN IF NOT EXISTS "settings" JSONB NOT NULL DEFAULT '{}';

-- AI crawler alert de-duplication
CREATE TABLE IF NOT EXISTS "ai_crawler_alert" (
    "id" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "agent" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_crawler_alert_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ai_crawler_alert_websiteId_kind_agent_day_key"
    ON "ai_crawler_alert"("websiteId", "kind", "agent", "day");

DO $$ BEGIN
    ALTER TABLE "ai_crawler_alert"
        ADD CONSTRAINT "ai_crawler_alert_websiteId_fkey"
        FOREIGN KEY ("websiteId") REFERENCES "website"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- RLS, matching every other table (see apps/worker/src/scripts/enable-rls.ts).
ALTER TABLE "wp_plugin_inventory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ai_crawler_alert" ENABLE ROW LEVEL SECURITY;
