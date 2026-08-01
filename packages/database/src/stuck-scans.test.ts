/**
 * Integration tests for stuck-scan recovery. The critical properties:
 * - abandoned QUEUED/RUNNING scans become FAILED so the dashboard, the
 *   manual-scan API, and the scheduler unstick;
 * - a QUEUED scan whose queue job is still live is NEVER touched (it will
 *   run momentarily after a worker restart);
 * - only websites left in BASELINING flip to ERROR.
 */

import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaClient, Prisma } from "@prisma/client";
import { failStuckScans } from "./stuck-scans";

const prisma = new PrismaClient();
const RUN = `test-stuck-${process.pid}-${Math.floor(process.hrtime()[1])}`;
const QUEUE = `scan-website-${RUN}`; // isolated queue name so live rows never collide

const OLD = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
const FRESH = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago

let workspaceId: string;
let websiteId: string;

async function makeScan(data: {
  status: "QUEUED" | "RUNNING";
  triggerType?: "BASELINE" | "SCHEDULED" | "MANUAL";
  createdAt?: Date;
  startedAt?: Date | null;
  websiteId?: string;
}) {
  return prisma.scan.create({
    data: {
      websiteId: data.websiteId ?? websiteId,
      triggerType: data.triggerType ?? "BASELINE",
      status: data.status,
      createdAt: data.createdAt ?? OLD,
      startedAt: data.startedAt ?? null,
    },
  });
}

beforeEach(async () => {
  await prisma.workspace.deleteMany({ where: { name: RUN } });
  const user = await prisma.user.upsert({
    where: { email: `${RUN}@test.local` },
    create: { id: RUN, name: "Stuck Tester", email: `${RUN}@test.local` },
    update: {},
  });
  const workspace = await prisma.workspace.create({ data: { name: RUN, ownerId: user.id } });
  workspaceId = workspace.id;
  const website = await prisma.website.create({
    data: {
      workspaceId,
      name: "Stuck",
      url: "https://stuck.test/",
      normalizedUrl: `https://stuck.test/${RUN}`,
      status: "PENDING",
    },
  });
  websiteId = website.id;
});

afterAll(async () => {
  await prisma.$executeRaw`DELETE FROM pgboss.job WHERE name = ${QUEUE}`.catch(() => {});
  await prisma
    .$executeRaw`SELECT pgboss.delete_queue(${QUEUE})`.catch(() => {});
  await prisma.workspace.deleteMany({ where: { name: RUN } });
  await prisma.user.deleteMany({ where: { id: RUN } });
  await prisma.$disconnect();
});

describe("failStuckScans", () => {
  it("fails an old QUEUED scan with no live queue job and leaves fresh scans alone", async () => {
    const stuck = await makeScan({ status: "QUEUED", createdAt: OLD });
    const fresh = await makeScan({ status: "QUEUED", createdAt: FRESH });

    const recovered = await failStuckScans(prisma, { queueName: QUEUE });

    expect(recovered.map((r) => r.scanId)).toContain(stuck.id);
    expect(recovered.map((r) => r.scanId)).not.toContain(fresh.id);

    const after = await prisma.scan.findUniqueOrThrow({ where: { id: stuck.id } });
    expect(after.status).toBe("FAILED");
    expect(after.errorCode).toBe("STUCK_QUEUED");
    expect(after.errorMessage).toContain("Run the scan again");
    expect(after.completedAt).not.toBeNull();

    expect((await prisma.scan.findUniqueOrThrow({ where: { id: fresh.id } })).status).toBe(
      "QUEUED",
    );
  });

  it("NEVER fails a QUEUED scan whose queue job is still live", async () => {
    const backlogged = await makeScan({ status: "QUEUED", createdAt: OLD });
    // Simulate a job still waiting in pg-boss (worker just came back from an
    // outage). Register the queue via pg-boss's own function when its real
    // schema exists (job.name has a FK to pgboss.queue); otherwise a minimal
    // shadow table stands in.
    const real = await prisma.$queryRaw<{ n: bigint }[]>(
      Prisma.sql`SELECT count(*)::bigint AS n FROM pg_proc p
                 JOIN pg_namespace ns ON ns.oid = p.pronamespace
                 WHERE ns.nspname = 'pgboss' AND p.proname = 'create_queue'`,
    );
    if (real[0].n > 0n) {
      await prisma.$executeRaw(
        Prisma.sql`SELECT pgboss.create_queue(${QUEUE}, '{"policy":"standard"}'::jsonb)`,
      );
    } else {
      await prisma.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS pgboss`);
      await prisma.$executeRawUnsafe(
        `CREATE TABLE IF NOT EXISTS pgboss.job (id uuid DEFAULT gen_random_uuid(), name text, state text, data jsonb)`,
      );
    }
    await prisma.$executeRaw(
      Prisma.sql`INSERT INTO pgboss.job (name, state, data)
                 VALUES (${QUEUE}, 'created', ${JSON.stringify({ scanId: backlogged.id })}::jsonb)`,
    );

    const recovered = await failStuckScans(prisma, { queueName: QUEUE });

    expect(recovered.map((r) => r.scanId)).not.toContain(backlogged.id);
    expect(
      (await prisma.scan.findUniqueOrThrow({ where: { id: backlogged.id } })).status,
    ).toBe("QUEUED");
  });

  it("fails an old RUNNING baseline scan and flips a BASELINING website to ERROR", async () => {
    await prisma.website.update({ where: { id: websiteId }, data: { status: "BASELINING" } });
    const stuck = await makeScan({
      status: "RUNNING",
      triggerType: "BASELINE",
      createdAt: OLD,
      startedAt: OLD,
    });

    const recovered = await failStuckScans(prisma, { queueName: QUEUE });

    expect(recovered.map((r) => r.scanId)).toContain(stuck.id);
    const after = await prisma.scan.findUniqueOrThrow({ where: { id: stuck.id } });
    expect(after.status).toBe("FAILED");
    expect(after.errorCode).toBe("STUCK_RUNNING");
    expect((await prisma.website.findUniqueOrThrow({ where: { id: websiteId } })).status).toBe(
      "ERROR",
    );
  });

  it("does not touch a recently started RUNNING scan or an ACTIVE website", async () => {
    await prisma.website.update({ where: { id: websiteId }, data: { status: "ACTIVE" } });
    const running = await makeScan({
      status: "RUNNING",
      triggerType: "SCHEDULED",
      createdAt: OLD,
      startedAt: FRESH, // attempt started recently - still legitimate
    });
    const stuckManual = await makeScan({
      status: "RUNNING",
      triggerType: "MANUAL",
      createdAt: OLD,
      startedAt: OLD,
    });

    const recovered = await failStuckScans(prisma, { queueName: QUEUE });

    expect(recovered.map((r) => r.scanId)).not.toContain(running.id);
    expect(recovered.map((r) => r.scanId)).toContain(stuckManual.id);
    // Non-baseline recovery never touches website status.
    expect((await prisma.website.findUniqueOrThrow({ where: { id: websiteId } })).status).toBe(
      "ACTIVE",
    );
  });

  it("is idempotent - a second sweep finds nothing", async () => {
    await makeScan({ status: "QUEUED", createdAt: OLD });
    const first = await failStuckScans(prisma, { queueName: QUEUE });
    expect(first).toHaveLength(1);
    const second = await failStuckScans(prisma, { queueName: QUEUE });
    expect(second).toHaveLength(0);
  });
});
