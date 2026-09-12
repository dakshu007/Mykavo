import { describe, expect, it } from "vitest";
import {
  detectTechnologies,
  mergeTechnologies,
  parseTechnologies,
  PROBED_GLOBALS,
  PROBED_SELECTORS,
} from "./tech-stack";

const slugs = (input: Parameters<typeof detectTechnologies>[0]) =>
  detectTechnologies(input).map((t) => t.slug);

describe("detectTechnologies", () => {
  it("identifies a Next.js site on Vercel with Google Analytics", () => {
    const found = detectTechnologies({
      assetUrls: [
        "https://example.com/_next/static/chunks/main-abc.js",
        "https://www.googletagmanager.com/gtag/js?id=G-XXXX",
        "https://fonts.googleapis.com/css2?family=Inter",
      ],
      globals: ["__NEXT_DATA__"],
      selectors: ["#__next"],
      headers: { "x-vercel-id": "bom1::abcd", "content-type": "text/html" },
    });
    expect(found.map((t) => t.slug)).toEqual([
      "nextjs",
      "vercel",
      "google-analytics",
      "google-fonts",
    ]);
  });

  it("identifies a WordPress shop with the usual marketing stack", () => {
    expect(
      slugs({
        assetUrls: [
          "https://shop.test/wp-content/plugins/woocommerce/assets/js/frontend.js?ver=8.5.1",
          "https://www.googletagmanager.com/gtm.js?id=GTM-XXXX",
          "https://connect.facebook.net/en_US/fbevents.js",
          "https://js.stripe.com/v3/",
          "https://static.hotjar.com/c/hotjar-123.js",
        ],
        generators: ["WordPress 6.4.2", "WooCommerce 8.5.1"],
      }),
    ).toEqual([
      "wordpress",
      "woocommerce",
      "google-tag-manager",
      "hotjar",
      "meta-pixel",
      "stripe",
    ]);
  });

  it("identifies Shopify from its CDN and its global", () => {
    expect(slugs({ assetUrls: ["https://cdn.shopify.com/s/files/1/theme.js"] })).toEqual([
      "shopify",
    ]);
    expect(slugs({ globals: ["Shopify"] })).toEqual(["shopify"]);
  });

  it("identifies Webflow from the attribute it stamps on <html>", () => {
    expect(slugs({ selectors: ["html[data-wf-page]"] })).toEqual(["webflow"]);
  });

  it("reads a version when the site declares one", () => {
    const found = detectTechnologies({ generators: ["WooCommerce 8.5.1"] });
    expect(found[0]).toMatchObject({ slug: "woocommerce", version: "8.5.1" });
  });

  it("refuses a build stamp posing as a version", () => {
    const found = detectTechnologies({ generators: ["WooCommerce 20240115"] });
    expect(found[0]).toMatchObject({ slug: "woocommerce", version: null });
  });

  it("records readable evidence for every detection", () => {
    const found = detectTechnologies({
      assetUrls: ["https://js.stripe.com/v3/"],
      headers: { "cf-ray": "abc-BOM" },
    });
    expect(found.find((t) => t.slug === "stripe")?.evidence).toBe("asset: js.stripe.com");
    expect(found.find((t) => t.slug === "cloudflare")?.evidence).toBe("header cf-ray");
  });

  it("finds nothing on a page with no recognisable signal", () => {
    expect(
      slugs({
        assetUrls: ["https://example.com/static/app.js", "https://example.com/style.css"],
        generators: ["Some Unknown Builder"],
        headers: { server: "nginx" },
      }),
    ).toEqual([]);
  });

  it("is order-independent and produces a stable list", () => {
    const a = slugs({ assetUrls: ["https://js.stripe.com/v3/", "https://static.hotjar.com/x.js"] });
    const b = slugs({ assetUrls: ["https://static.hotjar.com/x.js", "https://js.stripe.com/v3/"] });
    expect(a).toEqual(b);
  });

  it("does not confuse Cloudflare's CDN header with an nginx server header", () => {
    expect(slugs({ headers: { server: "nginx/1.24.0" } })).toEqual([]);
    expect(slugs({ headers: { server: "cloudflare" } })).toEqual(["cloudflare"]);
  });

  it("tolerates empty input", () => {
    expect(detectTechnologies({})).toEqual([]);
  });
});

// The probe lists and the rule table must not drift: a global nobody looks for
// is a rule that can never fire, and nothing would ever report it as broken.
describe("probe lists match the rules", () => {
  it("probes for every global any rule depends on", () => {
    expect(PROBED_GLOBALS).toContain("__NEXT_DATA__");
    expect(PROBED_GLOBALS).toContain("Shopify");
    expect(new Set(PROBED_GLOBALS).size).toBe(PROBED_GLOBALS.length);
  });

  it("probes for every selector any rule depends on", () => {
    expect(PROBED_SELECTORS).toContain("#__next");
    expect(PROBED_SELECTORS).toContain("html[data-wf-page]");
    expect(new Set(PROBED_SELECTORS).size).toBe(PROBED_SELECTORS.length);
  });
});

describe("mergeTechnologies", () => {
  // A checkout script only loads on /checkout. A site's stack is the union of
  // its pages', never any one page's.
  it("unions the technologies across pages", () => {
    const merged = mergeTechnologies([
      detectTechnologies({ assetUrls: ["https://example.com/_next/static/a.js"] }),
      detectTechnologies({ assetUrls: ["https://js.stripe.com/v3/"] }),
      detectTechnologies({ assetUrls: ["https://widget.intercom.io/widget/x"] }),
    ]);
    expect(merged.map((t) => t.slug)).toEqual(["nextjs", "stripe", "intercom"]);
  });

  it("prefers the observation that carries a version", () => {
    const merged = mergeTechnologies([
      detectTechnologies({ assetUrls: ["https://shop.test/wp-content/x.js"] }),
      detectTechnologies({ generators: ["WordPress 6.4.2"] }),
    ]);
    expect(merged[0]).toMatchObject({ slug: "wordpress", version: "6.4.2" });
  });

  it("returns nothing for no pages", () => {
    expect(mergeTechnologies([])).toEqual([]);
  });
});

describe("parseTechnologies", () => {
  it("round-trips through JSON", () => {
    const found = detectTechnologies({ assetUrls: ["https://js.stripe.com/v3/"] });
    expect(parseTechnologies(JSON.parse(JSON.stringify(found)))).toEqual(found);
  });

  it("drops malformed entries instead of throwing", () => {
    expect(parseTechnologies(null)).toEqual([]);
    expect(parseTechnologies("stripe")).toEqual([]);
    expect(parseTechnologies([{ slug: "x" }])).toEqual([]);
    expect(parseTechnologies([{ slug: "x", name: "X", category: "nonsense" }])).toEqual([]);
  });
});
