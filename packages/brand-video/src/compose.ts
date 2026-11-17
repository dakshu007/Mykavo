import type { BrandColors } from "./brand";
import { contrast, distance, isDark, isHex, mix, readableOn } from "./color";
import { BASE_SIZE, type VideoFormat } from "./limits";
import type { Scene, Storyboard } from "./storyboard";

/**
 * Turns a scene plan and a brand into ONE self-contained HTML document: the
 * dashboard plays it live in a sandboxed iframe (mode "preview"), and the
 * worker steps it frame by frame into an MP4 (mode "render"). Same document,
 * so the preview is exactly the export.
 *
 * Every animation is a CSS animation on one shared clock. Seeking is
 * `document.getAnimations()` with each animation paused and its currentTime
 * set, so frame N is always the same picture: no timers, no real time.
 *
 * Safety: all text is HTML-escaped; colors must be #rrggbb; font names are
 * letters, digits, spaces and hyphens only; image sources must be data:
 * images or https URLs without quotes or brackets. Nothing from a scanned
 * page or the AI reaches the document unescaped.
 */

export interface VideoBrand {
  name: string;
  colors: BrandColors;
  headingFont: string | null;
  bodyFont: string | null;
  logoBackground: string | null;
  /** Shown on the end card, e.g. "acme.com". */
  domain: string;
}

export interface VideoAssets {
  logo: string | null;
  logoWidth: number | null;
  logoHeight: number | null;
  /** The homepage's first screen (1440x900). */
  hero: string | null;
  /** The whole homepage, top to bottom (1440 wide). */
  page: string | null;
  pageWidth: number | null;
  pageHeight: number | null;
}

export interface ComposeOptions {
  format: VideoFormat;
  watermark: boolean;
  mode: "preview" | "render";
}

export interface SceneTiming {
  id: string;
  type: Scene["type"];
  start: number;
  end: number;
}

export function sceneTimeline(sb: Pick<Storyboard, "scenes">): SceneTiming[] {
  let t = 0;
  return sb.scenes.map((s) => {
    const start = t;
    t += s.duration;
    return { id: s.id, type: s.type, start: round(start), end: round(t) };
  });
}

function round(n: number, places = 3): number {
  const f = 10 ** places;
  return Math.round(n * f) / f;
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const DATA_IMAGE = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;

/** A source the document may load: a data: image, or an https URL with no characters that could break out. */
export function safeAssetUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (DATA_IMAGE.test(url)) return url;
  if (/^https:\/\/[^\s"'<>()\\`]+$/.test(url)) return url;
  // Same-origin API paths (the dashboard preview).
  if (/^\/api\/[A-Za-z0-9/_\-.?=&%]+$/.test(url)) return url;
  return null;
}

const FONT_OK = /^[A-Za-z0-9][A-Za-z0-9 -]{0,59}$/;

function fontStack(font: string | null): string {
  const f = font && FONT_OK.test(font) ? `"${font}", ` : "";
  return `${f}"Inter", system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`;
}

/** Google Fonts links: the family at its default weight, and bold separately, so a missing weight never fails the whole request. */
function fontLinks(fonts: Array<string | null>): string {
  const families = [...new Set(["Inter", ...fonts.filter((f): f is string => Boolean(f && FONT_OK.test(f)))])];
  const links: string[] = [];
  for (const f of families) {
    const fam = encodeURIComponent(f).replace(/%20/g, "+");
    links.push(`<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=${fam}:wght@400;500;600&display=block">`);
    links.push(`<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=${fam}:wght@700;800&display=block">`);
  }
  return links.join("\n");
}

interface Palette {
  base: string;
  onBase: string;
  surface: string;
  onSurface: string;
  brand: string;
  onBrand: string;
  primary: string;
  onPrimary: string;
  accent: string;
  /** Emphasis color on the base background. */
  hlBase: string;
  /** Emphasis color on the brand background. */
  hlBrand: string;
}

function safeColors(c: BrandColors): BrandColors {
  const pick = (v: string, fallback: string) => (isHex(v) ? v : fallback);
  return {
    primary: pick(c.primary, "#2563eb"),
    accent: pick(c.accent, "#f59e0b"),
    background: pick(c.background, "#ffffff"),
    surface: pick(c.surface, "#f4f4f5"),
    text: pick(c.text, "#111111"),
  };
}

export function paletteFor(colors: BrandColors): Palette {
  const c = safeColors(colors);
  const base = c.background;
  const onBase = readableOn(base, c.text);
  const surface = distance(c.surface, base) > 6 ? c.surface : mix(base, onBase, isDark(base) ? 0.08 : 0.04);
  // A brand-colored scene needs a brand color that stands apart from the base.
  const brand =
    distance(c.primary, base) > 70 ? c.primary : isDark(base) ? mix(c.primary, "#ffffff", 0.2) : mix(c.primary, "#000000", 0.35);
  const onBrand = readableOn(brand);
  const onPrimary = readableOn(c.primary);
  const hlBase = contrast(c.primary, base) >= 2.2 ? c.primary : contrast(c.accent, base) >= 2.2 ? c.accent : onBase;
  const hlBrand = contrast(c.accent, brand) >= 2 && distance(c.accent, brand) > 80 ? c.accent : onBrand;
  return { base, onBase, surface, onSurface: readableOn(surface, c.text), brand, onBrand, primary: c.primary, onPrimary, accent: c.accent, hlBase, hlBrand };
}

type Tone = "base" | "surface" | "brand";
const TONE: Record<Scene["type"], Tone> = {
  logo: "base",
  headline: "brand",
  statement: "surface",
  screen: "surface",
  scroll: "base",
  features: "base",
  list: "surface",
  stats: "brand",
  services: "base",
  cta: "brand",
};

/** Builds `animation` declarations on the shared clock. */
function anim(name: string, start: number, duration: number, ease = "cubic-bezier(.2,.8,.2,1)", extra = ""): string {
  return `animation:${name} ${round(duration)}s ${ease} ${round(start)}s both${extra ? ` ${extra}` : ""};`;
}

/** Title size in --u units: longer text gets smaller, each scene type has its own scale. */
function titleSize(text: string, format: VideoFormat, scale = 1): number {
  const n = text.length;
  let size = n > 90 ? 5.6 : n > 60 ? 6.8 : n > 40 ? 8.4 : n > 24 ? 9.6 : 11.2;
  size *= scale;
  if (format === "portrait") size *= 0.8;
  if (format === "square") size *= 0.92;
  return round(size, 2);
}

/** Wraps each word for staggered entry; words inside `highlight` get a marker. */
function words(text: string, start: number, step: number, highlight: string, hlColor: string): string {
  const list = text.split(/\s+/).filter(Boolean);
  const lower = text.toLowerCase();
  const hl = highlight.trim().toLowerCase();
  const hlStart = hl ? lower.indexOf(hl) : -1;
  const hlEnd = hlStart >= 0 ? hlStart + hl.length : -1;
  let cursor = 0;
  return list
    .map((w, i) => {
      const at = lower.indexOf(w.toLowerCase(), cursor);
      cursor = at + w.length;
      const inHl = hlStart >= 0 && at < hlEnd && at + w.length > hlStart;
      const t = start + i * step;
      const inner = inHl
        ? `<span class="hlw"><span class="mk" style="background:${hlColor};${anim("mk-line", t + 0.35, 0.5)}"></span><span class="hlt">${escapeHtml(w)}</span></span>`
        : escapeHtml(w);
      return `<span class="w" style="${anim("mk-word", t, 0.7)}">${inner}</span>`;
    })
    .join(" ");
}

function blobs(p: Palette, tone: Tone, start: number, duration: number, seed: number): string {
  const a = tone === "brand" ? p.accent : p.primary;
  const b = tone === "brand" ? mix(p.brand, "#ffffff", 0.35) : p.accent;
  const corners = [
    ["-12%", "-18%", "auto", "auto"],
    ["auto", "auto", "-16%", "-14%"],
    ["-14%", "auto", "auto", "-12%"],
    ["auto", "-16%", "-18%", "auto"],
  ] as const;
  const c1 = corners[seed % 4]!;
  const c2 = corners[(seed + 2) % 4]!;
  const pos = (c: readonly [string, string, string, string]) => `top:${c[0]};left:${c[1]};bottom:${c[2]};right:${c[3]};`;
  return (
    `<div class="blob" style="${pos(c1)}background:radial-gradient(circle,${a} 0%,transparent 68%);${anim("mk-drift", start, duration + 0.6, "ease-in-out")}"></div>` +
    `<div class="blob b2" style="${pos(c2)}background:radial-gradient(circle,${b} 0%,transparent 68%);${anim("mk-drift2", start, duration + 0.6, "ease-in-out")}"></div>`
  );
}

interface Ctx {
  sb: Storyboard;
  brand: VideoBrand;
  assets: VideoAssets;
  format: VideoFormat;
  p: Palette;
  W: number;
  H: number;
}

function logoMarkup(ctx: Ctx, sizeU: number, tone: Tone): string {
  const src = safeAssetUrl(ctx.assets.logo);
  const bg = tone === "brand" ? ctx.p.brand : tone === "surface" ? ctx.p.surface : ctx.p.base;
  if (!src) {
    const color = tone === "brand" ? ctx.p.onBrand : ctx.p.onBase;
    return `<div class="wordmark" style="color:${color};font-size:calc(var(--u)*${round(sizeU * 0.55, 2)})">${escapeHtml(ctx.brand.name)}</div>`;
  }
  const w = ctx.assets.logoWidth ?? 0;
  const h = ctx.assets.logoHeight ?? 0;
  const ratio = w > 0 && h > 0 ? w / h : 3;
  // Wide logos are limited by width, tall ones by height.
  const maxW = ctx.format === "portrait" ? 62 : 46;
  const height = round(Math.min(sizeU, maxW / ratio), 2);
  const lb = ctx.brand.logoBackground && isHex(ctx.brand.logoBackground) ? ctx.brand.logoBackground : null;
  // The logo was captured on its own header color; if that differs from the
  // scene, it sits on a chip of that color so it stays readable.
  const chip = lb && distance(lb, bg) > 40;
  const img = `<img class="logo" alt="" src="${escapeHtml(src)}" style="height:calc(var(--u)*${height})">`;
  return chip ? `<div class="chip" style="background:${lb}">${img}</div>` : img;
}

function frame(ctx: Ctx, inner: string, widthPx: number, viewportPx: number, style: string): string {
  const barColor = mix(ctx.p.surface, ctx.p.onSurface, 0.06);
  return (
    `<div class="frame" style="width:${round(widthPx, 1)}px;${style}">` +
    `<div class="bar" style="background:${barColor}"><i></i><i></i><i></i><span class="url" style="background:${ctx.p.base};color:${mix(ctx.p.onBase, ctx.p.base, 0.35)}">${escapeHtml(ctx.brand.domain)}</span></div>` +
    `<div class="vp" style="height:${round(viewportPx, 1)}px;background:${ctx.p.base}">${inner}</div></div>`
  );
}

function sceneHtml(ctx: Ctx, s: Scene, start: number, index: number): string {
  const { p, format } = ctx;
  const tone = TONE[s.type];
  const bg = tone === "brand" ? p.brand : tone === "surface" ? p.surface : p.base;
  const fg = tone === "brand" ? p.onBrand : tone === "surface" ? p.onSurface : p.onBase;
  const hl = tone === "brand" ? p.hlBrand : p.hlBase;
  const muted = mix(fg, bg, 0.3);
  const d = s.duration;
  const t = (offset: number) => start + offset;
  const stack = format === "landscape" ? "row" : "col";
  let body = "";

  const kicker = s.kicker
    ? `<div class="kicker" style="color:${tone === "brand" ? p.onBrand : p.primary};border-color:${mix(fg, bg, 0.7)};${anim("mk-up", t(0.1), 0.6)}">${escapeHtml(s.kicker)}</div>`
    : "";
  const sub = (text: string, at: number, size = 3) =>
    text ? `<p class="sub" style="color:${muted};font-size:calc(var(--u)*${size});${anim("mk-up", t(at), 0.7)}">${escapeHtml(text)}</p>` : "";

  switch (s.type) {
    case "logo": {
      body =
        `<div class="center">` +
        `<div class="ring" style="border-color:${p.primary};${anim("mk-ring", t(0.15), 1.4, "cubic-bezier(.1,.7,.2,1)")}"></div>` +
        `<div style="${anim("mk-pop", t(0.2), 0.9)}">${logoMarkup(ctx, 14, tone)}</div>` +
        (safeAssetUrl(ctx.assets.logo) && s.title && s.title.toLowerCase() !== ctx.brand.name.toLowerCase()
          ? `<div class="name" style="${anim("mk-up", t(0.7), 0.7)}">${escapeHtml(s.title)}</div>`
          : "") +
        sub(s.text, 0.9, 3.4) +
        `</div>`;
      break;
    }
    case "headline":
    case "statement": {
      const size = titleSize(s.title, format, s.type === "headline" ? 1 : 0.86);
      const step = s.type === "headline" ? 0.09 : 0.06;
      body =
        `<div class="center ${s.type === "statement" ? "left" : ""}">` +
        kicker +
        `<h1 class="title" style="font-size:calc(var(--u)*${size})">${words(s.title, t(0.25), step, s.highlight, hl)}</h1>` +
        sub(s.text, 0.5 + s.title.split(/\s+/).length * step, 3.2) +
        `</div>`;
      break;
    }
    case "screen": {
      const hero = safeAssetUrl(ctx.assets.hero);
      const fw = format === "landscape" ? ctx.W * 0.56 : ctx.W * (format === "portrait" ? 0.88 : 0.76);
      const vh = fw * (900 / 1440);
      const img = hero ? `<img class="shot" alt="" src="${escapeHtml(hero)}" style="${anim("mk-kenburns", t(0.3), d + 0.4, "linear")}">` : "";
      const text =
        `<div class="copy">${kicker}<h2 class="title" style="font-size:calc(var(--u)*${titleSize(s.title, format, 0.72)})">${words(s.title, t(0.2), 0.07, s.highlight, hl)}</h2>${sub(s.text, 0.7)}</div>`;
      body =
        `<div class="split ${stack}">${text}` +
        frame(ctx, img, fw, vh, `${anim(format === "landscape" ? "mk-frame-in" : "mk-frame-up", t(0.15), 1.0)}`) +
        `</div>`;
      break;
    }
    case "scroll": {
      const page = safeAssetUrl(ctx.assets.page);
      const fw = format === "landscape" ? ctx.W * 0.66 : ctx.W * (format === "portrait" ? 0.88 : 0.8);
      const vh = format === "landscape" ? ctx.H * 0.6 : format === "portrait" ? ctx.H * 0.56 : ctx.H * 0.56;
      const pw = ctx.assets.pageWidth && ctx.assets.pageWidth > 0 ? ctx.assets.pageWidth : 1440;
      const ph = ctx.assets.pageHeight && ctx.assets.pageHeight > 0 ? ctx.assets.pageHeight : 0;
      const shown = (fw * ph) / pw;
      const dist = Math.max(0, Math.min(shown - vh, vh * 3.2));
      const img = page
        ? `<img class="page" alt="" src="${escapeHtml(page)}" style="--dist:${round(-dist, 1)}px;${dist > 40 ? anim("mk-scroll", t(0.9), Math.max(1, d - 1.6), "cubic-bezier(.45,0,.25,1)") : anim("mk-kenburns", t(0.3), d, "linear")}">`
        : "";
      body =
        `<div class="stackc">` +
        (s.title
          ? `<h2 class="title cap" style="font-size:calc(var(--u)*${titleSize(s.title, format, 0.6)});${anim("mk-up", t(0.15), 0.6)}">${escapeHtml(s.title)}</h2>`
          : "") +
        frame(ctx, img, fw, vh, anim("mk-frame-up", t(0.2), 0.9)) +
        `</div>`;
      break;
    }
    case "features": {
      const cards = s.items
        .map((it, i) => {
          const at = t(0.55 + i * 0.22);
          return (
            `<div class="card" style="background:${tone === "base" ? p.surface : p.base};color:${tone === "base" ? p.onSurface : p.onBase};${anim("mk-card", at, 0.8)}">` +
            `<div class="num" style="background:${p.primary};color:${p.onPrimary}">${String(i + 1).padStart(2, "0")}</div>` +
            `<div class="cb"><div class="ct">${escapeHtml(it.title)}</div>` +
            (it.text ? `<div class="cx" style="color:${mix(tone === "base" ? p.onSurface : p.onBase, tone === "base" ? p.surface : p.base, 0.3)}">${escapeHtml(it.text)}</div>` : "") +
            `</div></div>`
          );
        })
        .join("");
      body =
        `<div class="stackc">${kicker}` +
        (s.title ? `<h2 class="title" style="font-size:calc(var(--u)*${titleSize(s.title, format, 0.66)})">${words(s.title, t(0.15), 0.06, s.highlight, hl)}</h2>` : "") +
        `<div class="cards ${stack} n${s.items.length}">${cards}</div></div>`;
      break;
    }
    case "list": {
      const rows = s.items
        .map((it, i) => {
          const at = t(0.6 + i * 0.32);
          return (
            `<div class="row" style="${anim("mk-left", at, 0.6)}">` +
            `<svg class="check" viewBox="0 0 24 24" style="background:${p.primary}"><path d="M6 12.5l4 4 8-9" fill="none" stroke="${p.onPrimary}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" style="stroke-dasharray:24;${anim("mk-draw", at + 0.2, 0.5)}"/></svg>` +
            `<div><div class="rt">${escapeHtml(it.title)}</div>${it.text ? `<div class="rx" style="color:${muted}">${escapeHtml(it.text)}</div>` : ""}</div></div>`
          );
        })
        .join("");
      body =
        `<div class="split ${stack} list">` +
        `<div class="copy">${kicker}${s.title ? `<h2 class="title" style="font-size:calc(var(--u)*${titleSize(s.title, format, 0.74)})">${words(s.title, t(0.15), 0.06, s.highlight, hl)}</h2>` : ""}${sub(s.text, 0.5)}</div>` +
        `<div class="rows">${rows}</div></div>`;
      break;
    }
    case "stats": {
      const items = s.items
        .map((it, i) => {
          const at = t(0.45 + i * 0.25);
          return (
            `<div class="stat" style="${anim("mk-up", at, 0.7)}">` +
            `<div class="sv" style="color:${hl}">${counter(it.title, at + 0.1, Math.min(1.8, d - 1))}</div>` +
            (it.text ? `<div class="sl" style="color:${muted}">${escapeHtml(it.text)}</div>` : "") +
            `</div>`
          );
        })
        .join(`<div class="sep" style="background:${mix(fg, bg, 0.75)}"></div>`);
      body =
        `<div class="stackc">${kicker}` +
        (s.title ? `<h2 class="title" style="font-size:calc(var(--u)*${titleSize(s.title, format, 0.6)})">${words(s.title, t(0.1), 0.06, s.highlight, hl)}</h2>` : "") +
        `<div class="stats ${stack}">${items}</div></div>`;
      break;
    }
    case "services": {
      const chips = s.items
        .map(
          (it, i) =>
            `<span class="svc" style="border-color:${mix(fg, bg, 0.7)};background:${mix(bg, fg, 0.05)};${anim("mk-pop", t(0.5 + i * 0.12), 0.6)}">${escapeHtml(it.title)}</span>`,
        )
        .join("");
      body =
        `<div class="stackc">${kicker}` +
        (s.title ? `<h2 class="title" style="font-size:calc(var(--u)*${titleSize(s.title, format, 0.7)})">${words(s.title, t(0.15), 0.06, s.highlight, hl)}</h2>` : "") +
        `<div class="svcs">${chips}</div></div>`;
      break;
    }
    case "cta": {
      const size = titleSize(s.title, format, 0.88);
      const btnBg = distance(p.accent, bg) > 90 && contrast(readableOn(p.accent), p.accent) >= 4.5 ? p.accent : fg;
      const btnFg = readableOn(btnBg);
      const nWords = s.title.split(/\s+/).length;
      body =
        `<div class="center">` +
        `<div style="${anim("mk-up", t(0.1), 0.6)}">${logoMarkup(ctx, 7, tone)}</div>` +
        `<h1 class="title" style="font-size:calc(var(--u)*${size})">${words(s.title, t(0.35), 0.08, s.highlight, hl)}</h1>` +
        sub(s.text, 0.6 + nWords * 0.08, 3.2) +
        `<div class="btnwrap" style="${anim("mk-pop", t(0.8 + nWords * 0.08), 0.7)}"><span class="btn" style="background:${btnBg};color:${btnFg};${anim("mk-pulse", t(1.6 + nWords * 0.08), 1.6, "ease-in-out", "3")}">${escapeHtml(s.button || "Learn more")}</span></div>` +
        `<div class="domain" style="color:${muted};${anim("mk-up", t(1.1 + nWords * 0.08), 0.6)}">${escapeHtml(ctx.brand.domain)}</div>` +
        `</div>`;
      break;
    }
  }

  return (
    `<section class="scene sc-${s.type}" data-i="${index}" style="background:${bg};color:${fg};animation:mk-vis-${index} ${round(totalOf(ctx.sb))}s linear 0s both;">` +
    blobs(p, tone, start, d, index) +
    `<div class="inner">${body}</div></section>`
  );
}

/** A number that counts up ("10,000+" counts 0 to 10,000 then shows "+"). */
function counter(value: string, start: number, duration: number): string {
  const m = /^([^\d]*?)(\d[\d,]*(?:\.\d+)?)(.*)$/.exec(value.trim());
  if (!m) return escapeHtml(value);
  const num = Number(m[2]!.replace(/,/g, ""));
  if (!Number.isFinite(num) || num === 0) return escapeHtml(value);
  const decimals = (m[2]!.split(".")[1] ?? "").length;
  const commas = m[2]!.includes(",") ? 1 : 0;
  return (
    `<span data-count="${num}" data-start="${round(start)}" data-dur="${round(duration)}" data-dec="${decimals}" data-commas="${commas}" ` +
    `data-prefix="${escapeHtml(m[1]!)}" data-suffix="${escapeHtml(m[3]!)}">${escapeHtml(value)}</span>`
  );
}

function totalOf(sb: Pick<Storyboard, "scenes">): number {
  return sb.scenes.reduce((n, s) => n + s.duration, 0);
}

/** Per-scene visibility on the shared clock: crossfade 0.4s at each boundary. */
function visibilityKeyframes(sb: Storyboard): string {
  const T = totalOf(sb);
  const pct = (sec: number) => `${round((Math.max(0, Math.min(T, sec)) / T) * 100, 4)}%`;
  const X = 0.2;
  return sceneTimeline(sb)
    .map((s, i, all) => {
      const first = i === 0;
      const last = i === all.length - 1;
      const frames: string[] = [];
      if (first) frames.push(`0%{opacity:1;visibility:visible;transform:none}`);
      else {
        frames.push(`0%,${pct(s.start - X)}{opacity:0;visibility:hidden;transform:scale(1.015)}`);
        frames.push(`${pct(s.start + X)}{opacity:1;visibility:visible;transform:none}`);
      }
      if (last) frames.push(`100%{opacity:1;visibility:visible;transform:none}`);
      else {
        frames.push(`${pct(s.end - X)}{opacity:1;visibility:visible;transform:none}`);
        frames.push(`${pct(s.end + X)},100%{opacity:0;visibility:hidden;transform:scale(.99)}`);
      }
      return `@keyframes mk-vis-${i}{${frames.join("")}}`;
    })
    .join("\n");
}

const CSS = `
*{box-sizing:border-box;margin:0;padding:0}
html,body{overflow:hidden;background:#000}
#stage{position:relative;overflow:hidden;font-family:var(--body);-webkit-font-smoothing:antialiased;text-rendering:geometricPrecision}
.scene{position:absolute;inset:0;overflow:hidden;will-change:opacity,transform}
.inner{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:calc(var(--u)*7) calc(var(--u)*8)}
.fmt-portrait .inner{padding:calc(var(--u)*10) calc(var(--u)*7)}
.blob{position:absolute;width:60%;aspect-ratio:1;border-radius:50%;opacity:.28;filter:blur(calc(var(--u)*3))}
.blob.b2{width:48%;opacity:.2}
.center{display:flex;flex-direction:column;align-items:center;text-align:center;gap:calc(var(--u)*2.4);max-width:100%;position:relative}
.center.left{align-items:flex-start;text-align:left;width:100%}
.title{font-family:var(--heading);font-weight:800;line-height:1.06;letter-spacing:-0.025em;max-width:100%;text-wrap:balance}
.center>.title{max-width:calc(var(--u)*150)}
.fmt-portrait .center>.title{max-width:100%}
.title.cap{font-weight:700}
.w{display:inline-block;white-space:pre}
.hlw{position:relative;display:inline-block}
.hlw .mk{position:absolute;left:-.06em;right:-.06em;bottom:.04em;height:.36em;border-radius:.08em;opacity:.38;transform-origin:left center;z-index:0}
.hlw .hlt{position:relative;z-index:1}
.sub{font-weight:500;line-height:1.4;max-width:calc(var(--u)*120)}
.kicker{display:inline-block;font-family:var(--body);font-weight:700;font-size:calc(var(--u)*2.2);letter-spacing:.14em;text-transform:uppercase;border:1px solid;border-radius:999px;padding:calc(var(--u)*.8) calc(var(--u)*2)}
.name{font-family:var(--heading);font-weight:700;font-size:calc(var(--u)*5)}
.wordmark{font-family:var(--heading);font-weight:800;letter-spacing:-0.03em;line-height:1}
.logo{display:block;width:auto;object-fit:contain}
.chip{border-radius:calc(var(--u)*2.2);padding:calc(var(--u)*2.2) calc(var(--u)*3.2);box-shadow:0 calc(var(--u)*1.4) calc(var(--u)*5) rgba(0,0,0,.18)}
.ring{position:absolute;left:50%;top:50%;width:calc(var(--u)*34);height:calc(var(--u)*34);margin:calc(var(--u)*-17) 0 0 calc(var(--u)*-17);border:calc(var(--u)*.5) solid;border-radius:50%;opacity:0}
.split{display:flex;align-items:center;gap:calc(var(--u)*6);width:100%}
.split.row>.copy{flex:0 0 38%}
.split.col{flex-direction:column;text-align:center;gap:calc(var(--u)*5)}
.split.col>.copy{display:flex;flex-direction:column;align-items:center}
.copy{display:flex;flex-direction:column;gap:calc(var(--u)*2);align-items:flex-start}
.stackc{display:flex;flex-direction:column;align-items:center;text-align:center;gap:calc(var(--u)*4);width:100%}
.frame{border-radius:calc(var(--u)*1.6);overflow:hidden;box-shadow:0 calc(var(--u)*3) calc(var(--u)*9) rgba(0,0,0,.28),0 0 0 1px rgba(0,0,0,.08);flex:0 0 auto;transform-origin:50% 60%}
.bar{height:calc(var(--u)*3.6);display:flex;align-items:center;gap:calc(var(--u)*.9);padding:0 calc(var(--u)*1.6)}
.bar i{width:calc(var(--u)*1.1);height:calc(var(--u)*1.1);border-radius:50%;background:rgba(0,0,0,.18)}
.bar i:first-child{background:#ff5f57}.bar i:nth-child(2){background:#febc2e}.bar i:nth-child(3){background:#28c840}
.url{margin-left:calc(var(--u)*1.6);flex:1;max-width:60%;height:calc(var(--u)*2.2);border-radius:999px;font-size:calc(var(--u)*1.4);display:flex;align-items:center;padding:0 calc(var(--u)*1.4);font-weight:600;white-space:nowrap;overflow:hidden}
.vp{position:relative;overflow:hidden}
.shot{display:block;width:100%;height:100%;object-fit:cover;object-position:top center;transform-origin:30% 20%}
.page{display:block;width:100%;height:auto}
.cards{display:flex;gap:calc(var(--u)*2.6);width:100%;justify-content:center}
.cards.col{flex-direction:column;align-items:stretch}
.card{flex:1 1 0;max-width:calc(var(--u)*46);border-radius:calc(var(--u)*2);padding:calc(var(--u)*3);text-align:left;display:flex;flex-direction:column;gap:calc(var(--u)*1.2);box-shadow:0 calc(var(--u)*1) calc(var(--u)*4) rgba(0,0,0,.08)}
.cards.col .card{max-width:none;flex-direction:row;align-items:center;gap:calc(var(--u)*2.6);padding:calc(var(--u)*2.6) calc(var(--u)*3)}
.cb{display:flex;flex-direction:column;gap:calc(var(--u)*.8)}
.cards.col .cb{flex:1}
.num{width:calc(var(--u)*5.6);height:calc(var(--u)*5.6);border-radius:calc(var(--u)*1.4);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:calc(var(--u)*2.2);font-family:var(--heading);flex:0 0 auto}
.ct{font-family:var(--heading);font-weight:700;font-size:calc(var(--u)*3);line-height:1.15}
.cx{font-size:calc(var(--u)*2.2);line-height:1.4;font-weight:500}
.rows{display:flex;flex-direction:column;gap:calc(var(--u)*2.4);flex:1;text-align:left}
.split.col .rows{width:100%}
.row{display:flex;align-items:center;gap:calc(var(--u)*2.2)}
.check{width:calc(var(--u)*5);height:calc(var(--u)*5);border-radius:50%;padding:calc(var(--u)*.8);flex:0 0 auto}
.rt{font-family:var(--heading);font-weight:700;font-size:calc(var(--u)*3.6);line-height:1.15}
.rx{font-size:calc(var(--u)*2.2);margin-top:calc(var(--u)*.4)}
.stats{display:flex;align-items:center;justify-content:center;gap:calc(var(--u)*5);width:100%}
.stats.col{flex-direction:column;gap:calc(var(--u)*3.4)}
.stat{display:flex;flex-direction:column;align-items:center;gap:calc(var(--u)*1)}
.sv{font-family:var(--heading);font-weight:800;font-size:calc(var(--u)*11);line-height:1;letter-spacing:-0.03em;font-variant-numeric:tabular-nums}
.sl{font-size:calc(var(--u)*2.6);font-weight:600;max-width:calc(var(--u)*30)}
.sep{width:1px;align-self:stretch;opacity:.6}
.stats.col .sep{width:calc(var(--u)*12);height:1px;align-self:center}
.svcs{display:flex;flex-wrap:wrap;justify-content:center;gap:calc(var(--u)*1.6);max-width:calc(var(--u)*120)}
.svc{border:1px solid;border-radius:999px;padding:calc(var(--u)*1.2) calc(var(--u)*2.6);font-weight:700;font-size:calc(var(--u)*2.8);font-family:var(--heading)}
.btnwrap{margin-top:calc(var(--u)*1.2)}
.btn{display:inline-block;border-radius:999px;padding:calc(var(--u)*2) calc(var(--u)*4.6);font-weight:800;font-size:calc(var(--u)*3);font-family:var(--heading);box-shadow:0 calc(var(--u)*1) calc(var(--u)*3.6) rgba(0,0,0,.22)}
.domain{font-weight:700;font-size:calc(var(--u)*2.4);letter-spacing:.04em}
.wm{position:absolute;right:calc(var(--u)*2.4);bottom:calc(var(--u)*2.4);z-index:50;display:flex;align-items:center;gap:calc(var(--u)*.9);background:rgba(17,17,17,.78);color:#fff;font:600 calc(var(--u)*1.9)/1 "Inter",system-ui,sans-serif;padding:calc(var(--u)*1.1) calc(var(--u)*1.7);border-radius:999px;letter-spacing:.01em}
.wm i{width:calc(var(--u)*1.5);height:calc(var(--u)*1.5);border-radius:calc(var(--u)*.35);background:#ffd400;display:block}
.wm b{font-weight:800}
@keyframes mk-up{from{opacity:0;transform:translateY(calc(var(--u)*3))}to{opacity:1;transform:none}}
@keyframes mk-left{from{opacity:0;transform:translateX(calc(var(--u)*-4))}to{opacity:1;transform:none}}
@keyframes mk-word{from{opacity:0;transform:translateY(.45em) rotate(3deg);filter:blur(4px)}to{opacity:1;transform:none;filter:blur(0)}}
@keyframes mk-pop{0%{opacity:0;transform:scale(.6)}65%{opacity:1;transform:scale(1.05)}100%{opacity:1;transform:scale(1)}}
@keyframes mk-card{from{opacity:0;transform:translateY(calc(var(--u)*6)) scale(.94)}to{opacity:1;transform:none}}
@keyframes mk-line{from{transform:scaleX(0)}to{transform:scaleX(1)}}
@keyframes mk-ring{0%{opacity:.55;transform:scale(.3)}100%{opacity:0;transform:scale(1.5)}}
@keyframes mk-drift{from{transform:translate(0,0) scale(1)}to{transform:translate(6%,4%) scale(1.12)}}
@keyframes mk-drift2{from{transform:translate(0,0) scale(1.05)}to{transform:translate(-5%,-6%) scale(.95)}}
@keyframes mk-kenburns{from{transform:scale(1)}to{transform:scale(1.1)}}
@keyframes mk-scroll{from{transform:translateY(0)}to{transform:translateY(var(--dist))}}
@keyframes mk-frame-in{from{opacity:0;transform:perspective(1400px) translateX(8%) rotateY(-14deg) scale(.92)}to{opacity:1;transform:perspective(1400px) rotateY(-5deg)}}
@keyframes mk-frame-up{from{opacity:0;transform:translateY(10%) scale(.94)}to{opacity:1;transform:none}}
@keyframes mk-draw{from{stroke-dashoffset:24}to{stroke-dashoffset:0}}
@keyframes mk-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}
`;

/** Runtime: seek on one clock; in preview, play in real time and talk to the parent page. */
function runtime(total: number, mode: "preview" | "render", W: number, H: number): string {
  return `
(function(){
  var T=${round(total)};
  var counters=[].slice.call(document.querySelectorAll('[data-count]'));
  function fmt(n,dec,commas){var s=n.toFixed(dec);if(commas){var p=s.split('.');p[0]=p[0].replace(/\\B(?=(\\d{3})+(?!\\d))/g,',');s=p.join('.')}return s}
  function seek(t){
    t=Math.max(0,Math.min(T,t));
    var list=document.getAnimations();
    for(var i=0;i<list.length;i++){var a=list[i];a.pause();a.currentTime=t*1000}
    for(var j=0;j<counters.length;j++){var c=counters[j],s=+c.dataset.start,d=+c.dataset.dur||1,p=Math.max(0,Math.min(1,(t-s)/d));var e=1-Math.pow(1-p,3);
      c.textContent=c.dataset.prefix+fmt(+c.dataset.count*e,+c.dataset.dec,c.dataset.commas==='1')+c.dataset.suffix}
  }
  window.__mkSeek=seek;window.__mkDuration=T;
  var imgs=[].slice.call(document.images).map(function(im){return im.decode?im.decode().catch(function(){}):Promise.resolve()});
  var fonts=document.fonts&&document.fonts.ready?document.fonts.ready:Promise.resolve();
  window.__mkReady=Promise.all([fonts].concat(imgs)).then(function(){seek(0);return true});
  ${
    mode === "preview"
      ? `
  var stage=document.getElementById('stage');
  function fit(){var s=Math.min(innerWidth/${W},innerHeight/${H});stage.style.transform='scale('+s+')';stage.style.left=((innerWidth-${W}*s)/2)+'px';stage.style.top=((innerHeight-${H}*s)/2)+'px'}
  addEventListener('resize',fit);fit();
  var playing=true,t0=null,offset=0,now=0;
  function post(){try{parent.postMessage({source:'mk-video',t:now,total:T,playing:playing},'*')}catch(e){}}
  function frame(ts){if(playing){if(t0===null)t0=ts-offset*1000;now=(ts-t0)/1000;if(now>=T){now=T;playing=false;t0=null;offset=0}seek(now);post()}requestAnimationFrame(frame)}
  window.__mkReady.then(function(){requestAnimationFrame(frame)});
  addEventListener('message',function(ev){var d=ev.data||{};if(d.source!=='mk-control')return;
    if(d.cmd==='play'){if(now>=T){now=0}offset=now;t0=null;playing=true}
    else if(d.cmd==='pause'){playing=false;offset=now;post()}
    else if(d.cmd==='seek'){now=Math.max(0,Math.min(T,+d.t||0));offset=now;t0=null;seek(now);post()}});`
      : ""
  }
})();`;
}

/** The whole video as one HTML document. */
export function composeVideoHtml(sb: Storyboard, brand: VideoBrand, assets: VideoAssets, opts: ComposeOptions): string {
  const { width: W, height: H } = BASE_SIZE[opts.format];
  const p = paletteFor(brand.colors);
  const ctx: Ctx = { sb, brand, assets, format: opts.format, p, W, H };
  // One design unit. Portrait gets a slightly larger unit: the canvas is as
// narrow as square but far taller, so everything can be bigger.
  const u = round(opts.format === "portrait" ? W / 88 : Math.min(W, H) / 100, 3);
  const timeline = sceneTimeline(sb);
  const scenes = sb.scenes.map((s, i) => sceneHtml(ctx, s, timeline[i]!.start, i)).join("\n");
  const total = totalOf(sb);
  const preview = opts.mode === "preview";
  return `<!doctype html>
<html><head><meta charset="utf-8">
<meta name="viewport" content="width=${W}">
${fontLinks([brand.headingFont, brand.bodyFont])}
<style>
:root{--u:${u}px;--heading:${fontStack(brand.headingFont)};--body:${fontStack(brand.bodyFont ?? brand.headingFont)}}
${CSS}
html,body{width:${preview ? "100%" : `${W}px`};height:${preview ? "100%" : `${H}px`}}
#stage{width:${W}px;height:${H}px;${preview ? "position:absolute;transform-origin:0 0;" : ""}background:${p.base}}
${visibilityKeyframes(sb)}
</style></head>
<body><div id="stage" class="fmt-${opts.format}">
${scenes}
${opts.watermark ? `<div class="wm"><i></i>Made with <b>MyKavo</b></div>` : ""}
</div>
<script>${runtime(total, opts.mode, W, H)}</script>
</body></html>`;
}

/** "https://www.acme.com/path" -> "acme.com". */
export function displayDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0] ?? url;
  }
}
