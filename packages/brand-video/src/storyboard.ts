import { z } from "zod";
import type { BrandKitEdit, StatItem } from "./brand";
import type { VideoDuration } from "./limits";

/**
 * The scene plan: an ordered list of scenes drawn from a fixed library of
 * templates. The AI only fills in words and picks scenes; it never writes
 * code, so every video renders the same way every time.
 */

export const SCENE_TYPES = [
  "logo",
  "headline",
  "statement",
  "screen",
  "scroll",
  "features",
  "list",
  "stats",
  "services",
  "cta",
] as const;
export type SceneType = (typeof SCENE_TYPES)[number];

/** What each scene is for, shown in the editor and given to the AI. */
export const SCENE_INFO: Record<SceneType, { label: string; hint: string; min: number; max: number }> = {
  logo: { label: "Logo reveal", hint: "Logo and brand name. Text: a short tagline.", min: 2.5, max: 4.5 },
  headline: { label: "Headline", hint: "One big promise in up to 8 words. Kicker: a 1 to 3 word label.", min: 3, max: 6 },
  statement: { label: "Statement", hint: "A problem or idea in up to 14 words.", min: 3, max: 6 },
  screen: { label: "Website shot", hint: "The homepage in a browser frame. Title: a short caption.", min: 4, max: 7 },
  scroll: { label: "Website scroll", hint: "Scrolls down the homepage. Title: a short caption.", min: 5, max: 9 },
  features: { label: "Feature cards", hint: "2 or 3 cards: a short title and one line each.", min: 5, max: 8 },
  list: { label: "Checklist", hint: "3 or 4 short benefits that tick in.", min: 4, max: 7 },
  stats: { label: "Numbers", hint: "1 to 3 numbers taken exactly from the website, with labels.", min: 4, max: 6 },
  services: { label: "Services", hint: "3 to 8 short service or product names.", min: 3.5, max: 6 },
  cta: { label: "Call to action", hint: "Closing line and a button label. Shows the website address.", min: 4, max: 6.5 },
};

export const sceneItem = z.object({
  title: z.string().trim().max(60),
  text: z.string().trim().max(120).default(""),
});

export const scene = z.object({
  id: z.string().trim().min(1).max(40),
  type: z.enum(SCENE_TYPES),
  duration: z.number().min(1).max(15),
  kicker: z.string().trim().max(40).default(""),
  title: z.string().trim().max(110).default(""),
  text: z.string().trim().max(200).default(""),
  /** Words in the title to emphasize; must appear in the title. */
  highlight: z.string().trim().max(40).default(""),
  /** Button label (cta). */
  button: z.string().trim().max(30).default(""),
  items: z.array(sceneItem).max(8).default([]),
});
export type Scene = z.infer<typeof scene>;

export const storyboard = z.object({
  version: z.literal(1),
  title: z.string().trim().min(1).max(80),
  scenes: z.array(scene).min(2).max(16),
});
export type Storyboard = z.infer<typeof storyboard>;

export interface StoryboardContext {
  target: VideoDuration;
  hasHero: boolean;
  hasPage: boolean;
  /** Numbers allowed in a stats scene: only ones found on the website. */
  stats: StatItem[];
  brandName: string;
  ctaText: string | null;
}

/** Most scenes a video may have, so each gets time to breathe. */
export function maxScenes(target: VideoDuration): number {
  return target === 30 ? 9 : 15;
}

function normValue(v: string): string {
  return v.toLowerCase().replace(/\s+/g, "");
}

/** Round to 0.1s. */
function r1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Fit durations to the target: clamp each scene to its type's range, then
 * scale toward the target and clamp again. Stops at the ranges, so a short
 * plan becomes a slightly shorter video rather than a padded one.
 */
export function fitDurations(scenes: Scene[], target: number): Scene[] {
  let out = scenes.map((s) => ({ ...s, duration: clampDuration(s.type, s.duration) }));
  for (let pass = 0; pass < 6; pass += 1) {
    const total = out.reduce((n, s) => n + s.duration, 0);
    if (Math.abs(total - target) < 0.05) break;
    const flexible = out.filter((s) =>
      total < target ? s.duration < SCENE_INFO[s.type].max : s.duration > SCENE_INFO[s.type].min,
    );
    if (flexible.length === 0) break;
    const share = (target - total) / flexible.length;
    out = out.map((s) => (flexible.includes(s) ? { ...s, duration: clampDuration(s.type, s.duration + share) } : s));
  }
  out = out.map((s) => ({ ...s, duration: r1(s.duration) }));
  // Rounding drift lands on the longest flexible scene, within its range.
  const drift = r1(target - out.reduce((n, s) => n + s.duration, 0));
  if (drift !== 0 && Math.abs(drift) < 1) {
    const idx = out
      .map((s, i) => ({ s, i }))
      .filter(({ s }) => {
        const d = s.duration + drift;
        return d >= SCENE_INFO[s.type].min && d <= SCENE_INFO[s.type].max;
      })
      .sort((a, b) => b.s.duration - a.s.duration)[0]?.i;
    if (idx !== undefined) out[idx] = { ...out[idx]!, duration: r1(out[idx]!.duration + drift) };
  }
  return out;
}

function clampDuration(type: SceneType, d: number): number {
  const { min, max } = SCENE_INFO[type];
  if (!Number.isFinite(d)) return min;
  return Math.max(min, Math.min(max, d));
}

/**
 * Make any plan (from the AI or the editor) safe to render:
 * - scenes that need a missing screenshot are dropped;
 * - numbers not found on the website are dropped (no invented stats);
 * - card, list and service scenes without enough items are dropped;
 * - it always opens on the logo and closes on the call to action;
 * - durations fit the target; ids are unique.
 */
export function normalizeStoryboard(input: Storyboard, ctx: StoryboardContext): Storyboard {
  const allowedStats = new Map(ctx.stats.map((s) => [normValue(s.value), s]));
  const kept: Scene[] = [];
  for (const raw of input.scenes) {
    const s: Scene = { ...raw, items: raw.items.filter((i) => i.title.trim().length > 0) };
    if (s.highlight && !s.title.toLowerCase().includes(s.highlight.toLowerCase())) s.highlight = "";
    switch (s.type) {
      case "screen":
        if (!ctx.hasHero) continue;
        break;
      case "scroll":
        if (!ctx.hasPage) continue;
        break;
      case "stats": {
        const items = s.items
          .filter((i) => allowedStats.has(normValue(i.title)))
          .map((i) => ({ title: allowedStats.get(normValue(i.title))!.value, text: i.text }))
          .slice(0, 3);
        if (items.length === 0) continue;
        s.items = items;
        break;
      }
      case "features":
        if (s.items.length < 2) continue;
        s.items = s.items.slice(0, 3);
        break;
      case "list":
        if (s.items.length < 2) continue;
        s.items = s.items.slice(0, 4);
        break;
      case "services":
        if (s.items.length < 3) continue;
        s.items = s.items.slice(0, 8);
        break;
      case "headline":
      case "statement":
        if (!s.title) continue;
        break;
      default:
        break;
    }
    kept.push(s);
  }

  // Open on the logo, close on the call to action (one of each).
  const logoScene = kept.find((s) => s.type === "logo") ?? blankScene("logo", { title: ctx.brandName });
  const ctaScene =
    kept.find((s) => s.type === "cta") ??
    blankScene("cta", { title: `Discover ${ctx.brandName}`, button: ctx.ctaText ?? "Visit the website" });
  const middle = kept.filter((s) => s.type !== "logo" && s.type !== "cta").slice(0, maxScenes(ctx.target) - 2);
  if (!logoScene.title) logoScene.title = ctx.brandName;
  if (!ctaScene.button) ctaScene.button = ctx.ctaText ?? "Visit the website";

  const scenes = fitDurations([logoScene, ...middle, ctaScene], ctx.target).map((s, i) => ({ ...s, id: `s${i + 1}` }));
  return { version: 1, title: input.title, scenes };
}

export function blankScene(type: SceneType, fields: Partial<Scene> = {}): Scene {
  const info = SCENE_INFO[type];
  return {
    id: "new",
    type,
    duration: (info.min + info.max) / 2,
    kicker: "",
    title: "",
    text: "",
    highlight: "",
    button: "",
    items: [],
    ...fields,
  };
}

export function totalDuration(sb: Pick<Storyboard, "scenes">): number {
  return r1(sb.scenes.reduce((n, s) => n + s.duration, 0));
}

/**
 * A plan built from the brand kit alone, no AI: the starting point when the
 * AI is unavailable, and the fixture the composer is tested with.
 */
export function templateStoryboard(
  kit: Pick<BrandKitEdit, "name" | "headline" | "description" | "valuePoints" | "stats" | "services" | "ctaText">,
  ctx: StoryboardContext,
): Storyboard {
  const scenes: Scene[] = [blankScene("logo", { title: kit.name, text: shortLine(kit.description, 60) })];
  if (kit.headline) scenes.push(blankScene("headline", { title: shortLine(kit.headline, 60) }));
  if (ctx.hasHero) scenes.push(blankScene("screen", { title: `Meet ${kit.name}` }));
  if (kit.valuePoints.length >= 2) {
    scenes.push(
      blankScene("features", {
        title: "Why teams choose us",
        items: kit.valuePoints.slice(0, 3).map((p) => ({ title: shortLine(p.title, 40), text: shortLine(p.text, 90) })),
      }),
    );
  }
  if (kit.stats.length > 0) {
    scenes.push(blankScene("stats", { items: kit.stats.slice(0, 3).map((s) => ({ title: s.value, text: s.label })) }));
  }
  if (ctx.target === 60 && kit.services.length >= 3) {
    scenes.push(blankScene("services", { title: "What we do", items: kit.services.slice(0, 8).map((t) => ({ title: t, text: "" })) }));
  }
  if (ctx.hasPage) scenes.push(blankScene("scroll", { title: "Everything in one place" }));
  if (ctx.target === 60 && kit.valuePoints.length >= 4) {
    scenes.push(
      blankScene("list", { title: "What you get", items: kit.valuePoints.slice(3, 7).map((p) => ({ title: shortLine(p.title, 40), text: "" })) }),
    );
  }
  scenes.push(blankScene("cta", { title: `Get started with ${kit.name}`, button: kit.ctaText ?? "Visit the website" }));
  return normalizeStoryboard({ version: 1, title: `${kit.name} brand video`, scenes }, ctx);
}

function shortLine(text: string | null | undefined, max: number): string {
  if (!text) return "";
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const space = cut.lastIndexOf(" ");
  return (space > max * 0.5 ? cut.slice(0, space) : cut).replace(/[,;:.\-\s]+$/, "");
}
