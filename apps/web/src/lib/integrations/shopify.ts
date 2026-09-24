/**
 * Pure building blocks for the MyKavo Shopify app. No database or Next.js
 * imports - everything here is unit-tested.
 *
 * How the app fits together:
 *
 *   - It is an EMBEDDED app: Shopify loads https://mykavo.app/shopify inside
 *     the Shopify admin. App Bridge gives that page a short-lived session
 *     token (a JWT signed with our client secret) and adds it to every fetch
 *     the page makes to mykavo.app.
 *   - Install is Shopify-managed. The first time a store opens the app, the
 *     server trades the session token for an offline Admin API token (token
 *     exchange) - no redirect dance, no install URL.
 *   - A store is LINKED to one MyKavo website by a member approving on
 *     mykavo.app (/connect/shopify), exactly like the WordPress plugin. The
 *     link is a site_connection row, so every /api/wp/v1 route serves the
 *     Shopify app unchanged: site-auth accepts either kind of credential.
 *   - Theme publishes and edits arrive as webhooks and start a deploy check,
 *     the Shopify version of Safe Updates.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

/** Admin API version for GraphQL calls. Shopify supports each for a year. */
export const SHOPIFY_API_VERSION = "2026-07";

/**
 * Access the app asks for. Theme webhooks need read_themes; nothing else is
 * read from the store - pages are discovered from the public storefront.
 */
export const SHOPIFY_SCOPES = "read_themes";

/** The link from the embedded app to mykavo.app's consent page. */
export const LINK_TTL_MS = 60 * 60 * 1000;

/** Theme edits arrive in bursts (every customizer save); check at most this often. */
export const THEME_EDIT_THROTTLE_MS = 15 * 60 * 1000;

/** Session tokens live one minute; allow a little clock skew either side. */
const CLOCK_SKEW_S = 10;

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

/** A store's permanent domain: lowercase-name.myshopify.com, nothing else. */
export function isShopDomain(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length <= 120 &&
    /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(value)
  );
}

/** "acme.myshopify.com" -> "acme", as used in admin.shopify.com/store/<handle>. */
export function storeHandle(shop: string): string {
  return shop.replace(/\.myshopify\.com$/, "");
}

/** The app inside the store's admin - where "back to Shopify" should go. */
export function adminAppUrl(shop: string, apiKey: string): string {
  return `https://admin.shopify.com/store/${storeHandle(shop)}/apps/${apiKey}`;
}

/* ----------------------------- session tokens ---------------------------- */

export interface SessionClaims {
  shop: string;
  /** The Shopify staff member using the admin, when present. */
  userId: string | null;
}

function b64urlJson(part: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(Buffer.from(part, "base64url").toString("utf8"));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

/** Cheap shape test so callers can route a bearer credential without verifying it. */
export function looksLikeJwt(token: string): boolean {
  return /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token) && token.length < 4096;
}

/**
 * Verify an App Bridge session token: HS256 over our client secret, issued
 * for our app (aud), for a *.myshopify.com store (dest, matching iss), and
 * inside its one-minute life. Returns the store, or null for anything off.
 */
export function verifySessionToken(
  token: string,
  opts: { apiKey: string; apiSecret: string; nowMs?: number },
): SessionClaims | null {
  if (!looksLikeJwt(token)) return null;
  const [headerPart, payloadPart, signature] = token.split(".") as [string, string, string];

  const header = b64urlJson(headerPart);
  if (!header || header.alg !== "HS256") return null;

  const expected = createHmac("sha256", opts.apiSecret)
    .update(`${headerPart}.${payloadPart}`)
    .digest("base64url");
  if (!safeEqual(expected, signature)) return null;

  const claims = b64urlJson(payloadPart);
  if (!claims) return null;

  const now = Math.floor((opts.nowMs ?? Date.now()) / 1000);
  if (typeof claims.exp !== "number" || claims.exp + CLOCK_SKEW_S < now) return null;
  if (typeof claims.nbf === "number" && claims.nbf - CLOCK_SKEW_S > now) return null;

  const aud = claims.aud;
  const audOk = Array.isArray(aud) ? aud.includes(opts.apiKey) : aud === opts.apiKey;
  if (!audOk) return null;

  let shop: string;
  try {
    const dest = new URL(String(claims.dest));
    if (dest.protocol !== "https:") return null;
    shop = dest.hostname;
  } catch {
    return null;
  }
  if (!isShopDomain(shop)) return null;
  // iss is the same store's admin; a token minted for one store must not
  // claim another.
  if (typeof claims.iss === "string") {
    try {
      if (new URL(claims.iss).hostname !== shop) return null;
    } catch {
      return null;
    }
  }

  return { shop, userId: typeof claims.sub === "string" ? claims.sub : null };
}

/* -------------------------------- webhooks ------------------------------- */

/** X-Shopify-Hmac-Sha256: base64 HMAC-SHA256 of the raw body with the client secret. */
export function verifyWebhookHmac(rawBody: string, header: string | null, apiSecret: string): boolean {
  if (!header) return false;
  const expected = createHmac("sha256", apiSecret).update(rawBody, "utf8").digest("base64");
  return safeEqual(expected, header.trim());
}

/* ------------------------------- link token ------------------------------ */

/**
 * The embedded app sends the merchant to mykavo.app with this token to link
 * the store. It proves which store asked (the app verified the session
 * token), so the consent page never trusts a shop name from the URL.
 */
export function signLinkToken(shop: string, secret: string, nowMs = Date.now()): string {
  const payload = Buffer.from(JSON.stringify({ s: shop, e: nowMs + LINK_TTL_MS })).toString("base64url");
  const sig = createHmac("sha256", secret).update(`shopify-link.${payload}`).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifyLinkToken(token: string | null | undefined, secret: string, nowMs = Date.now()): string | null {
  if (!token || token.length > 600) return null;
  const [payload, sig, extra] = token.split(".");
  if (!payload || !sig || extra !== undefined) return null;
  const expected = createHmac("sha256", secret).update(`shopify-link.${payload}`).digest("base64url");
  if (!safeEqual(expected, sig)) return null;
  const data = b64urlJson(payload);
  if (!data || typeof data.e !== "number" || data.e < nowMs) return null;
  return isShopDomain(data.s) ? data.s : null;
}

/* ----------------------------- theme checks ------------------------------ */

export type ThemeTopic = "publish" | "update";

export function themeTopic(webhookTopic: string | null): ThemeTopic | null {
  if (webhookTopic === "themes/publish") return "publish";
  if (webhookTopic === "themes/update") return "update";
  return null;
}

/** "Published theme Dawn" / "Edited theme Dawn" - shown in scan history and the verdict. */
export function themeNote(topic: ThemeTopic, themeName: string): string {
  const name = themeName.trim().slice(0, 100) || "Untitled theme";
  return topic === "publish" ? `Published theme ${name}` : `Edited theme ${name}`;
}

export type ThemeDecision = { check: true } | { check: false; reason: "IGNORED" | "OFF" | "NOT_CONNECTED" | "THROTTLED" };

/**
 * Whether a theme webhook should start a check. Only the LIVE theme
 * matters: editing a draft theme changes nothing customers see. A publish
 * always checks; edits are throttled because the customizer saves often.
 */
export function decideThemeCheck(input: {
  topic: ThemeTopic;
  role: unknown;
  themeChecks: boolean;
  connected: boolean;
  lastThemeCheckAt: Date | null;
  nowMs?: number;
}): ThemeDecision {
  if (input.role !== "main") return { check: false, reason: "IGNORED" };
  if (!input.connected) return { check: false, reason: "NOT_CONNECTED" };
  if (!input.themeChecks) return { check: false, reason: "OFF" };
  if (input.topic === "update" && input.lastThemeCheckAt) {
    const since = (input.nowMs ?? Date.now()) - input.lastThemeCheckAt.getTime();
    if (since < THEME_EDIT_THROTTLE_MS) return { check: false, reason: "THROTTLED" };
  }
  return { check: true };
}

/**
 * The storefront pages a store guard offers to monitor, on the store's
 * customer-facing domain. Checkout is Shopify-hosted and not scanned.
 */
export function storePages(primaryDomain: string): Array<{ key: string; label: string; url: string }> {
  const base = primaryDomain.replace(/\/+$/, "");
  return [
    { key: "home", label: "Home page", url: `${base}/` },
    { key: "catalog", label: "All products", url: `${base}/collections/all` },
    { key: "cart", label: "Cart", url: `${base}/cart` },
    { key: "search", label: "Search", url: `${base}/search` },
  ];
}
