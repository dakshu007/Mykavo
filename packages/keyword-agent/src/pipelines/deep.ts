import { MODELS } from "../pricing";
import { logStep, researchCall, structuredCall, type AgentDeps, type AgentRun } from "../claude";
import { normalizeKeywords, scoredOutput, seedsOutput, type ProfileInput } from "../schemas";
import { expansionsFor, popularityScore, type AutocompleteResult } from "../autocomplete";

/**
 * Deep analysis for sites without (enough) Search Console data, using only
 * public sources: the site's own pages, Google autocomplete and web search.
 * Search Console data is never sent to the model here.
 *
 *   1. seeds      Haiku   20 to 40 seed terms from the confirmed profile
 *   2. expand     -       autocomplete, cached, rate limited, optional
 *   3. research   Sonnet  web search on the strongest candidates (max 5)
 *   4. score      Sonnet  top 20 opportunities, clustered, with reasons
 *
 * Four model calls at most, so the step count is bounded by construction.
 */

export interface DeepInput {
  profile: ProfileInput;
  siteUrl: string;
  /** Titles of the site's existing pages, to suggest updates over new posts. */
  existingPages: { url: string; title: string }[];
  collect: (queries: string[]) => Promise<AutocompleteResult>;
  onProgress: (step: string, progress: number) => Promise<void>;
}

export interface DeepOpportunity {
  rank: number;
  keyword: string;
  intent: string;
  cluster: string;
  reason: string;
  suggestedTitle: string;
  competition: string;
  popularity: number;
}

export interface DeepResult {
  summary: string;
  opportunities: DeepOpportunity[];
  autocompleteBlocked: boolean;
}

const SEED_SYSTEM =
  "You are an SEO strategist for small businesses. You suggest the searches real customers type, in the site's own language and market.";

const SCORE_SYSTEM =
  "You are an SEO strategist. You pick the content a small business should write next, honestly. You never invent search volumes or traffic numbers; competition is your estimate from the research notes.";

export const MAX_OPPORTUNITIES = 20;

export async function runDeepAnalysis(deps: AgentDeps, run: AgentRun, input: DeepInput): Promise<DeepResult> {
  const { profile } = input;

  await input.onProgress("Finding keyword ideas", 15);
  const seedsRaw = await structuredCall(deps, run, {
    step: "seeds",
    model: MODELS.fast,
    system: SEED_SYSTEM,
    instruction: `Suggest 25 to 35 short search queries (2 to 5 words) this business's customers type into Google, in language "${profile.language}" for the market "${profile.country}". Cover the main services, problems customers have, comparisons and buying intent. No brand names of competitors. Lower case.`,
    data: { profile, pages: input.existingPages.slice(0, 15).map((p) => p.title) },
    schema: seedsOutput,
    maxTokens: 1200,
    effort: "low",
  });
  const seeds = normalizeKeywords(seedsRaw.seeds, 35);

  await input.onProgress("Checking what people search for", 35);
  const startedAt = Date.now();
  const queries = seeds.slice(0, 12).flatMap((s) => expansionsFor(s).slice(0, 4));
  const ac = await input.collect(queries);
  await logStep(deps, run, {
    name: "autocomplete",
    ok: !ac.blocked,
    durationMs: Date.now() - startedAt,
    note: `${ac.fetched} live, ${ac.cached} cached, ${ac.ideas.size} ideas${ac.blocked ? ", blocked" : ""}`,
  });

  // Candidates: autocomplete ideas by popularity, then seeds not seen there.
  const popularity = new Map<string, number>();
  for (const [k, v] of ac.ideas) popularity.set(k, popularityScore(v.bestRank, v.timesSeen));
  for (const s of seeds) if (!popularity.has(s)) popularity.set(s, 1);
  const candidates = [...popularity.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 60)
    .map(([keyword, pop]) => ({ keyword, popularityEstimate: pop }));

  await input.onProgress("Checking competitors", 55);
  const notes = await researchCall(deps, run, {
    step: "research",
    model: MODELS.writer,
    system: "You research Google results for SEO. Be brief and factual.",
    instruction: `Search Google for up to 5 of the most promising of these queries for a ${profile.businessType} in ${profile.country}. For each one searched, note in two or three lines who ranks on page one and whether the results look weak (forums, thin or outdated pages, small sites), which would make it an easy win. Plain text only.`,
    data: { candidates: candidates.slice(0, 20).map((c) => c.keyword) },
    maxSearches: 5,
    maxTokens: 2500,
  });

  await input.onProgress("Ranking opportunities", 80);
  const scored = await structuredCall(deps, run, {
    step: "score",
    model: MODELS.writer,
    system: SCORE_SYSTEM,
    instruction: `Choose the ${MAX_OPPORTUNITIES} best keywords for this business to write about next, best first, using the candidates (popularityEstimate is 1 to 5, an estimate from autocomplete) and the research notes. Prefer keywords that match what the business sells and have weak competition. Group them into clusters (topic names). For each: intent, cluster, a one-sentence plain-English reason, a suggested post title, and competition low/medium/high as your estimate. If an existing page already covers a keyword, say in the reason to update that page instead of writing a new post. Also write a two-sentence summary of the plan.`,
    data: {
      profile,
      existingPages: input.existingPages.slice(0, 30),
      candidates,
      researchNotes: notes || "No research notes available.",
    },
    schema: scoredOutput,
    maxTokens: 8000,
    effort: "medium",
  });

  const seen = new Set<string>();
  const opportunities: DeepOpportunity[] = [];
  for (const o of scored.opportunities) {
    const keyword = normalizeKeywords([o.keyword], 1)[0];
    if (!keyword || seen.has(keyword)) continue;
    seen.add(keyword);
    opportunities.push({
      rank: opportunities.length + 1,
      keyword,
      intent: o.intent,
      cluster: o.cluster.replace(/\s+/g, " ").trim().slice(0, 60) || "General",
      reason: o.reason.replace(/\s+/g, " ").trim().slice(0, 300),
      suggestedTitle: o.suggestedTitle.replace(/\s+/g, " ").trim().slice(0, 120),
      competition: o.competition,
      // From our own autocomplete data, never from the model.
      popularity: popularity.get(keyword) ?? 1,
    });
    if (opportunities.length >= MAX_OPPORTUNITIES) break;
  }

  return {
    summary: scored.summary.replace(/\s+/g, " ").trim().slice(0, 500),
    opportunities,
    autocompleteBlocked: ac.blocked,
  };
}
