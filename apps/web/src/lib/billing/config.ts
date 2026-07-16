/**
 * Dodo Payments configuration (Phase 8). All secrets are server-side only.
 * The paid product defaults to the user's Pro product; every value is
 * overridable by env so test/live and product changes need no code edit.
 */

import { site } from "@/config/site";

/** The $20 Pro product id in Dodo (test-mode product; override for live). */
export const DODO_PRODUCT_ID =
  process.env.DODO_PRODUCT_ID ?? "pdt_0NjKW2inGBlQ6ycRtvnMd";

/**
 * The $6/mo website add-on product id in Dodo (each purchased unit = +30
 * websites). Unset until the product is created — add-on purchase stays hidden
 * until then. Create a recurring $6/mo product in Dodo and set its id here.
 */
export const DODO_ADDON_PRODUCT_ID = process.env.DODO_ADDON_PRODUCT_ID ?? "";

/** Whether the website add-on can be purchased (its product is configured). */
export const websiteAddonEnabled = Boolean(DODO_ADDON_PRODUCT_ID);

export const DODO_WEBHOOK_SECRET = process.env.DODO_WEBHOOK_SECRET ?? "";
export const DODO_API_KEY = process.env.DODO_API_KEY ?? "";
export const DODO_MODE = process.env.DODO_MODE === "live" ? "live" : "test";

// Hosted checkout host follows the mode — test products only resolve on the
// test host and vice versa.
const CHECKOUT_BASE =
  process.env.DODO_CHECKOUT_BASE ??
  (DODO_MODE === "live"
    ? "https://checkout.dodopayments.com/buy"
    : "https://test.checkout.dodopayments.com/buy");

/** Whether the checkout button can be shown (product configured). */
export const billingEnabled = Boolean(DODO_PRODUCT_ID);

/** REST API base for the active mode (test vs live). */
export function dodoApiBase(): string {
  return DODO_MODE === "live"
    ? "https://live.dodopayments.com"
    : "https://test.dodopayments.com";
}

const appUrl = process.env.APP_URL ?? process.env.BETTER_AUTH_URL ?? site.url;

/**
 * Build a Dodo static-checkout URL for a product. Attribution rides on an
 * UNGUESSABLE, server-issued `checkoutToken` (not a client-editable workspace
 * id) so a buyer cannot redirect a payment to a workspace they don't own — the
 * webhook resolves the token back to a workspace it recorded, and reads the
 * purchase `kind` from that server-issued intent (never from metadata). Static
 * links use `metadata_<key>` and `redirect_url` (research §4). `metadata_kind`
 * is informational only. Null when the product is unconfigured.
 */
function buildProductCheckoutUrl(
  productId: string,
  params: { checkoutToken: string; email: string; kind: string },
): string | null {
  if (!productId) return null;
  const url = new URL(`${CHECKOUT_BASE}/${productId}`);
  url.searchParams.set("quantity", "1");
  url.searchParams.set("email", params.email);
  url.searchParams.set("metadata_checkoutToken", params.checkoutToken);
  url.searchParams.set("metadata_kind", params.kind);
  url.searchParams.set("redirect_url", `${appUrl}/dashboard/billing?checkout=success`);
  return url.toString();
}

/** Checkout URL for the $20 Pro base plan. */
export function buildCheckoutUrl(params: {
  checkoutToken: string;
  email: string;
}): string | null {
  return buildProductCheckoutUrl(DODO_PRODUCT_ID, { ...params, kind: "pro" });
}

/** Checkout URL for a $6/mo website add-on (+30 websites). */
export function buildAddonCheckoutUrl(params: {
  checkoutToken: string;
  email: string;
}): string | null {
  return buildProductCheckoutUrl(DODO_ADDON_PRODUCT_ID, {
    ...params,
    kind: "website_addon",
  });
}
