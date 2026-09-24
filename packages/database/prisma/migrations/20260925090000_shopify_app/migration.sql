-- The MyKavo Shopify app.
--
-- shopify_shop: one row per store that installed the app, holding its
-- encrypted offline Admin API token. A member links the store to a MyKavo
-- website through a site_connection row (platform 'shopify'), so the same
-- kill switch and cascade rules as the WordPress plugin apply.
--
-- shopify_theme_event: theme publishes and edits, and the check each one
-- started (or why it did not).

CREATE TABLE "shopify_shop" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "accessTokenEnc" TEXT,
    "scope" TEXT,
    "name" TEXT,
    "primaryDomain" TEXT,
    "installedAt" TIMESTAMP(3),
    "uninstalledAt" TIMESTAMP(3),
    "themeChecks" BOOLEAN NOT NULL DEFAULT true,
    "lastThemeCheckAt" TIMESTAMP(3),
    "siteConnectionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shopify_shop_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "shopify_shop_shop_key" ON "shopify_shop"("shop");
CREATE UNIQUE INDEX "shopify_shop_siteConnectionId_key" ON "shopify_shop"("siteConnectionId");

-- SetNull: revoking or deleting the link leaves the install in place, so the
-- merchant can link again from the app.
ALTER TABLE "shopify_shop"
    ADD CONSTRAINT "shopify_shop_siteConnectionId_fkey"
    FOREIGN KEY ("siteConnectionId") REFERENCES "site_connection"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "shopify_theme_event" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "themeId" TEXT,
    "themeName" TEXT NOT NULL,
    "scanId" TEXT,
    "reason" TEXT,
    "webhookId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shopify_theme_event_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "shopify_theme_event_webhookId_key" ON "shopify_theme_event"("webhookId");

CREATE INDEX "shopify_theme_event_shopId_createdAt_idx" ON "shopify_theme_event"("shopId", "createdAt");

ALTER TABLE "shopify_theme_event"
    ADD CONSTRAINT "shopify_theme_event_shopId_fkey"
    FOREIGN KEY ("shopId") REFERENCES "shopify_shop"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- RLS, matching every other table (see apps/worker/src/scripts/enable-rls.ts).
ALTER TABLE "shopify_shop" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "shopify_theme_event" ENABLE ROW LEVEL SECURITY;
