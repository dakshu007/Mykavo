import { describe, expect, it } from "vitest";
import { normalizeUrl } from "@/lib/url";
import { GUARD_DEFINITIONS, checkoutGuardSchema, planCheckoutGuard } from "./wp-checkout-guard";

const SITE = "https://shop.example.com/";

describe("planCheckoutGuard", () => {
  it("guards each named page with its button", () => {
    const plan = planCheckoutGuard(
      { checkoutUrl: "https://shop.example.com/checkout/", cartUrl: "http://www.shop.example.com/cart/" },
      SITE,
    );
    if (!plan.ok) throw new Error(plan.error);
    expect(plan.targets.map((t) => [t.kind, t.url, t.element.importance])).toEqual([
      ["checkout", "https://shop.example.com/checkout/", "CRITICAL"],
      ["cart", "https://shop.example.com/cart/", "IMPORTANT"],
    ]);
    expect(plan.targets[0]!.normalizedUrl).toBe(normalizeUrl(new URL("https://shop.example.com/checkout/")));
  });

  it("refuses pages on another site", () => {
    expect(planCheckoutGuard({ productUrl: "https://evil.test/product/x/" }, SITE).ok).toBe(false);
  });

  it("uses the agreed WooCommerce selectors", () => {
    expect(GUARD_DEFINITIONS.checkout.element.selector).toBe(
      "#place_order, .wc-block-components-checkout-place-order-button",
    );
    expect(GUARD_DEFINITIONS.cart.element.selector).toBe(".checkout-button, .wc-block-cart__submit-button");
    expect(GUARD_DEFINITIONS.product.element).toEqual({
      name: "Add to cart button",
      selector: ".single_add_to_cart_button",
      importance: "CRITICAL",
    });
  });

  it("needs at least one page", () => {
    expect(checkoutGuardSchema.safeParse({}).success).toBe(false);
    expect(checkoutGuardSchema.safeParse({ cartUrl: "https://shop.example.com/cart/" }).success).toBe(true);
  });
});
