/**
 * Server-side product events, sent to Mixpanel's ingestion API.
 *
 * Why server-side: the moments that matter (a baseline finishing, a change
 * being detected, a trial converting) happen in route handlers and in the
 * worker, never in the browser, and ad blockers cannot drop them. Page views
 * stay with GA4.
 *
 * Rules:
 *  - Off unless MIXPANEL_TOKEN is set, so local runs and tests send nothing.
 *  - distinct_id is the MyKavo user id. No email, name or URL is ever sent:
 *    properties are counts, plans, severities and buckets.
 *  - $insert_id guards retries: Mixpanel drops an event only when its name,
 *    distinct_id, time and $insert_id all match one it already has. Events
 *    that must count once therefore pass a stable `time` (the moment the
 *    thing happened, read from the database), not "now".
 *  - Never throws and never blocks for long: analytics must not break a scan,
 *    a webhook or a request.
 */

export type ProductEvent =
  | "baseline_funnel_started"
  | "baseline_funnel_completed"
  | "monitoring_activated"
  | "first_change_detected"
  | "change_viewed"
  | "change_reviewed"
  | "change_approved"
  | "ai_explanation_viewed"
  | "trial_to_paid_conversion"
  | "trial_ended";

export type ProductEventProps = Record<string, string | number | boolean | null | undefined>;

export type ProductEventInput = {
  event: ProductEvent;
  /** The MyKavo user id the event belongs to. */
  distinctId: string;
  /**
   * A stable key for this occurrence (for example the change id), so a retry
   * sends the same $insert_id. Combined with the event name.
   */
  dedupeKey: string;
  props?: ProductEventProps;
  /** When it happened; defaults to now. */
  time?: Date;
};

type MixpanelConfig = { token: string; host: string };

const DEFAULT_HOST = "https://api.mixpanel.com";
const TIMEOUT_MS = 3_000;

export function mixpanelConfig(env: Record<string, string | undefined> = process.env): MixpanelConfig | null {
  const token = env.MIXPANEL_TOKEN?.trim();
  if (!token) return null;
  // EU data residency projects use https://api-eu.mixpanel.com.
  const host = (env.MIXPANEL_API_HOST?.trim() || DEFAULT_HOST).replace(/\/+$/, "");
  return { token, host };
}

/** Mixpanel limits $insert_id to 36 characters of [A-Za-z0-9-]. */
export function insertIdFor(event: ProductEvent, dedupeKey: string): string {
  const raw = `${event}:${dedupeKey}`;
  // Two 32-bit FNV-1a passes with different seeds: short, stable,
  // dependency-free (the web app targets ES2017, so no BigInt).
  const fnv = (seed: number) => {
    let h = seed >>> 0;
    for (let i = 0; i < raw.length; i++) {
      h ^= raw.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h.toString(16).padStart(8, "0");
  };
  return `mk-${fnv(0x811c9dc5)}${fnv(0x01234567)}`;
}

/** Drops undefined values; Mixpanel stores null as "(not set)". */
function cleanProps(props: ProductEventProps | undefined): Record<string, string | number | boolean | null> {
  const out: Record<string, string | number | boolean | null> = {};
  for (const [k, v] of Object.entries(props ?? {})) {
    if (v === undefined) continue;
    out[k] = typeof v === "number" && !Number.isFinite(v) ? null : v;
  }
  return out;
}

export function buildMixpanelPayload(input: ProductEventInput, token: string) {
  return {
    event: input.event,
    properties: {
      ...cleanProps(input.props),
      token,
      distinct_id: input.distinctId,
      time: (input.time ?? new Date()).getTime(),
      $insert_id: insertIdFor(input.event, input.dedupeKey),
      source: "server",
    },
  };
}

type Fetcher = (url: string, init: RequestInit) => Promise<Response>;

/**
 * Sends one or more events. Resolves to true when Mixpanel accepted them,
 * false when tracking is off or the call failed. Never rejects.
 */
export async function sendProductEvents(
  inputs: ProductEventInput[],
  opts: { env?: Record<string, string | undefined>; fetcher?: Fetcher; onError?: (err: unknown) => void } = {},
): Promise<boolean> {
  const cfg = mixpanelConfig(opts.env);
  if (!cfg || inputs.length === 0) return false;
  const fetcher = opts.fetcher ?? fetch;
  try {
    const res = await fetcher(`${cfg.host}/track?strict=1`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(inputs.map((i) => buildMixpanelPayload(i, cfg.token))),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      opts.onError?.(new Error(`mixpanel: HTTP ${res.status}`));
      return false;
    }
    return true;
  } catch (err) {
    opts.onError?.(err);
    return false;
  }
}

export function sendProductEvent(
  input: ProductEventInput,
  opts?: Parameters<typeof sendProductEvents>[1],
): Promise<boolean> {
  return sendProductEvents([input], opts);
}

/** Whole hours (one decimal) between two moments; null when either is missing. */
export function hoursBetween(from: Date | null | undefined, to: Date | null | undefined): number | null {
  if (!from || !to) return null;
  return Math.max(0, Math.round(((to.getTime() - from.getTime()) / 3_600_000) * 10) / 10);
}

/** Whole minutes between two moments; null when either is missing. */
export function minutesBetween(from: Date | null | undefined, to: Date | null | undefined): number | null {
  if (!from || !to) return null;
  return Math.max(0, Math.round((to.getTime() - from.getTime()) / 60_000));
}
