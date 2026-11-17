import { describe, expect, it } from "vitest";
import {
  BASE_SIZE,
  brandKitEdit,
  brandNameFrom,
  composeVideoHtml,
  contrast,
  firstFontFamily,
  normalizeCapture,
  normalizeStoryboard,
  outputSize,
  readableOn,
  safeAssetUrl,
  sceneTimeline,
  templateStoryboard,
  toHex,
  totalDuration,
  videoLimitsFor,
  type RawBrandCapture,
  type Storyboard,
  type StoryboardContext,
} from "./pure";
import { toStoryboard } from "./script";

const RAW: RawBrandCapture = {
  url: "https://www.brightleaf.example/",
  siteName: null,
  title: "Brightleaf | Bookkeeping for small businesses",
  headline: "Bookkeeping that never keeps you up at night",
  description: "Brightleaf does your bookkeeping, payroll and taxes.",
  ctas: [{ text: "Book a free call", href: "/signup", background: "rgb(232, 116, 59)", color: "#fff", area: 5000 }],
  navItems: ["Bookkeeping", "Payroll", "Payroll", "x"],
  valuePoints: [
    { title: "Monthly reports", text: "Clear profit and loss." },
    { title: "monthly reports", text: "dup" },
    { title: "A dedicated accountant", text: "" },
  ],
  stats: [{ value: "1,200+", label: "businesses served" }],
  backgrounds: [
    { color: "rgb(251, 250, 246)", weight: 900000 },
    { color: "rgba(0, 0, 0, 0)", weight: 999999 },
    { color: "rgb(15, 61, 46)", weight: 200000 },
  ],
  foregrounds: [{ color: "rgb(15, 61, 46)", weight: 5000 }],
  bodyBackground: "rgb(251, 250, 246)",
  textColor: "rgb(29, 43, 36)",
  headingFont: '"__Manrope_a1b2c3", "__Manrope_Fallback_a1b2c3", system-ui',
  bodyFont: "-apple-system, BlinkMacSystemFont, sans-serif",
  logoBackground: "rgb(15, 61, 46)",
};

const CTX: StoryboardContext = {
  target: 30,
  hasHero: true,
  hasPage: false,
  stats: [{ value: "1,200+", label: "businesses served" }],
  brandName: "Brightleaf",
  ctaText: "Book a free call",
};

function plan(scenes: Array<Partial<Storyboard["scenes"][number]> & { type: Storyboard["scenes"][number]["type"] }>): Storyboard {
  return {
    version: 1,
    title: "Test",
    scenes: scenes.map((s, i) => ({
      id: `x${i}`,
      duration: 4,
      kicker: "",
      title: "",
      text: "",
      highlight: "",
      button: "",
      items: [],
      ...s,
    })),
  };
}

describe("colors", () => {
  it("parses css colors and ignores transparent ones", () => {
    expect(toHex("rgb(232, 116, 59)")).toBe("#e8743b");
    expect(toHex("#ABC")).toBe("#aabbcc");
    expect(toHex("rgba(0, 0, 0, 0)")).toBeNull();
    expect(toHex("rgba(10, 20, 30, 0.9)")).toBe("#0a141e");
    expect(toHex("red; background:url(x)")).toBeNull();
  });

  it("picks readable text", () => {
    expect(readableOn("#ffffff")).toBe("#111111");
    expect(readableOn("#0f3d2e")).toBe("#ffffff");
    expect(contrast(readableOn("#e8743b"), "#e8743b")).toBeGreaterThanOrEqual(4.5);
  });
});

describe("normalizeCapture", () => {
  const kit = normalizeCapture(RAW);

  it("takes the brand name from the title and the primary color from the main button", () => {
    expect(kit.name).toBe("Brightleaf");
    expect(kit.colors.primary).toBe("#e8743b");
    expect(kit.colors.background).toBe("#fbfaf6");
    expect(kit.ctaText).toBe("Book a free call");
    expect(kit.ctaUrl).toBe("https://www.brightleaf.example/signup");
  });

  it("dedupes words and cleans build-tool font names", () => {
    expect(kit.valuePoints.map((v) => v.title)).toEqual(["Monthly reports", "A dedicated accountant"]);
    expect(kit.services).toEqual(["Bookkeeping", "Payroll"]);
    expect(kit.headingFont).toBe("Manrope");
    expect(kit.bodyFont).toBeNull();
  });

  it("produces a kit the editor schema accepts", () => {
    const parsed = brandKitEdit.safeParse(kit);
    expect(parsed.success).toBe(true);
  });

  it("falls back to the hostname for a name", () => {
    expect(brandNameFrom({ siteName: null, title: null, url: "https://www.acme-tools.com/x" })).toBe("Acme-tools");
  });

  it("refuses unsafe font names", () => {
    expect(firstFontFamily('"Evil\\"; } body{x:y", serif')).toBeNull();
  });
});

describe("normalizeStoryboard", () => {
  it("always opens on the logo and closes on the call to action", () => {
    const sb = normalizeStoryboard(plan([{ type: "headline", title: "Hello there" }]), CTX);
    expect(sb.scenes[0]!.type).toBe("logo");
    expect(sb.scenes.at(-1)!.type).toBe("cta");
    expect(sb.scenes.at(-1)!.button).toBe("Book a free call");
    expect(sb.scenes.map((s) => s.id)).toEqual(["s1", "s2", "s3"]);
  });

  it("drops numbers that are not on the website", () => {
    const sb = normalizeStoryboard(
      plan([
        { type: "logo" },
        {
          type: "stats",
          items: [
            { title: "1,200 +", text: "businesses" },
            { title: "10x", text: "invented" },
          ],
        },
        { type: "stats", items: [{ title: "99%", text: "invented" }] },
        { type: "cta" },
      ]),
      CTX,
    );
    const stats = sb.scenes.filter((s) => s.type === "stats");
    expect(stats).toHaveLength(1);
    expect(stats[0]!.items).toEqual([{ title: "1,200+", text: "businesses" }]);
  });

  it("drops scenes that need a missing screenshot or have too few items", () => {
    const sb = normalizeStoryboard(
      plan([
        { type: "scroll", title: "x" },
        { type: "screen", title: "y" },
        { type: "features", items: [{ title: "one", text: "" }] },
        { type: "services", items: [{ title: "a", text: "" }, { title: "b", text: "" }] },
      ]),
      CTX,
    );
    expect(sb.scenes.map((s) => s.type)).toEqual(["logo", "screen", "cta"]);
  });

  it("fits durations to the target within each scene's range", () => {
    const sb = templateStoryboard(normalizeCapture(RAW), { ...CTX, target: 30 });
    expect(totalDuration(sb)).toBeLessThanOrEqual(30);
    expect(totalDuration(sb)).toBeGreaterThan(20);
    const long = templateStoryboard(
      { ...normalizeCapture(RAW), valuePoints: Array.from({ length: 6 }, (_, i) => ({ title: `Point ${i}`, text: "x" })) },
      { ...CTX, target: 60, hasPage: true },
    );
    // Few scenes: a slightly shorter video, never padded past each scene's range.
    expect(totalDuration(long)).toBeLessThanOrEqual(60);
    expect(totalDuration(long)).toBeGreaterThan(45);
  });

  it("clears a highlight that is not in the title", () => {
    const sb = normalizeStoryboard(plan([{ type: "headline", title: "Fast books", highlight: "slow" }]), CTX);
    expect(sb.scenes[1]!.highlight).toBe("");
  });

  it("cuts AI fields to their limits", () => {
    const sb = toStoryboard(
      {
        title: "",
        scenes: [
          { type: "headline", seconds: Number.NaN, kicker: "k".repeat(80), title: "word ".repeat(60), text: "", highlight: "", button: "", items: [] },
        ],
      },
      "Fallback",
    );
    expect(sb.title).toBe("Fallback");
    expect(sb.scenes[0]!.title.length).toBeLessThanOrEqual(110);
    expect(sb.scenes[0]!.kicker.length).toBeLessThanOrEqual(40);
    expect(Number.isFinite(sb.scenes[0]!.duration)).toBe(true);
  });
});

describe("composeVideoHtml", () => {
  const brand = {
    name: "Bright<leaf>",
    colors: { primary: "#e8743b", accent: "#0f3d2e", background: "#fbfaf6", surface: "#f2f2ee", text: "#1d2b24" },
    headingFont: "Manrope",
    bodyFont: null,
    logoBackground: "#0f3d2e",
    domain: "brightleaf.example",
  };
  const assets = { logo: null, logoWidth: null, logoHeight: null, hero: null, page: null, pageWidth: null, pageHeight: null };

  it("escapes every piece of text", () => {
    const sb = normalizeStoryboard(
      plan([{ type: "headline", title: `<img src=x onerror="alert(1)">` }, { type: "cta", title: "</script><script>alert(2)</script>" }]),
      CTX,
    );
    const html = composeVideoHtml(sb, brand, assets, { format: "landscape", watermark: false, mode: "render" });
    expect(html).not.toContain("<img src=x");
    expect(html).not.toContain("<script>alert(2)");
    expect(html).toContain("Bright&lt;leaf&gt;");
  });

  it("refuses unsafe asset urls and colors", () => {
    expect(safeAssetUrl("javascript:alert(1)")).toBeNull();
    expect(safeAssetUrl('https://x.test/a.png" onerror="x')).toBeNull();
    expect(safeAssetUrl("data:image/svg+xml;base64,PHN2Zz4=")).toBeNull();
    expect(safeAssetUrl("data:image/png;base64,iVBORw0KGgo=")).toBe("data:image/png;base64,iVBORw0KGgo=");
    const sb = templateStoryboard(normalizeCapture(RAW), CTX);
    const html = composeVideoHtml(
      sb,
      { ...brand, colors: { ...brand.colors, primary: "red;}</style><script>x()</script>" } },
      { ...assets, logo: "javascript:alert(1)" },
      { format: "landscape", watermark: false, mode: "render" },
    );
    expect(html).not.toContain("javascript:");
    expect(html).not.toContain("<script>x()");
  });

  it("adds the watermark only when asked", () => {
    const sb = templateStoryboard(normalizeCapture(RAW), CTX);
    expect(composeVideoHtml(sb, brand, assets, { format: "square", watermark: true, mode: "render" })).toContain("Made with <b>MyKavo</b>");
    expect(composeVideoHtml(sb, brand, assets, { format: "square", watermark: false, mode: "render" })).not.toContain("Made with");
  });

  it("gives each scene a window on one clock", () => {
    const sb = templateStoryboard(normalizeCapture(RAW), CTX);
    const tl = sceneTimeline(sb);
    expect(tl[0]!.start).toBe(0);
    for (let i = 1; i < tl.length; i += 1) expect(tl[i]!.start).toBe(tl[i - 1]!.end);
    expect(tl.at(-1)!.end).toBeCloseTo(totalDuration(sb), 1);
  });
});

describe("limits", () => {
  it("watermarks Free and trials, not paid plans", () => {
    expect(videoLimitsFor("free", false).watermark).toBe(true);
    expect(videoLimitsFor("pro", true).watermark).toBe(true);
    expect(videoLimitsFor("starter", false).watermark).toBe(false);
    expect(videoLimitsFor("unknown", false)).toEqual(videoLimitsFor("free", false));
  });

  it("renders 1080p at 1.5x the canvas", () => {
    expect(outputSize("landscape", 1080)).toEqual({ width: 1920, height: 1080, scale: 1.5 });
    expect(outputSize("portrait", 720)).toEqual({ ...BASE_SIZE.portrait, scale: 1 });
  });
});
