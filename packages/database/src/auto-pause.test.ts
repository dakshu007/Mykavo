import type { PrismaClient } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { autoPauseWebsites, resumeAutoPaused } from "./auto-pause";

type Status = "PENDING" | "DISCOVERING" | "BASELINING" | "ACTIVE" | "PAUSED" | "ERROR";

/**
 * A stand-in for the few Prisma calls auto-pause makes, so the pause and
 * resume rules run without a database (CI has none).
 */
function fakeDb(websites: Array<{ id: string; status: Status; hasBaseline?: boolean }>) {
  const sites = new Map(websites.map((w) => [w.id, { ...w, name: `Site ${w.id}`, nextScanAt: null as Date | null }]));
  const pauses = new Map<string, { websiteId: string; workspaceId: string; reason: string; pausedAt: Date }>();
  const db = {
    website: {
      updateMany: async ({ where, data }: { where: { id: string; status: { in: Status[] } }; data: { status: Status } }) => {
        const site = sites.get(where.id);
        if (!site || !where.status.in.includes(site.status)) return { count: 0 };
        site.status = data.status;
        return { count: 1 };
      },
      findUnique: async ({ where }: { where: { id: string } }) => {
        const site = sites.get(where.id);
        return site ? { id: site.id, name: site.name, status: site.status } : null;
      },
      update: async ({ where, data }: { where: { id: string }; data: { status: Status; nextScanAt: Date } }) => {
        const site = sites.get(where.id)!;
        site.status = data.status;
        site.nextScanAt = data.nextScanAt;
        return site;
      },
    },
    baseline: {
      findFirst: async ({ where }: { where: { websiteId: string } }) =>
        sites.get(where.websiteId)?.hasBaseline ? { id: `b-${where.websiteId}` } : null,
    },
    websiteAutoPause: {
      upsert: async ({
        where,
        create,
        update,
      }: {
        where: { websiteId: string };
        create: { websiteId: string; workspaceId: string; reason: string; pausedAt: Date };
        update: { reason: string; pausedAt: Date };
      }) => {
        const prev = pauses.get(where.websiteId);
        const row = prev ? { ...prev, ...update } : create;
        pauses.set(where.websiteId, row);
        return row;
      },
      findMany: async ({ where }: { where: { workspaceId: string; reason: { in: string[] } } }) =>
        [...pauses.values()]
          .filter((p) => p.workspaceId === where.workspaceId && where.reason.in.includes(p.reason))
          .sort((a, b) => a.pausedAt.getTime() - b.pausedAt.getTime())
          .map((p) => ({ websiteId: p.websiteId })),
      delete: async ({ where }: { where: { websiteId: string } }) => {
        const row = pauses.get(where.websiteId);
        pauses.delete(where.websiteId);
        return row;
      },
    },
  };
  return { db: db as unknown as PrismaClient, sites, pauses };
}

const NOW = new Date("2026-10-15T12:00:00Z");
const ws = "ws_1";

describe("autoPauseWebsites", () => {
  it("OVER_LIMIT pauses websites still being set up, not only monitored ones", async () => {
    const { db, sites, pauses } = fakeDb([
      { id: "active", status: "ACTIVE" },
      { id: "error", status: "ERROR" },
      { id: "pending", status: "PENDING" },
      { id: "discovering", status: "DISCOVERING" },
      { id: "baselining", status: "BASELINING" },
    ]);
    const paused = await autoPauseWebsites(
      db,
      [...sites.keys()].map((id) => ({ id, workspaceId: ws })),
      "OVER_LIMIT",
      NOW,
    );
    expect(paused).toEqual(["active", "error", "pending", "discovering", "baselining"]);
    expect([...sites.values()].every((s) => s.status === "PAUSED")).toBe(true);
    expect([...pauses.values()].every((p) => p.reason === "OVER_LIMIT")).toBe(true);
  });

  it("DORMANT pauses only websites being scanned", async () => {
    const { db, sites, pauses } = fakeDb([
      { id: "active", status: "ACTIVE" },
      { id: "error", status: "ERROR" },
      { id: "pending", status: "PENDING" },
      { id: "baselining", status: "BASELINING" },
    ]);
    const paused = await autoPauseWebsites(
      db,
      [...sites.keys()].map((id) => ({ id, workspaceId: ws })),
      "DORMANT",
      NOW,
    );
    expect(paused).toEqual(["active", "error"]);
    expect(sites.get("pending")?.status).toBe("PENDING");
    expect(sites.get("baselining")?.status).toBe("BASELINING");
    expect([...pauses.keys()]).toEqual(["active", "error"]);
  });

  it("never records a pause for a website the owner already paused", async () => {
    const { db, sites, pauses } = fakeDb([{ id: "mine", status: "PAUSED" }]);
    const paused = await autoPauseWebsites(db, [{ id: "mine", workspaceId: ws }], "OVER_LIMIT", NOW);
    expect(paused).toEqual([]);
    expect(sites.get("mine")?.status).toBe("PAUSED");
    expect(pauses.size).toBe(0);
  });
});

describe("resumeAutoPaused", () => {
  it("brings a site paused mid-setup back as PENDING and a baselined one back to ACTIVE", async () => {
    const { db, sites, pauses } = fakeDb([
      { id: "baselined", status: "ACTIVE", hasBaseline: true },
      { id: "setup", status: "DISCOVERING" },
    ]);
    await autoPauseWebsites(
      db,
      [
        { id: "baselined", workspaceId: ws },
        { id: "setup", workspaceId: ws },
      ],
      "OVER_LIMIT",
      NOW,
    );

    const resumed = await resumeAutoPaused(db, ws, ["OVER_LIMIT", "DORMANT"], { now: NOW });

    expect(resumed.map((r) => r.id).sort()).toEqual(["baselined", "setup"]);
    expect(sites.get("baselined")?.status).toBe("ACTIVE");
    expect(sites.get("setup")?.status).toBe("PENDING");
    expect(pauses.size).toBe(0);
  });

  it("leaves a website that is no longer paused alone but clears its pause record", async () => {
    const { db, sites, pauses } = fakeDb([{ id: "site", status: "PENDING" }]);
    await autoPauseWebsites(db, [{ id: "site", workspaceId: ws }], "OVER_LIMIT", NOW);
    // Something set it going again in the meantime.
    sites.get("site")!.status = "BASELINING";

    const resumed = await resumeAutoPaused(db, ws, ["OVER_LIMIT"], { now: NOW });

    expect(resumed).toEqual([]);
    expect(sites.get("site")?.status).toBe("BASELINING");
    expect(pauses.size).toBe(0);
  });
});
