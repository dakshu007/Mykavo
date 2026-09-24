/**
 * Database-side of the Shopify app: install (token exchange), theme
 * webhooks, uninstall and Shopify's privacy webhooks. Routes stay thin and
 * call these.
 */

import { prisma, type ShopifyShop } from "@mykavo/database";
import { encryptToken } from "@mykavo/shared";
import { appBaseUrl } from "@/lib/app-url";
import { logger } from "@/lib/logger";
import { triggerWebsiteScan } from "@/lib/scans/trigger";
import {
  decideThemeCheck,
  themeNote,
  type ThemeTopic,
} from "@/lib/integrations/shopify";
import { exchangeSessionToken, fetchShopInfo, registerWebhooks } from "@/lib/integrations/shopify-admin";

export interface ShopifyConfig {
  apiKey: string;
  apiSecret: string;
}

/** Client ID and secret from the Shopify Dev Dashboard, or null when the app is not set up. */
export function shopifyConfig(): ShopifyConfig | null {
  const apiKey = process.env.SHOPIFY_API_KEY?.trim();
  const apiSecret = process.env.SHOPIFY_API_SECRET?.trim();
  return apiKey && apiSecret ? { apiKey, apiSecret } : null;
}

/**
 * Admin API tokens are encrypted with the same AES-256-GCM key as Search
 * Console tokens (GSC_TOKEN_KEY, which must never be rotated).
 */
function tokenKey(): string {
  const key = process.env.GSC_TOKEN_KEY;
  if (key?.length !== 64) throw new Error("GSC_TOKEN_KEY not configured");
  return key;
}

export function webhookUrl(): string {
  return `${appBaseUrl()}/api/shopify/webhooks`;
}

/**
 * Make sure the store has a stored offline token, its name and domain, and
 * our webhooks. Runs each time the embedded app opens; after the first time
 * it is one database read.
 */
export async function ensureInstalled(params: {
  shop: string;
  sessionToken: string;
  config: ShopifyConfig;
}): Promise<ShopifyShop> {
  const { shop, sessionToken, config } = params;
  const existing = await prisma.shopifyShop.findUnique({ where: { shop } });
  if (existing?.accessTokenEnc && !existing.uninstalledAt) return existing;

  const { accessToken, scope } = await exchangeSessionToken({
    shop,
    sessionToken,
    apiKey: config.apiKey,
    apiSecret: config.apiSecret,
  });
  const info = await fetchShopInfo(shop, accessToken).catch((err: unknown) => {
    logger.error("shopify shop info failed", { shop }, err);
    return { name: null, primaryDomain: `https://${shop}` };
  });
  const problems = await registerWebhooks(shop, accessToken, webhookUrl()).catch((err: unknown) => {
    logger.error("shopify webhook registration failed", { shop }, err);
    return ["registration threw"];
  });
  if (problems.length) logger.warn("shopify webhook registration problems", { shop, problems: problems.join(" | ") });

  const now = new Date();
  const data = {
    accessTokenEnc: encryptToken(accessToken, tokenKey()),
    scope,
    name: info.name,
    primaryDomain: info.primaryDomain,
    installedAt: now,
    uninstalledAt: null,
  };
  const row = await prisma.shopifyShop.upsert({
    where: { shop },
    create: { shop, ...data },
    update: data,
  });
  logger.info("shopify store installed", { shop, reinstall: Boolean(existing) });
  return row;
}

/** The store's live link to a MyKavo website, or null. */
export async function activeLink(shopId: string) {
  const row = await prisma.shopifyShop.findUnique({
    where: { id: shopId },
    select: {
      uninstalledAt: true,
      siteConnection: {
        select: {
          id: true,
          revokedAt: true,
          workspaceId: true,
          website: { select: { id: true, name: true, url: true } },
        },
      },
    },
  });
  const link = row?.siteConnection;
  if (!row || row.uninstalledAt || !link || link.revokedAt) return null;
  return link;
}

/** themes/publish and themes/update: check the storefront if the live theme changed. */
export async function handleThemeWebhook(params: {
  shop: string;
  topic: ThemeTopic;
  webhookId: string | null;
  payload: Record<string, unknown>;
}): Promise<void> {
  const { shop, topic, webhookId, payload } = params;
  const row = await prisma.shopifyShop.findUnique({ where: { shop } });
  if (!row) return;
  const link = await activeLink(row.id);

  const decision = decideThemeCheck({
    topic,
    role: payload.role,
    themeChecks: row.themeChecks,
    connected: Boolean(link),
    lastThemeCheckAt: row.lastThemeCheckAt,
  });
  // Draft themes and unlinked stores leave no trace: nothing to show anyone.
  if (!decision.check && (decision.reason === "IGNORED" || decision.reason === "NOT_CONNECTED")) return;

  const themeName = typeof payload.name === "string" ? payload.name.slice(0, 100) : "Untitled theme";
  const themeId = typeof payload.id === "number" || typeof payload.id === "string" ? String(payload.id) : null;

  // Claim the delivery first: a retried webhook must not start a second check.
  if (webhookId && (await prisma.shopifyThemeEvent.findUnique({ where: { webhookId }, select: { id: true } }))) return;
  let eventId: string;
  try {
    const event = await prisma.shopifyThemeEvent.create({
      data: { shopId: row.id, topic, themeId, themeName, webhookId, reason: decision.check ? null : decision.reason },
    });
    eventId = event.id;
  } catch (err) {
    if ((err as { code?: string }).code === "P2002") return;
    throw err;
  }
  if (!decision.check || !link) return;

  const result = await triggerWebsiteScan({
    workspaceId: link.workspaceId,
    websiteId: link.website.id,
    mode: "deploy",
    note: themeNote(topic, themeName),
  });
  const scanId = result.ok ? result.scan.id : result.reason === "BUSY" ? (result.scanId ?? null) : null;
  await prisma.shopifyThemeEvent.update({
    where: { id: eventId },
    data: { scanId, reason: result.ok ? null : result.reason },
  });
  if (result.ok || result.reason === "BUSY") {
    await prisma.shopifyShop.update({ where: { id: row.id }, data: { lastThemeCheckAt: new Date() } });
  }
  logger.info("shopify theme change", {
    shop,
    topic,
    workspaceId: link.workspaceId,
    websiteId: link.website.id,
    ...(result.ok ? { scanId: result.scan.id } : { reason: result.reason }),
  });
}

/** Revoke the store's link, keeping the site_connection row for audit. */
async function unlink(row: { id: string; siteConnectionId: string | null }): Promise<void> {
  if (row.siteConnectionId) {
    await prisma.siteConnection.updateMany({
      where: { id: row.siteConnectionId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}

/** app/uninstalled: the token is dead; forget it and the link. */
export async function handleUninstall(shop: string): Promise<void> {
  const row = await prisma.shopifyShop.findUnique({ where: { shop } });
  if (!row) return;
  await unlink(row);
  await prisma.shopifyShop.update({
    where: { id: row.id },
    data: { accessTokenEnc: null, uninstalledAt: new Date(), siteConnectionId: null },
  });
  logger.info("shopify store uninstalled", { shop });
}

/**
 * shop/redact (48 hours after uninstall): delete everything we hold about
 * the store. Its MyKavo website, if any, belongs to the MyKavo workspace and
 * stays - the merchant deletes that from MyKavo.
 */
export async function handleShopRedact(shop: string): Promise<void> {
  const row = await prisma.shopifyShop.findUnique({ where: { shop } });
  if (!row) return;
  await unlink(row);
  await prisma.shopifyShop.delete({ where: { id: row.id } });
  logger.info("shopify store data redacted", { shop });
}
