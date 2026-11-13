import { z } from "zod";

/**
 * Shapes the model must answer in (structured outputs). Deliberately loose:
 * only types and enums, because length and count limits are not enforced by
 * the API and a near-miss would fail the whole call. Limits are applied in
 * code afterwards (normalize* functions), so the stored data is always tidy.
 */

export const profileOutput = z.object({
  businessType: z.string(),
  services: z.array(z.string()),
  audience: z.string(),
  country: z.string(),
  language: z.string(),
  /** False for sites the agent must not write for (adult, illegal, scams...). */
  allowedTopic: z.boolean(),
});
export type ProfileOutput = z.infer<typeof profileOutput>;

export const seedsOutput = z.object({
  seeds: z.array(z.string()),
});

export const INTENTS = ["informational", "commercial", "transactional", "navigational"] as const;
export const COMPETITION = ["low", "medium", "high"] as const;

export const scoredOutput = z.object({
  summary: z.string(),
  opportunities: z.array(
    z.object({
      keyword: z.string(),
      intent: z.enum(INTENTS),
      cluster: z.string(),
      reason: z.string(),
      suggestedTitle: z.string(),
      competition: z.enum(COMPETITION),
    }),
  ),
});
export type ScoredOutput = z.infer<typeof scoredOutput>;

export const postOutput = z.object({
  /** False when the keyword has nothing to do with this site. */
  onTopic: z.boolean(),
  title: z.string(),
  metaDescription: z.string(),
  bodyHtml: z.string(),
  faq: z.array(z.object({ question: z.string(), answer: z.string() })),
  reviewNotes: z.array(z.string()),
});
export type PostOutput = z.infer<typeof postOutput>;

/** What a user may save from the setup form (API boundary). */
export const profileInput = z.object({
  businessType: z.string().trim().min(2).max(80),
  services: z.array(z.string().trim().min(1).max(60)).min(1).max(10),
  audience: z.string().trim().min(2).max(160),
  country: z.string().trim().regex(/^[A-Za-z]{2}$/),
  language: z.string().trim().regex(/^[A-Za-z]{2}$/),
});
export type ProfileInput = z.infer<typeof profileInput>;

const clip = (s: string, n: number) => s.replace(/\s+/g, " ").trim().slice(0, n);

/** Tidies a model profile into what is stored; null fields fall back. */
export function normalizeProfile(raw: ProfileOutput, fallback: { country: string; language: string }): ProfileInput {
  const country = /^[A-Za-z]{2}$/.test(raw.country.trim()) ? raw.country.trim().toUpperCase() : fallback.country;
  const language = /^[A-Za-z]{2}$/.test(raw.language.trim()) ? raw.language.trim().toLowerCase() : fallback.language;
  const services = [...new Set(raw.services.map((s) => clip(s, 60)).filter(Boolean))].slice(0, 10);
  return {
    businessType: clip(raw.businessType, 80) || "Business",
    services: services.length > 0 ? services : ["General services"],
    audience: clip(raw.audience, 160) || "Customers",
    country,
    language,
  };
}

/** Lower-case, single-spaced, 2 to 80 characters, deduplicated, at most `max`. */
export function normalizeKeywords(list: string[], max: number): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of list) {
    const k = raw.toLowerCase().replace(/[\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim();
    if (k.length < 2 || k.length > 80 || seen.has(k)) continue;
    seen.add(k);
    out.push(k);
    if (out.length >= max) break;
  }
  return out;
}

/** Input stored on an ai_job of kind "write" (validated on both sides). */
export const writeJobInput = z.object({
  keyword: z.string().trim().min(2).max(120),
  notes: z.string().trim().max(2000).default(""),
  /** Rewriting an existing post (uses its free regeneration). */
  postId: z.string().optional(),
});
export type WriteJobInput = z.infer<typeof writeJobInput>;

/** The site's real pages, as stored on content_profile.pages. */
export const profilePages = z.array(z.object({ url: z.string(), title: z.string() }));
