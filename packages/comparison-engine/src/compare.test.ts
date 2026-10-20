import { describe, expect, it } from "vitest";
import {
  compareSnapshots,
  type ComparableSnapshot,
  type ComparableElement,
} from "./compare";

const BASE: ComparableSnapshot = {
  httpStatus: 200,
  finalUrl: "https://shop.test/pricing",
  redirectCount: 0,
  domHash: "dom-a",
  textHash: "text-a",
  title: "Pricing - Shop",
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
  platformFingerprint: null,
  elements: [],
};

function withChanges(overrides: Partial<ComparableSnapshot>): ComparableSnapshot {
  return { ...BASE, ...overrides };
}

function el(overrides: Partial<ComparableElement> = {}): ComparableElement {
  return {
    monitoredElementId: "el1",
    name: "Start free trial",
    importance: "CRITICAL",
    expectedExistence: true,
    expectedVisibility: true,
    expectedText: null,
    expectedHref: null,
    exists: true,
    visible: true,
    text: "Start free trial",
    href: "/signup",
    ...overrides,
  };
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
    const changes = compareSnapshots(
      withChanges({ pageWeightBytes: 1_000_000 }),
      withChanges({ pageWeightBytes: 1_700_000 }),
    );
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

describe("compareSnapshots - conversion elements (spec §23)", () => {
  it("flags a missing critical element as CRITICAL", () => {
    const baseline = withChanges({ elements: [el({ exists: true })] });
    const current = withChanges({
      elements: [el({ exists: false, visible: false, text: null, href: null })],
    });
    const missing = compareSnapshots(baseline, current).find(
      (c) => c.changeType === "conversion_element_missing",
    );
    expect(missing?.category).toBe("CONVERSION");
    expect(missing?.severity).toBe("CRITICAL");
    expect(missing?.title).toMatch(/Start free trial/);
  });

  it("scales missing-element severity by importance (NORMAL → MEDIUM)", () => {
    const baseline = withChanges({ elements: [el({ importance: "NORMAL" })] });
    const current = withChanges({
      elements: [el({ importance: "NORMAL", exists: false, visible: false })],
    });
    const missing = compareSnapshots(baseline, current).find(
      (c) => c.changeType === "conversion_element_missing",
    );
    expect(missing?.severity).toBe("MEDIUM");
  });

  it("flags a hidden element", () => {
    const changes = compareSnapshots(
      withChanges({ elements: [el({ visible: true })] }),
      withChanges({ elements: [el({ visible: false })] }),
    );
    const hidden = changes.find((c) => c.changeType === "conversion_element_hidden");
    expect(hidden?.category).toBe("CONVERSION");
    expect(hidden?.severity).toBe("CRITICAL");
  });

  it("flags a changed CTA link destination", () => {
    const hrefChange = compareSnapshots(
      withChanges({ elements: [el({ href: "/signup" })] }),
      withChanges({ elements: [el({ href: "/pricing" })] }),
    ).find((c) => c.changeType === "conversion_element_href_changed");
    expect(hrefChange?.previousValue).toBe("/signup");
    expect(hrefChange?.currentValue).toBe("/pricing");
  });

  it("flags CTA text changes, honoring a pinned expected value", () => {
    const textChange = compareSnapshots(
      withChanges({ elements: [el({ text: "Start free trial" })] }),
      withChanges({ elements: [el({ text: "Sold out", expectedText: "Start free trial" })] }),
    ).find((c) => c.changeType === "conversion_element_text_changed");
    expect(textChange).toBeDefined();
    expect(textChange?.currentValue).toBe("Sold out");
  });

  it("does not compare an element with no baseline observation", () => {
    const conv = compareSnapshots(
      withChanges({ elements: [] }),
      withChanges({ elements: [el({ exists: false })] }),
    ).filter((c) => c.category === "CONVERSION");
    expect(conv).toHaveLength(0);
  });

  it("flags an element that appeared when it was expected absent", () => {
    const appeared = compareSnapshots(
      withChanges({ elements: [el({ expectedExistence: false, exists: false, visible: false })] }),
      withChanges({ elements: [el({ expectedExistence: false, exists: true })] }),
    ).find((c) => c.changeType === "conversion_element_appeared");
    expect(appeared?.category).toBe("CONVERSION");
  });

  it("suppresses conversion diffs when the page is broken", () => {
    const changes = compareSnapshots(
      withChanges({ elements: [el({ exists: true })] }),
      withChanges({ httpStatus: 500, elements: [el({ exists: false, visible: false })] }),
    );
    expect(changes.every((c) => c.category === "AVAILABILITY")).toBe(true);
  });
});

describe("platform fingerprint via compareSnapshots", () => {
  const wp = (version: string) => ({
    platform: "wordpress" as const,
    components: [
      { kind: "plugin" as const, slug: "elementor", name: "Elementor", version },
    ],
    assetsSeen: 1,
    assetsVersioned: 1,
    present: ["plugin:elementor"],
  });

  it("surfaces a plugin update alongside the change it explains", () => {
    const changes = compareSnapshots(
      { ...BASE, platformFingerprint: wp("3.18.0") },
      { ...BASE, h1Values: [], platformFingerprint: wp("3.19.1") },
    );
    const platform = changes.find((c) => c.category === "PLATFORM");
    const seo = changes.find((c) => c.changeType === "h1_removed" || c.category === "SEO");

    // Both must be present: the damage AND the update that likely caused it.
    expect(platform?.title).toBe("Elementor updated 3.18.0 → 3.19.1");
    expect(seo).toBeDefined();
    // The update itself must never page anyone at 2am.
    expect(platform?.notify).toBe(false);
    expect(platform?.severity).toBe("LOW");
  });

  it("emits no platform change when neither side was fingerprinted", () => {
    const changes = compareSnapshots(BASE, { ...BASE, title: "New" });
    expect(changes.some((c) => c.category === "PLATFORM")).toBe(false);
  });
});

describe("noise seen in production alerts", () => {
  it("ignores a final URL that differs only by a session/state query token", () => {
    const changes = compareSnapshots(
      withChanges({ finalUrl: "https://accounts.example/login?state=6bcba41d" }),
      withChanges({ finalUrl: "https://accounts.example/login?state=1c8c6802" }),
    );
    expect(changes.find((c) => c.changeType === "final_url_changed")).toBeUndefined();
  });

  it("still reports a final URL that lands on a different path", () => {
    const changes = compareSnapshots(
      withChanges({ finalUrl: "https://shop.test/" }),
      withChanges({ finalUrl: "https://shop.test/home/" }),
    );
    expect(changes.find((c) => c.changeType === "final_url_changed")?.severity).toBe("HIGH");
  });

  it("reports a new login wall once instead of five HIGH diffs of the login screen", () => {
    // Production: canonical, final URL, H1, links and the screenshot all
    // changed every scan when facebook.com sent the scanner to /login.
    const changes = compareSnapshots(
      withChanges({ finalUrl: "https://shop.test/" }),
      withChanges({
        finalUrl: "https://shop.test/login/?next=%2F",
        canonicalUrl: "https://shop.test/login",
        title: "Log in",
        h1Values: [],
      }),
    );
    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({ changeType: "login_wall", severity: "HIGH" });
  });

  it("compares a monitored login page normally", () => {
    const changes = compareSnapshots(
      withChanges({ finalUrl: "https://shop.test/login" }),
      withChanges({ finalUrl: "https://shop.test/login", title: "Sign in to Shop" }),
    );
    expect(changes.some((c) => c.changeType === "login_wall")).toBe(false);
    expect(changes.some((c) => c.changeType === "title_changed")).toBe(true);
  });

  it("reports only a LOW recovery against a baseline captured while the page was 404", () => {
    const changes = compareSnapshots(
      withChanges({ httpStatus: 404, canonicalUrl: null, title: "Not found", pageWeightBytes: 20_000 }),
      withChanges({ finalUrl: "https://shop.test/about-us", canonicalUrl: "https://shop.test/about-us/" }),
    );
    expect(changes).toHaveLength(1);
    expect(changes[0].changeType).toBe("http_status_recovered");
    expect(changes[0].severity).toBe("LOW");
  });

  it("scores a canonical that now points at the page itself as LOW", () => {
    const changes = compareSnapshots(
      withChanges({ canonicalUrl: "https://shop.test" }),
      withChanges({ canonicalUrl: "https://shop.test/pricing/" }),
    );
    const c = changes.find((x) => x.category === "SEO" && x.changeType.startsWith("canonical"));
    expect(c?.changeType).toBe("canonical_now_self");
    expect(c?.severity).toBe("LOW");
  });

  it("still scores a canonical moved to another page as HIGH", () => {
    const changes = compareSnapshots(BASE, withChanges({ canonicalUrl: "https://shop.test/" }));
    expect(changes.find((c) => c.changeType === "canonical_changed")?.severity).toBe("HIGH");
  });

  it("replaces every diff with one MEDIUM event when the scanner hit a bot challenge", () => {
    const changes = compareSnapshots(
      BASE,
      withChanges({ httpStatus: 403, title: "Just a moment...", h1Values: [], canonicalUrl: null, links: [] }),
    );
    expect(changes).toHaveLength(1);
    expect(changes[0].changeType).toBe("bot_challenge");
    expect(changes[0].severity).toBe("MEDIUM");
  });

  it("does not treat a plain 403 as a bot challenge", () => {
    const changes = compareSnapshots(BASE, withChanges({ httpStatus: 403 }));
    expect(changes[0].changeType).toBe("http_status_changed");
    expect(changes[0].severity).toBe("CRITICAL");
  });

  it("does not suppress noindex or a 200 -> 500", () => {
    expect(
      compareSnapshots(BASE, withChanges({ robotsMeta: "noindex" })).find((c) => c.changeType === "robots_noindex")
        ?.severity,
    ).toBe("CRITICAL");
    expect(compareSnapshots(BASE, withChanges({ httpStatus: 500 }))[0].severity).toBe("CRITICAL");
  });
});
