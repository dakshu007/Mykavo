import { safeFetch } from "@mykavo/shared";
import { normalizeKeywords } from "./schemas";

/**
 * Google autocomplete: real searches people type, for keyword ideas. It is
 * an unofficial endpoint with no volume data, so it is rate limited, cached in
 * Postgres for 30 days (shared across users, public data only) and optional:
 * if Google blocks it the analysis carries on with model ideas instead.
 */

export const AUTOCOMPLETE_HOST = "https://suggestqueries.google.com/complete/search";

/** Modifiers per seed (spec: how, what, best, vs, for, near me, price, free). */
export const MODIFIERS = ["", "how", "what", "best", "vs", "for", "near me", "price", "free"] as const;

export function autocompleteUrl(query: string, country: string, language: string): string {
  const params = new URLSearchParams({ client: "firefox", q: query, hl: language, gl: country.toLowerCase() });
  return `${AUTOCOMPLETE_HOST}?${params.toString()}`;
}

/** The firefox client answers ["query", ["suggestion", ...], ...]. */
export function parseAutocomplete(body: string): string[] {
  try {
    const data: unknown = JSON.parse(body);
    if (!Array.isArray(data) || !Array.isArray(data[1])) return [];
    return normalizeKeywords(data[1].filter((s): s is string => typeof s === "string"), 10);
  } catch {
    return [];
  }
}

/** Queries to ask for one seed: the seed alone and with modifiers. */
export function expansionsFor(seed: string): string[] {
  return MODIFIERS.map((m) => {
    if (!m) return seed;
    return m === "near me" || m === "price" || m === "free" || m === "vs" || m === "for" ? `${seed} ${m}` : `${m} ${seed}`;
  });
}

/** Very small blocklist; anything matching is never cached or shown. */
const BLOCKED = /\b(porn|xxx|nude|sex|escort|casino|betting|viagra|cialis|crack|torrent|hack(ed|ing)?|kill|suicide|nazi)\b/i;

export function isCleanSuggestion(s: string): boolean {
  return !BLOCKED.test(s);
}

/**
 * Popularity proxy, 1..5, never a search volume: how high a suggestion sits
 * in autocomplete and how many different seed queries surfaced it.
 */
export function popularityScore(bestRank: number, timesSeen: number): number {
  const rankPart = bestRank <= 1 ? 3 : bestRank <= 3 ? 2 : bestRank <= 6 ? 1 : 0;
  const seenPart = timesSeen >= 3 ? 2 : timesSeen >= 2 ? 1 : 0;
  return Math.min(5, 1 + rankPart + seenPart);
}

export interface AutocompleteCacheStore {
  get(query: string, country: string, language: string): Promise<string[] | null>;
  put(query: string, country: string, language: string, suggestions: string[]): Promise<void>;
}

export interface AutocompleteResult {
  /** suggestion -> { best rank seen (1 = top), how many queries surfaced it } */
  ideas: Map<string, { bestRank: number; timesSeen: number }>;
  fetched: number;
  cached: number;
  /** True when Google stopped answering and the rest were skipped. */
  blocked: boolean;
}

/**
 * Asks autocomplete for each query, cache first. Sequential with a pause
 * between live requests, at most `maxLive` live requests, and it stops at the
 * first refusal (429/403) instead of hammering.
 */
export async function collectAutocomplete(params: {
  queries: string[];
  country: string;
  language: string;
  cache: AutocompleteCacheStore;
  maxLive: number;
  delayMs?: number;
  fetcher?: (url: string) => Promise<{ status: number; body: string }>;
}): Promise<AutocompleteResult> {
  const fetcher =
    params.fetcher ??
    (async (url: string) => {
      const res = await safeFetch(url, { timeoutMs: 8000, maxBytes: 64 * 1024 });
      return { status: res.status, body: res.body };
    });
  const ideas = new Map<string, { bestRank: number; timesSeen: number }>();
  let fetched = 0;
  let cached = 0;
  let blocked = false;

  const record = (list: string[]) => {
    list.filter(isCleanSuggestion).forEach((s, i) => {
      const prev = ideas.get(s);
      ideas.set(s, { bestRank: Math.min(prev?.bestRank ?? 99, i + 1), timesSeen: (prev?.timesSeen ?? 0) + 1 });
    });
  };

  for (const query of params.queries) {
    const hit = await params.cache.get(query, params.country, params.language);
    if (hit) {
      cached++;
      record(hit);
      continue;
    }
    if (blocked || fetched >= params.maxLive) continue;
    try {
      if (fetched > 0 && (params.delayMs ?? 400) > 0) await new Promise((r) => setTimeout(r, params.delayMs ?? 400));
      const res = await fetcher(autocompleteUrl(query, params.country, params.language));
      fetched++;
      if (res.status === 429 || res.status === 403) {
        blocked = true;
        continue;
      }
      if (res.status !== 200) continue;
      const suggestions = parseAutocomplete(res.body).filter(isCleanSuggestion);
      await params.cache.put(query, params.country, params.language, suggestions);
      record(suggestions);
    } catch {
      // A network failure on one query is not worth failing the analysis.
      fetched++;
    }
  }
  return { ideas, fetched, cached, blocked };
}
