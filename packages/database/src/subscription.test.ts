/**
 * Integration tests for subscription entitlement + upgrade/downgrade against
 * the real database (Phase 8).
 */

import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import {
  getWorkspaceEntitlement,
  upgradeWorkspaceToPro,
  downgradeWorkspaceToFree,
  findWorkspaceByDodoSubscription,
  applyWebsiteAddon,
  revokeWebsiteAddon,
  findWorkspaceByAddonSubscription,
  listActiveWebsiteAddons,
  getWorkspaceAddonWebsites,
  createCheckoutIntent,
  consumeCheckoutIntent,
} from "./subscription";

const prisma = new PrismaClient();
const RUN = `test-sub-${process.pid}-${Math.floor(process.hrtime()[1])}`;

let workspaceId: string;

beforeEach(async () => {
  await prisma.workspace.deleteMany({ where: { name: RUN } });
  const user = await prisma.user.upsert({
    where: { email: `${RUN}@test.local` },
    create: { id: RUN, name: "Sub Tester", email: `${RUN}@test.local` },
    update: {},
  });
  const workspace = await prisma.workspace.create({ data: { name: RUN, ownerId: user.id } });
  workspaceId = workspace.id;
});

afterAll(async () => {
  await prisma.workspace.deleteMany({ where: { name: RUN } });
  await prisma.user.deleteMany({ where: { id: RUN } });
  await prisma.$disconnect();
});

describe("getWorkspaceEntitlement", () => {
  it("returns null (Free) when no subscription exists", async () => {
    expect(await getWorkspaceEntitlement(prisma, workspaceId)).toBeNull();
  });
});

describe("upgradeWorkspaceToPro", () => {
  it("creates a pro subscription and reports pro entitlement", async () => {
    await upgradeWorkspaceToPro(prisma, {
      workspaceId,
      status: "active",
      dodoCustomerId: "cus_1",
      dodoSubscriptionId: "sub_1",
    });
    const ent = await getWorkspaceEntitlement(prisma, workspaceId);
    expect(ent?.planId).toBe("pro");
    expect(ent?.status).toBe("active");
    expect(ent?.dodoSubscriptionId).toBe("sub_1");
  });

  it("is idempotent — a repeated active event keeps a single pro subscription", async () => {
    for (const _ of [1, 2, 3]) {
      await upgradeWorkspaceToPro(prisma, {
        workspaceId,
        status: "active",
        dodoSubscriptionId: "sub_dup",
      });
    }
    const count = await prisma.subscription.count({ where: { workspaceId } });
    expect(count).toBe(1);
  });

  it("a non-active status does not grant pro entitlement", async () => {
    await upgradeWorkspaceToPro(prisma, { workspaceId, status: "on_hold" });
    // planId is pro but status isn't active → entitlement falls back to free.
    expect((await getWorkspaceEntitlement(prisma, workspaceId))?.planId).toBe("free");
  });
});

describe("downgradeWorkspaceToFree", () => {
  it("downgrades to free and resets daily scan frequency to weekly", async () => {
    await upgradeWorkspaceToPro(prisma, { workspaceId, status: "active", dodoSubscriptionId: "sub_x" });
    const site = await prisma.website.create({
      data: {
        workspaceId,
        name: "Site",
        url: "https://d.test/",
        normalizedUrl: `https://d.test/${RUN}`,
        scanFrequency: "DAILY",
        status: "ACTIVE",
      },
    });

    await downgradeWorkspaceToFree(prisma, { workspaceId, status: "cancelled" });

    expect((await getWorkspaceEntitlement(prisma, workspaceId))?.planId).toBe("free");
    const refreshed = await prisma.website.findUnique({ where: { id: site.id } });
    expect(refreshed?.scanFrequency).toBe("WEEKLY");
  });
});

describe("findWorkspaceByDodoSubscription", () => {
  it("maps a dodo subscription id back to its workspace", async () => {
    await upgradeWorkspaceToPro(prisma, { workspaceId, status: "active", dodoSubscriptionId: "sub_find" });
    expect(await findWorkspaceByDodoSubscription(prisma, "sub_find")).toBe(workspaceId);
    expect(await findWorkspaceByDodoSubscription(prisma, "sub_missing")).toBeNull();
  });
});

describe("out-of-order event guard", () => {
  it("ignores a downgrade that is older than the last applied event", async () => {
    const t1 = new Date("2026-07-08T10:00:00Z");
    const t0 = new Date("2026-07-08T09:00:00Z");
    // Apply a newer upgrade first…
    await upgradeWorkspaceToPro(prisma, {
      workspaceId,
      status: "active",
      dodoSubscriptionId: "sub_ooo",
      eventAt: t1,
    });
    // …then a STALE (earlier) cancel should be skipped.
    await downgradeWorkspaceToFree(prisma, { workspaceId, status: "cancelled", eventAt: t0 });
    expect((await getWorkspaceEntitlement(prisma, workspaceId))?.planId).toBe("pro");
  });

  it("applies a downgrade that is newer than the last applied event", async () => {
    const t1 = new Date("2026-07-08T10:00:00Z");
    const t2 = new Date("2026-07-08T11:00:00Z");
    await upgradeWorkspaceToPro(prisma, { workspaceId, status: "active", eventAt: t1 });
    await downgradeWorkspaceToFree(prisma, { workspaceId, status: "cancelled", eventAt: t2 });
    expect((await getWorkspaceEntitlement(prisma, workspaceId))?.planId).toBe("free");
  });
});

describe("checkout intents (unforgeable attribution)", () => {
  it("resolves and consumes a valid token exactly once, carrying its kind", async () => {
    await createCheckoutIntent(prisma, { token: "tok_ok", workspaceId, userId: RUN });
    expect(await consumeCheckoutIntent(prisma, "tok_ok")).toEqual({ workspaceId, kind: "pro" });
    // Second consume returns null (already used) — no double-attribution.
    expect(await consumeCheckoutIntent(prisma, "tok_ok")).toBeNull();
  });

  it("preserves the add-on kind through consumption", async () => {
    await createCheckoutIntent(prisma, {
      token: "tok_addon",
      workspaceId,
      userId: RUN,
      kind: "website_addon",
    });
    expect(await consumeCheckoutIntent(prisma, "tok_addon")).toEqual({
      workspaceId,
      kind: "website_addon",
    });
  });

  it("returns null for unknown or expired tokens", async () => {
    expect(await consumeCheckoutIntent(prisma, "tok_unknown")).toBeNull();
    await createCheckoutIntent(prisma, {
      token: "tok_expired",
      workspaceId,
      userId: RUN,
      ttlMinutes: -1,
    });
    expect(await consumeCheckoutIntent(prisma, "tok_expired")).toBeNull();
  });
});

describe("website add-ons", () => {
  it("grants extra website capacity that sums across active add-ons", async () => {
    expect(await getWorkspaceAddonWebsites(prisma, workspaceId)).toBe(0);

    await applyWebsiteAddon(prisma, {
      workspaceId,
      dodoSubscriptionId: "addon_1",
      status: "active",
    });
    await applyWebsiteAddon(prisma, {
      workspaceId,
      dodoSubscriptionId: "addon_2",
      status: "active",
    });

    expect(await getWorkspaceAddonWebsites(prisma, workspaceId)).toBe(2);
    expect((await listActiveWebsiteAddons(prisma, workspaceId)).length).toBe(2);
    expect(await findWorkspaceByAddonSubscription(prisma, "addon_1")).toBe(workspaceId);
  });

  it("is idempotent on repeated active events (keyed by subscription id)", async () => {
    for (const _ of [1, 2, 3]) {
      await applyWebsiteAddon(prisma, {
        workspaceId,
        dodoSubscriptionId: "addon_dup",
        status: "active",
      });
    }
    expect(await prisma.websiteAddon.count({ where: { workspaceId } })).toBe(1);
    expect(await getWorkspaceAddonWebsites(prisma, workspaceId)).toBe(1);
  });

  it("revoking removes the capacity", async () => {
    await applyWebsiteAddon(prisma, {
      workspaceId,
      dodoSubscriptionId: "addon_rev",
      status: "active",
    });
    expect(await getWorkspaceAddonWebsites(prisma, workspaceId)).toBe(1);
    await revokeWebsiteAddon(prisma, { dodoSubscriptionId: "addon_rev", status: "cancelled" });
    expect(await getWorkspaceAddonWebsites(prisma, workspaceId)).toBe(0);
    expect((await listActiveWebsiteAddons(prisma, workspaceId)).length).toBe(0);
  });

  it("ignores a stale (out-of-order) add-on event", async () => {
    const t1 = new Date("2026-07-08T10:00:00Z");
    const t0 = new Date("2026-07-08T09:00:00Z");
    await applyWebsiteAddon(prisma, {
      workspaceId,
      dodoSubscriptionId: "addon_ooo",
      status: "active",
      eventAt: t1,
    });
    // A stale cancel must not deactivate a newer activation.
    await revokeWebsiteAddon(prisma, {
      dodoSubscriptionId: "addon_ooo",
      status: "cancelled",
      eventAt: t0,
    });
    expect(await getWorkspaceAddonWebsites(prisma, workspaceId)).toBe(1);
  });
});
