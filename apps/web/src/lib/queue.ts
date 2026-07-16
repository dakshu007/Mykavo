/**
 * Job queue producer for the web app. Enqueue only - jobs are consumed by
 * apps/worker. pg-boss rides on the existing PostgreSQL instance.
 */

import { PgBoss } from "pg-boss";
import {
  SCAN_WEBSITE_QUEUE,
  LIGHTHOUSE_AUDIT_QUEUE,
  type ScanWebsiteJob,
  type LighthouseAuditJob,
} from "@mykavo/shared";
import { env } from "@/lib/env";

const globalForBoss = globalThis as unknown as { boss?: Promise<PgBoss> };

async function createBoss(): Promise<PgBoss> {
  const boss = new PgBoss({ connectionString: env.DATABASE_URL, schema: "pgboss" });
  await boss.start();
  // Retry/expiry policy lives on the queue in pg-boss v12. createQueue is
  // idempotent (the worker also ensures these) - ignore "already exists".
  await boss
    .createQueue(SCAN_WEBSITE_QUEUE, {
      retryLimit: 2,
      retryDelay: 30,
      expireInSeconds: 15 * 60,
    })
    .catch(() => {});
  await boss
    .createQueue(LIGHTHOUSE_AUDIT_QUEUE, { retryLimit: 1, expireInSeconds: 5 * 60 })
    .catch(() => {});
  return boss;
}

function getBoss(): Promise<PgBoss> {
  if (!globalForBoss.boss) {
    globalForBoss.boss = createBoss().catch((err) => {
      // Never memoize a FAILED connection: a transient DB hiccup on the first
      // enqueue (e.g. cold start right after a deploy) would otherwise make
      // every later "Run scan" fail with the same cached rejection until the
      // process restarts.
      globalForBoss.boss = undefined;
      throw err;
    });
  }
  return globalForBoss.boss;
}

/** Enqueue a website scan. Returns the pg-boss job id. */
export async function enqueueScanWebsite(job: ScanWebsiteJob): Promise<string | null> {
  const boss = await getBoss();
  return boss.send(SCAN_WEBSITE_QUEUE, { ...job });
}

/** Enqueue a Lighthouse performance audit. Returns the pg-boss job id. */
export async function enqueueLighthouseAudit(job: LighthouseAuditJob): Promise<string | null> {
  const boss = await getBoss();
  return boss.send(LIGHTHOUSE_AUDIT_QUEUE, { ...job });
}
