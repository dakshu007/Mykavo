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
  ARTIFACT_PURGE_QUEUE,
  LIGHTHOUSE_AUDIT_QUEUE,
  HEALTH_SWEEP_QUEUE,
  CHANGE_WATCH_QUEUE,
  PRODUCT_UPDATES_QUEUE,
  REPORT_SWEEP_QUEUE,
  AUDIT_SWEEP_QUEUE,
  BILLING_SWEEP_QUEUE,
  ACTIVATION_SWEEP_QUEUE,
  CLIENT_REPORT_SWEEP_QUEUE,
  SITE_AUDIT_QUEUE,
  GSC_SYNC_QUEUE,
  GSC_SYNC_SWEEP_QUEUE,
  DOMAIN_SWEEP_QUEUE,
  PUSH_TEST_QUEUE,
  ADMIN_SIGNUP_QUEUE,
  WELCOME_EMAIL_QUEUE,
  type PushTestJob,
  type AdminSignupJob,
  type WelcomeEmailJob,
  type ScanWebsiteJob,
  type LighthouseAuditJob,
  type SiteAuditJob,
  type GscSyncJob,
} from "@mykavo/shared";
import { logger } from "./logger";
import { BOSS_TUNING, ON_DEMAND_POLL, SWEEP_POLL, ensureQueue } from "./queue-tuning";
import { sendTestPush } from "./push";
import { runScanWebsiteJob } from "./scan-website";
import { runSchedulerSweep } from "./scheduler";
import { startDatabaseWatch } from "./db-watch";
import { runAdminSignupJob } from "./admin-signup";
import { runWelcomeEmailJob } from "./welcome-email";
import { runRetentionSweep } from "./retention";
import { drainArtifactPurge } from "./purge-artifacts";
import { runLighthouseAuditJob } from "./lighthouse-audit";
import { runHealthSweep } from "./health";
import { runChangeWatchSweep } from "./change-watch";
import { runProductUpdates } from "./product-updates";
import { runReportSweep } from "./report";
import { runAuditSweep } from "./audit-sweep";
import { runBillingSweep } from "./billing-sweep";
import { runActivationSweep } from "./activation-email";
import { runClientReportSweep } from "./client-report";
import { runSiteAuditJob } from "./site-audit";
import { runGscSync, runGscSweep } from "./gsc-sync";
import { runDomainSweep } from "./domain-check";
import { startWatchdog } from "./watchdog";
import { startKeepWarm } from "./keep-warm";

const SWEEP_CRON = process.env.SCHEDULER_CRON ?? "*/5 * * * *"; // every 5 minutes
const RETENTION_CRON = process.env.RETENTION_CRON ?? "0 3 * * *"; // daily 03:00 UTC
const HEALTH_CRON = process.env.HEALTH_CRON ?? "*/5 * * * *"; // every 5 minutes
// Quick change checks; each website is still checked at most hourly (paid)
// or every 6 hours (free) - see change-watch.ts.
const CHANGE_WATCH_CRON = process.env.CHANGE_WATCH_CRON ?? "*/10 * * * *";
// Update emails: WordPress.org is asked hourly; admin "Send" is picked up here.
const PRODUCT_UPDATES_CRON = process.env.PRODUCT_UPDATES_CRON ?? "*/10 * * * *";
const REPORT_CRON = process.env.REPORT_CRON ?? "0 8 * * 1"; // Mondays 08:00 UTC
const AUDIT_CRON = process.env.AUDIT_CRON ?? "0 6 * * 2"; // Tuesdays 06:00 UTC
const BILLING_CRON = process.env.BILLING_CRON ?? "0 9 * * *"; // daily 09:00 UTC
const ACTIVATION_CRON = process.env.ACTIVATION_CRON ?? "20 * * * *"; // hourly at :20
const CLIENT_REPORT_CRON = process.env.CLIENT_REPORT_CRON ?? "30 8 * * *"; // daily 08:30 UTC
const GSC_CRON = process.env.GSC_CRON ?? "0 7 * * *"; // daily 07:00 UTC
// A registration changes once a year; weekly is already far more often than
// it can move, and keeps us a polite visitor to the registries.
const DOMAIN_CRON = process.env.DOMAIN_CRON ?? "0 5 * * 3"; // Wednesdays 05:00 UTC

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
    // Idle egress: NOTIFY delivery + relaxed housekeeping (see queue-tuning.ts).
    ...BOSS_TUNING,
  });
  boss.on("error", (err) => logger.error("pg-boss error", {}, err));

  await boss.start();
  await ensureQueue(boss, SCAN_WEBSITE_QUEUE, {
    retryLimit: 2,
    retryDelay: 30,
    expireInSeconds: 15 * 60,
  });

  const pool = new BrowserPool({ maxConcurrentPages: 3, restartAfterPages: 50 });

  await boss.work<ScanWebsiteJob>(
    SCAN_WEBSITE_QUEUE,
    { batchSize: 1, ...ON_DEMAND_POLL },
    async ([job]) => {
      logger.info("job received", { jobId: job.id, scanId: job.data.scanId });
      await runScanWebsiteJob(job.data.scanId, pool);
    },
  );

  // Central scheduler (spec §40): a single cron sweep, not one job per website.
  await ensureQueue(boss, SCHEDULER_SWEEP_QUEUE);
  await boss.work(SCHEDULER_SWEEP_QUEUE, { batchSize: 1, ...SWEEP_POLL }, async () => {
    await runSchedulerSweep(boss);
  });
  await boss.schedule(SCHEDULER_SWEEP_QUEUE, SWEEP_CRON);

  // Retention cleanup (spec §60/§91): a daily sweep deletes expired snapshots,
  // their artifacts, and old change events per each workspace's plan window.
  await ensureQueue(boss, RETENTION_SWEEP_QUEUE);
  await boss.work(RETENTION_SWEEP_QUEUE, { batchSize: 1, ...SWEEP_POLL }, async () => {
    await runRetentionSweep();
  });
  await boss.schedule(RETENTION_SWEEP_QUEUE, RETENTION_CRON);

  // Storage reclaim: deletes objects whose owning rows are already gone.
  // Enqueued by the web app the moment a website is deleted, so the bucket
  // shrinks immediately rather than at 03:00; the retention sweep drains the
  // same table, so a missed job costs hours, not the saving itself.
  await ensureQueue(boss, ARTIFACT_PURGE_QUEUE, { retryLimit: 2 });
  await boss.work(ARTIFACT_PURGE_QUEUE, { batchSize: 1, ...ON_DEMAND_POLL }, async () => {
    await drainArtifactPurge();
  });

  // Site-health sweep: uptime probe + SSL expiry for every ACTIVE website.
  await ensureQueue(boss, HEALTH_SWEEP_QUEUE);
  await boss.work(HEALTH_SWEEP_QUEUE, { batchSize: 1, ...SWEEP_POLL }, async () => {
    await runHealthSweep();
  });
  await boss.schedule(HEALTH_SWEEP_QUEUE, HEALTH_CRON);

  // Quick change checks between full scans: a redesign or a broken deploy
  // triggers a full scan within the hour instead of waiting for the schedule.
  await ensureQueue(boss, CHANGE_WATCH_QUEUE, { retryLimit: 0, expireInSeconds: 15 * 60 });
  await boss.work(CHANGE_WATCH_QUEUE, { batchSize: 1, ...SWEEP_POLL }, async () => {
    await runChangeWatchSweep(boss);
  });
  await boss.schedule(CHANGE_WATCH_QUEUE, CHANGE_WATCH_CRON);

  // "Update available" emails for the WordPress plugin and the Android app.
  await ensureQueue(boss, PRODUCT_UPDATES_QUEUE, { retryLimit: 0, expireInSeconds: 15 * 60 });
  await boss.work(PRODUCT_UPDATES_QUEUE, { batchSize: 1, ...SWEEP_POLL }, async () => {
    await runProductUpdates();
  });
  await boss.schedule(PRODUCT_UPDATES_QUEUE, PRODUCT_UPDATES_CRON);

  // Weekly client-ready reports (spec §37): one summary email per ACTIVE
  // website every Monday morning - the agency forward-to-client selling point.
  await ensureQueue(boss, REPORT_SWEEP_QUEUE);
  await boss.work(REPORT_SWEEP_QUEUE, { batchSize: 1, ...SWEEP_POLL }, async () => {
    await runReportSweep();
  });
  await boss.schedule(REPORT_SWEEP_QUEUE, REPORT_CRON);

  // Weekly Lighthouse audit sweep: enqueues one homepage audit per ACTIVE
  // website (Tuesdays by default - offset from the Monday report sweep) so
  // scores stay fresh and performance-drop alerts fire without user action.
  await ensureQueue(boss, AUDIT_SWEEP_QUEUE);
  await boss.work(AUDIT_SWEEP_QUEUE, { batchSize: 1, ...SWEEP_POLL }, async () => {
    await runAuditSweep(boss);
  });
  await boss.schedule(AUDIT_SWEEP_QUEUE, AUDIT_CRON);

  // Daily client-report delivery sweep (Pro): emails each website's branded
  // report to configured client recipients on its weekly/monthly cadence.
  await ensureQueue(boss, CLIENT_REPORT_SWEEP_QUEUE);
  await boss.work(CLIENT_REPORT_SWEEP_QUEUE, { batchSize: 1, ...SWEEP_POLL }, async () => {
    await runClientReportSweep();
  });
  await boss.schedule(CLIENT_REPORT_SWEEP_QUEUE, CLIENT_REPORT_CRON);

  // Daily billing sweep: "Pro renews soon / about to expire" reminder emails,
  // one per billing period (dedupe via Subscription.renewalReminderSentAt).
  await ensureQueue(boss, BILLING_SWEEP_QUEUE);
  await boss.work(BILLING_SWEEP_QUEUE, { batchSize: 1, ...SWEEP_POLL }, async () => {
    await runBillingSweep();
  });
  await boss.schedule(BILLING_SWEEP_QUEUE, BILLING_CRON);

  // Activation: "baseline ready" + the one-time "add your first website"
  // reminder, spending only the email budget alerts leave over.
  await ensureQueue(boss, ACTIVATION_SWEEP_QUEUE, { expireInSeconds: 20 * 60 });
  await boss.work(ACTIVATION_SWEEP_QUEUE, { batchSize: 1, ...SWEEP_POLL }, async () => {
    await runActivationSweep();
  });
  await boss.schedule(ACTIVATION_SWEEP_QUEUE, ACTIVATION_CRON);

  // Google Search Console: on-demand syncs + a daily sweep.
  await ensureQueue(boss, GSC_SYNC_QUEUE, { retryLimit: 1, expireInSeconds: 10 * 60 });
  await boss.work<GscSyncJob>(GSC_SYNC_QUEUE, { batchSize: 1, ...ON_DEMAND_POLL }, async ([job]) => {
    await runGscSync(job.data);
  });
  await ensureQueue(boss, GSC_SYNC_SWEEP_QUEUE);
  await boss.work(GSC_SYNC_SWEEP_QUEUE, { batchSize: 1, ...SWEEP_POLL }, async () => {
    await runGscSweep();
  });
  await boss.schedule(GSC_SYNC_SWEEP_QUEUE, GSC_CRON);

  // Domain expiry (RDAP). One request per registrable domain, a second apart.
  await ensureQueue(boss, DOMAIN_SWEEP_QUEUE, { expireInSeconds: 20 * 60 });
  await boss.work(DOMAIN_SWEEP_QUEUE, { batchSize: 1, ...SWEEP_POLL }, async () => {
    await runDomainSweep();
  });
  await boss.schedule(DOMAIN_SWEEP_QUEUE, DOMAIN_CRON);

  // "Send me a test alert" from the app. Short expiry: a test nobody receives
  // within a minute has failed its purpose, and a stale one arriving later
  // would be more confusing than none.
  await ensureQueue(boss, PUSH_TEST_QUEUE, { retryLimit: 0, expireInSeconds: 60 });
  await boss.work<PushTestJob>(
    PUSH_TEST_QUEUE,
    { batchSize: 1, ...ON_DEMAND_POLL },
    async ([job]) => {
      logger.info("push test job received", { jobId: job.id, userId: job.data.userId });
      await sendTestPush(job.data.userId);
    },
  );

  // Site audits (technical SEO crawl): up to ~10 min of polite fetching per
  // run, so strictly one at a time with a single retry on expiry.
  await ensureQueue(boss, SITE_AUDIT_QUEUE, { retryLimit: 1, expireInSeconds: 15 * 60 });
  await boss.work<SiteAuditJob>(
    SITE_AUDIT_QUEUE,
    { batchSize: 1, ...ON_DEMAND_POLL },
    async ([job]) => {
      logger.info("site audit job received", { jobId: job.id, siteAuditId: job.data.siteAuditId });
      await runSiteAuditJob(job.data);
    },
  );

  // Lighthouse audits (on-demand + weekly sweep). Heavyweight (~10-40s,
  // CPU-bound), so one at a time (batchSize 1) with a single retry.
  await ensureQueue(boss, LIGHTHOUSE_AUDIT_QUEUE, { retryLimit: 1, expireInSeconds: 5 * 60 });
  await boss.work<LighthouseAuditJob>(
    LIGHTHOUSE_AUDIT_QUEUE,
    { batchSize: 1, ...ON_DEMAND_POLL },
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
    domainCron: DOMAIN_CRON,
    reportCron: REPORT_CRON,
    auditCron: AUDIT_CRON,
    watchdog: true,
  });

  // "Somebody signed up" - to the operator, not to a customer. Enqueued by the
  // web app's signup hook; delivered here so a push round trip can never slow
  // down or fail the request that creates an account.
  await ensureQueue(boss, ADMIN_SIGNUP_QUEUE, { retryLimit: 2 });
  await boss.work<AdminSignupJob>(ADMIN_SIGNUP_QUEUE, { batchSize: 1, ...ON_DEMAND_POLL }, async ([job]) => {
    await runAdminSignupJob(job.data.userId);
  });

  // "Welcome to MyKavo" - to the customer this time. A separate queue from
  // the operator alert above: the two have independent failure modes, and the
  // admin job's early returns (no ADMIN_EMAILS, admin's own signup) must
  // never be able to swallow a customer's welcome.
  await ensureQueue(boss, WELCOME_EMAIL_QUEUE, { retryLimit: 3 });
  await boss.work<WelcomeEmailJob>(WELCOME_EMAIL_QUEUE, { batchSize: 1, ...ON_DEMAND_POLL }, async ([job]) => {
    await runWelcomeEmailJob(job.data.userId);
  });

  // Self-monitoring. Deliberately NOT a pg-boss schedule: pg-boss fetches its
  // jobs from Postgres, so a cron-based check is silent in the one failure it
  // exists to report. A plain interval keeps ticking either way.
  const stopDatabaseWatch = startDatabaseWatch();

  // Keep the web app's serverless function warm so dashboard clicks do not
  // wait on a cold start (see keep-warm.ts).
  const stopKeepWarm = startKeepWarm();

  async function shutdown(signal: string) {
    logger.info("shutting down", { signal });
    try {
      stopDatabaseWatch();
      stopKeepWarm();
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
