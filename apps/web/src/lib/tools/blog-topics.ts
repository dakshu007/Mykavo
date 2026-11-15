/**
 * The free blog topic finder on the AI blog writer pages: real searches from
 * Google autocomplete for a seed topic, grouped into the kinds of posts they
 * suggest. Autocomplete gives no search volume, so the only popularity
 * signal shown is relative: how high a suggestion sat and how many of the
 * seed's variations surfaced it (1 to 5), the same proxy the AI Keywords
 * agent uses (packages/keyword-agent). Nothing here is presented as volume.
 *
 * The host is fixed (Google), so there is no user-supplied URL to vet.
 */

export const AUTOCOMPLETE_HOST = "https://suggestqueries.google.com/complete/search";

/** Seed variations asked for, in this order (the seed alone first). */
const PREFIXES = ["", "how to", "what is", "best", "why"] as const;
const SUFFIXES = ["for", "vs", "ideas", "tips"] as const;

export const MAX_SEED_LENGTH = 60;

/** Lowercase, collapse spaces, strip anything that is not a word character. */
export function cleanSeed(raw: string): string | null {
  const seed = raw
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s'&+-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_SEED_LENGTH)
    .trim();
  return seed.length >= 2 ? seed : null;
}

export function topicQueries(seed: string): string[] {
  return [...PREFIXES.map((p) => (p ? `${p} ${seed}` : seed)), ...SUFFIXES.map((s) => `${seed} ${s}`)];
}

export function autocompleteUrl(query: string, country = "us", language = "en"): string {
  const params = new URLSearchParams({ client: "firefox", q: query, hl: language, gl: country });
  return `${AUTOCOMPLETE_HOST}?${params.toString()}`;
}

/** The firefox client answers ["query", ["suggestion", ...], ...]. */
export function parseSuggestions(body: string): string[] {
  try {
    const data: unknown = JSON.parse(body);
    if (!Array.isArray(data) || !Array.isArray(data[1])) return [];
    return data[1].filter((s): s is string => typeof s === "string").map((s) => s.trim().toLowerCase()).filter(Boolean);
  } catch {
    return [];
  }
}

const BLOCKED = /\b(porn|xxx|nude|sex|escort|casino|betting|viagra|cialis|crack|torrent|hack(ed|ing)?|kill|suicide|nazi)\b/i;

export type TopicKind = "question" | "comparison" | "audience" | "idea";

export interface Topic {
  keyword: string;
  kind: TopicKind;
  /** Relative popularity 1..5 from autocomplete position, never a volume. */
  popularity: number;
}

export interface TopicGroups {
  seed: string;
  question: Topic[];
  comparison: Topic[];
  audience: Topic[];
  idea: Topic[];
  total: number;
}

const QUESTION = /^(how|what|why|when|where|which|who|can|could|does|do|is|are|should|will|would)\b/;
const COMPARISON = /\b(best|vs|versus|alternative|alternatives|top|compare|comparison|review|reviews|cheapest)\b/;
const AUDIENCE = /\bfor\s+\w+/;

export function topicKind(keyword: string): TopicKind {
  if (QUESTION.test(keyword)) return "question";
  if (COMPARISON.test(keyword)) return "comparison";
  if (AUDIENCE.test(keyword)) return "audience";
  return "idea";
}

export function popularity(bestRank: number, timesSeen: number): number {
  const rankPart = bestRank <= 1 ? 3 : bestRank <= 3 ? 2 : bestRank <= 6 ? 1 : 0;
  const seenPart = timesSeen >= 3 ? 2 : timesSeen >= 2 ? 1 : 0;
  return Math.min(5, 1 + rankPart + seenPart);
}

/** Merge the suggestion lists (one per query) into grouped, ranked topics. */
export function groupTopics(seed: string, lists: string[][], perGroup = 8): TopicGroups {
  const seen = new Map<string, { bestRank: number; timesSeen: number; order: number }>();
  let order = 0;
  for (const list of lists) {
    list.forEach((raw, i) => {
      const keyword = raw.replace(/\s+/g, " ").trim();
      if (!keyword || keyword === seed || keyword.length > 90 || BLOCKED.test(keyword)) return;
      const prev = seen.get(keyword);
      if (prev) {
        prev.timesSeen += 1;
        prev.bestRank = Math.min(prev.bestRank, i + 1);
      } else {
        seen.set(keyword, { bestRank: i + 1, timesSeen: 1, order: order++ });
      }
    });
  }
  const topics = [...seen.entries()]
    .map(([keyword, s]) => ({ keyword, kind: topicKind(keyword), popularity: popularity(s.bestRank, s.timesSeen), order: s.order }))
    .sort((a, b) => b.popularity - a.popularity || a.order - b.order);
  const pick = (kind: TopicKind): Topic[] =>
    topics.filter((t) => t.kind === kind).slice(0, perGroup).map(({ keyword, kind: k, popularity: p }) => ({ keyword, kind: k, popularity: p }));
  const groups = { question: pick("question"), comparison: pick("comparison"), audience: pick("audience"), idea: pick("idea") };
  return { seed, ...groups, total: groups.question.length + groups.comparison.length + groups.audience.length + groups.idea.length };
}

type Fetcher = (url: string, init: RequestInit) => Promise<Response>;

/**
 * Ask autocomplete for each variation, a few at a time, with a short timeout.
 * Stops at the first refusal (403/429) so a blocked IP is not hammered.
 */
export async function fetchTopicLists(seed: string, fetcher: Fetcher = fetch, country = "us"): Promise<string[][]> {
  const lists: string[][] = [];
  const queries = topicQueries(seed);
  for (let i = 0; i < queries.length; i += 3) {
    const batch = queries.slice(i, i + 3);
    const results = await Promise.all(
      batch.map(async (q) => {
        try {
          const res = await fetcher(autocompleteUrl(q, country), {
            headers: { accept: "application/json" },
            signal: AbortSignal.timeout(4000),
            cache: "no-store",
          });
          if (res.status === 403 || res.status === 429) return null;
          if (!res.ok) return [];
          return parseSuggestions(await res.text());
        } catch {
          return [];
        }
      }),
    );
    if (results.some((r) => r === null)) break;
    for (const r of results) if (r) lists.push(r);
  }
  return lists;
}
