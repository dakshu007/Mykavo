import { describe, expect, it } from "vitest";
import { normalizeUrl } from "@/lib/url";
import { planPageAdditions } from "./wp-pages";

const SITE = "https://shop.example.com/";

describe("planPageAdditions", () => {
  it("adds pages of the website", () => {
    const plan = planPageAdditions([{ url: "https://shop.example.com/cart/", name: " Cart " }], SITE, []);
    expect(plan).toEqual({
      ok: true,
      alreadyMonitored: 0,
      fresh: [{ url: "https://shop.example.com/cart/", normalizedUrl: normalizeUrl(new URL("https://shop.example.com/cart/")), name: "Cart" }],
    });
  });

  it("rebuilds http and www addresses on the website's own origin", () => {
    const plan = planPageAdditions(
      [{ url: "http://www.shop.example.com/checkout/?step=1#top" }],
      SITE,
      [],
    );
    if (!plan.ok) throw new Error(plan.error);
    expect(plan.fresh[0].url).toBe("https://shop.example.com/checkout/?step=1");
  });

  it("skips pages already monitored and duplicates in one request", () => {
    const existing = [normalizeUrl(new URL("https://shop.example.com/cart/"))];
    const plan = planPageAdditions(
      [{ url: "https://shop.example.com/cart/" }, { url: "https://shop.example.com/shop/" }, { url: "https://shop.example.com/shop/" }],
      SITE,
      existing,
    );
    if (!plan.ok) throw new Error(plan.error);
    expect(plan.fresh.map((p) => p.url)).toEqual(["https://shop.example.com/shop/"]);
    expect(plan.alreadyMonitored).toBe(2);
  });

  it.each([
    "https://evil.example.org/cart/",
    "https://example.com/cart/",
    "https://sub.shop.example.com/",
    "https://shop.example.com.evil.org/",
    "https://user:pass@shop.example.com/",
    "ftp://shop.example.com/file",
    "javascript:alert(1)",
  ])("refuses %s", (url) => {
    const plan = planPageAdditions([{ url }], SITE, []);
    expect(plan.ok).toBe(false);
  });

  it("refuses the whole request if any page is off-site", () => {
    const plan = planPageAdditions(
      [{ url: "https://shop.example.com/a/" }, { url: "https://other.test/b/" }],
      SITE,
      [],
    );
    expect(plan.ok).toBe(false);
  });
});
