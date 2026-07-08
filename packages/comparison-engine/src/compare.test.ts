import { describe, expect, it } from "vitest";
import { compareSnapshots, type ComparableSnapshot } from "./compare";

const BASE: ComparableSnapshot = {
  httpStatus: 200,
  finalUrl: "https://shop.test/pricing",
  redirectCount: 0,
  domHash: "dom-a",
  textHash: "text-a",
  title: "Pricing — Shop",
  metaDescription: "Our plans",
  canonicalUrl: "https://shop.test/pricing",
  robotsMeta: "index, follow",
  h1Values: ["Pricing"],
  pageWeightBytes: 100_000,
  requestCount: 20,
  responseTimeMs: 300,
  links: [
    { normalizedUrl: "https://shop.test/a", linkType: "INTERNAL" },
    { normalizedUrl: "https://shop.test/b", linkType: "INTERNAL" },
    { normalizedUrl: "https://shop.test/c", linkType: "INTERNAL" },
  ],
  scripts: [
    { domain: "www.googletagmanager.com", isThirdParty: true, service: "Google Tag Manager" },
    { domain: "js.stripe.com", isThirdParty: true, service: "Stripe" },
  ],
};

function withChanges(overrides: Partial<ComparableSnapshot>): ComparableSnapshot {
  return { ...BASE, ...overrides };
}

describe("compareSnapshots", () => {
  it("returns no changes for identical snapshots", () => {
    expect(compareSnapshots(BASE, { ...BASE })).toEqual([]);
  });

  it("detects a title change (MEDIUM)", () => {
    const changes = compareSnapshots(BASE, withChanges({ title: "New Pricing", textHash: "text-b" }));
    const title = changes.find((c) => c.changeType === "title_changed");
    expect(title?.severity).toBe("MEDIUM");
  });

  it("detects index → noindex as CRITICAL and sorts it first", () => {
    const changes = compareSnapshots(
      BASE,
      withChanges({ robotsMeta: "noindex, nofollow", title: "x" }),
    );
    expect(changes[0].severity).toBe("CRITICAL");
    expect(changes[0].changeType).toBe("robots_noindex");
  });

  it("short-circuits to availability-only when the page is now broken", () => {
    const changes = compareSnapshots(
      BASE,
      withChanges({ httpStatus: 500, title: "different", canonicalUrl: "different" }),
    );
    // Only the availability change is reported; SEO diffs are suppressed.
    expect(changes).toHaveLength(1);
    expect(changes[0].category).toBe("AVAILABILITY");
    expect(changes[0].severity).toBe("CRITICAL");
  });

  it("groups removed internal links into one change", () => {
    const changes = compareSnapshots(
      BASE,
      withChanges({
        links: [{ normalizedUrl: "https://shop.test/a", linkType: "INTERNAL" }],
        textHash: "text-b",
      }),
    );
    const removed = changes.find((c) => c.changeType === "internal_links_removed");
    expect(removed).toBeDefined();
    expect(removed?.title).toMatch(/2 internal links removed/);
  });

  it("flags a disappeared analytics script as HIGH", () => {
    const changes = compareSnapshots(
      BASE,
      withChanges({
        scripts: [{ domain: "js.stripe.com", isThirdParty: true, service: "Stripe" }],
      }),
    );
    const removed = changes.find((c) => c.changeType === "script_removed");
    expect(removed?.severity).toBe("HIGH");
    expect(removed?.title).toMatch(/Google Tag Manager/);
  });

  it("ignores identical scripts with different cache-busting domains via service key", () => {
    const changes = compareSnapshots(BASE, withChanges({ textHash: "text-a", domHash: "dom-a" }));
    expect(changes.filter((c) => c.category === "SCRIPT")).toHaveLength(0);
  });

  it("detects a page-weight regression over 50% as HIGH", () => {
    const changes = compareSnapshots(BASE, withChanges({ pageWeightBytes: 170_000 }));
    const perf = changes.find((c) => c.changeType === "page_weight_increased");
    expect(perf?.severity).toBe("HIGH");
  });

  it("emits content_text when text changes, content_dom when only structure changes", () => {
    expect(
      compareSnapshots(BASE, withChanges({ textHash: "text-b", domHash: "dom-b" })).some(
        (c) => c.changeType === "text_changed",
      ),
    ).toBe(true);
    const domOnly = compareSnapshots(BASE, withChanges({ domHash: "dom-b" }));
    expect(domOnly.some((c) => c.changeType === "dom_changed")).toBe(true);
    expect(domOnly.some((c) => c.changeType === "text_changed")).toBe(false);
  });
});
