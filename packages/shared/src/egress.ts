/**
 * Database egress, measured from the Supabase Metrics API.
 *
 * The worker stores a reading of the database server's bytes-sent counter
 * every hour (apps/worker/src/egress-sample.ts); the admin usage page turns
 * those readings into usage for the billing cycle. Pure helpers, shared so
 * both sides read the counter the same way.
 */

/** The usage_sample metric the worker writes. */
export const EGRESS_METRIC = "db_network_tx_bytes";

/** "postgres.<ref>" (pooler) or db.<ref>.supabase.co (direct) names the project. */
export function projectRefFromDatabaseUrl(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const user = /^postgres\.([a-z0-9]{10,40})$/.exec(decodeURIComponent(parsed.username));
    if (user?.[1]) return user[1];
    const host = /^db\.([a-z0-9]{10,40})\.supabase\.co$/.exec(parsed.hostname);
    return host?.[1] ?? null;
  } catch {
    return null;
  }
}

/**
 * Bytes sent across every real interface, from Prometheus text. Loopback is
 * the server talking to itself. Null when the series is missing.
 */
export function transmitBytesFromMetrics(text: string): number | null {
  let total = 0;
  let found = false;
  for (const line of text.split("\n")) {
    const match = /^node_network_transmit_bytes_total(\{[^}]*\})?\s+([0-9.eE+-]+)/.exec(line);
    if (!match) continue;
    if (/device="lo"/.test(match[1] ?? "")) continue;
    const value = Number(match[2]);
    if (!Number.isFinite(value)) continue;
    total += value;
    found = true;
  }
  return found ? total : null;
}

export interface CounterReading {
  value: number;
  at: Date;
}

/**
 * What a cumulative counter added between readings, oldest first. A drop
 * means the server restarted and the counter began again from zero, so the
 * new reading itself is what was sent since.
 */
export function counterIncrease(readings: CounterReading[]): number {
  let total = 0;
  for (let i = 1; i < readings.length; i++) {
    const prev = readings[i - 1]!.value;
    const cur = readings[i]!.value;
    total += cur >= prev ? cur - prev : cur;
  }
  return total;
}

/**
 * Start of the billing cycle containing `now`, in UTC. `day` is the day of
 * the month the cycle renews (1-28); Supabase shows it under Billing.
 */
export function billingCycleStart(now: Date, day = 1): Date {
  const d = Math.min(28, Math.max(1, Math.floor(day)));
  const thisMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), d));
  return thisMonth <= now ? thisMonth : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, d));
}

/** The next renewal after `start`. */
export function billingCycleEnd(start: Date): Date {
  return new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, start.getUTCDate()));
}

/**
 * Egress at the end of the cycle if the rate seen so far holds. Null until
 * there is at least an hour of readings to go on.
 */
export function projectCycleUsage(params: {
  used: number;
  measuredFrom: Date;
  now: Date;
  cycleEnd: Date;
}): number | null {
  const elapsed = params.now.getTime() - params.measuredFrom.getTime();
  if (elapsed < 3_600_000) return null;
  const remaining = Math.max(0, params.cycleEnd.getTime() - params.now.getTime());
  return params.used + (params.used / elapsed) * remaining;
}
