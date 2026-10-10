import { describe, expect, it } from "vitest";
import {
  NOT_CHECKED_TIME_LIMIT,
  buildBrokenLinkReport,
  classifyLink,
  extractLinks,
  mapWithBudget,
  type LinkProbe,
} from "./broken-links";
import { SAFE_FETCH_USER_MESSAGES } from "./user-messages";

const probe = (p: Partial<LinkProbe>): LinkProbe => ({ status: 200, finalUrl: null, redirectCount: 0, error: null, ...p });

describe("extractLinks", () => {
  it("resolves, dedupes, drops non-http and fragment-only links, and keeps anchor text", () => {
    const html = `
      <a href="/about">About <b>us</b></a>
      <a href="/about#team">Team</a>
      <a href="#top">Top</a>
      <a href="mailto:hi@e.com">Mail</a><a href="tel:123">Call</a><a href="javascript:void(0)">JS</a>
      <a href="https://www.example.com/pricing" title="Pricing"></a>
      <a href="https://other.com/x"><img src="a.png" alt="Partner"></a>
      <a name="anchor-without-href">nothing</a>`;
    const links = extractLinks(html, "https://example.com/blog/post");
    expect(links).toEqual([
      { url: "https://example.com/about", text: "About us", internal: true, occurrences: 2 },
      { url: "https://www.example.com/pricing", text: "Pricing", internal: true, occurrences: 1 },
      { url: "https://other.com/x", text: "Partner", internal: false, occurrences: 1 },
    ]);
  });

  it("ignores links in comments and scripts, and honours <base href>", () => {
    const html = `<base href="https://example.com/docs/">
      <!-- <a href="/old">old</a> -->
      <script>const s = '<a href="/fake">x</a>';</script>
      <a href="guide">Guide</a>
      <a href="relative.html">Unclosed`;
    expect(extractLinks(html, "https://example.com/").map((l) => l.url)).toEqual([
      "https://example.com/docs/guide",
      "https://example.com/docs/relative.html",
    ]);
  });
});

describe("classifyLink", () => {
  it("treats 404, 410, other 4xx, 5xx and hard failures as broken", () => {
    expect(classifyLink(probe({ status: 404 }), 5)).toEqual({ outcome: "broken", reason: "Not found (404)." });
    expect(classifyLink(probe({ status: 410 }), 5).outcome).toBe("broken");
    expect(classifyLink(probe({ status: 400 }), 5).outcome).toBe("broken");
    expect(classifyLink(probe({ status: 503 }), 5).outcome).toBe("broken");
    expect(classifyLink(probe({ status: null, error: SAFE_FETCH_USER_MESSAGES.DNS_FAILURE }), 5).outcome).toBe("broken");
    expect(classifyLink(probe({ status: null, error: SAFE_FETCH_USER_MESSAGES.FETCH_FAILED }), 5).outcome).toBe("broken");
    expect(classifyLink(probe({ status: 404, redirectCount: 1, finalUrl: "https://e.com/new" }), 5).reason).toBe(
      "Redirects to https://e.com/new, which returns Not found (404).",
    );
  });

  it("never calls bot-blocking, timeouts or blocked hosts broken", () => {
    for (const status of [401, 403, 429]) {
      expect(classifyLink(probe({ status }), 5).outcome).toBe("unverified");
    }
    expect(classifyLink(probe({ status: 999 }), 5).outcome).toBe("unverified");
    expect(classifyLink(probe({ status: null, error: SAFE_FETCH_USER_MESSAGES.TIMEOUT }), 5)).toEqual({
      outcome: "unverified",
      reason: "No response within 5 seconds. The server may be slow rather than down.",
    });
    expect(classifyLink(probe({ status: null, error: SAFE_FETCH_USER_MESSAGES.BLOCKED_IP }), 5).outcome).toBe("unverified");
    expect(classifyLink(probe({ status: null, error: NOT_CHECKED_TIME_LIMIT }), 5).outcome).toBe("unverified");
    expect(classifyLink(probe({ status: 301, redirectCount: 5 }), 5).reason).toMatch(/Too many redirects/);
  });

  it("separates redirects from plain OK", () => {
    expect(classifyLink(probe({ status: 200 }), 5)).toEqual({ outcome: "ok", reason: "OK (200)" });
    expect(classifyLink(probe({ status: 200, redirectCount: 2, finalUrl: "https://e.com/b" }), 5)).toEqual({
      outcome: "redirect",
      reason: "Redirects to https://e.com/b",
    });
  });
});

describe("buildBrokenLinkReport", () => {
  it("sorts broken first, counts outcomes and flags the cap", () => {
    const links = ["a", "b", "c", "d"].map((p, i) => ({ url: `https://e.com/${p}`, text: p, internal: i < 3, occurrences: 1 }));
    const report = buildBrokenLinkReport({
      url: "https://e.com/",
      finalUrl: "https://e.com/",
      httpStatus: 200,
      links,
      totalLinks: 150,
      probes: [probe({}), probe({ status: 403 }), probe({ status: 404 }), probe({ status: 200, redirectCount: 1, finalUrl: "https://x.com/" })],
      timeoutSeconds: 5,
    });
    expect(report.results.map((r) => r.text)).toEqual(["c", "b", "d", "a"]);
    expect(report.counts).toEqual({ broken: 1, unverified: 1, redirect: 1, ok: 1 });
    expect(report).toMatchObject({ capped: true, checkedLinks: 4, totalLinks: 150, internalCount: 3, externalCount: 1 });
  });
});

describe("mapWithBudget", () => {
  it("preserves order, limits concurrency and times out slow or late items", async () => {
    let active = 0;
    let peak = 0;
    const out = await mapWithBudget(
      [1, 2, 3, 4, 5, 6],
      { concurrency: 2, budgetMs: 60 },
      async (n) => {
        active++;
        peak = Math.max(peak, active);
        await new Promise((r) => setTimeout(r, n === 3 ? 500 : 5));
        active--;
        return n * 10;
      },
      () => -1,
    );
    expect(peak).toBeLessThanOrEqual(2);
    expect(out.slice(0, 2)).toEqual([10, 20]);
    expect(out[2]).toBe(-1); // outlived the budget
    expect(out.every((v) => v === -1 || v % 10 === 0)).toBe(true);
  });
});
