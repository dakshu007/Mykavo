/**
 * The pure half of the screen cache (live-cache.ts): how an entry is written
 * and when a stored one is still worth showing. Kept free of React Native so
 * it runs under vitest.
 */

/** A cached screen older than this is not shown at all: stale numbers mislead. */
export const MAX_AGE_MS = 3 * 24 * 60 * 60 * 1000;
/** Bigger responses are not written to disk (keeps the cache cheap to read). */
export const MAX_BYTES = 300_000;

export interface CacheEntry<T> {
  v: 1;
  at: number;
  data: T;
}

/** The storage key: per workspace, so switching workspaces never shows another's data. */
export function entryKey(workspace: string | null, name: string, deps: string): string {
  return `mk-live:${workspace ?? "-"}:${name}${deps ? `:${deps}` : ""}`;
}

export function encodeEntry<T>(data: T, now: number = Date.now()): string | null {
  const raw = JSON.stringify({ v: 1, at: now, data } satisfies CacheEntry<T>);
  return raw.length > MAX_BYTES ? null : raw;
}

/** The cached data, or null when the entry is missing, corrupt, foreign or too old. */
export function decodeEntry<T>(raw: string | null, now: number = Date.now()): { data: T; at: number } | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<CacheEntry<T>>;
    if (parsed?.v !== 1 || typeof parsed.at !== "number" || parsed.data === undefined) return null;
    if (now - parsed.at > MAX_AGE_MS || parsed.at > now + 60_000) return null;
    return { data: parsed.data as T, at: parsed.at };
  } catch {
    return null;
  }
}
