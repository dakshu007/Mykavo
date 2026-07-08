/**
 * Job queue producer for the web app. Enqueue only — jobs are consumed by
 * apps/worker. pg-boss rides on the existing PostgreSQL instance.
 */

import { PgBoss } from "pg-boss";
import { SCAN_WEBSITE_QUEUE, type ScanWebsiteJob } from "@fluxen/shared";
import { env } from "@/lib/env";

const globalForBoss = globalThis as unknown as { boss?: Promise<PgBoss> };

async function createBoss(): Promise<PgBoss> {
  const boss = new PgBoss({ connectionString: env.DATABASE_URL, schema: "pgboss" });
  await boss.start();
  // Retry/expiry policy lives on the queue in pg-boss v12.
  await boss
    .createQueue(SCAN_WEBSITE_QUEUE, {
      retryLimit: 2,
      retryDelay: 30,
      expireInSeconds: 15 * 60,
    })
    .catch(() => {
      // Queue already exists — fine.
    });
  return boss;
}

function getBoss(): Promise<PgBoss> {
  if (!globalForBoss.boss) globalForBoss.boss = createBoss();
  return globalForBoss.boss;
}

/** Enqueue a website scan. Returns the pg-boss job id. */
export async function enqueueScanWebsite(job: ScanWebsiteJob): Promise<string | null> {
  const boss = await getBoss();
  return boss.send(SCAN_WEBSITE_QUEUE, { ...job });
}
