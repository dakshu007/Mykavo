/**
 * MyKavo for Shopify, as the marketing site describes it. The app itself is
 * served from /shopify (see docs/SHOPIFY_APP.md).
 */

/** The marketing page. */
export const SHOPIFY_APP_PAGE_PATH = "/shopify-app";

/**
 * The Shopify App Store listing, once Shopify has approved it. While it is
 * null the page says the listing is on its way and points merchants at the
 * web dashboard instead.
 */
export const SHOPIFY_APP_STORE_URL: string | null = null;

/** Access the app asks for when it is installed. */
export const SHOPIFY_APP_SCOPES = ["read_themes"] as const;
