import { MODELS } from "../pricing";
import { AgentError, structuredCall, type AgentDeps, type AgentRun } from "../claude";
import { normalizeProfile, profileOutput, type ProfileInput } from "../schemas";
import { countryFromDomain, type SiteSnapshot } from "../site-reader";

export interface SetupResult {
  profile: ProfileInput;
  /** The site's real pages: the only allowed internal links for posts. */
  pages: { url: string; title: string }[];
}

const SYSTEM =
  "You are MyKavo's content strategist. You read a small business website and describe it accurately and briefly, in plain English. Never invent services the site does not mention.";

const INSTRUCTION = `Describe this business from its own pages.
- businessType: what kind of business it is, in a few words (for example "Family dental clinic").
- services: its main products or services, 3 to 8 short items.
- audience: who it serves, one short phrase.
- country: ISO 3166-1 alpha-2 code of the main market (use the hint if the pages don't say).
- language: ISO 639-1 code of the language the site is written in.
- allowedTopic: false only if the site is adult content, gambling, weapons, drugs, illegal services, scams or hate; otherwise true.`;

/** One Haiku call: the business profile the user then confirms or edits. */
export async function buildProfile(
  deps: AgentDeps,
  run: AgentRun,
  input: { siteUrl: string; siteName: string; snapshot: SiteSnapshot },
): Promise<SetupResult> {
  const fallback = {
    country: countryFromDomain(input.siteUrl) ?? "US",
    language: input.snapshot.htmlLang ?? "en",
  };
  const raw = await structuredCall(deps, run, {
    step: "profile",
    model: MODELS.fast,
    system: SYSTEM,
    instruction: INSTRUCTION,
    data: {
      siteName: input.siteName,
      siteUrl: input.siteUrl,
      countryHint: fallback.country,
      pages: input.snapshot.pages.map((p) => ({
        url: p.url,
        title: p.title,
        description: p.description,
        h1: p.h1,
        h2s: p.h2s.slice(0, 6),
        excerpt: p.excerpt.slice(0, 400),
      })),
    },
    schema: profileOutput,
    maxTokens: 800,
    effort: "low",
  });
  if (!raw.allowedTopic) {
    throw new AgentError(
      "policy",
      "MyKavo's AI writer can't help with this kind of website. Monitoring still works as normal.",
    );
  }
  return {
    profile: normalizeProfile(raw, fallback),
    pages: input.snapshot.pages.map((p) => ({ url: p.url, title: p.title || p.h1 || p.url })),
  };
}
