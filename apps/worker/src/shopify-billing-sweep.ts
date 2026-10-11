/**
 * Shopify App Pricing: re-check stores that pay for MyKavo through Shopify.
 *
 * Shopify sends no webhook when a merchant cancels, or when a subscription
 * is frozen over an unpaid Shopify bill; the Partner API is the only source.
 * The app asks it whenever it opens, so this sweep covers stores nobody
 * opened lately: every paid store at least every 6 hours, and right after
 * the end of its billing period.
 *
 * A failed lookup changes nothing (an outage must not take a paying store
 * down to Free); it is simply asked again next run.
 */

import { applyShopifyBilling, prisma } from "@mykavo/database";
import { fetchShopifySubscription, shopifyBillingConfig } from "@mykavo/shared";
import { logger } from "./logger";

const RECHECK_MS = 6 * 60 * 60 * 1000;
/** Stores per run; the Partner API allows 4 requests a second. */
const MAX_PER_RUN = 200;
const GAP_MS = 350;

const pause = () => new Promise((resolve) => setTimeout(resolve, GAP_MS));

export async function runShopifyBillingSweep(): Promise<void> {
  const config = shopifyBillingConfig(process.env);
  if (!config) return;
  const now = new Date();
  const stale = new Date(now.getTime() - RECHECK_MS);

  const shops = await prisma.shopifyShop.findMany({
    where: {
      billingPlan: { not: null },
      uninstalledAt: null,
      shopGid: { not: null },
      OR: [{ billingCheckedAt: null }, { billingCheckedAt: { lt: stale } }, { billingPeriodEnd: { lt: now } }],
    },
    orderBy: { billingCheckedAt: { sort: "asc", nulls: "first" } },
    take: MAX_PER_RUN,
    select: { id: true, shop: true, shopGid: true },
  });

  let checked = 0;
  let changed = 0;
  let failed = 0;
  for (const row of shops) {
    try {
      const sub = await fetchShopifySubscription(config, row.shopGid!);
      const result = await applyShopifyBilling(prisma, row.id, sub, new Date());
      checked++;
      if (result.changed) {
        changed++;
        logger.info("shopify plan changed", { shop: row.shop, plan: sub.plan ?? "free" });
      }
    } catch (err) {
      failed++;
      logger.warn("shopify plan check failed", { shop: row.shop, error: err instanceof Error ? err.message : String(err) });
    }
    await pause();
  }
  if (shops.length) logger.info("shopify billing sweep finished", { checked, changed, failed });
}
