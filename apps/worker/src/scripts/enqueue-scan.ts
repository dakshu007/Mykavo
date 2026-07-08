/**
 * Dev utility: enqueue a scan for a website. Until the scheduler lands
 * (Phase 7), this is how SCHEDULED scans are triggered for testing the
 * comparison engine (the web app's manual-scan trigger is plan-gated).
 *
 *   pnpm --filter worker exec tsx src/scripts/enqueue-scan.ts <websiteId> [SCHEDULED|MANUAL|BASELINE]
 */

import "dotenv/config";
import { prisma } from "@fluxen/database";
import { PgBoss } from "pg-boss";
import { SCAN_WEBSITE_QUEUE } from "@fluxen/shared";

async function main() {
  const websiteId = process.argv[2];
  const trigger = (process.argv[3] ?? "SCHEDULED") as "SCHEDULED" | "MANUAL" | "BASELINE";
  if (!websiteId) {
    console.error("Usage: enqueue-scan.ts <websiteId> [SCHEDULED|MANUAL|BASELINE]");
    process.exit(1);
  }

  const website = await prisma.website.findUnique({ where: { id: websiteId } });
  if (!website) {
    console.error(`Website ${websiteId} not found`);
    process.exit(1);
  }

  const scan = await prisma.scan.create({
    data: { websiteId, triggerType: trigger, status: "QUEUED" },
  });

  const boss = new PgBoss({
    connectionString: process.env.DATABASE_URL!,
    schema: "pgboss",
  });
  await boss.start();
  await boss.createQueue(SCAN_WEBSITE_QUEUE).catch(() => {});
  const jobId = await boss.send(SCAN_WEBSITE_QUEUE, { scanId: scan.id });
  await boss.stop({ graceful: false });

  console.log(`Enqueued ${trigger} scan ${scan.id} (job ${jobId}) for ${website.name}`);
  await prisma.$disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
