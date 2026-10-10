import { attr } from "./html";
import { humanizeSlug } from "./wordpress-detect";

/**
 * Shopify theme & app detection from a storefront page's delivered HTML.
 *
 * What a Shopify storefront reveals from outside:
 *  - `Shopify.theme = {...}` - the theme's name as the merchant renamed it,
 *    plus `schema_name` / `schema_version` (the original theme and its
 *    version) and `theme_store_id` (set only for Theme Store themes).
 *  - `Shopify.shop` - the store's permanent *.myshopify.com address.
 *  - Asset URLs on cdn.shopify.com or the store's own /cdn/shop/ path.
 *  - Apps: theme app extensions load from
 *    cdn.shopify.com/extensions/<uuid>/<app-handle>-<version>/, and older
 *    script-tag apps load from their own domains.
 * Only apps that load something on the page checked can be seen. Backend apps
 * (inventory, reporting, fulfilment) never touch the storefront.
 */

export interface ShopifyTheme {
  /** The name in the merchant's theme library (may be renamed). */
  name: string | null;
  /** The theme it was built from, e.g. "Dawn", even if renamed. */
  schemaName: string | null;
  schemaVersion: string | null;
  /** Set only for themes from the Shopify Theme Store. */
  themeStoreId: number | null;
  /** "main" for the published theme. */
  role: string | null;
}

export interface ShopifyApp {
  name: string;
  /** How we know: a theme app extension, or a script/stylesheet from the app's domain. */
  evidence: "app extension" | "app asset";
  /** The extension handle or the domain the asset came from. */
  source: string;
}

export interface ShopifyReport {
  url: string;
  finalUrl: string;
  httpStatus: number;
  isShopify: boolean;
  signals: string[];
  /** The store's *.myshopify.com address, when the page exposes it. */
  shop: string | null;
  theme: ShopifyTheme | null;
  /** true: Theme Store theme. false: custom or outside-the-store theme. null: unknown. */
  fromThemeStore: boolean | null;
  /** The storefront redirected to its password page. */
  passwordProtected: boolean;
  apps: ShopifyApp[];
}

/** Known apps, tested against extension handles and asset URLs. Keep specific before broad. */
const KNOWN_APPS: ReadonlyArray<readonly [RegExp, string]> = [
  [/klaviyo/i, "Klaviyo"],
  [/judge\.?me/i, "Judge.me"],
  [/yotpo/i, "Yotpo"],
  [/loox/i, "Loox"],
  [/okendo/i, "Okendo"],
  [/stamped\.io|stamped-?reviews/i, "Stamped"],
  [/privy/i, "Privy"],
  [/recharge(?:cdn|apps|payments)?|rechargecdn/i, "Recharge"],
  [/gorgias/i, "Gorgias"],
  [/tidio/i, "Tidio"],
  [/omnisend|omnisnippet/i, "Omnisend"],
  [/pagefly/i, "PageFly"],
  [/gempages|gem-page/i, "GemPages"],
  [/getshogun|shogun-?(?:page|frontend)/i, "Shogun"],
  [/boldapps|boldcommerce|bold-?(?:subscriptions|options|upsell)/i, "Bold"],
  [/afterpay/i, "Afterpay"],
  [/klarna/i, "Klarna"],
  [/hotjar/i, "Hotjar"],
  [/attn\.tv|attentive/i, "Attentive"],
  [/postscript/i, "Postscript"],
  [/smile\.io|smile-?(?:loyalty|ui)/i, "Smile.io"],
  [/loyaltylion/i, "LoyaltyLion"],
  [/rebuyengine|rebuy-/i, "Rebuy"],
  [/searchanise/i, "Searchanise"],
  [/boostcommerce|bc-sf-filter|boost-(?:pfs|sd)/i, "Boost AI Search & Filter"],
  [/zipify/i, "Zipify"],
  [/sezzle/i, "Sezzle"],
  [/swym/i, "Swym Wishlist Plus"],
  [/aftership/i, "AfterShip"],
  [/routeapp|route-(?:widget|protection)/i, "Route"],
  [/elfsight/i, "Elfsight"],
  [/luckyorange/i, "Lucky Orange"],
  [/intercom(?:cdn)?\./i, "Intercom"],
  [/zdassets|zopim/i, "Zendesk"],
  [/chimpstatic|mailchimp/i, "Mailchimp"],
  [/sealsubscriptions/i, "Seal Subscriptions"],
  [/appstle/i, "Appstle"],
  [/weglot/i, "Weglot"],
  [/langify/i, "Langify"],
  [/growave|socialshopwave/i, "Growave"],
  [/reviews\.io/i, "REVIEWS.io"],
  [/trustpilot/i, "Trustpilot"],
  [/instafeed/i, "Instafeed"],
  [/tapcart/i, "Tapcart"],
];

export function knownAppName(text: string): string | null {
  return KNOWN_APPS.find(([pattern]) => pattern.test(text))?.[1] ?? null;
}

/** Inline JS escapes slashes in URLs ("https:\/\/..."); undo that before matching. */
const unescapeSlashes = (s: string) => s.replace(/\\\//g, "/");

/**
 * Read the `{...}` object that starts at `from`, honouring strings so a brace
 * inside a theme name doesn't end it early. Returns null when unbalanced.
 */
export function readBalancedObject(text: string, from: number): string | null {
  if (text[from] !== "{") return null;
  let depth = 0;
  let inString: string | null = null;
  const end = Math.min(text.length, from + 20_000);
  for (let i = from; i < end; i++) {
    const ch = text[i];
    if (inString) {
      if (ch === "\\") i++;
      else if (ch === inString) inString = null;
      continue;
    }
    if (ch === '"' || ch === "'") inString = ch;
    else if (ch === "{") depth++;
    else if (ch === "}" && --depth === 0) return text.slice(from, i + 1);
  }
  return null;
}

const str = (v: unknown, max = 120): string | null =>
  typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;

/** Parse the `Shopify.theme = {...}` object. */
export function parseThemeObject(html: string): ShopifyTheme | null {
  const m = /Shopify\.theme\s*=\s*\{/.exec(html);
  if (!m) return null;
  const raw = readBalancedObject(html, m.index + m[0].length - 1);
  if (!raw) return null;
  try {
    const obj = JSON.parse(raw) as Record<string, unknown>;
    const storeId = obj.theme_store_id;
    const theme: ShopifyTheme = {
      name: str(obj.name),
      schemaName: str(obj.schema_name),
      schemaVersion: str(obj.schema_version, 40),
      themeStoreId: typeof storeId === "number" && Number.isInteger(storeId) && storeId > 0 ? storeId : null,
      role: str(obj.role, 40),
    };
    return theme.name || theme.schemaName ? theme : null;
  } catch {
    return null;
  }
}

/** Shopify's performance beacon also names the theme; used when the object is missing. */
export function parseBoomrTheme(html: string): ShopifyTheme | null {
  const name = /BOOMR\.themeName\s*=\s*"([^"]{1,120})"/.exec(html)?.[1] ?? null;
  if (!name) return null;
  const version = /BOOMR\.themeVersion\s*=\s*"([^"]{1,40})"/.exec(html)?.[1] ?? null;
  return { name, schemaName: name, schemaVersion: version, themeStoreId: null, role: null };
}

export function detectShopifySignals(html: string): { signals: string[]; shop: string | null } {
  const signals: string[] = [];
  const shopMatch = /Shopify\.shop\s*=\s*["']([a-z0-9][a-z0-9-]{0,62}\.myshopify\.com)["']/i.exec(html);
  const shop = shopMatch ? shopMatch[1].toLowerCase() : null;
  if (/Shopify\.theme\s*=/.test(html)) signals.push("Shopify.theme object");
  if (shop) signals.push("myshopify.com store address");
  if (/cdn\.shopify\.com\//i.test(html)) signals.push("cdn.shopify.com assets");
  if (/["'(]\/cdn\/shop\//i.test(html) || /\/\/[^/"'\s]+\/cdn\/shop\//i.test(html)) signals.push("/cdn/shop/ asset paths");
  const metaNames = (html.match(/<meta\b[^>]*>/gi) ?? []).map((t) => attr(t, "name")?.toLowerCase());
  if (metaNames.includes("shopify-checkout-api-token")) signals.push("Shopify checkout meta tag");
  if (metaNames.includes("shopify-digital-wallet")) signals.push("Shopify digital wallet meta tag");
  if (/ShopifyAnalytics\s*=|window\.ShopifyAnalytics/.test(html)) signals.push("ShopifyAnalytics script");
  return { signals, shop };
}

/** Every resource URL the page loads: script src, link href, and URLs inside inline scripts. */
function resourceUrls(html: string): string[] {
  const urls: string[] = [];
  for (const m of html.matchAll(/<(script|link)\b[^>]*>/gi)) {
    const value = attr(m[0], m[1].toLowerCase() === "script" ? "src" : "href");
    if (value) urls.push(value);
  }
  for (const m of html.matchAll(/<script\b(?![^>]*\bsrc\s*=)[^>]*>([\s\S]*?)<\/script\s*>/gi)) {
    for (const u of unescapeSlashes(m[1]).matchAll(/(?:https?:)?\/\/[a-z0-9.-]+\.[a-z]{2,}[^\s"'<>`)]*/gi)) urls.push(u[0]);
  }
  return urls;
}

const EXTENSION_RE = /\/extensions\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/([a-z0-9][a-z0-9_-]{0,80}?)(?:-\d+(?:\.\d+)*)?\//gi;

/** Hosts that belong to Shopify or common CDNs, never an app. */
const PLATFORM_HOST = /(?:^|\.)(?:shopify\.com|shopifycdn\.net|shopifysvc\.com|shopifycloud\.com|myshopify\.com|shop\.app|googleapis\.com|gstatic\.com|cloudflare\.com|jsdelivr\.net|unpkg\.com|jquery\.com)$/i;

export function detectShopifyApps(html: string, pageUrl: string): ShopifyApp[] {
  const found = new Map<string, ShopifyApp>();
  let storeHost = "";
  try {
    storeHost = new URL(pageUrl).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    storeHost = "";
  }
  const text = unescapeSlashes(html);

  for (const m of text.matchAll(EXTENSION_RE)) {
    const handle = m[1].toLowerCase();
    const name = knownAppName(handle) ?? humanizeSlug(handle);
    if (!found.has(name)) found.set(name, { name, evidence: "app extension", source: handle });
  }

  for (const raw of resourceUrls(html)) {
    let host: string;
    let path: string;
    try {
      const u = new URL(raw, pageUrl);
      host = u.hostname.toLowerCase();
      path = u.pathname;
    } catch {
      continue;
    }
    // Extensions are handled above; storefront paths only count for /apps/ proxies.
    const isStore = host.replace(/^www\./, "") === storeHost || PLATFORM_HOST.test(host);
    const haystack = isStore ? (path.startsWith("/apps/") ? path : "") : `${host}${path}`;
    if (!haystack || /\/extensions\//.test(path)) continue;
    const name = knownAppName(haystack);
    if (name && !found.has(name)) found.set(name, { name, evidence: "app asset", source: isStore ? path.slice(0, 80) : host });
  }

  return [...found.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function analyzeShopify(html: string, finalUrl: string): Omit<ShopifyReport, "url" | "finalUrl" | "httpStatus"> {
  const { signals, shop } = detectShopifySignals(html);
  const themeObject = parseThemeObject(html);
  const theme = themeObject ?? parseBoomrTheme(html);
  let passwordProtected = false;
  try {
    passwordProtected = new URL(finalUrl).pathname.replace(/\/+$/, "") === "/password";
  } catch {
    passwordProtected = false;
  }
  return {
    isShopify: signals.length > 0,
    signals,
    shop,
    theme,
    fromThemeStore: themeObject ? themeObject.themeStoreId !== null : null,
    passwordProtected,
    apps: detectShopifyApps(html, finalUrl),
  };
}
