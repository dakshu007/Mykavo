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
  it("500 → 200 (recovery) is HIGH, not critical", () => {
    expect(score({ kind: "http_status", previous: 500, current: 200 })!.severity).toBe("HIGH");
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
    expect(score({ kind: "page_weight", previousBytes: 100_000, currentBytes: 160_000 })!.severity).toBe("HIGH");
    expect(score({ kind: "page_weight", previousBytes: 100_000, currentBytes: 130_000 })!.severity).toBe("MEDIUM");
    expect(score({ kind: "page_weight", previousBytes: 100_000, currentBytes: 110_000 })).toBeNull();
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
});

describe("visual rules (spec §18)", () => {
  it("<1% is ignored", () => {
    expect(score({ kind: "visual_diff", percentage: 0.4 })).toBeNull();
  });
  it("1–5% is LOW, 5–15% MEDIUM, 15%+ HIGH", () => {
    expect(score({ kind: "visual_diff", percentage: 3 })!.severity).toBe("LOW");
    expect(score({ kind: "visual_diff", percentage: 9 })!.severity).toBe("MEDIUM");
    expect(score({ kind: "visual_diff", percentage: 22 })!.severity).toBe("HIGH");
    expect(score({ kind: "visual_diff", percentage: 40 })!.severity).toBe("HIGH");
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
