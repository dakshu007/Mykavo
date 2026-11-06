import { describe, expect, it } from "vitest";
import { isWordpressTopic, looksLikeWordpress } from "./wordpress-topic";

describe("isWordpressTopic", () => {
  it("matches WordPress and WooCommerce posts", () => {
    expect(isWordpressTopic("how-to-safely-update-wordpress-plugins")).toBe(true);
    expect(isWordpressTopic("x", "WooCommerce checkout broke")).toBe(true);
    expect(isWordpressTopic(null, undefined, ["seo", "WP"])).toBe(true);
  });
  it("ignores other topics", () => {
    expect(isWordpressTopic("supabase-free-tier-limits", "Supabase free tier limits", null, ["database"])).toBe(false);
    expect(isWordpressTopic("seo-monitoring-tools")).toBe(false);
  });
});

describe("looksLikeWordpress", () => {
  it("spots wp-content and wp-includes scripts", () => {
    expect(looksLikeWordpress(["https://a.com/wp-includes/js/jquery/jquery.min.js"])).toBe(true);
    expect(looksLikeWordpress(["https://a.com/wp-content/plugins/x/app.js"])).toBe(true);
  });
  it("is false for other stacks", () => {
    expect(looksLikeWordpress(["https://cdn.shopify.com/s/files/app.js", "https://www.googletagmanager.com/gtm.js"])).toBe(false);
  });
});
