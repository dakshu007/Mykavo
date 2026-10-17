/**
 * Simple in-memory sliding-window rate limiter for Phase 0 public endpoints.
 * Per-instance only - replaced by a shared store (Redis) in Phase 10 hardening.
 */

interface Window {
  timestamps: number[];
}

const buckets = new Map<string, Window>();
const MAX_BUCKETS = 10_000;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function rateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number },
): RateLimitResult {
  const now = Date.now();
  const cutoff = now - windowMs;

  // Opportunistic cleanup to bound memory.
  if (buckets.size > MAX_BUCKETS) {
    for (const [k, w] of buckets) {
      if (w.timestamps.every((t) => t < cutoff)) buckets.delete(k);
      if (buckets.size <= MAX_BUCKETS / 2) break;
    }
  }

  const bucket = buckets.get(key) ?? { timestamps: [] };
  bucket.timestamps = bucket.timestamps.filter((t) => t >= cutoff);

  if (bucket.timestamps.length >= limit) {
    buckets.set(key, bucket);
    const oldest = bucket.timestamps[0];
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((oldest + windowMs - now) / 1000)),
    };
  }

  bucket.timestamps.push(now);
  buckets.set(key, bucket);
  return { allowed: true, remaining: limit - bucket.timestamps.length, retryAfterSeconds: 0 };
}

/**
 * Best-effort client identifier for public endpoints.
 *
 * Order matters, because only some of these headers are set by
 * infrastructure we trust:
 *  1. `x-nf-client-connection-ip` - set by Netlify's edge from the TCP
 *     connection itself, overwriting anything the client sent. The one
 *     header here a caller cannot forge in production.
 *  2. `x-real-ip` - a single address set by a reverse proxy, for running
 *     behind something other than Netlify.
 *  3. The FIRST `x-forwarded-for` entry - the original client as the first
 *     proxy saw it. A client can prepend fake entries, so this is only a
 *     fallback for local and non-Netlify setups; it is never preferred over
 *     the two above.
 */
export function clientKey(request: Request): string {
  const netlify = request.headers.get("x-nf-client-connection-ip")?.trim();
  if (netlify) return netlify;
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  const forwarded = request.headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  return first || "unknown";
}
