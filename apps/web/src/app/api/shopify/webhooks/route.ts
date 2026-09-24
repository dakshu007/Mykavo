import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { isShopDomain, themeTopic, verifyWebhookHmac } from "@/lib/integrations/shopify";
import {
  handleShopRedact,
  handleThemeWebhook,
  handleUninstall,
  shopifyConfig,
} from "@/lib/integrations/shopify-server";

/**
 * Every Shopify webhook lands here: theme publishes and edits (which start a
 * check), app/uninstalled, and the three mandatory privacy webhooks.
 * Deliveries are authenticated by their HMAC; anything unsigned is refused.
 * Shopify retries non-2xx responses, so known-but-uninteresting deliveries
 * still get a 200.
 */
export async function POST(request: Request) {
  const config = shopifyConfig();
  if (!config) return NextResponse.json({ error: "Not configured" }, { status: 503 });

  const raw = await request.text();
  if (!verifyWebhookHmac(raw, request.headers.get("x-shopify-hmac-sha256"), config.apiSecret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const topic = request.headers.get("x-shopify-topic");
  const shop = request.headers.get("x-shopify-shop-domain")?.toLowerCase() ?? "";
  if (!isShopDomain(shop)) return NextResponse.json({ ok: true });

  let payload: Record<string, unknown> = {};
  try {
    const parsed: unknown = JSON.parse(raw || "{}");
    if (parsed && typeof parsed === "object") payload = parsed as Record<string, unknown>;
  } catch {
    payload = {};
  }

  try {
    const theme = themeTopic(topic);
    if (theme) {
      await handleThemeWebhook({
        shop,
        topic: theme,
        webhookId: request.headers.get("x-shopify-webhook-id"),
        payload,
      });
    } else if (topic === "app/uninstalled") {
      await handleUninstall(shop);
    } else if (topic === "shop/redact") {
      await handleShopRedact(shop);
    } else if (topic === "customers/data_request" || topic === "customers/redact") {
      // MyKavo stores no customer data from Shopify - nothing to return or erase.
      logger.info("shopify privacy request (no customer data held)", { shop, topic });
    }
  } catch (err) {
    logger.error("shopify webhook failed", { shop, topic }, err);
    // 500 so Shopify retries later.
    return NextResponse.json({ error: "Temporary failure" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
