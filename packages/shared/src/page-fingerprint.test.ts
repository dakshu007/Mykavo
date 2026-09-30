import { describe, expect, it } from "vitest";
import { compareFingerprints, fingerprintPage, textSimilarity } from "./page-fingerprint";

const URL = "https://boutique.example/";

function page(opts: {
  title?: string;
  h1?: string;
  body?: string;
  css?: string[];
  scripts?: string[];
  robots?: string;
}): string {
  const css = (opts.css ?? ["/wp-content/themes/old/style.css?ver=1.2"])
    .map((h) => `<link rel="stylesheet" href="${h}">`)
    .join("");
  const scripts = (opts.scripts ?? ["/wp-includes/js/jquery.js?ver=3.7"])
    .map((s) => `<script src="${s}"></script>`)
    .join("");
  const robots = opts.robots ? `<meta name="robots" content="${opts.robots}">` : "";
  return `<!doctype html><html><head><title>${opts.title ?? "Harsh Designer Boutique"}</title>${robots}${css}${scripts}</head>
<body><h1>${opts.h1 ?? "Designer bridal wear"}</h1><p>${opts.body ?? LOREM}</p>
<script>window.__nonce = "${Math.random()}";</script></body></html>`;
}

const LOREM =
  "Handcrafted bridal lehengas and designer sarees stitched in our studio. Book a fitting appointment, browse the new festive collection, and follow our custom tailoring process from fabric selection to the final fitting. We deliver across the city within fourteen days of the final fitting.";

const REWRITE =
  "Welcome to our new online store. Shop ready to wear kurtis, trending co-ord sets and everyday cotton suits with free shipping on every order above the minimum. Sign up for early access to seasonal sales, track your order in real time and chat with a stylist whenever you need help.";

const fp = (html: string, status = 200) => fingerprintPage(html, status, URL);

describe("fingerprintPage", () => {
  it("reads title, h1, robots and assets without query strings", () => {
    const f = fp(page({ robots: "noindex, follow" }));
    expect(f.title).toBe("Harsh Designer Boutique");
    expect(f.h1).toBe("Designer bridal wear");
    expect(f.robots).toBe("noindex, follow");
    expect(f.assets).toEqual([
      "boutique.example/wp-content/themes/old/style.css",
      "boutique.example/wp-includes/js/jquery.js",
    ]);
    expect(f.words).toBeGreaterThan(20);
  });

  it("ignores inline script content, nonces and cache-busting versions", () => {
    const a = fp(page({}));
    const b = fp(page({ css: ["/wp-content/themes/old/style.css?ver=9.9"] }));
    expect(compareFingerprints(a, b).changed).toBe(false);
  });

  it("ignores numbers such as years, counts and timestamps", () => {
    const a = fp(page({ body: `${LOREM} Updated 3 hours ago. © 2025 Boutique.` }));
    const b = fp(page({ body: `${LOREM} Updated 5 hours ago. © 2026 Boutique.` }));
    expect(compareFingerprints(a, b).changed).toBe(false);
  });
});

describe("compareFingerprints", () => {
  it("flags a redesign: new theme assets and rewritten copy", () => {
    const before = fp(page({}));
    const after = fp(
      page({
        body: REWRITE,
        css: ["/_next/static/css/app-4f2a.css"],
        scripts: ["/_next/static/chunks/main-9c1b.js"],
      }),
    );
    const verdict = compareFingerprints(before, after);
    expect(verdict.changed).toBe(true);
    expect(verdict.reasons.join(" ")).toMatch(/replaced/);
    expect(verdict.reasons.join(" ")).toMatch(/text changed/);
  });

  it("flags a new theme even when every word is the same", () => {
    const before = fp(page({}));
    const after = fp(page({ css: ["/wp-content/themes/new/style.css"], scripts: ["/wp-content/themes/new/app.js"] }));
    expect(compareFingerprints(before, after).changed).toBe(true);
  });

  it("flags a title, H1 or robots change on its own", () => {
    const before = fp(page({}));
    expect(compareFingerprints(before, fp(page({ title: "Shop kurtis online" }))).changed).toBe(true);
    expect(compareFingerprints(before, fp(page({ h1: "Everyday wear" }))).changed).toBe(true);
    expect(compareFingerprints(before, fp(page({ robots: "noindex" }))).changed).toBe(true);
  });

  it("flags a page that starts returning errors", () => {
    expect(compareFingerprints(fp(page({})), fp(page({}), 404)).changed).toBe(true);
    expect(compareFingerprints(fp(page({})), fp(page({}), 503)).changed).toBe(true);
  });

  it("stays quiet for a one-sentence edit on a long page", () => {
    const long = Array.from({ length: 12 }, () => LOREM).join(" ") + " " + REWRITE;
    const before = fp(page({ body: long }));
    const after = fp(page({ body: long.replace("Book a fitting appointment", "Book a video consultation") }));
    expect(compareFingerprints(before, after).changed).toBe(false);
  });
});

describe("textSimilarity", () => {
  it("is 1 for identical samples and 0 for disjoint ones", () => {
    expect(textSimilarity([1, 2, 3], [1, 2, 3])).toBe(1);
    expect(textSimilarity([1, 2, 3], [4, 5, 6])).toBe(0);
  });
});
