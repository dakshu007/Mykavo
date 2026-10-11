import type { PrismaClient } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { applyShopifyBilling, getShopifyPaidPlan, getWorkspaceEntitlement, higherPlan } from "./subscription";

/**
 * A stand-in for the few Prisma calls these functions make, so the Shopify
 * plan rules run without a database (CI has none).
 */
function fakeDb(state: {
  shops: Array<{
    id: string;
    shop: string;
    billingPlan: string | null;
    billingPeriodEnd?: Date | null;
    billingCancelAtEnd?: boolean;
    uninstalledAt?: Date | null;
    link: { workspaceId: string; revokedAt: Date | null } | null;
  }>;
  subscription?: { planId: string; status: string; createdAt: Date } | null;
}) {
  const weeklyResets: string[] = [];
  const db = {
    shopifyShop: {
      findMany: async ({ where }: { where: { siteConnection: { is: { workspaceId: string } } } }) =>
        state.shops
          .filter(
            (s) =>
              (s.billingPlan === "pro" || s.billingPlan === "agency") &&
              !s.uninstalledAt &&
              s.link &&
              !s.link.revokedAt &&
              s.link.workspaceId === where.siteConnection.is.workspaceId,
          )
          .map((s) => ({
            shop: s.shop,
            billingPlan: s.billingPlan,
            billingPeriodEnd: s.billingPeriodEnd ?? null,
            billingCancelAtEnd: s.billingCancelAtEnd ?? false,
          })),
      findUnique: async ({ where }: { where: { id: string } }) => {
        const s = state.shops.find((x) => x.id === where.id);
        return s ? { billingPlan: s.billingPlan, siteConnection: s.link } : null;
      },
      update: async ({ where, data }: { where: { id: string }; data: { billingPlan: string | null } }) => {
        const s = state.shops.find((x) => x.id === where.id)!;
        s.billingPlan = data.billingPlan;
        return s;
      },
    },
    subscription: {
      findUnique: async () =>
        state.subscription
          ? {
              ...state.subscription,
              cancelAtPeriodEnd: false,
              currentPeriodEnd: null,
              dodoCustomerId: "cus_1",
              dodoSubscriptionId: "sub_1",
            }
          : null,
    },
    workspace: { findUnique: async () => null },
    website: {
      updateMany: async ({ where }: { where: { workspaceId: string } }) => {
        weeklyResets.push(where.workspaceId);
        return { count: 1 };
      },
    },
  };
  return { db: db as unknown as PrismaClient, weeklyResets };
}

const linked = (workspaceId: string) => ({ workspaceId, revokedAt: null });

describe("higherPlan", () => {
  it("orders Agency over Pro over Free", () => {
    expect(higherPlan("free", "pro")).toBe("pro");
    expect(higherPlan("agency", "pro")).toBe("agency");
    expect(higherPlan("pro", "pro")).toBe("pro");
  });
});

describe("Shopify plans in the workspace entitlement", () => {
  it("gives the workspace the plan its linked store pays for through Shopify", async () => {
    const { db } = fakeDb({ shops: [{ id: "s1", shop: "a.myshopify.com", billingPlan: "pro", link: linked("w1") }] });
    const ent = await getWorkspaceEntitlement(db, "w1");
    expect(ent).toMatchObject({ planId: "pro", billedBy: "shopify", shopifyShop: "a.myshopify.com", status: "active" });
  });

  it("ignores stores that are uninstalled, unlinked or linked elsewhere", async () => {
    const { db } = fakeDb({
      shops: [
        { id: "s1", shop: "a.myshopify.com", billingPlan: "agency", uninstalledAt: new Date(), link: linked("w1") },
        { id: "s2", shop: "b.myshopify.com", billingPlan: "agency", link: { workspaceId: "w1", revokedAt: new Date() } },
        { id: "s3", shop: "c.myshopify.com", billingPlan: "agency", link: linked("w2") },
      ],
    });
    expect(await getWorkspaceEntitlement(db, "w1")).toBeNull();
  });

  it("takes the higher of a MyKavo subscription and a Shopify plan", async () => {
    const createdAt = new Date("2026-10-01T00:00:00Z");
    const dodoAgency = fakeDb({
      shops: [{ id: "s1", shop: "a.myshopify.com", billingPlan: "pro", link: linked("w1") }],
      subscription: { planId: "agency", status: "active", createdAt },
    });
    expect(await getWorkspaceEntitlement(dodoAgency.db, "w1")).toMatchObject({ planId: "agency", billedBy: "dodo" });

    const shopifyAgency = fakeDb({
      shops: [{ id: "s1", shop: "a.myshopify.com", billingPlan: "agency", link: linked("w1") }],
      subscription: { planId: "pro", status: "active", createdAt },
    });
    expect(await getWorkspaceEntitlement(shopifyAgency.db, "w1")).toMatchObject({ planId: "agency", billedBy: "shopify" });
  });

  it("picks the best store when several pay", async () => {
    const { db } = fakeDb({
      shops: [
        { id: "s1", shop: "a.myshopify.com", billingPlan: "pro", link: linked("w1") },
        { id: "s2", shop: "b.myshopify.com", billingPlan: "agency", link: linked("w1") },
      ],
    });
    expect(await getShopifyPaidPlan(db, "w1")).toMatchObject({ planId: "agency", shop: "b.myshopify.com" });
  });
});

describe("applyShopifyBilling", () => {
  it("records a new plan without touching scan schedules", async () => {
    const { db, weeklyResets } = fakeDb({ shops: [{ id: "s1", shop: "a.myshopify.com", billingPlan: null, link: linked("w1") }] });
    const r = await applyShopifyBilling(db, "s1", { plan: "pro", handle: "pro", periodEnd: null, cancelAtEnd: false });
    expect(r).toEqual({ changed: true, workspaceId: "w1" });
    expect(weeklyResets).toEqual([]);
  });

  it("puts daily scans back to weekly when the last paid plan ends", async () => {
    const { db, weeklyResets } = fakeDb({ shops: [{ id: "s1", shop: "a.myshopify.com", billingPlan: "pro", link: linked("w1") }] });
    await applyShopifyBilling(db, "s1", { plan: null, handle: "free", periodEnd: null, cancelAtEnd: false });
    expect(weeklyResets).toEqual(["w1"]);
  });

  it("keeps daily scans when MyKavo billing still pays", async () => {
    const { db, weeklyResets } = fakeDb({
      shops: [{ id: "s1", shop: "a.myshopify.com", billingPlan: "pro", link: linked("w1") }],
      subscription: { planId: "pro", status: "active", createdAt: new Date() },
    });
    await applyShopifyBilling(db, "s1", { plan: null, handle: null, periodEnd: null, cancelAtEnd: false });
    expect(weeklyResets).toEqual([]);
  });
});
