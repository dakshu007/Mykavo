-- Shopify App Pricing: the plan a store pays for through Shopify.
--
-- Merchants who install MyKavo from the Shopify App Store pay on their
-- Shopify bill (an App Store requirement). Shopify hosts the plan page; the
-- app reads the store's active subscription from the Partner API and keeps
-- the result here. A paid plan on a store linked to a MyKavo workspace
-- counts as that workspace's plan (see getWorkspaceEntitlement).
--
-- Additive and idempotent: safe to run more than once.

ALTER TABLE "shopify_shop" ADD COLUMN IF NOT EXISTS "shopGid" TEXT;
ALTER TABLE "shopify_shop" ADD COLUMN IF NOT EXISTS "billingPlan" TEXT;
ALTER TABLE "shopify_shop" ADD COLUMN IF NOT EXISTS "billingPlanHandle" TEXT;
ALTER TABLE "shopify_shop" ADD COLUMN IF NOT EXISTS "billingPeriodEnd" TIMESTAMP(3);
ALTER TABLE "shopify_shop" ADD COLUMN IF NOT EXISTS "billingCancelAtEnd" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "shopify_shop" ADD COLUMN IF NOT EXISTS "billingCheckedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "shopify_shop_billingPlan_idx" ON "shopify_shop"("billingPlan");
