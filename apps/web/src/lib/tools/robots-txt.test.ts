import { describe, expect, it } from "vitest";
import { isAllowed, parseRobotsTxt, patternMatches, robotsStatusEffect, rulesForAgent } from "./robots-txt";

const TXT = `# comment
User-agent: *
Disallow: /admin/
Allow: /admin/public/
Disallow: /*.pdf$
Disallow:

User-agent: Googlebot
User-agent: Bingbot
Disallow: /private

User-agent: GPTBot
Disallow: /

Sitemap: https://example.com/sitemap.xml
`;

describe("robots.txt", () => {
  const parsed = parseRobotsTxt(TXT);

  it("parses groups, shared agents, rules with line numbers and sitemaps", () => {
    expect(parsed.groups).toHaveLength(3);
    expect(parsed.groups[1].agents).toEqual(["googlebot", "bingbot"]);
    expect(parsed.groups[0].rules.map((r) => r.path)).toEqual(["/admin/", "/admin/public/", "/*.pdf$"]);
    expect(parsed.groups[0].rules[0].line).toBe(3);
    expect(parsed.sitemaps).toEqual(["https://example.com/sitemap.xml"]);
  });

  it("uses the crawler's own group, not *, when one names it", () => {
    expect(rulesForAgent(parsed, "Googlebot").matchedAgent).toBe("googlebot");
    expect(isAllowed(parsed, "Googlebot", "/admin/").allowed).toBe(true);
    expect(isAllowed(parsed, "Googlebot", "/private/x").allowed).toBe(false);
    expect(rulesForAgent(parsed, "Googlebot-Image").matchedAgent).toBe("*");
  });

  it("longest match wins, allow wins ties, wildcards and $ anchors work", () => {
    expect(isAllowed(parsed, "SomeBot", "/admin/settings").allowed).toBe(false);
    expect(isAllowed(parsed, "SomeBot", "/admin/public/page").allowed).toBe(true);
    expect(isAllowed(parsed, "SomeBot", "/files/report.pdf").allowed).toBe(false);
    expect(isAllowed(parsed, "SomeBot", "/files/report.pdf?x=1").allowed).toBe(true);
    const tie = parseRobotsTxt("User-agent: *\nDisallow: /page\nAllow: /page\n");
    expect(isAllowed(tie, "x", "/page").allowed).toBe(true);
  });

  it("blocks everything for a Disallow: / group and allows all with no rules", () => {
    expect(isAllowed(parsed, "GPTBot", "/").allowed).toBe(false);
    expect(isAllowed(parseRobotsTxt(""), "Googlebot", "/anything").allowed).toBe(true);
    expect(isAllowed(parseRobotsTxt("User-agent: Other\nDisallow: /"), "Googlebot", "/").matchedAgent).toBeNull();
  });

  it("matches patterns literally apart from * and $", () => {
    expect(patternMatches("/a.b", "/a.b/c")).toBe(true);
    expect(patternMatches("/a.b", "/axb")).toBe(false);
    expect(patternMatches("/*/x$", "/q/x")).toBe(true);
  });

  it("maps HTTP status to Google's behaviour", () => {
    expect(robotsStatusEffect(200)).toBe("parse");
    expect(robotsStatusEffect(404)).toBe("allow-all");
    expect(robotsStatusEffect(503)).toBe("disallow-all");
  });
});
