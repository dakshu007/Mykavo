/**
 * Fluxen scan worker. Consumes SCAN_WEBSITE jobs from pg-boss (PostgreSQL-
 * backed queue — zero extra infrastructure) and executes them with a
 * bounded Playwright browser pool. Scales horizontally: run more processes.
 */

import "dotenv/config";
import { PgBoss } from "pg-boss";
import { BrowserPool } from "@fluxen/scanner";
import { SCAN_WEBSITE_QUEUE, type ScanWebsiteJob } from "@fluxen/shared";
import { logger } from "./logger";
import { runScanWebsiteJob } from "./scan-website";

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

  logger.info("worker started", { queue: SCAN_WEBSITE_QUEUE });

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
