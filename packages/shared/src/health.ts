/**
 * Site-health decision logic (uptime + SSL expiry). Pure functions only — the
 * worker sweep (apps/worker/src/health.ts) does the IO and delegates every
 * up/down and incident decision here so the rules are unit-testable without a
 * database or network.
 *
 * THE UP/DOWN RULE — a website is "up" when its homepage returned ANY HTTP
 * response with status < 500 and != 404. It is "down" on a network error,
 * timeout, any 5xx, or a 404 on the homepage. Rationale: 401/403/429 mean the
 * server is alive and serving (possibly rate-limiting or bot-blocking our
 * probe) — alerting on those would be false positives (spec §25); a 404 on the
 * monitored homepage URL means the site is effectively gone; 5xx and network
 * failures are genuine outages. Redirects are followed before this rule runs.
 */

/** A DOWN incident opens only after this many consecutive failed checks. */
export const DOWN_CONFIRMATION_CHECKS = 2;

/** SSL_EXPIRING opens when the certificate expires within this many days. */
export const SSL_EXPIRY_THRESHOLD_DAYS = 14;

/** Minimum gap between repeat notifications for the same open incident. */
export const HEALTH_RENOTIFY_INTERVAL_MS = 24 * 60 * 60 * 1000;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The up/down rule (documented above): up = got an HTTP response with
 * status < 500 and != 404. `null` means no response at all (network error or
 * timeout) — always down.
 */
export function isHttpUp(httpStatus: number | null): boolean {
  if (httpStatus === null) return false;
  return httpStatus < 500 && httpStatus !== 404;
}

export type HealthIncidentAction = "open" | "resolve" | "none";

/**
 * DOWN incident state machine. Inputs are the current check, the previous
 * check's result (null when this is the site's first check), and whether a
 * DOWN incident is already open.
 *
 * - open: current AND previous check failed (2 consecutive — a single blip
 *   never alerts, spec §25) and no incident is open yet.
 * - resolve: any successful check while an incident is open.
 */
export function decideDownIncident(params: {
  currentUp: boolean;
  previousUp: boolean | null;
  hasOpenIncident: boolean;
}): HealthIncidentAction {
  const { currentUp, previousUp, hasOpenIncident } = params;
  if (currentUp) return hasOpenIncident ? "resolve" : "none";
  if (!hasOpenIncident && previousUp === false) return "open";
  return "none";
}

/**
 * SSL_EXPIRING incident state machine.
 *
 * - open: certificate expires within SSL_EXPIRY_THRESHOLD_DAYS (including
 *   already expired) and no incident is open.
 * - resolve: a check observed an expiry safely beyond the threshold (the
 *   certificate was renewed).
 * - Unknown expiry (http site or failed TLS metadata probe) never opens NOR
 *   resolves — a transient probe failure must not close a real incident.
 */
export function decideSslIncident(params: {
  sslValidTo: Date | null;
  hasOpenIncident: boolean;
  now: Date;
}): HealthIncidentAction {
  const { sslValidTo, hasOpenIncident, now } = params;
  if (sslValidTo === null) return "none";
  const expiring = daysUntil(sslValidTo, now) <= SSL_EXPIRY_THRESHOLD_DAYS;
  if (expiring && !hasOpenIncident) return "open";
  if (!expiring && hasOpenIncident) return "resolve";
  return "none";
}

/** Whole days until `date` (ceiling — "13.2 days left" counts as 14). */
export function daysUntil(date: Date, now: Date): number {
  return Math.ceil((date.getTime() - now.getTime()) / DAY_MS);
}

/**
 * Alert rate limit for an open incident: notify when it was never notified,
 * or when the last notification is at least `intervalMs` old (default 24h).
 */
export function shouldRenotify(
  lastNotifiedAt: Date | null,
  now: Date,
  intervalMs: number = HEALTH_RENOTIFY_INTERVAL_MS,
): boolean {
  if (lastNotifiedAt === null) return true;
  return now.getTime() - lastNotifiedAt.getTime() >= intervalMs;
}

/** Human duration for alert copy: "23m", "3h 12m", "2d 4h". Floors at "1m". */
export function formatDowntime(ms: number): string {
  const totalMinutes = Math.max(1, Math.floor(ms / 60_000));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  if (hours > 0) return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  return `${minutes}m`;
}
