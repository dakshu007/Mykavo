import { describe, expect, it } from "vitest";
import { highestSeverity, scoreChange, type ChangeSignal } from "./index";

function score(signal: ChangeSignal) {
  return scoreChange(signal);
}

describe("highestSeverity", () => {
  it("returns the most severe", () => {
    expect(highestSeverity(["INFO", "MEDIUM", "LOW"])).toBe("MEDIUM");
    expect(highestSeverity(["HIGH", "CRITICAL", "LOW"])).toBe("CRITICAL");
  });
  it("returns null for empty", () => {
    expect(highestSeverity([])).toBeNull();
  });
});

describe("availability rules (spec §19)", () => {
  it("200 → 404 is CRITICAL and notifies", () => {
    const c = score({ kind: "http_status", previous: 200, current: 404 })!;
    expect(c.severity).toBe("CRITICAL");
    expect(c.category).toBe("AVAILABILITY");
    expect(c.notify).toBe(true);
  });
  it("200 → 500 is CRITICAL", () => {
    expect(score({ kind: "http_status", previous: 200, current: 500 })!.severity).toBe("CRITICAL");
  });
  it("500 → 200 / 404 → 200 (recovery) is LOW and never emails", () => {
    // Recovery is only ever seen against a baseline captured while broken; at
    // HIGH it re-emailed on every scan until someone re-approved (production).
    for (const previous of [500, 404]) {
      const c = score({ kind: "http_status", previous, current: 200 })!;
      expect(c.severity).toBe("LOW");
      expect(c.changeType).toBe("http_status_recovered");
      expect(c.notify).toBe(false);
    }
  });
  it("200 → 403 / 502 stay CRITICAL (real regressions are never downgraded)", () => {
    expect(score({ kind: "http_status", previous: 200, current: 403 })!.severity).toBe("CRITICAL");
    expect(score({ kind: "http_status", previous: 200, current: 502 })!.severity).toBe("CRITICAL");
  });
  it("a bot-protection challenge is MEDIUM and does not email", () => {
    const c = score({ kind: "bot_challenge", title: "Just a moment...", httpStatus: 403 })!;
    expect(c.severity).toBe("MEDIUM");
    expect(c.category).toBe("AVAILABILITY");
    expect(c.notify).toBe(false);
  });
  it("new redirect is MEDIUM", () => {
    expect(score({ kind: "redirect_appeared", hops: 1 })!.severity).toBe("MEDIUM");
  });
  it("final URL change is HIGH", () => {
    expect(
      score({ kind: "final_url", previous: "https://a.com/", current: "https://a.com/x" })!.severity,
    ).toBe("HIGH");
  });
});

describe("SEO rules (spec §19)", () => {
  it("title changed is MEDIUM, removed is HIGH", () => {
    expect(score({ kind: "title", previous: "A", current: "B" })!.severity).toBe("MEDIUM");
    expect(score({ kind: "title", previous: "A", current: null })!.severity).toBe("HIGH");
  });
  it("canonical changed and removed are both HIGH", () => {
    expect(score({ kind: "canonical", previous: "a", current: "b" })!.severity).toBe("HIGH");
    expect(score({ kind: "canonical", previous: "a", current: null })!.severity).toBe("HIGH");
    // Removal stays HIGH even if a caller (wrongly) claims it matches the page.
    expect(score({ kind: "canonical", previous: "a", current: null, matchesPage: true })!.severity).toBe("HIGH");
  });
  it("canonical moving TO the page itself is LOW good news, not HIGH", () => {
    const c = score({ kind: "canonical", previous: "https://a.com", current: "https://a.com/contact", matchesPage: true })!;
    expect(c.severity).toBe("LOW");
    expect(c.changeType).toBe("canonical_now_self");
  });
  it("canonical added where there was none is LOW when self-referencing, MEDIUM otherwise", () => {
    expect(score({ kind: "canonical", previous: null, current: "https://a.com/x", matchesPage: true })!.severity).toBe("LOW");
    const other = score({ kind: "canonical", previous: null, current: "https://a.com/" })!;
    expect(other.severity).toBe("MEDIUM");
    expect(other.changeType).toBe("canonical_added");
  });
  it("index → noindex is CRITICAL and notifies", () => {
    const c = score({ kind: "robots", previous: "index, follow", current: "noindex" })!;
    expect(c.severity).toBe("CRITICAL");
    expect(c.changeType).toBe("robots_noindex");
    expect(c.notify).toBe(true);
  });
  it("noindex → index is not critical", () => {
    expect(
      score({ kind: "robots", previous: "noindex", current: "index, follow" })!.severity,
    ).toBe("MEDIUM");
  });
  it("meta description changed is LOW, removed is MEDIUM", () => {
    expect(score({ kind: "meta_description", previous: "a", current: "b" })!.severity).toBe("LOW");
    expect(score({ kind: "meta_description", previous: "a", current: null })!.severity).toBe("MEDIUM");
  });
  it("H1 removed is HIGH", () => {
    expect(score({ kind: "h1", previous: ["Home"], current: [] })!.severity).toBe("HIGH");
  });
});

describe("script rules (spec §21)", () => {
  it("known-service removal is HIGH", () => {
    const c = score({ kind: "script_removed", domain: "google-analytics.com", service: "Google Analytics" })!;
    expect(c.severity).toBe("HIGH");
    expect(c.title).toMatch(/Google Analytics/);
  });
  it("unknown script removal is LOW", () => {
    expect(
      score({ kind: "script_removed", domain: "cdn.example.com", service: null })!.severity,
    ).toBe("LOW");
  });
  it("unknown third-party script added is MEDIUM", () => {
    expect(
      score({ kind: "script_added", domain: "evil.example", service: null, isThirdParty: true })!
        .severity,
    ).toBe("MEDIUM");
  });
  it("known script added is LOW", () => {
    expect(
      score({ kind: "script_added", domain: "js.stripe.com", service: "Stripe", isThirdParty: true })!
        .severity,
    ).toBe("LOW");
  });
});

describe("performance rules (spec §22)", () => {
  it("page weight +>50% is HIGH, +>20% is MEDIUM, <=20% is ignored", () => {
    expect(score({ kind: "page_weight", previousBytes: 1_000_000, currentBytes: 1_600_000 })!.severity).toBe("HIGH");
    expect(score({ kind: "page_weight", previousBytes: 1_000_000, currentBytes: 1_300_000 })!.severity).toBe("MEDIUM");
    expect(score({ kind: "page_weight", previousBytes: 1_000_000, currentBytes: 1_100_000 })).toBeNull();
  });
  it("page weight growth needs an absolute floor: tiny pages do not alert", () => {
    // Production: 25 KB -> 55 KB (+120%) was a HIGH alert.
    expect(score({ kind: "page_weight", previousBytes: 25 * 1024, currentBytes: 55 * 1024 })!.severity).toBe("LOW");
    // +60% but only ~60 KB: MEDIUM, not HIGH.
    expect(score({ kind: "page_weight", previousBytes: 100_000, currentBytes: 160_000 })!.severity).toBe("MEDIUM");
    // Real multi-megabyte growth is still HIGH.
    expect(score({ kind: "page_weight", previousBytes: 1675 * 1024, currentBytes: 4856 * 1024 })!.severity).toBe("HIGH");
  });
  it("request count +>25% is MEDIUM, else ignored", () => {
    expect(score({ kind: "request_count", previous: 20, current: 30 })!.severity).toBe("MEDIUM");
    expect(score({ kind: "request_count", previous: 20, current: 22 })).toBeNull();
  });
});

describe("links rules (spec §20)", () => {
  it("large internal-link removal is HIGH", () => {
    expect(
      score({ kind: "internal_links_removed", count: 20, total: 50 })!.severity,
    ).toBe("HIGH");
  });
  it("removing >30% is HIGH", () => {
    expect(score({ kind: "internal_links_removed", count: 4, total: 10 })!.severity).toBe("HIGH");
  });
  it("a few removed links is INFO", () => {
    expect(score({ kind: "internal_links_removed", count: 2, total: 100 })!.severity).toBe("INFO");
  });
  it("added links are INFO", () => {
    expect(score({ kind: "internal_links_added", count: 5 })!.severity).toBe("INFO");
  });
  it("a few broken links are MEDIUM, 5+ are HIGH and notify", () => {
    const few = score({
      kind: "broken_links",
      count: 2,
      totalChecked: 40,
      samples: [
        { url: "https://a.com/gone", status: 404, pages: 3 },
        { url: "https://a.com/dead", status: 0, pages: 1 },
      ],
    })!;
    expect(few.severity).toBe("MEDIUM");
    expect(few.category).toBe("LINKS");
    expect(few.notify).toBe(false);
    expect(few.title).toBe("2 broken internal links detected");
    expect(few.description).toContain("/gone (HTTP 404)");
    expect(few.description).toContain("/dead (unreachable)");

    const many = score({
      kind: "broken_links",
      count: 17,
      totalChecked: 120,
      samples: [{ url: "https://a.com/gone", status: 404, pages: 12 }],
    })!;
    expect(many.severity).toBe("HIGH");
    expect(many.notify).toBe(true);
    expect(many.title).toBe("17 broken internal links detected");
  });
});

describe("visual rules (spec §18)", () => {
  it("<1% is ignored", () => {
    expect(score({ kind: "visual_diff", percentage: 0.4 })).toBeNull();
  });
  it("1-5% LOW, 5-15% MEDIUM, 15-30% HIGH, 30%+ CRITICAL", () => {
    expect(score({ kind: "visual_diff", percentage: 3 })!.severity).toBe("LOW");
    expect(score({ kind: "visual_diff", percentage: 9 })!.severity).toBe("MEDIUM");
    expect(score({ kind: "visual_diff", percentage: 22 })!.severity).toBe("HIGH");
    // Was asserted as HIGH, which codified a bug: both arms of the ternary
    // returned HIGH, so spec §18's 30%+ CRITICAL tier could never fire.
    expect(score({ kind: "visual_diff", percentage: 40 })!.severity).toBe("CRITICAL");
    expect(score({ kind: "visual_diff", percentage: 30 })!.severity).toBe("CRITICAL");
    expect(score({ kind: "visual_diff", percentage: 29.9 })!.severity).toBe("HIGH");
  });
});

describe("content rules", () => {
  it("text change is LOW, dom-only change is INFO", () => {
    expect(score({ kind: "content_text" })!.severity).toBe("LOW");
    expect(score({ kind: "content_dom" })!.severity).toBe("INFO");
  });
});

describe("notification eligibility (spec §27)", () => {
  it("only CRITICAL and HIGH notify immediately", () => {
    expect(score({ kind: "http_status", previous: 200, current: 404 })!.notify).toBe(true);
    expect(score({ kind: "canonical", previous: "a", current: "b" })!.notify).toBe(true);
    expect(score({ kind: "title", previous: "a", current: "b" })!.notify).toBe(false);
    expect(score({ kind: "content_text" })!.notify).toBe(false);
  });
});

describe("conversion element rules (spec §23)", () => {
  it("a missing element scales severity by importance", () => {
    expect(score({ kind: "element_missing", name: "CTA", importance: "CRITICAL" })!.severity).toBe(
      "CRITICAL",
    );
    expect(score({ kind: "element_missing", name: "CTA", importance: "IMPORTANT" })!.severity).toBe(
      "HIGH",
    );
    expect(score({ kind: "element_missing", name: "CTA", importance: "NORMAL" })!.severity).toBe(
      "MEDIUM",
    );
  });

  it("missing and hidden are CONVERSION and notify at HIGH+", () => {
    const missing = score({ kind: "element_missing", name: "CTA", importance: "CRITICAL" })!;
    expect(missing.category).toBe("CONVERSION");
    expect(missing.notify).toBe(true);
    const hidden = score({ kind: "element_hidden", name: "CTA", importance: "IMPORTANT" })!;
    expect(hidden.changeType).toBe("conversion_element_hidden");
    expect(hidden.severity).toBe("HIGH");
  });

  it("a changed link destination is high-impact", () => {
    const c = score({
      kind: "element_href_changed",
      name: "CTA",
      importance: "IMPORTANT",
      previous: "/a",
      current: "/b",
    })!;
    expect(c.severity).toBe("HIGH");
    expect(c.category).toBe("CONVERSION");
  });

  it("a text change is MEDIUM (HIGH for critical elements)", () => {
    expect(
      score({
        kind: "element_text_changed",
        name: "CTA",
        importance: "NORMAL",
        previous: "Buy",
        current: "Sold",
      })!.severity,
    ).toBe("MEDIUM");
    expect(
      score({
        kind: "element_text_changed",
        name: "CTA",
        importance: "CRITICAL",
        previous: "Buy",
        current: "Sold",
      })!.severity,
    ).toBe("HIGH");
  });
});

describe("platform (plugin/theme/core) rules", () => {
  it("names the plugin and both versions when exactly one updated", () => {
    const c = score({
      kind: "platform_updates",
      components: [
        { name: "Elementor", kind: "plugin", previous: "3.18.0", current: "3.19.1" },
      ],
    });
    expect(c?.category).toBe("PLATFORM");
    expect(c?.title).toBe("Elementor updated 3.18.0 → 3.19.1");
    expect(c?.severity).toBe("LOW");
    // An update is an explanation, not an emergency. Never wake anyone for it.
    expect(c?.notify).toBe(false);
  });

  it("counts them instead of listing them in the title when several updated", () => {
    const c = score({
      kind: "platform_updates",
      components: [
        { name: "Elementor", kind: "plugin", previous: "3.18.0", current: "3.19.1" },
        { name: "Yoast SEO", kind: "plugin", previous: "21.4", current: "21.5" },
      ],
    });
    expect(c?.title).toBe("2 plugin and theme updates");
    // The detail must still be recoverable from the event itself.
    expect(c?.description).toContain("Elementor 3.18.0 → 3.19.1");
    expect(c?.description).toContain("Yoast SEO 21.4 → 21.5");
  });

  it("produces nothing from an empty component list", () => {
    expect(score({ kind: "platform_updates", components: [] })).toBeNull();
    expect(score({ kind: "platform_components_added", components: [] })).toBeNull();
    expect(score({ kind: "platform_components_removed", components: [] })).toBeNull();
  });

  it("treats a plugin that stopped loading as worth a look, not an alert", () => {
    const c = score({
      kind: "platform_components_removed",
      components: [{ name: "Contact Form 7", kind: "plugin", version: "5.9" }],
    });
    expect(c?.severity).toBe("MEDIUM");
    expect(c?.notify).toBe(false);
    expect(c?.title).toBe("Contact Form 7 is no longer loading on this page");
    // The honest alternative explanation has to be in front of the user, or
    // they will go hunting for a deactivation that never happened.
    expect(c?.description).toMatch(/caching/i);
  });

  it("escalates a theme switch, which is a redesign or an accident", () => {
    const c = score({
      kind: "platform_theme_switched",
      previous: "Astra 4.6.2",
      current: "Kadence 1.2.3",
    });
    expect(c?.severity).toBe("HIGH");
    expect(c?.notify).toBe(true);
    expect(c?.title).toBe("Theme changed from Astra 4.6.2 to Kadence 1.2.3");
  });
});

describe("visual noise guard", () => {
  it("caps the visual score at LOW when under 1% of pixels changed in place", () => {
    const c = score({ kind: "visual_diff", percentage: 27, pixelPercentage: 0.5 })!;
    expect(c.severity).toBe("LOW");
    expect(c.notify).toBe(false);
  });
  it("keeps the spec bands when pixels really changed, or when the caller has no pixel figure", () => {
    expect(score({ kind: "visual_diff", percentage: 27, pixelPercentage: 12 })!.severity).toBe("HIGH");
    expect(score({ kind: "visual_diff", percentage: 27 })!.severity).toBe("HIGH");
  });
});
