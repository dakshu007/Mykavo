/**
 * Dodo Payments configuration (Phase 8). All secrets are server-side only.
 * The paid product defaults to the user's Pro product; every value is
 * overridable by env so test/live and product changes need no code edit.
 */

import { site } from "@/config/site";

/** The $12 Pro product id in Dodo. */
export const DODO_PRODUCT_ID =
  process.env.DODO_PRODUCT_ID ?? "pdt_0Niiijjb1NtzJsNQpp0iD";

const CHECKOUT_BASE =
  process.env.DODO_CHECKOUT_BASE ?? "https://checkout.dodopayments.com/buy";

export const DODO_WEBHOOK_SECRET = process.env.DODO_WEBHOOK_SECRET ?? "";
export const DODO_API_KEY = process.env.DODO_API_KEY ?? "";
export const DODO_MODE = process.env.DODO_MODE === "live" ? "live" : "test";

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
 * Build a Dodo static-checkout URL. Attribution rides on an UNGUESSABLE,
 * server-issued `checkoutToken` (not a client-editable workspace id) so a
 * buyer cannot redirect a payment to a workspace they don't own — the webhook
 * resolves the token back to a workspace it recorded. Static links use
 * `metadata_<key>` and `redirect_url` (research §4). Null when unconfigured.
 */
export function buildCheckoutUrl(params: {
  checkoutToken: string;
  email: string;
}): string | null {
  if (!DODO_PRODUCT_ID) return null;
  const url = new URL(`${CHECKOUT_BASE}/${DODO_PRODUCT_ID}`);
  url.searchParams.set("quantity", "1");
  url.searchParams.set("email", params.email);
  url.searchParams.set("metadata_checkoutToken", params.checkoutToken);
  url.searchParams.set("metadata_plan", "pro");
  url.searchParams.set("redirect_url", `${appUrl}/dashboard/billing?checkout=success`);
  return url.toString();
}
