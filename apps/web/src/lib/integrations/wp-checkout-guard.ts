/**
 * WooCommerce checkout guard (conversionElementMonitoring: Pro, Agency):
 * the plugin names the store's cart, checkout and a product page, and MyKavo
 * monitors each with the button that matters on it. Pure; unit-tested.
 */

import { z } from "zod";
import { planPageAdditions } from "@/lib/integrations/wp-pages";

export type GuardKind = "checkout" | "cart" | "product";

export interface GuardElement {
  name: string;
  selector: string;
  importance: "CRITICAL" | "IMPORTANT";
}

/** The page name used when the guard adds the page, and the element on it. */
export const GUARD_DEFINITIONS: Record<GuardKind, { pageName: string; element: GuardElement }> = {
  checkout: {
    pageName: "Checkout",
    element: {
      name: "Place order button",
      selector: "#place_order, .wc-block-components-checkout-place-order-button",
      importance: "CRITICAL",
    },
  },
  cart: {
    pageName: "Cart",
    element: {
      name: "Proceed to checkout button",
      selector: ".checkout-button, .wc-block-cart__submit-button",
      importance: "IMPORTANT",
    },
  },
  product: {
    pageName: "Product",
    element: {
      name: "Add to cart button",
      selector: ".single_add_to_cart_button",
      importance: "CRITICAL",
    },
  },
};

const url = z.string().trim().min(1).max(2048);

export const checkoutGuardSchema = z
  .object({ cartUrl: url.optional(), checkoutUrl: url.optional(), productUrl: url.optional() })
  .refine((b) => Boolean(b.cartUrl || b.checkoutUrl || b.productUrl), "Name at least one page.");

export interface GuardTarget {
  kind: GuardKind;
  url: string;
  normalizedUrl: string;
  pageName: string;
  element: GuardElement;
}

export type GuardPlan = { ok: true; targets: GuardTarget[] } | { ok: false; error: string };

/**
 * The pages to guard, each on the website's own origin (the same rules as
 * "Monitor with MyKavo"). Two kinds naming one page keep both elements.
 */
export function planCheckoutGuard(input: z.infer<typeof checkoutGuardSchema>, websiteUrl: string): GuardPlan {
  const requested: Array<[GuardKind, string | undefined]> = [
    ["checkout", input.checkoutUrl],
    ["cart", input.cartUrl],
    ["product", input.productUrl],
  ];
  const targets: GuardTarget[] = [];
  for (const [kind, pageUrl] of requested) {
    if (!pageUrl) continue;
    const def = GUARD_DEFINITIONS[kind];
    const plan = planPageAdditions([{ url: pageUrl, name: def.pageName }], websiteUrl, []);
    if (!plan.ok) return plan;
    const page = plan.fresh[0];
    if (!page) return { ok: false, error: "Invalid page." };
    targets.push({ kind, url: page.url, normalizedUrl: page.normalizedUrl, pageName: def.pageName, element: def.element });
  }
  return { ok: true, targets };
}
