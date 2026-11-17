import { z } from "zod";
import { MODELS, structuredCall, type AgentDeps, type AgentRun, type PageSummary } from "@mykavo/keyword-agent";
import type { BrandKitEdit } from "./brand";
import type { VideoDuration } from "./limits";
import type { VideoScriptInput } from "./tones";
import {
  SCENE_INFO,
  SCENE_TYPES,
  maxScenes,
  normalizeStoryboard,
  type Scene,
  type Storyboard,
  type StoryboardContext,
} from "./storyboard";

/**
 * Writes a video's scene plan with one Sonnet call. The model chooses scenes
 * from the fixed template library and writes the words; code then makes the
 * plan safe (normalizeStoryboard): numbers must come from the website,
 * scenes needing a missing screenshot are dropped, durations fit the target.
 */

const aiScene = z.object({
  type: z.enum(SCENE_TYPES),
  seconds: z.number(),
  kicker: z.string(),
  title: z.string(),
  text: z.string(),
  highlight: z.string(),
  button: z.string(),
  items: z.array(z.object({ title: z.string(), text: z.string() })),
});
export const scriptOutput = z.object({
  title: z.string(),
  scenes: z.array(aiScene),
});
export type ScriptOutput = z.infer<typeof scriptOutput>;

export interface ScriptRequest {
  kit: Pick<BrandKitEdit, "name" | "headline" | "description" | "ctaText" | "valuePoints" | "stats" | "services">;
  siteUrl: string;
  /** A few pages of the site for context (packages/keyword-agent readSite). */
  pages: PageSummary[];
  /** The confirmed business profile from the AI writer, when there is one. */
  profile: { businessType: string; services: string[]; audience: string; language: string } | null;
  language: string;
  hasHero: boolean;
  hasPage: boolean;
  input: VideoScriptInput;
}

const SYSTEM = `You are a senior motion designer and copywriter. You storyboard short brand marketing videos for small businesses, choosing scenes from a fixed template library and writing the words shown on screen.
Rules:
- On-screen words are short, concrete and easy to read in two seconds. Headlines up to 8 words. Statements up to 14 words. Card and list titles up to 5 words, card lines up to 12 words.
- Use only facts found in the data. Never invent numbers, prices, customers, testimonials, reviews, awards, guarantees, partners or results.
- A stats scene may only use values listed in brand.stats, copied exactly, with an honest short label.
- Spell the brand name exactly as given. No emojis, no hashtags, no exclamation marks in headlines.
- Write in the requested language only.`;

function clip(text: string, max: number): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const space = cut.lastIndexOf(" ");
  return (space > max * 0.5 ? cut.slice(0, space) : cut).replace(/[,;:.\-\s]+$/, "");
}

/** The model's answer as a storyboard, with every field cut to its limit. */
export function toStoryboard(out: ScriptOutput, fallbackTitle: string): Storyboard {
  const scenes: Scene[] = out.scenes.slice(0, 16).map((s, i) => ({
    id: `s${i + 1}`,
    type: s.type,
    duration: Number.isFinite(s.seconds) ? s.seconds : SCENE_INFO[s.type].min,
    kicker: clip(s.kicker, 40),
    title: clip(s.title, 110),
    text: clip(s.text, 200),
    highlight: clip(s.highlight, 40),
    button: clip(s.button, 30),
    items: s.items.slice(0, 8).map((it) => ({ title: clip(it.title, 60), text: clip(it.text, 120) })),
  }));
  return { version: 1, title: clip(out.title, 80) || fallbackTitle, scenes };
}

export function storyboardContext(req: Pick<ScriptRequest, "kit" | "hasHero" | "hasPage" | "input">): StoryboardContext {
  return {
    target: req.input.durationSec as VideoDuration,
    hasHero: req.hasHero,
    hasPage: req.hasPage,
    stats: req.kit.stats,
    brandName: req.kit.name,
    ctaText: req.kit.ctaText,
  };
}

export async function writeVideoScript(deps: AgentDeps, run: AgentRun, req: ScriptRequest): Promise<Storyboard> {
  const target = req.input.durationSec;
  const sceneRange = target === 30 ? "6 to 8" : "10 to 13";
  const library = SCENE_TYPES.map(
    (t) => `- ${t}: ${SCENE_INFO[t].hint} (${SCENE_INFO[t].min} to ${SCENE_INFO[t].max} seconds)`,
  ).join("\n");
  const available = [
    req.hasHero ? "screen (a homepage screenshot exists)" : "NOT screen (no screenshot)",
    req.hasPage ? "scroll (a full-page screenshot exists)" : "NOT scroll (no screenshot)",
    req.kit.stats.length > 0 ? "stats (only with the listed values)" : "NOT stats (the website shows no numbers)",
  ].join("; ");

  const raw = await structuredCall(deps, run, {
    step: "video-script",
    model: MODELS.writer,
    system: SYSTEM,
    instruction: `Storyboard a ${target}-second brand marketing video for ${req.kit.name} (${req.siteUrl}) in a ${req.input.tone} tone, in language "${req.language}".

Scene library (type: what it shows):
${library}

Available here: ${available}.

Make ${sceneRange} scenes, at most ${maxScenes(target)}. The seconds must add up to ${target}. Start with logo and end with cta. A good arc: a hook (headline), the problem or promise (statement), the product itself (screen), what the customer gets (features or list), proof only if real numbers exist (stats), what they offer (services, for 60 seconds), then the call to action.
Fields: kicker is an optional 1 to 3 word label; highlight is 1 to 3 words copied from the title to emphasize (or empty); button is the cta button label, using the site's own button text when it fits; items are the cards, list rows, numbers (title = the value, text = the label) or service names. Leave unused fields as empty strings or an empty list.
Title: a short name for this video.${req.input.notes ? `\n\nThe owner asked: ${JSON.stringify(req.input.notes)} (follow it unless it breaks a rule).` : ""}`,
    data: {
      brand: {
        name: req.kit.name,
        headline: req.kit.headline,
        description: req.kit.description,
        buttonText: req.kit.ctaText,
        valuePoints: req.kit.valuePoints,
        stats: req.kit.stats,
        services: req.kit.services,
      },
      business: req.profile,
      pages: req.pages.slice(0, 6).map((p) => ({
        url: p.url,
        title: p.title,
        description: p.description,
        h1: p.h1,
        h2s: p.h2s.slice(0, 10),
        excerpt: p.excerpt.slice(0, 600),
      })),
    },
    schema: scriptOutput,
    maxTokens: 6000,
    effort: "medium",
  });

  const sb = toStoryboard(raw, `${req.kit.name} brand video`);
  return normalizeStoryboard(sb, storyboardContext(req));
}
