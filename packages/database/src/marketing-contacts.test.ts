import type { PrismaClient } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { loadMarketingContacts } from "./marketing-contacts";

const DAY_MS = 24 * 60 * 60 * 1000;

interface FakeTrial {
  workspaceId: string;
  startedAt: Date;
  endsAt: Date;
}

/**
 * A stand-in for the Prisma calls loadMarketingContacts makes, so the trial
 * rules run without a database (CI has none). The trial table honours the
 * endsAt filter the way PostgreSQL would; the user query returns every
 * account and records its filter for the assertions.
 */
function fakeDb(trials: FakeTrial[]) {
  const seen: { trialWhere?: unknown; userWhere?: unknown } = {};
  const users = [
    { id: "u1", name: "Ada Lovelace", email: "ada@example.test", ws: "ws_running" },
    { id: "u2", name: "Alan Turing", email: "alan@example.test", ws: "ws_ended_recently" },
    { id: "u3", name: "Grace Hopper", email: "grace@example.test", ws: "ws_ended_long_ago" },
  ];
  const db = {
    emailOptOut: { findMany: async () => [] },
    workspaceTrial: {
      findMany: async (args: { where?: { endsAt?: { gte?: Date } } }) => {
        seen.trialWhere = args.where;
        const from = args.where?.endsAt?.gte;
        return trials.filter((t) => !from || t.endsAt >= from);
      },
    },
    user: {
      findMany: async (args: { where: unknown }) => {
        seen.userWhere = args.where;
        return users.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          createdAt: new Date("2026-01-01T00:00:00Z"),
          ownedWorkspaces: [{ id: u.ws, subscription: null, _count: { websites: 2 } }],
        }));
      },
    },
    shopifyShop: { findMany: async () => [] },
  };
  return { db: db as unknown as PrismaClient, seen };
}

describe("loadMarketingContacts trials", () => {
  const now = Date.now();
  const trials: FakeTrial[] = [
    // Started 4 days ago, 10 days left.
    { workspaceId: "ws_running", startedAt: new Date(now - 4 * DAY_MS), endsAt: new Date(now + 10 * DAY_MS) },
    // Ended an hour ago.
    { workspaceId: "ws_ended_recently", startedAt: new Date(now - 14 * DAY_MS - 3_600_000), endsAt: new Date(now - 3_600_000) },
    // Ended months ago.
    { workspaceId: "ws_ended_long_ago", startedAt: new Date(now - 120 * DAY_MS), endsAt: new Date(now - 106 * DAY_MS) },
  ];

  it("full sync reads only trials still running and marks those accounts as on a Pro trial", async () => {
    const { db, seen } = fakeDb(trials);
    const contacts = await loadMarketingContacts(db, null);

    const from = (seen.trialWhere as { endsAt: { gte: Date } }).endsAt.gte;
    expect(from.getTime()).toBeGreaterThanOrEqual(now);
    const byEmail = new Map(contacts.map((c) => [c.email, c]));
    expect(byEmail.get("ada@example.test")).toMatchObject({ plan: "pro_trial", trial: true, paid: false });
    expect(byEmail.get("alan@example.test")).toMatchObject({ plan: "free", trial: false, paid: false });
    expect(byEmail.get("grace@example.test")).toMatchObject({ plan: "free", trial: false, paid: false });
  });

  it("incremental sync reads trials ending since then and counts a trial that just ended as a change", async () => {
    const since = new Date(now - 2 * 3_600_000);
    const { db, seen } = fakeDb(trials);
    await loadMarketingContacts(db, since);

    expect(seen.trialWhere).toEqual({ endsAt: { gte: since } });
    const changed = JSON.stringify(seen.userWhere);
    expect(changed).toContain("ws_ended_recently");
    expect(changed).not.toContain("ws_ended_long_ago");
    expect(changed).not.toContain("ws_running");
  });
});
