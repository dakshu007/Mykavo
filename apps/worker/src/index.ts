/**
 * Fluxen scan worker. Consumes SCAN_WEBSITE jobs from pg-boss (PostgreSQL-
 * backed queue — zero extra infrastructure) and executes them with a
 * bounded Playwright browser pool. Scales horizontally: run more processes.
 */

import "dotenv/config";
import { PgBoss } from "pg-boss";
import { BrowserPool } from "@fluxen/scanner";
import {
  SCAN_WEBSITE_QUEUE,
  SCHEDULER_SWEEP_QUEUE,
  RETENTION_SWEEP_QUEUE,
  LIGHTHOUSE_AUDIT_QUEUE,
  HEALTH_SWEEP_QUEUE,
  REPORT_SWEEP_QUEUE,
  type ScanWebsiteJob,
  type LighthouseAuditJob,
} from "@fluxen/shared";
import { logger } from "./logger";
import { runScanWebsiteJob } from "./scan-website";
import { runSchedulerSweep } from "./scheduler";
import { runRetentionSweep } from "./retention";
import { runLighthouseAuditJob } from "./lighthouse-audit";
import { runHealthSweep } from "./health";
import { runReportSweep } from "./report";

const SWEEP_CRON = process.env.SCHEDULER_CRON ?? "*/5 * * * *"; // every 5 minutes
const RETENTION_CRON = process.env.RETENTION_CRON ?? "0 3 * * *"; // daily 03:00 UTC
const HEALTH_CRON = process.env.HEALTH_CRON ?? "*/5 * * * *"; // every 5 minutes
const REPORT_CRON = process.env.REPORT_CRON ?? "0 8 * * 1"; // Mondays 08:00 UTC

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  logger.error("DATABASE_URL is not set — worker cannot start");
  process.exit(1);
}

async function main() {
  const boss = new PgBoss({
    connectionString: DATABASE_URL,
    schema: "pgboss",
  });
  boss.on("error", (err) => logger.error("pg-boss error", {}, err));

  await boss.start();
  await boss
    .createQueue(SCAN_WEBSITE_QUEUE, {
      retryLimit: 2,
      retryDelay: 30,
      expireInSeconds: 15 * 60,
    })
    .catch(() => {
      // Queue already created by the web app — fine.
    });

  const pool = new BrowserPool({ maxConcurrentPages: 3, restartAfterPages: 50 });

  await boss.work<ScanWebsiteJob>(
    SCAN_WEBSITE_QUEUE,
    { batchSize: 1, pollingIntervalSeconds: 2 },
    async ([job]) => {
      logger.info("job received", { jobId: job.id, scanId: job.data.scanId });
      await runScanWebsiteJob(job.data.scanId, pool);
    },
  );

  // Central scheduler (spec §40): a single cron sweep, not one job per website.
  await boss.createQueue(SCHEDULER_SWEEP_QUEUE).catch(() => {});
  await boss.work(SCHEDULER_SWEEP_QUEUE, { batchSize: 1 }, async () => {
    await runSchedulerSweep(boss);
  });
  await boss.schedule(SCHEDULER_SWEEP_QUEUE, SWEEP_CRON);

  // Retention cleanup (spec §60/§91): a daily sweep deletes expired snapshots,
  // their artifacts, and old change events per each workspace's plan window.
  await boss.createQueue(RETENTION_SWEEP_QUEUE).catch(() => {});
  await boss.work(RETENTION_SWEEP_QUEUE, { batchSize: 1 }, async () => {
    await runRetentionSweep();
  });
  await boss.schedule(RETENTION_SWEEP_QUEUE, RETENTION_CRON);

  // Site-health sweep: uptime probe + SSL expiry for every ACTIVE website.
  await boss.createQueue(HEALTH_SWEEP_QUEUE).catch(() => {});
  await boss.work(HEALTH_SWEEP_QUEUE, { batchSize: 1 }, async () => {
    await runHealthSweep();
  });
  await boss.schedule(HEALTH_SWEEP_QUEUE, HEALTH_CRON);

  // Weekly client-ready reports (spec §37): one summary email per ACTIVE
  // website every Monday morning — the agency forward-to-client selling point.
  await boss.createQueue(REPORT_SWEEP_QUEUE).catch(() => {});
  await boss.work(REPORT_SWEEP_QUEUE, { batchSize: 1 }, async () => {
    await runReportSweep();
  });
  await boss.schedule(REPORT_SWEEP_QUEUE, REPORT_CRON);

  // On-demand Lighthouse audits. Heavyweight (~10–40s, CPU-bound), so one at a
  // time (batchSize 1) with a single retry.
  await boss
    .createQueue(LIGHTHOUSE_AUDIT_QUEUE, { retryLimit: 1, expireInSeconds: 5 * 60 })
    .catch(() => {});
  await boss.work<LighthouseAuditJob>(
    LIGHTHOUSE_AUDIT_QUEUE,
    { batchSize: 1, pollingIntervalSeconds: 2 },
    async ([job]) => {
      logger.info("lighthouse job received", { jobId: job.id, auditId: job.data.auditId });
      await runLighthouseAuditJob(job.data.auditId);
    },
  );

  logger.info("worker started", {
    queue: SCAN_WEBSITE_QUEUE,
    schedulerCron: SWEEP_CRON,
    retentionCron: RETENTION_CRON,
    healthCron: HEALTH_CRON,
    reportCron: REPORT_CRON,
  });

  async function shutdown(signal: string) {
    logger.info("shutting down", { signal });
    try {
      await boss.stop({ graceful: true, timeout: 30_000 });
      await pool.close();
    } finally {
      process.exit(0);
    }
  }
  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((err) => {
  logger.error("worker crashed on startup", {}, err);
  process.exit(1);
});
