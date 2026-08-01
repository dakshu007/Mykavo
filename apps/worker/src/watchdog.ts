/**
 * Database-connectivity watchdog. pg-boss's internal pg-pool can wedge
 * permanently after a network drop (a Mac sleep/wake, a Supabase blip): every
 * client sits checked out by a query that will never return, so each acquire
 * times out with "timeout exceeded when trying to connect" - while brand-new
 * connections from a fresh process work fine. pg-boss only emits error events
 * and never rebuilds its pool, which once stalled every queue for 19 hours
 * with the process still "running".
 *
 * The watchdog probes the database THROUGH pg-boss's own pool (getQueue is a
 * single cheap SELECT) so it exercises the exact path job fetching uses.
 * After enough consecutive failures it exits the process; launchd (KeepAlive)
 * restarts the worker with fresh pools - the only reliable way out of a
 * wedged pool. A scan interrupted mid-run is safe: the job is idempotent and
 * pg-boss retries it.
 */

import type { PgBoss } from "pg-boss";
import { logger } from "./logger";

const INTERVAL_SECONDS = Number(process.env.WATCHDOG_INTERVAL_SECONDS ?? 30);
const MAX_FAILURES = Number(process.env.WATCHDOG_MAX_FAILURES ?? 6); // ~3 min
const PROBE_TIMEOUT_MS = 45_000; // backstop for a probe that hangs instead of erroring

export function startWatchdog(boss: PgBoss, probeQueue: string): void {
  let failures = 0;

  async function tick(): Promise<void> {
    try {
      await Promise.race([
        boss.getQueue(probeQueue),
        new Promise((_, reject) => {
          const t = setTimeout(
            () => reject(new Error(`watchdog probe timed out after ${PROBE_TIMEOUT_MS}ms`)),
            PROBE_TIMEOUT_MS,
          );
          t.unref();
        }),
      ]);
      failures = 0;
    } catch (err) {
      failures++;
      logger.warn("watchdog probe failed", { failures, maxFailures: MAX_FAILURES });
      if (failures >= MAX_FAILURES) {
        logger.error(
          "watchdog: database unreachable through the queue pool - exiting so launchd restarts the worker",
          { failures },
          err,
        );
        process.exit(1);
      }
    }
    schedule();
  }

  function schedule(): void {
    const t = setTimeout(() => void tick(), INTERVAL_SECONDS * 1000);
    t.unref(); // never keep a shutting-down process alive
  }

  schedule();
}
