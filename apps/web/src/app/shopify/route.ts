import { adminAppUrl, isShopDomain } from "@/lib/integrations/shopify";
import { shopifyConfig } from "@/lib/integrations/shopify-server";

/**
 * The embedded app's page - what Shopify loads inside the admin (the App URL
 * in the Dev Dashboard). A plain HTML shell: App Bridge must be the first
 * script in <head> as a classic script, which a Next.js page cannot promise,
 * and the screen itself is the same vanilla JS the WordPress plugin uses
 * (public/shopify-app), talking to the same site API.
 *
 * Framing: only this store's admin may frame the page. next.config.ts
 * leaves /shopify out of the site-wide X-Frame-Options: SAMEORIGIN.
 */

const ASSET_VERSION = "2";

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

export function GET(request: Request) {
  const config = shopifyConfig();
  const shopParam = new URL(request.url).searchParams.get("shop")?.toLowerCase() ?? "";
  const shop = isShopDomain(shopParam) ? shopParam : null;
  const frameAncestors = shop
    ? `https://${shop} https://admin.shopify.com`
    : "https://*.myshopify.com https://admin.shopify.com";

  const body = config
    ? `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="shopify-api-key" content="${escapeHtml(config.apiKey)}">
<script src="https://cdn.shopify.com/shopifycloud/app-bridge.js"></script>
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>MyKavo</title>
<link rel="stylesheet" href="/shopify-app/app.css?v=${ASSET_VERSION}">
</head>
<body>
<div class="mykavo-wrap"><div id="mykavo-app" class="mk" aria-live="polite"${shop ? ` data-admin-url="${escapeHtml(adminAppUrl(shop, config.apiKey))}"` : ""}><div class="mk-boot" role="status">Loading MyKavo...</div></div></div>
<script src="/shopify-app/bootstrap.js?v=${ASSET_VERSION}"></script>
</body>
</html>`
    : `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>MyKavo</title></head>
<body style="font-family:system-ui,sans-serif;padding:40px;color:#151515">
<h1 style="font-size:20px">MyKavo for Shopify is not set up yet.</h1>
<p>Please try again later.</p></body></html>`;

  return new Response(body, {
    status: config ? 200 : 503,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "content-security-policy": `frame-ancestors ${frameAncestors};`,
      "x-content-type-options": "nosniff",
      "referrer-policy": "strict-origin-when-cross-origin",
      "strict-transport-security": "max-age=63072000; includeSubDomains",
      "x-robots-tag": "noindex",
    },
  });
}
