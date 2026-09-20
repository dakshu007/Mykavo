/**
 * Emails the operators when the worker loses its database.
 *
 * WHY A PLAIN TIMER AND NOT A pg-boss CRON
 * ----------------------------------------
 * Every other recurring job here is a pg-boss schedule, and pg-boss fetches
 * its jobs from Postgres. In the one failure this is meant to report, that
 * fetch is exactly what is broken - so a cron-based check would be silent
 * precisely when it matters. This runs on setInterval inside the process,
 * which keeps ticking whether or not the database answers.
 *
 * For the same reason the recipients come from the environment rather than
 * from a table, and delivery goes through Resend, which is an HTTPS call that
 * touches no database at all.
 *
 * The decision of whether to send lives in @mykavo/shared (nextDbWatchState),
 * where it is tested; this file is only probing, sending and logging.
 */

import { prisma } from "@mykavo/database";
import { sendEmail, workerDbOutageEmail, workerDbRecoveryEmail } from "@mykavo/email";
import {
  formatOutageDuration,
  initialDbWatchState,
  isDatabaseUnreachable,
  nextDbWatchState,
  parseAlertRecipients,
  type DbWatchState,
} from "@mykavo/shared";
import { logger } from "./logger";

const PROBE_INTERVAL_MS = 60_000;

/** The cheapest question that still proves the database answers. */
async function probe(): Promise<{ reachable: boolean; reason: string }> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { reachable: true, reason: "" };
  } catch (err) {
    // A failure that is NOT connectivity means the database answered and
    // something else is wrong - not an outage, and not worth an email.
    if (!isDatabaseUnreachable(err)) {
      logger.warn("database probe failed for a non-connectivity reason", {
        error: err instanceof Error ? err.message : String(err),
      });
      return { reachable: true, reason: "" };
    }
    const raw = err instanceof Error ? err.message : String(err);
    return { reachable: false, reason: raw.replace(/\s+/g, " ").trim().slice(0, 300) };
  }
}

function dashboardUrl(): string {
  const base = (process.env.APP_URL ?? "https://mykavo.app").replace(/\/+$/, "");
  return `${base}/dashboard/usage`;
}

export function alertRecipients(): string[] {
  // ALERT_EMAILS lets the operator route infrastructure alerts somewhere
  // other than the product's admin list; ADMIN_EMAILS is the sensible default
  // because it is already the "people who run this" list.
  return parseAlertRecipients(process.env.ALERT_EMAILS ?? process.env.ADMIN_EMAILS);
}

/**
 * Starts the watch. Returns a stop function for graceful shutdown.
 *
 * Exported state handling is deliberately internal: the caller starts it once
 * at boot and stops it on SIGTERM.
 */
export function startDatabaseWatch(options: { intervalMs?: number } = {}): () => void {
  const intervalMs = options.intervalMs ?? PROBE_INTERVAL_MS;
  const recipients = alertRecipients();

  if (recipients.length === 0) {
    // Loud, once, at boot. A monitor that is installed but addressed to
    // nobody fails exactly like no monitor at all, and the whole point of
    // this file is that silence must not be mistaken for health.
    logger.error(
      "database outage alerts are DISABLED - set ALERT_EMAILS or ADMIN_EMAILS in the worker environment",
      {},
    );
    return () => {};
  }

  logger.info("database watch started", {
    intervalSeconds: Math.round(intervalMs / 1000),
    recipients: recipients.length,
  });

  let state: DbWatchState = { ...initialDbWatchState };
  let inFlight = false;

  const tick = async () => {
    // A probe that outlives its interval must not stack up behind itself.
    if (inFlight) return;
    inFlight = true;
    try {
      const result = await probe();
      const decision = nextDbWatchState(state, result.reachable, Date.now());
      state = decision.state;
      const action = decision.action;
      if (action.kind === "none") return;

      if (action.kind === "down") {
        const downFor = formatOutageDuration(action.downForMs);
        logger.error("database unreachable - alerting", {
          downFor,
          repeat: action.repeat,
          reason: result.reason,
        });
        const message = workerDbOutageEmail({
          downFor,
          reason: result.reason || "No error detail was captured.",
          repeat: action.repeat,
          dashboardUrl: dashboardUrl(),
        });
        const sent = await sendEmail({
          to: recipients,
          subject: message.subject,
          html: message.html,
          text: message.text,
        });
        if (!sent.ok) {
          logger.error("could not send the database outage alert", { error: sent.error });
        }
        return;
      }

      const downFor = formatOutageDuration(action.downForMs);
      logger.info("database recovered - alerting", { downFor });
      const message = workerDbRecoveryEmail({ downFor, dashboardUrl: dashboardUrl() });
      const sent = await sendEmail({
        to: recipients,
        subject: message.subject,
        html: message.html,
        text: message.text,
      });
      if (!sent.ok) {
        logger.error("could not send the database recovery alert", { error: sent.error });
      }
    } catch (err) {
      // Never let the watchdog be the thing that crashes the worker.
      logger.error("database watch tick failed", {}, err);
    } finally {
      inFlight = false;
    }
  };

  const timer = setInterval(() => {
    void tick();
  }, intervalMs);
  // Do not hold the process open on shutdown.
  timer.unref?.();

  // Probe immediately so a worker that boots with bad credentials - which is
  // how both real outages began - reports itself rather than waiting out the
  // first interval in silence.
  void tick();

  return () => clearInterval(timer);
}
