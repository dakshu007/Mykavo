import { describe, expect, it } from "vitest";
import { checkHreflangCode, extractHreflangLinks, pageLevelIssues, parseLinkHeaderHreflang, sameUrl } from "./hreflang";

describe("hreflang codes", () => {
  it("accepts language, language-region, script and x-default", () => {
    expect(checkHreflangCode("en")).toMatchObject({ valid: true, label: "English" });
    expect(checkHreflangCode("en-GB")).toMatchObject({ valid: true, label: "English (United Kingdom)" });
    expect(checkHreflangCode("pt-br").valid).toBe(true);
    expect(checkHreflangCode("zh-Hant-TW").valid).toBe(true);
    expect(checkHreflangCode("x-default").valid).toBe(true);
  });

  it("explains the common mistakes", () => {
    expect(checkHreflangCode("en-UK").problem).toContain("GB");
    expect(checkHreflangCode("en_US").problem).toContain("en-US");
    expect(checkHreflangCode("us").problem).toMatch(/country|language/);
    expect(checkHreflangCode("english").valid).toBe(false);
    expect(checkHreflangCode("en-XX").valid).toBe(false);
    expect(checkHreflangCode("en-GB-extra").valid).toBe(false);
  });
});

describe("hreflang extraction", () => {
  it("reads link tags in any attribute order and the Link header", () => {
    const html = `<link hreflang="de" rel="alternate" href="https://e.com/de/"><link rel="alternate" href="/fr/" hreflang="fr"><link rel="canonical" href="/">`;
    expect(extractHreflangLinks(html).map((l) => l.hreflang)).toEqual(["de", "fr"]);
    const header = `<https://e.com/>; rel="alternate"; hreflang="en", <https://e.com/es/>; rel="alternate"; hreflang="es", <https://e.com/style.css>; rel=preload`;
    expect(parseLinkHeaderHreflang(header)).toEqual([
      { hreflang: "en", href: "https://e.com/", source: "header" },
      { hreflang: "es", href: "https://e.com/es/", source: "header" },
    ]);
  });

  it("compares URLs ignoring a trailing slash and fragment", () => {
    expect(sameUrl("https://e.com/de", "https://e.com/de/#x")).toBe(true);
    expect(sameUrl("https://e.com/de", "https://e.com/fr")).toBe(false);
  });
});

describe("page-level issues", () => {
  it("flags missing self-reference, duplicate codes, bad codes; notes missing x-default and relative URLs", () => {
    const links = [
      { hreflang: "de", href: "https://e.com/de/", source: "html" as const },
      { hreflang: "de", href: "https://e.com/de-other/", source: "html" as const },
      { hreflang: "en-UK", href: "/uk/", source: "html" as const },
    ];
    const { issues, notes } = pageLevelIssues(links, "https://e.com/");
    expect(issues.join(" ")).toContain("doesn't list itself");
    expect(issues.join(" ")).toContain("two different URLs");
    expect(issues.join(" ")).toContain("GB");
    expect(notes.join(" ")).toContain("x-default");
    expect(notes.join(" ")).toContain("relative URL");
  });

  it("is clean for a correct set", () => {
    const links = ["en", "de", "x-default"].map((c) => ({ hreflang: c, href: c === "de" ? "https://e.com/de/" : "https://e.com/", source: "html" as const }));
    expect(pageLevelIssues(links, "https://e.com/")).toEqual({ issues: [], notes: [] });
  });
});
