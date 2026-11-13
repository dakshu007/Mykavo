import { describe, expect, it } from "vitest";
import { agentBudgetMicroUsd, callCostMicroUsd, WEB_SEARCH_MICRO_USD } from "./pricing";
import { agentLimitsFor, quotaPeriod } from "./limits";
import { htmlToMarkdown, sanitizePostHtml, slugify } from "./html";
import { buildJsonLd, jsonLdScripts } from "./jsonld";
import { clipWords, normalizeProfile } from "./schemas";

describe("pricing", () => {
  it("prices tokens per model and adds web searches", () => {
    expect(callCostMicroUsd("claude-haiku-5-5", { inputTokens: 1_000_000, outputTokens: 0 })).toBe(100_000);
    expect(callCostMicroUsd("claude-sonnet-5-5", { inputTokens: 1000, outputTokens: 1000 })).toBe(12_000);
    expect(callCostMicroUsd("claude-sonnet-5-5", { inputTokens: 0, outputTokens: 0, webSearches: 3 })).toBe(
      3 * WEB_SEARCH_MICRO_USD,
    );
    expect(callCostMicroUsd("claude-sonnet-5-5", { inputTokens: 0, outputTokens: 0, cacheReadTokens: 1000 })).toBe(100);
  });

  it("prices an unknown model as the dearest, never as free", () => {
    expect(callCostMicroUsd("claude-mystery", { inputTokens: 1000, outputTokens: 0 })).toBe(4000);
  });

  it("keeps the agent cap at $0 until it is set", () => {
    expect(agentBudgetMicroUsd(undefined)).toBe(0);
    expect(agentBudgetMicroUsd("")).toBe(0);
    expect(agentBudgetMicroUsd("abc")).toBe(0);
    expect(agentBudgetMicroUsd("5")).toBe(5_000_000);
  });
});

describe("quota limits and periods", () => {
  it("caps trial posts at 3 and treats unknown plans as Free", () => {
    expect(agentLimitsFor("pro", true).posts).toBe(3);
    expect(agentLimitsFor("pro", false).posts).toBe(10);
    expect(agentLimitsFor("mystery", false)).toEqual(agentLimitsFor("free", false));
  });

  it("refills on the anchor's day of the month", () => {
    const anchor = new Date("2026-03-15T10:00:00Z");
    expect(quotaPeriod(new Date("2026-11-20T00:00:00Z"), anchor)).toEqual({
      start: new Date("2026-11-15T10:00:00Z"),
      end: new Date("2026-12-15T10:00:00Z"),
    });
    expect(quotaPeriod(new Date("2026-11-15T09:59:00Z"), anchor).start).toEqual(new Date("2026-10-15T10:00:00Z"));
  });

  it("clamps the 31st to short months and crosses the year", () => {
    const anchor = new Date("2026-01-31T00:00:00Z");
    expect(quotaPeriod(new Date("2027-02-28T12:00:00Z"), anchor)).toEqual({
      start: new Date("2027-02-28T00:00:00Z"),
      end: new Date("2027-03-31T00:00:00Z"),
    });
    expect(quotaPeriod(new Date("2027-01-05T00:00:00Z"), anchor)).toEqual({
      start: new Date("2026-12-31T00:00:00Z"),
      end: new Date("2027-01-31T00:00:00Z"),
    });
  });
});

describe("sanitizePostHtml", () => {
  const allowedLinks = ["https://example.com/pricing", "https://example.com/blog/guide/"];

  it("keeps structure and drops scripts, handlers and unknown wrappers", () => {
    const html =
      '<div class="x"><h2 onclick="evil()">Title</h2><p>Hi <strong>there</strong><script>alert(1)</script></p>' +
      '<img src=x onerror=alert(1)><style>p{}</style><ul><li>One</li><li></li></ul></div>';
    expect(sanitizePostHtml(html, { allowedLinks })).toBe(
      "<h2>Title</h2><p>Hi <strong>there</strong></p><ul><li>One</li></ul>",
    );
  });

  it("keeps links only to the site's real pages", () => {
    const html =
      '<p><a href="https://example.com/pricing#plans" target="_blank">our pricing</a>, ' +
      '<a href="https://www.example.com/blog/guide">the guide</a>, ' +
      '<a href="https://made-up.example/page">invented</a>, ' +
      '<a href="javascript:alert(1)">bad</a></p>';
    expect(sanitizePostHtml(html, { allowedLinks })).toBe(
      '<p><a href="https://example.com/pricing#plans">our pricing</a>, ' +
        '<a href="https://www.example.com/blog/guide">the guide</a>, invented, bad</p>',
    );
  });

  it("keeps stray h1 and h5 text as headings in range", () => {
    expect(sanitizePostHtml("<h1>Big</h1><h5>Small</h5>", { allowedLinks })).toBe("<h2>Big</h2><h4>Small</h4>");
  });

  it("escapes text so markup in content cannot run", () => {
    expect(sanitizePostHtml("<p>1 &lt; 2 &amp; &lt;b&gt;</p>", { allowedLinks })).toBe(
      "<p>1 &lt; 2 &amp; &lt;b&gt;</p>",
    );
  });
});

describe("markdown, slug and JSON-LD", () => {
  it("turns post HTML into Markdown", () => {
    const md = htmlToMarkdown(
      '<h2>Why</h2><p>It is <strong>fast</strong> and <a href="https://example.com/a">linked</a>.</p><ol><li>One</li><li>Two</li></ol>',
    );
    expect(md).toBe("## Why\n\nIt is **fast** and [linked](https://example.com/a).\n\n1. One\n2. Two\n");
  });

  it("makes clean slugs", () => {
    expect(slugify("  Invisalign Cost: What You'll Pay in 2026!  ")).toBe("invisalign-cost-what-you-ll-pay-in-2026");
    expect(slugify("Café déjà vu")).toBe("cafe-deja-vu");
  });

  it("builds an article and an FAQ block, and skips an empty FAQ", () => {
    const base = { title: "T", metaDescription: "D", language: "en", siteName: "S", siteUrl: "https://s.com" };
    const withFaq = buildJsonLd({ ...base, faq: [{ question: "Q?", answer: "A." }, { question: " ", answer: "x" }] });
    expect(withFaq.map((b) => b["@type"])).toEqual(["BlogPosting", "FAQPage"]);
    expect((withFaq[1]?.mainEntity as unknown[]).length).toBe(1);
    expect(buildJsonLd({ ...base, faq: [] })).toHaveLength(1);
    expect(jsonLdScripts([{ a: "</script>" }])).not.toContain("</script></script>");
  });
});

describe("service names", () => {
  it("are cut at a word, never mid-word", () => {
    expect(clipWords("Identifies which plugin, theme or WordPress update broke a site", 60)).toBe(
      "Identifies which plugin, theme or WordPress update broke a",
    );
    expect(clipWords("Short service", 80)).toBe("Short service");
  });

  it("keep commas inside one service when the profile is tidied", () => {
    const p = normalizeProfile(
      {
        businessType: "Plugin",
        services: ["Identifies which plugin, theme or WordPress update broke a site"],
        audience: "Site owners",
        country: "US",
        language: "en",
      } as never,
      { country: "US", language: "en" },
    );
    expect(p.services).toEqual(["Identifies which plugin, theme or WordPress update broke a site"]);
  });
});
