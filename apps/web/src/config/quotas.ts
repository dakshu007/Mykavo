/**
 * Caps for the external services MyKavo runs on, in one place.
 *
 * Spec §37 says never hardcode limits throughout application code, and these
 * are the same class of thing as plan limits - except these are somebody
 * else's limits, which makes them worse: they change when a provider changes
 * its free tier, and nothing in this repo finds out. So every cap is
 * overridable by an environment variable, and the UI shows where each number
 * came from ("configured" vs "reported by the provider") rather than implying
 * we verified it.
 *
 * The defaults are the free-tier figures as of Sept 2026. Treat them as a
 * starting point to correct against your own provider dashboards, not as
 * truth: an out-of-date cap makes a meter lie in the most dangerous
 * direction, showing 40% when you are actually at 90%.
 */

/** Bytes per unit, for turning provider figures into one comparable number. */
export const MB = 1024 * 1024;
export const GB = 1024 * MB;

export type QuotaSource = "configured" | "reported";

export interface Quota {
  /** Cap in the metric's own unit (bytes, count). Infinity means no cap. */
  limit: number;
  /** Where the number came from. Env overrides stay "configured". */
  source: QuotaSource;
  /** Shown under the meter so the number is auditable. */
  note: string;
}

/** Parse a positive number from an env var; undefined when unset or invalid. */
function envNumber(name: string): number | undefined {
  const raw = process.env[name];
  if (typeof raw !== "string" || raw.trim().length === 0) return undefined;
  const value = Number(raw.trim());
  // A typo must not silently become a cap of NaN, which compares false
  // against everything and would paint every meter green.
  if (!Number.isFinite(value) || value <= 0) return undefined;
  return value;
}

/**
 * Resolve a cap: env override if present, otherwise the documented default.
 * `scale` converts the env var's friendly unit (MB, GB) into the metric's.
 */
function quota(
  envName: string,
  fallback: number,
  note: string,
  scale = 1,
): Quota {
  const override = envNumber(envName);
  if (override !== undefined) {
    return {
      limit: override * scale,
      source: "configured",
      note: `Set by ${envName}.`,
    };
  }
  return { limit: fallback, source: "configured", note };
}

export const QUOTAS = {
  databaseBytes: () =>
    quota(
      "QUOTA_DATABASE_MB",
      500 * MB,
      "Supabase free tier is 500 MB. Raise QUOTA_DATABASE_MB after upgrading.",
      MB,
    ),
  databaseConnections: () =>
    quota(
      "QUOTA_DATABASE_CONNECTIONS",
      60,
      "Supabase free tier allows 60 direct connections. The pooler allows more.",
    ),
  storageBytes: () =>
    quota(
      "QUOTA_R2_GB",
      10 * GB,
      "Cloudflare R2 includes 10 GB of storage free, then bills per GB.",
      GB,
    ),
  emailsPerDay: () =>
    quota(
      "QUOTA_RESEND_DAILY",
      100,
      "Resend free tier sends 100 emails per day.",
    ),
  emailsPerMonth: () =>
    quota(
      "QUOTA_RESEND_MONTHLY",
      3_000,
      "Resend free tier sends 3,000 emails per month.",
    ),
  bandwidthBytes: () =>
    quota(
      "QUOTA_NETLIFY_BANDWIDTH_GB",
      100 * GB,
      "Netlify free tier includes 100 GB of bandwidth per month.",
      GB,
    ),
} as const;

/**
 * How alarmed to be about a ratio.
 *
 * THREE steps, not four, and that is a measured decision rather than a
 * preference. A four-step green/amber/orange/red ramp cannot be rendered
 * distinguishably in this palette: the two middle fills (warning-strong
 * #b45309 and orange-strong #c2410c) measure a normal-vision OKLab deltaE of
 * 4.1 and a deuteranopia deltaE of 0.1 - identical to a red-green colourblind
 * reader, and near-identical to everyone else. A level nobody can tell apart
 * from its neighbour carries no information, so there are three.
 *
 * Every level also ships an icon and a word in the UI, so hue is the third
 * redundant channel rather than the only one.
 */
export type UsageLevel = "ok" | "warning" | "critical";

/**
 * `ratio` is used/limit, so 0.82 is 82%.
 *
 * 0.9 is the critical line rather than 1.0: a hard provider cap reached is
 * already an outage or an unexpected bill, so the alarm has to come before
 * it, not when it happens.
 */
export function usageLevel(ratio: number): UsageLevel {
  if (!Number.isFinite(ratio) || ratio < 0) return "ok";
  if (ratio >= 0.9) return "critical";
  if (ratio >= 0.7) return "warning";
  return "ok";
}

/** Plain-language reason, so the colour is never the only signal. */
export function usageLabel(level: UsageLevel): string {
  switch (level) {
    case "critical":
      return "At capacity";
    case "warning":
      return "Getting full";
    case "ok":
      return "Healthy";
  }
}
