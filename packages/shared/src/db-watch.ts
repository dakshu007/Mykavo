/**
 * Should we email someone that the worker has lost its database?
 *
 * WHY THIS EXISTS
 * ---------------
 * The worker has twice run for hours unable to reach Postgres. While that is
 * true there are no scans, no uptime checks, no alerts, no reports - the
 * product is entirely inert - and the dashboard looks normal, because the
 * dashboard reports what is in the database and the database simply stops
 * changing. Both times it surfaced only because somebody went looking.
 *
 * Email is the right channel precisely because it does not touch Postgres:
 * Resend is an HTTPS call, so the alert path stays alive in the one failure
 * that kills every other path. The admin addresses come from the environment
 * rather than from a table, for the same reason.
 *
 * WHY THIS IS A PURE FUNCTION
 * ---------------------------
 * Deciding *whether* to alert is where the judgement lives: too eager and
 * every transient blip pages you until you filter the sender; too slow, or
 * with no repeat, and a long outage goes quiet again. That decision is worth
 * testing, so it is separated from probing and sending, and from the worker
 * package - which has no test runner and is not in CI's test list.
 */

/** How long the database must stay unreachable before the first email. */
export const DB_ALERT_AFTER_MS = 5 * 60_000;

/**
 * How long before a still-unresolved outage is reported again. An outage that
 * alerts once and then goes silent looks identical to one that recovered.
 */
export const DB_ALERT_REPEAT_MS = 6 * 60 * 60_000;

export interface DbWatchState {
  /** When the current run of failures began; null while healthy. */
  failingSince: number | null;
  /** When the last "down" email was sent for this outage; null if none yet. */
  lastAlertAt: number | null;
  /** True once an outage has been reported, so recovery is worth reporting. */
  reported: boolean;
}

export const initialDbWatchState: DbWatchState = {
  failingSince: null,
  lastAlertAt: null,
  reported: false,
};

export type DbWatchAction =
  | { kind: "none" }
  | { kind: "down"; downForMs: number; repeat: boolean }
  | { kind: "recovered"; downForMs: number };

export interface DbWatchDecision {
  action: DbWatchAction;
  state: DbWatchState;
}

/**
 * Advance the watch by one probe.
 *
 * `reachable` is the result of a trivial query, not of any real work - the
 * question is only whether the database answers at all.
 */
export function nextDbWatchState(
  state: DbWatchState,
  reachable: boolean,
  now: number,
  options: { alertAfterMs?: number; repeatAfterMs?: number } = {},
): DbWatchDecision {
  const alertAfter = options.alertAfterMs ?? DB_ALERT_AFTER_MS;
  const repeatAfter = options.repeatAfterMs ?? DB_ALERT_REPEAT_MS;

  if (reachable) {
    // Only worth an email if somebody was told it was broken. Recovering from
    // a blip nobody heard about is not news.
    if (state.reported && state.failingSince !== null) {
      return {
        action: { kind: "recovered", downForMs: Math.max(0, now - state.failingSince) },
        state: { ...initialDbWatchState },
      };
    }
    return { action: { kind: "none" }, state: { ...initialDbWatchState } };
  }

  const failingSince = state.failingSince ?? now;
  const downForMs = Math.max(0, now - failingSince);

  // A short outage is usually a restart, a failover or a pooler hiccup, and
  // recovers on its own. Alerting on the first failed probe would train the
  // reader to ignore the sender, which defeats the whole thing.
  if (downForMs < alertAfter) {
    return {
      action: { kind: "none" },
      state: { ...state, failingSince },
    };
  }

  const alreadyAlerted = state.lastAlertAt !== null;
  const dueForRepeat = alreadyAlerted && now - (state.lastAlertAt as number) >= repeatAfter;

  if (alreadyAlerted && !dueForRepeat) {
    return {
      action: { kind: "none" },
      state: { ...state, failingSince },
    };
  }

  return {
    action: { kind: "down", downForMs, repeat: dueForRepeat },
    state: { failingSince, lastAlertAt: now, reported: true },
  };
}

/**
 * Is this error the database being unreachable, rather than a bad query?
 *
 * Prisma flattens connectivity and authentication into a handful of P100x
 * codes. A constraint violation or a missing row is a bug or ordinary data,
 * and must never page anyone - so this matches the connection-level codes
 * explicitly rather than treating every Prisma error as an outage.
 *
 *   P1000  authentication failed
 *   P1001  can't reach database server
 *   P1002  server reached but timed out
 *   P1008  operation timed out
 *   P1017  server has closed the connection
 */
const CONNECTIVITY_CODES = new Set(["P1000", "P1001", "P1002", "P1008", "P1017"]);

export function isDatabaseUnreachable(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;

  const code = (err as { code?: unknown }).code;
  if (typeof code === "string" && CONNECTIVITY_CODES.has(code)) return true;

  // Not every failure arrives as a Prisma error with a code - a dead socket
  // surfaces as a plain driver error. These strings are narrow enough not to
  // catch application-level failures.
  const message = (err as { message?: unknown }).message;
  if (typeof message !== "string") return false;
  return (
    message.includes("Can't reach database server") ||
    message.includes("ECONNREFUSED") ||
    message.includes("ETIMEDOUT") ||
    message.includes("Connection terminated") ||
    message.includes("Closed connection")
  );
}

/** "3 minutes", "2 hours", "1 day" - for a subject line, not a report. */
export function formatOutageDuration(ms: number): string {
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return "less than a minute";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"}`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"}`;
}

/**
 * Parse a comma-separated recipient list from the environment.
 *
 * Deliberately lenient about whitespace and empty entries: this is set by
 * hand in a .env file on a server, and a stray comma should not silence the
 * only alert that survives a database outage.
 */
export function parseAlertRecipients(raw: string | undefined | null): string[] {
  if (!raw) return [];
  return [
    ...new Set(
      raw
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && s.includes("@")),
    ),
  ];
}
