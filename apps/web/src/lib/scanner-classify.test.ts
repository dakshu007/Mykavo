/**
 * Guards the link/script classification logic the scanner relies on
 * (same-origin detection + normalization). The scanner's page-side
 * extraction runs in a browser, but classification is pure and testable.
 */

import { describe, expect, it } from "vitest";
import { isSameOrigin, normalizeUrl } from "@/lib/url";

function classifyLinks(hrefs: string[], baseUrl: string) {
  const base = new URL(baseUrl);
  const seen = new Set<string>();
  return hrefs.flatMap((href) => {
    try {
      const u = new URL(href);
      const normalized = normalizeUrl(u);
      if (seen.has(normalized)) return [];
      seen.add(normalized);
      return [
        {
          normalizedUrl: normalized,
          linkType: isSameOrigin(u, base) ? "INTERNAL" : "EXTERNAL",
        },
      ];
    } catch {
      return [];
    }
  });
}

describe("scanner link classification", () => {
  const base = "https://shop.example.com/";

  it("labels same-origin links INTERNAL and others EXTERNAL", () => {
    const result = classifyLinks(
      [
        "https://shop.example.com/products",
        "https://shop.example.com/products", // dup after normalization
        "https://www.example.com/other-subdomain",
        "https://google.com/",
      ],
      base,
    );
    expect(result).toEqual([
      { normalizedUrl: "https://shop.example.com/products", linkType: "INTERNAL" },
      { normalizedUrl: "https://www.example.com/other-subdomain", linkType: "EXTERNAL" },
      { normalizedUrl: "https://google.com/", linkType: "EXTERNAL" },
    ]);
  });

  it("deduplicates links that normalize identically", () => {
    const result = classifyLinks(
      [
        "https://shop.example.com/p?utm_source=x",
        "https://shop.example.com/p/",
        "https://shop.example.com/p#reviews",
      ],
      base,
    );
    expect(result).toHaveLength(1);
  });
});
