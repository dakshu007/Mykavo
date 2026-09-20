import { prisma } from "@mykavo/database";

/**
 * Is the scan worker alive?
 *
 * This exists because it once was not, for five days, and nobody noticed. The
 * worker had moved to a server whose auto-update cron was failing on every run
 * into a log nobody reads; the only reason it surfaced was somebody going
 * looking for something else. While a worker is down there are no scans, no
 * uptime checks, no alerts, no reports - the product is entirely inert, and
 * the dashboard looks completely normal, because the dashboard only reports
 * what is in the database and the database simply stops changing.
 *
 * MyKavo's whole proposition is catching silent failures on somebody's
 * website. It should be able to catch one in itself.
 *
 * DERIVED, NOT RECORDED. There is deliberately no heartbeat table. The health
 * sweep already writes a health_check row for every active website every five
 * minutes, so "when did a health check last land" is an existing, honest
 * liveness signal - and adding a table would mean a migration, which in this
 * repo is applied by hand before a deploy. A monitor whose installation
 * depends on remembering a manual step is the same class of problem it is
 * meant to detect.
 */

export type WorkerState = "healthy" | "stale" | "down" | "unknown";

export interface WorkerLiveness {
  state: WorkerState;
  /** ISO timestamp of the most recent health check, or null if there is none. */
  lastSeenAt: string | null;
  minutesAgo: number | null;
  /** Plain-language explanation, shown under the status. */
  detail: string;
}

/**
 * The health sweep runs every five minutes, so these allow for missed sweeps
 * rather than flagging on a single late one - a monitor that cries wolf at the
 * first hiccup gets ignored, which is how you end up back where we started.
 */
const STALE_AFTER_MINUTES = 15;
const DOWN_AFTER_MINUTES = 60;

export function classifyWorkerLiveness(params: {
  lastHealthCheckAt: Date | null;
  /** Health checks only run for ACTIVE websites; with none, silence proves nothing. */
  activeWebsites: number;
  now?: Date;
}): WorkerLiveness {
  const now = params.now ?? new Date();

  if (params.activeWebsites === 0) {
    return {
      state: "unknown",
      lastSeenAt: params.lastHealthCheckAt?.toISOString() ?? null,
      minutesAgo: null,
      detail:
        "No active websites, so no health checks are expected. Worker status cannot be inferred.",
    };
  }

  if (!params.lastHealthCheckAt) {
    return {
      state: "down",
      lastSeenAt: null,
      minutesAgo: null,
      detail:
        "No health check has ever been recorded, but there are active websites. The worker has never run against this database.",
    };
  }

  const minutesAgo = Math.max(
    0,
    Math.round((now.getTime() - params.lastHealthCheckAt.getTime()) / 60000),
  );
  const lastSeenAt = params.lastHealthCheckAt.toISOString();

  if (minutesAgo <= STALE_AFTER_MINUTES) {
    return {
      state: "healthy",
      lastSeenAt,
      minutesAgo,
      detail: "Health checks are landing on schedule. Scans, alerts and sweeps are running.",
    };
  }

  if (minutesAgo <= DOWN_AFTER_MINUTES) {
    return {
      state: "stale",
      lastSeenAt,
      minutesAgo,
      detail:
        "Later than the five-minute sweep should be. One missed sweep is normal; several in a row is not.",
    };
  }

  return {
    state: "down",
    lastSeenAt,
    minutesAgo,
    detail:
      "No health check for over an hour. Nothing is being scanned, no alerts are being sent, and no sweeps are running. Check the worker container and its auto-update log.",
  };
}

/** Reads the two figures the classifier needs, and never throws. */
export async function getWorkerLiveness(now: Date = new Date()): Promise<WorkerLiveness> {
  try {
    const [latest, activeWebsites] = await Promise.all([
      prisma.healthCheck.findFirst({
        orderBy: { checkedAt: "desc" },
        select: { checkedAt: true },
      }),
      prisma.website.count({ where: { status: "ACTIVE" } }),
    ]);

    return classifyWorkerLiveness({
      lastHealthCheckAt: latest?.checkedAt ?? null,
      activeWebsites,
      now,
    });
  } catch (err) {
    // A failure to MEASURE liveness is not evidence of death. Saying "down"
    // here would be the monitor inventing an outage out of its own error.
    return {
      state: "unknown",
      lastSeenAt: null,
      minutesAgo: null,
      detail: `Could not read worker status: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
