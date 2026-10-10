import { describe, expect, it } from "vitest";
import { buildPageSizeReport, extractResources, firstSrcsetCandidate, formatBytes, type ExtractedResource } from "./page-size";

describe("extractResources", () => {
  it("finds scripts, stylesheets, images, preloads and iframes, deduped, with first/third party", () => {
    const html = `
      <link rel="stylesheet" href="/css/site.css">
      <link rel="preload" as="font" href="/fonts/inter.woff2" crossorigin>
      <link rel="preload" as="image" imagesrcset="/hero-800.webp 800w, /hero-1600.webp 1600w">
      <link rel="preload" as="fetch" href="/api/data.json">
      <link rel="modulepreload" href="https://cdn.example.com/app.js">
      <link rel="icon" href="/favicon.ico">
      <script src="https://www.googletagmanager.com/gtag/js?id=G-1"></script>
      <script>inline()</script>
      <img src="/logo.svg" alt="">
      <img srcset="/a-1x.jpg 1x, /a-2x.jpg 2x">
      <img src="data:image/png;base64,AAAA">
      <img src="/logo.svg#again">
      <!-- <script src="/commented.js"></script> -->
      <iframe src="https://www.youtube.com/embed/x"></iframe>`;
    const found = extractResources(html, "https://www.example.com/page");
    expect(found).toEqual<ExtractedResource[]>([
      { url: "https://www.example.com/css/site.css", type: "stylesheet", firstParty: true },
      { url: "https://www.example.com/fonts/inter.woff2", type: "font", firstParty: true },
      { url: "https://www.example.com/hero-800.webp", type: "image", firstParty: true },
      { url: "https://cdn.example.com/app.js", type: "script", firstParty: true },
      { url: "https://www.googletagmanager.com/gtag/js?id=G-1", type: "script", firstParty: false },
      { url: "https://www.example.com/logo.svg", type: "image", firstParty: true },
      { url: "https://www.example.com/a-1x.jpg", type: "image", firstParty: true },
      { url: "https://www.youtube.com/embed/x", type: "iframe", firstParty: false },
    ]);
  });

  it("reads the first srcset candidate", () => {
    expect(firstSrcsetCandidate(" /a.jpg 1x, /b.jpg 2x")).toBe("/a.jpg");
    expect(firstSrcsetCandidate("")).toBeNull();
  });
});

describe("buildPageSizeReport", () => {
  const resources: ExtractedResource[] = [
    { url: "https://e.com/app.js", type: "script", firstParty: true },
    { url: "https://cdn.other.com/lib.js", type: "script", firstParty: false },
    { url: "https://e.com/hero.jpg", type: "image", firstParty: true },
    { url: "https://e.com/huge.png", type: "image", firstParty: true },
    { url: "https://e.com/missing.css", type: "stylesheet", firstParty: true },
    { url: "https://e.com/late.woff2", type: "font", firstParty: true },
  ];

  it("totals, breaks down by type, ranks the heaviest and applies guidance", () => {
    const report = buildPageSizeReport({
      url: "https://e.com/",
      finalUrl: "https://e.com/",
      httpStatus: 200,
      htmlBytes: 150_000,
      contentEncoding: "br",
      contentLength: "30000",
      resources,
      sizes: [
        { kind: "measured", bytes: 200_000, status: 200 },
        { kind: "measured", bytes: 50_000, status: 200 },
        { kind: "measured", bytes: 1_500_000, status: 200 },
        { kind: "too-large" },
        { kind: "measured", bytes: 0, status: 404 },
      ],
    });
    expect(report.html).toEqual({ bytes: 150_000, transferBytes: 30_000, encoding: "br" });
    expect(report.requests).toBe(7);
    expect(report.firstPartyRequests).toBe(6);
    expect(report.thirdPartyRequests).toBe(1);
    expect(report.knownBytes).toBe(150_000 + 200_000 + 50_000 + 1_500_000);
    expect(report).toMatchObject({ measured: 3, unknown: 3, capped: true });
    expect(report.heaviest.map((r) => r.url)).toEqual(["https://e.com/hero.jpg", "https://e.com/app.js", "https://cdn.other.com/lib.js"]);
    expect(report.byType.find((t) => t.type === "script")).toEqual({
      type: "script",
      count: 2,
      firstParty: 1,
      thirdParty: 1,
      knownBytes: 250_000,
      unknown: 0,
    });
    expect(report.resources[4].note).toBe("Returned HTTP 404");
    expect(report.resources[5].note).toBe("Not measured");
    const g = Object.fromEntries(report.guidance.map((x) => [x.id, x.ok]));
    expect(g).toEqual({ html: false, total: false, requests: true, single: false });
  });

  it("reports no transfer size without compression and passes a lean page", () => {
    const report = buildPageSizeReport({
      url: "https://e.com/",
      finalUrl: "https://e.com/",
      httpStatus: 200,
      htmlBytes: 20_000,
      contentEncoding: null,
      contentLength: "20000",
      resources: resources.slice(0, 1),
      sizes: [{ kind: "measured", bytes: 10_000, status: 200 }],
    });
    expect(report.html.transferBytes).toBeNull();
    expect(report.capped).toBe(false);
    expect(report.guidance.every((x) => x.ok)).toBe(true);
  });

  it("formats bytes", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toBe("2.0 KB");
    expect(formatBytes(150 * 1024)).toBe("150 KB");
    expect(formatBytes(3 * 1024 * 1024)).toBe("3.00 MB");
  });
});
