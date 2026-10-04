import type { PgBoss } from "pg-boss";

/**
 * pg-boss tuning for Supabase egress.
 *
 * Every byte Postgres sends to the worker counts as Supabase egress, and an
 * idle pg-boss is anything but quiet. Measured against a local Postgres
 * through a byte-counting proxy, with this worker's 20 queues:
 *
 *   defaults (2 s polls, 5 s flow + cron loops)   302.7 MB/day while idle
 *   this tuning (NOTIFY + relaxed loops)            8.3 MB/day while idle
 *
 * That idle cost was the flat ~300 MB/day that pushed the Free plan past its
 * 5 GB egress quota. The tuning loses nothing:
 *
 *  - Jobs are delivered by LISTEN/NOTIFY: pg-boss fires a pg_notify in the
 *    same transaction as the insert, so a "Run scan" is picked up in
 *    milliseconds (measured 5-8 ms) instead of on the next 2 s poll. Polling
 *    stays only as a backstop, and falls back to `pollingIntervalSeconds` on
 *    its own if the LISTEN connection is ever unavailable.
 *  - The housekeeping loops run every few minutes instead of every few
 *    seconds. The shortest cron here is every 5 minutes and every queue
 *    expiry is 1 minute or more, so nothing waits on them.
 *  - `flowIntervalSeconds` drives job flows (dependencies between jobs),
 *    which MyKavo does not use; at its 5 s default it was the largest single
 *    cost once polling was fixed.
 */
export const BOSS_TUNING = {
  useListenNotify: true,
  superviseIntervalSeconds: 300,
  maintenanceIntervalSeconds: 600,
  monitorIntervalSeconds: 600,
  queueCacheIntervalSeconds: 300,
  cronWorkerIntervalSeconds: 30,
  cronMonitorIntervalSeconds: 45,
  flowIntervalSeconds: 600,
  bamIntervalSeconds: 600,
} as const;

/** Queues a person is waiting on (Run scan, test alert, audits, emails). */
export const ON_DEMAND_POLL = { pollingIntervalSeconds: 10, notifyPollingIntervalSeconds: 60 } as const;

/** Cron-fired sweeps: the schedule's own insert NOTIFYs the worker. */
export const SWEEP_POLL = { pollingIntervalSeconds: 60, notifyPollingIntervalSeconds: 300 } as const;

type QueueOptions = Parameters<PgBoss["createQueue"]>[1];

/**
 * Create the queue if needed and make sure it NOTIFYs on insert. createQueue
 * is a no-op for a queue that already exists (so it cannot turn notify on for
 * queues created before this change); updateQueue patches just that flag.
 */
export async function ensureQueue(boss: PgBoss, name: string, options: QueueOptions = {}): Promise<void> {
  await boss.createQueue(name, { ...options, notify: true }).catch(() => {
    // Already created (by the web app or a previous start) - fine.
  });
  await boss.updateQueue(name, { notify: true }).catch(() => {});
}
