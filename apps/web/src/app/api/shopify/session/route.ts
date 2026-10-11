import { NextResponse } from "next/server";
import { appBaseUrl } from "@/lib/app-url";
import { logger } from "@/lib/logger";
import { rateLimit } from "@/lib/security/rate-limit";
import { adminAppUrl, signLinkToken, storePages, verifySessionToken } from "@/lib/integrations/shopify";
import { ShopifyApiError } from "@/lib/integrations/shopify-admin";
import {
  activeLink,
  ensureInstalled,
  refreshShopifyBilling,
  shopifyConfig,
  shopifyPlanPageUrl,
} from "@/lib/integrations/shopify-server";

/**
 * The embedded app calls this first, every time it opens. It verifies the
 * App Bridge session token, completes the install when needed (token
 * exchange), and says whether the store is linked to a MyKavo website -
 * with the consent link to use if it is not. It also refreshes the plan the
 * store pays for through Shopify; `?refreshPlan=1` (sent when the merchant
 * returns from Shopify's plan page) skips the short cache.
 */
export async function POST(request: Request) {
  const config = shopifyConfig();
  if (!config) {
    return NextResponse.json({ error: "The Shopify app is not configured.", code: "NOT_CONFIGURED" }, { status: 503 });
  }

  const token = /^Bearer\s+(\S+)$/i.exec(request.headers.get("authorization") ?? "")?.[1] ?? "";
  const claims = verifySessionToken(token, config);
  if (!claims) {
    return NextResponse.json({ error: "Your Shopify session expired. Reload the app.", code: "BAD_SESSION" }, { status: 401 });
  }

  const rl = rateLimit(`shopify-session:${claims.shop}`, { limit: 60, windowMs: 60_000 });
  if (!rl.allowed) return NextResponse.json({ error: "Too many requests. Wait a minute." }, { status: 429 });

  let row;
  try {
    row = await ensureInstalled({ shop: claims.shop, sessionToken: token, config });
  } catch (err) {
    logger.error("shopify install failed", { shop: claims.shop }, err);
    const status = err instanceof ShopifyApiError && err.status < 500 ? 502 : 500;
    return NextResponse.json(
      { error: "MyKavo could not finish installing on this store. Reload the app to try again.", code: "INSTALL_FAILED" },
      { status },
    );
  }

  const forcePlan = new URL(request.url).searchParams.get("refreshPlan") === "1";
  row = await refreshShopifyBilling(row, { force: forcePlan });

  const link = await activeLink(row.id);
  const primaryDomain = row.primaryDomain ?? `https://${row.shop}`;
  return NextResponse.json(
    {
      shop: row.shop,
      name: row.name,
      primaryDomain,
      linked: Boolean(link),
      website: link ? link.website : null,
      linkUrl: link ? null : `${appBaseUrl()}/connect/shopify?t=${encodeURIComponent(signLinkToken(row.shop, config.apiSecret))}`,
      themeChecks: row.themeChecks,
      storePages: storePages(primaryDomain),
      adminUrl: adminAppUrl(row.shop, config.apiKey),
      // Shopify App Pricing: the plan this store pays for, and Shopify's
      // plan page (null until billing is set up in the Partner Dashboard).
      shopifyPlan: row.billingPlan ?? "free",
      planPageUrl: shopifyPlanPageUrl(row.shop),
    },
    { headers: { "cache-control": "no-store" } },
  );
}
