import { createHash } from "node:crypto";
import type { Page } from "playwright";
import type { ArtifactStorage } from "./storage";

/**
 * Brand capture: reads a homepage's brand (name, words, colors, fonts, logo,
 * screenshots) from the page the scan has ALREADY loaded and stabilized, so
 * it costs no extra navigation, no extra SSRF surface and no AI. Runs only
 * when the worker asks for it (the homepage, when the kit is missing or old).
 *
 * Never fails a scan: every step is wrapped, and a capture that throws just
 * returns null.
 */

/** Exactly what packages/brand-video's normalizeCapture reads. */
export interface RawBrandCapture {
  url: string;
  siteName: string | null;
  title: string | null;
  headline: string | null;
  description: string | null;
  ctas: Array<{ text: string; href: string | null; background: string | null; color: string | null; area: number }>;
  navItems: string[];
  valuePoints: Array<{ title: string; text: string }>;
  stats: Array<{ value: string; label: string }>;
  backgrounds: Array<{ color: string; weight: number }>;
  foregrounds: Array<{ color: string; weight: number }>;
  bodyBackground: string | null;
  textColor: string | null;
  headingFont: string | null;
  bodyFont: string | null;
  logoBackground: string | null;
}

export interface BrandCaptureResult {
  raw: RawBrandCapture;
  logo: { key: string; width: number; height: number } | null;
  hero: { key: string } | null;
  page: { key: string; width: number; height: number } | null;
}

type InPageBrand = Omit<RawBrandCapture, "url"> & { logoFound: boolean };

/**
 * Runs inside the page (serialized with toString, so it must be fully
 * self-contained). Marks the chosen logo element with data-mykavo-logo.
 */
export function extractBrandInPage(): InPageBrand {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const limitY = vh * 2.5;
  const txt = (el: Element | null | undefined): string =>
    ((el as HTMLElement | null)?.innerText ?? el?.textContent ?? "").replace(/\s+/g, " ").trim();
  const meta = (sel: string): string | null => {
    const v = document.querySelector(sel)?.getAttribute("content");
    return v && v.trim() ? v.trim() : null;
  };
  const visible = (el: Element): DOMRect | null => {
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return null;
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none" || Number(cs.opacity) < 0.1) return null;
    return r;
  };
  const isTransparent = (c: string) => !c || c === "transparent" || /rgba\([^)]*,\s*0(\.0+)?\)$/.test(c);
  const scrollY = window.scrollY;

  // Colors weighted by on-screen area across the top of the page.
  const bgMap = new Map<string, number>();
  const fgMap = new Map<string, number>();
  const all = Array.from(document.body.querySelectorAll("*")).slice(0, 4000);
  for (const el of all) {
    const r = el.getBoundingClientRect();
    const top = r.top + scrollY;
    if (r.width < 4 || r.height < 4 || top > limitY) continue;
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") continue;
    const visH = Math.max(0, Math.min(top + r.height, limitY) - Math.max(top, 0));
    const area = Math.min(r.width, vw) * visH;
    if (!isTransparent(cs.backgroundColor) && area > 0) {
      bgMap.set(cs.backgroundColor, (bgMap.get(cs.backgroundColor) ?? 0) + area);
    }
    const tag = el.tagName;
    if (/^(H1|H2|H3|A|BUTTON)$/.test(tag) || (tag === "SPAN" && el.parentElement?.tagName.match(/^H[1-3]$/))) {
      const w = Math.min(txt(el).length, 80) * parseFloat(cs.fontSize || "16");
      if (w > 0 && !isTransparent(cs.color)) fgMap.set(cs.color, (fgMap.get(cs.color) ?? 0) + w);
    }
    if (tag === "svg" || tag === "path") {
      const fill = cs.fill;
      if (fill && fill.startsWith("rgb") && !isTransparent(fill)) fgMap.set(fill, (fgMap.get(fill) ?? 0) + 200);
    }
  }
  const toList = (m: Map<string, number>) =>
    [...m.entries()].map(([color, weight]) => ({ color, weight })).sort((a, b) => b.weight - a.weight).slice(0, 24);

  // Calls to action: real-looking buttons near the top.
  const ctas: InPageBrand["ctas"] = [];
  for (const el of Array.from(document.querySelectorAll("a, button, [role=button]"))) {
    const r = visible(el);
    if (!r || r.top + scrollY > vh * 1.6) continue;
    const text = txt(el);
    if (text.length < 2 || text.length > 40) continue;
    const cs = getComputedStyle(el);
    if (isTransparent(cs.backgroundColor)) continue;
    ctas.push({
      text,
      href: el.getAttribute("href"),
      background: cs.backgroundColor,
      color: cs.color,
      area: Math.round(r.width * r.height),
    });
    if (ctas.length >= 12) break;
  }

  // Navigation labels.
  const skipNav = /^(log ?in|sign ?in|sign ?up|register|menu|search|cart|basket|account|home|close|open menu|skip to content)$/i;
  const navItems: string[] = [];
  for (const a of Array.from(document.querySelectorAll("header a, nav a"))) {
    if (!visible(a)) continue;
    const t = txt(a);
    if (t.length < 2 || t.length > 30 || skipNav.test(t) || navItems.includes(t)) continue;
    navItems.push(t);
    if (navItems.length >= 12) break;
  }

  // Section headings and their first line.
  const valuePoints: InPageBrand["valuePoints"] = [];
  for (const h of Array.from(document.querySelectorAll("main h2, main h3, section h2, section h3, h2, h3"))) {
    if (!visible(h)) continue;
    const title = txt(h);
    if (title.length < 4 || title.length > 80 || /^\d+$/.test(title)) continue;
    if (valuePoints.some((v) => v.title === title)) continue;
    let text = "";
    let sib = h.nextElementSibling;
    for (let i = 0; i < 3 && sib && !text; i += 1, sib = sib.nextElementSibling) {
      // A short paragraph, not a whole grid of cards that happens to follow.
      if (/^H[1-6]$/.test(sib.tagName) || sib.querySelectorAll("h2, h3, h4, li").length > 0) continue;
      const t = txt(sib);
      if (t.length >= 12 && t.length <= 220) text = t;
    }
    valuePoints.push({ title, text });
    if (valuePoints.length >= 10) break;
  }

  // Numbers shown on the page, exactly as written.
  const statRe =
    /^([$€£₹]?\d[\d,.]*\s?(\+|%|k\+?|K\+?|M\+?|B\+?|x|×|\/5|\/10|★)?\+?|\d[\d,.]*\+?\s?(years?|yrs|hours?|countries|clients|customers|users|reviews|projects)\+?)$/i;
  const stats: InPageBrand["stats"] = [];
  for (const el of Array.from(document.querySelectorAll("body *")).slice(0, 6000)) {
    if (el.children.length > 1) continue;
    const value = txt(el);
    if (value.length < 1 || value.length > 16 || !statRe.test(value) || /^\d{4}$/.test(value)) continue;
    if (!visible(el)) continue;
    const parent = el.parentElement;
    let label = "";
    const next = el.nextElementSibling;
    if (next) label = txt(next);
    if (!label && parent) label = txt(parent).replace(value, "").trim();
    if (!label || label.length > 60) continue;
    if (stats.some((s) => s.value === value)) continue;
    stats.push({ value, label });
    if (stats.length >= 6) break;
  }

  // The logo: small, near the top, named "logo" or inside the home link.
  const origin = location.origin;
  const isHomeLink = (a: Element | null) => {
    const href = a?.getAttribute("href");
    if (!href) return false;
    try {
      const u = new URL(href, location.href);
      return u.origin === origin && (u.pathname === "/" || u.pathname === "") ;
    } catch {
      return false;
    }
  };
  let best: { el: Element; score: number } | null = null;
  const logoSel =
    'header img, header svg, nav img, nav svg, a img, a svg, [class*="logo" i], [id*="logo" i], img[alt*="logo" i], img[src*="logo" i]';
  for (const el of Array.from(document.querySelectorAll(logoSel)).slice(0, 300)) {
    const r = visible(el);
    if (!r || r.top + scrollY > 220 || r.width > 520 || r.height > 200 || r.width < 18 || r.height < 12) continue;
    const name = `${el.getAttribute("class") ?? ""} ${el.id} ${el.getAttribute("alt") ?? ""} ${el.getAttribute("src") ?? ""} ${el.getAttribute("aria-label") ?? ""}`.toLowerCase();
    let score = 0;
    if (name.includes("logo")) score += 3;
    if (el.closest("header, nav")) score += 2;
    if (isHomeLink(el.closest("a"))) score += 3;
    if (r.left < vw / 2) score += 1;
    if (el.tagName === "IMG" || el.tagName === "svg") score += 1;
    if (r.width < 28 && r.height < 28) score -= 2;
    if (!best || score > best.score) best = { el, score };
  }
  let logoFound = false;
  let logoBackground: string | null = null;
  if (best && best.score >= 3) {
    let target: Element = best.el;
    const link = best.el.closest("a");
    if (link && isHomeLink(link)) {
      const lr = link.getBoundingClientRect();
      if (lr.width < 440 && lr.height < 160) target = link;
    }
    target.setAttribute("data-mykavo-logo", "1");
    logoFound = true;
    for (let p: Element | null = target; p; p = p.parentElement) {
      const c = getComputedStyle(p).backgroundColor;
      if (!isTransparent(c)) {
        logoBackground = c;
        break;
      }
    }
    if (!logoBackground) logoBackground = getComputedStyle(document.body).backgroundColor;
  }

  const h1 = Array.from(document.querySelectorAll("h1")).find((h) => visible(h)) ?? null;
  const firstP = Array.from(document.querySelectorAll("p")).find((p) => visible(p) && txt(p).length > 30) ?? null;
  const bodyBg = getComputedStyle(document.body).backgroundColor;
  const htmlBg = getComputedStyle(document.documentElement).backgroundColor;

  return {
    siteName: meta('meta[property="og:site_name"]') ?? meta('meta[name="application-name"]'),
    title: document.title ? document.title.trim() : null,
    headline: h1 ? txt(h1) : null,
    description: meta('meta[name="description"]') ?? meta('meta[property="og:description"]'),
    ctas,
    navItems,
    valuePoints,
    stats,
    backgrounds: toList(bgMap),
    foregrounds: toList(fgMap),
    bodyBackground: !isTransparent(bodyBg) ? bodyBg : !isTransparent(htmlBg) ? htmlBg : null,
    textColor: getComputedStyle(firstP ?? document.body).color,
    headingFont: getComputedStyle(h1 ?? document.querySelector("h2") ?? document.body).fontFamily,
    bodyFont: getComputedStyle(firstP ?? document.body).fontFamily,
    logoBackground,
    logoFound,
  };
}

/** In-page: clear the backgrounds behind the marked logo so it captures on transparency. */
export function isolateLogoInPage(): boolean {
  const el = document.querySelector("[data-mykavo-logo]");
  if (!el) return false;
  for (let p: Element | null = el; p; p = p.parentElement) {
    (p as HTMLElement).style.setProperty("background", "transparent", "important");
    (p as HTMLElement).style.setProperty("box-shadow", "none", "important");
  }
  document.documentElement.style.setProperty("background", "transparent", "important");
  return true;
}

const sha = (b: Buffer) => createHash("sha256").update(b).digest("hex").slice(0, 32);

/** Max stored page height: enough for a long scroll, bounded for cost. */
const PAGE_MAX_HEIGHT = 5000;
const PAGE_WIDTH = 1280;

/**
 * Capture the brand from a loaded, stabilized page. Stores the logo (PNG with
 * transparency), the first screen and a full-page image under `prefix`, with
 * content-hashed names. Returns null on any failure.
 */
export async function captureBrand(
  page: Page,
  url: string,
  storage: ArtifactStorage,
  prefix: string,
  timeoutMs = 20_000,
): Promise<BrandCaptureResult | null> {
  const work = async (): Promise<BrandCaptureResult> => {
    const { default: sharp } = await import("sharp");
    await page.evaluate(() => window.scrollTo(0, 0)).catch(() => {});
    const found: InPageBrand = await page.evaluate(
      `(() => { const __name = (fn) => fn; return (${extractBrandInPage.toString()})(); })()`,
    );
    const { logoFound, ...rest } = found;
    const raw: RawBrandCapture = { url, ...rest };

    // First screen, before anything on the page is changed.
    let hero: BrandCaptureResult["hero"] = null;
    try {
      const shot = await page.screenshot({ type: "jpeg", quality: 88 });
      const out = await sharp(shot).jpeg({ quality: 80, mozjpeg: true }).toBuffer();
      const key = `${prefix}/hero-${sha(out)}.jpg`;
      await storage.put(key, out, "image/jpeg");
      hero = { key };
    } catch {
      hero = null;
    }

    let pageImg: BrandCaptureResult["page"] = null;
    try {
      const height = await page.evaluate(() => document.documentElement.scrollHeight);
      const width = page.viewportSize()?.width ?? 1440;
      const shot = await page.screenshot({
        type: "jpeg",
        quality: 82,
        ...(height > PAGE_MAX_HEIGHT ? { clip: { x: 0, y: 0, width, height: PAGE_MAX_HEIGHT } } : { fullPage: true }),
      });
      const out = await sharp(shot).resize({ width: PAGE_WIDTH, withoutEnlargement: true }).jpeg({ quality: 72, mozjpeg: true }).toBuffer();
      const meta = await sharp(out).metadata();
      const key = `${prefix}/page-${sha(out)}.jpg`;
      await storage.put(key, out, "image/jpeg");
      pageImg = { key, width: meta.width ?? PAGE_WIDTH, height: meta.height ?? 0 };
    } catch {
      pageImg = null;
    }

    let logo: BrandCaptureResult["logo"] = null;
    if (logoFound) {
      try {
        await page.evaluate(`(() => { const __name = (fn) => fn; return (${isolateLogoInPage.toString()})(); })()`);
        const shot = await page.locator("[data-mykavo-logo]").first().screenshot({ type: "png", omitBackground: true, timeout: 5000 });
        const trimmed = await sharp(shot).trim().png().toBuffer().catch(() => shot);
        const out = await sharp(trimmed).resize({ height: 240, withoutEnlargement: true }).png({ compressionLevel: 9 }).toBuffer();
        const meta = await sharp(out).metadata();
        if ((meta.width ?? 0) >= 12 && (meta.height ?? 0) >= 8) {
          const key = `${prefix}/logo-${sha(out)}.png`;
          await storage.put(key, out, "image/png");
          logo = { key, width: meta.width ?? 0, height: meta.height ?? 0 };
        }
      } catch {
        logo = null;
      }
    }
    return { raw, logo, hero, page: pageImg };
  };

  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work(),
      new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), timeoutMs);
      }),
    ]);
  } catch (err) {
    console.warn(`[brand] capture failed for ${url}: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}
