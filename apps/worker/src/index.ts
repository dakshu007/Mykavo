/**
 * MyKavo scan worker. Consumes SCAN_WEBSITE jobs from pg-boss (PostgreSQL-
 * backed queue - zero extra infrastructure) and executes them with a
 * bounded Playwright browser pool. Scales horizontally: run more processes.
 */

import "dotenv/config";
import { PgBoss } from "pg-boss";
import { BrowserPool } from "@mykavo/scanner";
import {
  SCAN_WEBSITE_QUEUE,
  SCHEDULER_SWEEP_QUEUE,
  RETENTION_SWEEP_QUEUE,
  LIGHTHOUSE_AUDIT_QUEUE,
  HEALTH_SWEEP_QUEUE,
  REPORT_SWEEP_QUEUE,
  AUDIT_SWEEP_QUEUE,
  BILLING_SWEEP_QUEUE,
  CLIENT_REPORT_SWEEP_QUEUE,
  SITE_AUDIT_QUEUE,
  GSC_SYNC_QUEUE,
  GSC_SYNC_SWEEP_QUEUE,
  type ScanWebsiteJob,
  type LighthouseAuditJob,
  type SiteAuditJob,
  type GscSyncJob,
} from "@mykavo/shared";
import { logger } from "./logger";
import { runScanWebsiteJob } from "./scan-website";
import { runSchedulerSweep } from "./scheduler";
import { runRetentionSweep } from "./retention";
import { runLighthouseAuditJob } from "./lighthouse-audit";
import { runHealthSweep } from "./health";
import { runReportSweep } from "./report";
import { runAuditSweep } from "./audit-sweep";
import { runBillingSweep } from "./billing-sweep";
import { runClientReportSweep } from "./client-report";
import { runSiteAuditJob } from "./site-audit";
import { runGscSync, runGscSweep } from "./gsc-sync";
import { startWatchdog } from "./watchdog";

const SWEEP_CRON = process.env.SCHEDULER_CRON ?? "*/5 * * * *"; // every 5 minutes
const RETENTION_CRON = process.env.RETENTION_CRON ?? "0 3 * * *"; // daily 03:00 UTC
const HEALTH_CRON = process.env.HEALTH_CRON ?? "*/5 * * * *"; // every 5 minutes
const REPORT_CRON = process.env.REPORT_CRON ?? "0 8 * * 1"; // Mondays 08:00 UTC
const AUDIT_CRON = process.env.AUDIT_CRON ?? "0 6 * * 2"; // Tuesdays 06:00 UTC
const BILLING_CRON = process.env.BILLING_CRON ?? "0 9 * * *"; // daily 09:00 UTC
const CLIENT_REPORT_CRON = process.env.CLIENT_REPORT_CRON ?? "30 8 * * *"; // daily 08:30 UTC
const GSC_CRON = process.env.GSC_CRON ?? "0 7 * * *"; // daily 07:00 UTC

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  logger.error("DATABASE_URL is not set - worker cannot start");
  process.exit(1);
}

async function main() {
  const boss = new PgBoss({
    connectionString: DATABASE_URL,
    schema: "pgboss",
    // pg-boss opens its OWN pool, entirely separate from Prisma's, and it
    // does NOT read the `connection_limit` query parameter - that one is
    // Prisma-only. Left at pg-boss's default of 10, a single worker could
    // hold 10 queue connections plus Prisma's, which alone reaches the ~15
    // slots a Supabase session pooler allows. Two workers made it certain:
    //   (EMAXCONNSESSION) max clients reached in session mode
    // That is what silently killed comparisons on 2026-09-08 - the scan
    // reported success while the comparison never ran - and what stopped a
    // second worker from starting at all during the move to a real server.
    // Four is ample: the queue does short polls, not sustained parallel work.
    max: Number(process.env.PGBOSS_POOL_MAX ?? 4),
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
      // Queue already created by the web app - fine.
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
  // website every Monday morning - the agency forward-to-client selling point.
  await boss.createQueue(REPORT_SWEEP_QUEUE).catch(() => {});
  await boss.work(REPORT_SWEEP_QUEUE, { batchSize: 1 }, async () => {
    await runReportSweep();
  });
  await boss.schedule(REPORT_SWEEP_QUEUE, REPORT_CRON);

  // Weekly Lighthouse audit sweep: enqueues one homepage audit per ACTIVE
  // website (Tuesdays by default - offset from the Monday report sweep) so
  // scores stay fresh and performance-drop alerts fire without user action.
  await boss.createQueue(AUDIT_SWEEP_QUEUE).catch(() => {});
  await boss.work(AUDIT_SWEEP_QUEUE, { batchSize: 1 }, async () => {
    await runAuditSweep(boss);
  });
  await boss.schedule(AUDIT_SWEEP_QUEUE, AUDIT_CRON);

  // Daily client-report delivery sweep (Pro): emails each website's branded
  // report to configured client recipients on its weekly/monthly cadence.
  await boss.createQueue(CLIENT_REPORT_SWEEP_QUEUE).catch(() => {});
  await boss.work(CLIENT_REPORT_SWEEP_QUEUE, { batchSize: 1 }, async () => {
    await runClientReportSweep();
  });
  await boss.schedule(CLIENT_REPORT_SWEEP_QUEUE, CLIENT_REPORT_CRON);

  // Daily billing sweep: "Pro renews soon / about to expire" reminder emails,
  // one per billing period (dedupe via Subscription.renewalReminderSentAt).
  await boss.createQueue(BILLING_SWEEP_QUEUE).catch(() => {});
  await boss.work(BILLING_SWEEP_QUEUE, { batchSize: 1 }, async () => {
    await runBillingSweep();
  });
  await boss.schedule(BILLING_SWEEP_QUEUE, BILLING_CRON);

  // Google Search Console: on-demand syncs + a daily sweep.
  await boss.createQueue(GSC_SYNC_QUEUE, { retryLimit: 1, expireInSeconds: 10 * 60 }).catch(() => {});
  await boss.work<GscSyncJob>(GSC_SYNC_QUEUE, { batchSize: 1 }, async ([job]) => {
    await runGscSync(job.data);
  });
  await boss.createQueue(GSC_SYNC_SWEEP_QUEUE).catch(() => {});
  await boss.work(GSC_SYNC_SWEEP_QUEUE, { batchSize: 1 }, async () => {
    await runGscSweep();
  });
  await boss.schedule(GSC_SYNC_SWEEP_QUEUE, GSC_CRON);

  // Site audits (technical SEO crawl): up to ~10 min of polite fetching per
  // run, so strictly one at a time with a single retry on expiry.
  await boss
    .createQueue(SITE_AUDIT_QUEUE, { retryLimit: 1, expireInSeconds: 15 * 60 })
    .catch(() => {});
  await boss.work<SiteAuditJob>(
    SITE_AUDIT_QUEUE,
    { batchSize: 1, pollingIntervalSeconds: 2 },
    async ([job]) => {
      logger.info("site audit job received", { jobId: job.id, siteAuditId: job.data.siteAuditId });
      await runSiteAuditJob(job.data);
    },
  );

  // Lighthouse audits (on-demand + weekly sweep). Heavyweight (~10–40s,
  // CPU-bound), so one at a time (batchSize 1) with a single retry.
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

  // Self-healing: if the DB becomes unreachable through pg-boss's pool (it
  // wedges permanently after network drops), exit and let launchd restart us.
  startWatchdog(boss, SCAN_WEBSITE_QUEUE);

  logger.info("worker started", {
    queue: SCAN_WEBSITE_QUEUE,
    schedulerCron: SWEEP_CRON,
    retentionCron: RETENTION_CRON,
    healthCron: HEALTH_CRON,
    reportCron: REPORT_CRON,
    auditCron: AUDIT_CRON,
    watchdog: true,
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
