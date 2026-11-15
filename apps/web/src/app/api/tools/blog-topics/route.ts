import { NextResponse } from "next/server";
import { clientKey, rateLimit } from "@/lib/security/rate-limit";
import { cleanSeed, fetchTopicLists, groupTopics, type TopicGroups } from "@/lib/tools/blog-topics";

/**
 * Free blog topic finder (the AI blog writer pages): real Google autocomplete
 * searches for a seed topic, grouped into questions, comparisons, audiences
 * and ideas. Rate limited per visitor and cached per seed for a day, so a
 * popular seed costs Google one round of requests a day at most.
 */

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_MAX = 500;
const cache = new Map<string, { at: number; value: TopicGroups }>();

function cached(seed: string): TopicGroups | null {
  const hit = cache.get(seed);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    cache.delete(seed);
    return null;
  }
  return hit.value;
}

function remember(seed: string, value: TopicGroups) {
  if (cache.size >= CACHE_MAX) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(seed, { at: Date.now(), value });
}

export async function GET(request: Request) {
  const seed = cleanSeed(new URL(request.url).searchParams.get("q") ?? "");
  if (!seed) {
    return NextResponse.json({ error: "Type a topic of at least two letters." }, { status: 400 });
  }

  const hit = cached(seed);
  if (hit) return NextResponse.json(hit);

  const limit = rateLimit(`blog-topics:${clientKey(request)}`, { limit: 12, windowMs: 60_000 });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many searches - please wait a moment and try again." },
      { status: 429, headers: { "retry-after": String(limit.retryAfterSeconds) } },
    );
  }

  const lists = await fetchTopicLists(seed);
  // Nothing at all came back (blocked, offline, timeouts): say so, and never
  // cache it, so the next visitor gets a fresh try.
  if (lists.every((l) => l.length === 0)) {
    return NextResponse.json(
      { error: "Google suggestions are not answering right now. Please try again in a minute." },
      { status: 503 },
    );
  }
  const groups = groupTopics(seed, lists);
  if (groups.total > 0) remember(seed, groups);
  return NextResponse.json(groups);
}
