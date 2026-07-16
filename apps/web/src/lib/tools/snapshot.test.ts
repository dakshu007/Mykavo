import { describe, expect, it } from "vitest";
import type { SafeFetchResult } from "@/lib/security/ssrf";
import { diffSnapshots, extractSnapshot, type PageToolSnapshot } from "./snapshot";

const HTML = `<!doctype html>
<html>
<head>
  <title>Aurora Outdoor - Tents &amp; Gear</title>
  <meta name="description" content="Quality tents and camping gear.">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="https://aurora-outdoor.com/">
  <script src="https://www.googletagmanager.com/gtm.js?id=GTM-XYZ"></script>
  <script src="/js/app.js"></script>
</head>
<body>
  <h1>Aurora <b>Outdoor</b></h1>
  <a href="/collections/tents">Tents</a>
  <a href="/pricing">Pricing</a>
  <a href="https://instagram.com/aurora">IG</a>
  <a href="#top">Top</a>
  <a href="mailto:hi@aurora-outdoor.com">Mail</a>
</body>
</html>`;

function fetched(overrides: Partial<SafeFetchResult> = {}): SafeFetchResult {
  return {
    finalUrl: "https://aurora-outdoor.com/",
    status: 200,
    headers: new Headers(),
    body: HTML,
    bodyBytes: HTML.length,
    redirectChain: [],
    responseTimeMs: 120,
    ...overrides,
  };
}

describe("extractSnapshot", () => {
  const snap = extractSnapshot(fetched(), "https://aurora-outdoor.com/");

  it("extracts SEO metadata with entity decoding and tag stripping", () => {
    expect(snap.title).toBe("Aurora Outdoor - Tents & Gear");
    expect(snap.metaDescription).toBe("Quality tents and camping gear.");
    expect(snap.canonicalUrl).toBe("https://aurora-outdoor.com/");
    expect(snap.robotsMeta).toBe("index, follow");
    expect(snap.h1Values).toEqual(["Aurora Outdoor"]);
  });

  it("counts internal vs external links, ignoring anchors and mailto", () => {
    expect(snap.internalLinkCount).toBe(2);
    expect(snap.externalLinkCount).toBe(1);
  });

  it("identifies third-party scripts and known services", () => {
    expect(snap.scripts).toHaveLength(2);
    const gtm = snap.scripts.find((s) => s.service === "Google Tag Manager");
    expect(gtm?.isThirdParty).toBe(true);
    const own = snap.scripts.find((s) => s.src === "https://aurora-outdoor.com/js/app.js");
    expect(own?.isThirdParty).toBe(false);
  });
});

describe("diffSnapshots severity rules", () => {
  const base = extractSnapshot(fetched(), "https://aurora-outdoor.com/");

  function mutate(overrides: Partial<PageToolSnapshot>): PageToolSnapshot {
    return { ...base, ...overrides };
  }

  it("reports no diffs for identical snapshots", () => {
    expect(diffSnapshots(base, mutate({}))).toEqual([]);
  });

  it("200 → 404 is CRITICAL (spec §19)", () => {
    const diffs = diffSnapshots(base, mutate({ httpStatus: 404 }));
    expect(diffs[0]).toMatchObject({ label: "HTTP status", severity: "CRITICAL" });
  });

  it("index → noindex is CRITICAL (spec §19)", () => {
    const diffs = diffSnapshots(base, mutate({ robotsMeta: "noindex, nofollow" }));
    expect(diffs[0]).toMatchObject({ label: "Robots meta", severity: "CRITICAL" });
  });

  it("title changed is MEDIUM, title removed is HIGH (spec §19)", () => {
    expect(diffSnapshots(base, mutate({ title: "New Title" }))[0]).toMatchObject({
      severity: "MEDIUM",
    });
    expect(diffSnapshots(base, mutate({ title: null }))[0]).toMatchObject({
      severity: "HIGH",
    });
  });

  it("canonical changed is HIGH (spec §19)", () => {
    const diffs = diffSnapshots(
      base,
      mutate({ canonicalUrl: "https://aurora-outdoor.com/home" }),
    );
    expect(diffs[0]).toMatchObject({ label: "Canonical URL", severity: "HIGH" });
  });

  it("known-service script removal is HIGH (spec §21)", () => {
    const diffs = diffSnapshots(
      base,
      mutate({ scripts: base.scripts.filter((s) => s.service !== "Google Tag Manager") }),
    );
    expect(diffs[0]).toMatchObject({
      label: "Google Tag Manager script removed",
      severity: "HIGH",
    });
  });

  it("page weight +>50% is HIGH, +>20% is MEDIUM (spec §22)", () => {
    expect(
      diffSnapshots(base, mutate({ pageWeightBytes: base.pageWeightBytes * 1.6 }))[0],
    ).toMatchObject({ severity: "HIGH" });
    expect(
      diffSnapshots(base, mutate({ pageWeightBytes: base.pageWeightBytes * 1.3 }))[0],
    ).toMatchObject({ severity: "MEDIUM" });
    expect(
      diffSnapshots(base, mutate({ pageWeightBytes: base.pageWeightBytes * 1.1 })),
    ).toEqual([]);
  });

  it("sorts results by severity, most severe first", () => {
    const diffs = diffSnapshots(
      base,
      mutate({ httpStatus: 500, title: "Changed", externalLinkCount: 5 }),
    );
    expect(diffs.map((d) => d.severity)).toEqual(["CRITICAL", "MEDIUM", "INFO"]);
  });
});
