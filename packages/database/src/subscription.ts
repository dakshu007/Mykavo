/**
 * Subscription persistence (Phase 8 - Dodo Payments). DB-level mutations
 * shared by the webhook handler and billing APIs. Entitlement mapping to
 * plan features lives in the web app; this module is pure persistence.
 *
 * All mutations accept a Prisma client OR an interactive transaction client
 * (`Tx`) so the webhook can apply the dedupe record + the entitlement change
 * atomically (security review: durability gap).
 */

import type { PrismaClient, Prisma } from "@prisma/client";
import { isPlatformAdminEmail, platformAdminEmails } from "./platform-admin";
import { getActiveTrial } from "./trial";

type Db = PrismaClient | Prisma.TransactionClient;

/** Dodo statuses that grant paid access. */
const ACTIVE_STATUSES = new Set(["active"]);

/** A paid plan a subscription can hold. Anything else resolves to Free. */
export type PaidPlanId = "pro" | "agency";

function toPaidPlanId(value: string): PaidPlanId | null {
  return value === "pro" || value === "agency" ? value : null;
}

/**
 * Pro subscriptions that began before the Agency plan launched keep what Pro
 * included when they bought it: white-label client reports, automatic report
 * emails and 5 seats. Keyed on the subscription row's creation time, which a
 * cancellation does not reset - a returning customer keeps their deal too.
 */
export const PRO_GRANDFATHER_CUTOFF = new Date("2026-09-24T00:00:00Z");

export function isGrandfatheredPro(planId: string, subscriptionCreatedAt: Date): boolean {
  return planId === "pro" && subscriptionCreatedAt < PRO_GRANDFATHER_CUTOFF;
}

/** The plan a subscription row grants right now: a paid plan while active, otherwise Free. */
export function planIdFromSubscription(sub: { planId: string; status: string } | null): "free" | PaidPlanId {
  if (!sub || !ACTIVE_STATUSES.has(sub.status)) return "free";
  return toPaidPlanId(sub.planId) ?? "free";
}

/** Higher of two plans: Agency over Pro over Free. */
export function higherPlan(a: "free" | PaidPlanId, b: "free" | PaidPlanId): "free" | PaidPlanId {
  const rank = { free: 0, pro: 1, agency: 2 } as const;
  return rank[b] > rank[a] ? b : a;
}

/**
 * The best plan paid for through Shopify by a store linked to this
 * workspace (Shopify App Pricing), with that store's domain. A store only
 * counts while the app is installed and its link to the workspace is live.
 */
export async function getShopifyPaidPlan(
  db: Db,
  workspaceId: string,
): Promise<{ planId: PaidPlanId; shop: string; periodEnd: Date | null; cancelAtEnd: boolean } | null> {
  const shops = await db.shopifyShop.findMany({
    where: {
      billingPlan: { in: ["pro", "agency"] },
      uninstalledAt: null,
      siteConnection: { is: { workspaceId, revokedAt: null } },
    },
    select: { shop: true, billingPlan: true, billingPeriodEnd: true, billingCancelAtEnd: true },
  });
  let best: { planId: PaidPlanId; shop: string; periodEnd: Date | null; cancelAtEnd: boolean } | null = null;
  for (const s of shops) {
    const planId = toPaidPlanId(s.billingPlan ?? "");
    if (!planId) continue;
    if (!best || higherPlan(best.planId, planId) !== best.planId) {
      best = { planId, shop: s.shop, periodEnd: s.billingPeriodEnd, cancelAtEnd: s.billingCancelAtEnd };
    }
  }
  return best;
}

export interface Entitlement {
  planId: "free" | PaidPlanId;
  /**
   * Who bills the plan in force: MyKavo's own billing (Dodo), or Shopify
   * for a store linked to the workspace. Null on Free.
   */
  billedBy?: "dodo" | "shopify" | "trial" | null;
  /** The store paying through Shopify, when billedBy is "shopify". */
  shopifyShop?: string | null;
  /** When the free trial ends, when billedBy is "trial". */
  trialEndsAt?: Date | null;
  /** Pro bought before Agency existed - keeps the features it included then. */
  grandfathered: boolean;
  /**
   * The platform admin's own workspaces: Agency with every numeric limit
   * lifted, and no charge. Decided by the owner's email being on ADMIN_EMAILS
   * - never stored, so nothing a customer or a webhook writes can grant it.
   */
  unlimited: boolean;
  status: string;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: Date | null;
  dodoCustomerId: string | null;
  dodoSubscriptionId: string | null;
}

/** True when the workspace's owner is a platform admin (ADMIN_EMAILS). */
async function ownedByPlatformAdmin(db: Db, workspaceId: string): Promise<boolean> {
  // No allowlist configured: skip the lookup entirely.
  if (platformAdminEmails().length === 0) return false;
  const ws = await db.workspace.findUnique({
    where: { id: workspaceId },
    select: { owner: { select: { email: true } } },
  });
  return isPlatformAdminEmail(ws?.owner.email);
}

export async function getWorkspaceEntitlement(
  db: Db,
  workspaceId: string,
): Promise<Entitlement | null> {
  const [sub, admin] = await Promise.all([
    db.subscription.findUnique({ where: { workspaceId } }),
    ownedByPlatformAdmin(db, workspaceId),
  ]);
  if (admin) {
    // A real subscription, if the admin ever bought one, keeps its billing
    // details so it can still be managed or cancelled.
    return {
      planId: "agency",
      grandfathered: false,
      unlimited: true,
      status: sub?.status ?? "active",
      cancelAtPeriodEnd: sub?.cancelAtPeriodEnd ?? false,
      currentPeriodEnd: sub?.currentPeriodEnd ?? null,
      dodoCustomerId: sub?.dodoCustomerId ?? null,
      dodoSubscriptionId: sub?.dodoSubscriptionId ?? null,
    };
  }
  const shopify = await getShopifyPaidPlan(db, workspaceId);
  const dodoPlan = planIdFromSubscription(sub);
  // Nothing paid: a running free trial grants its plan (see trial.ts).
  if (dodoPlan === "free" && !shopify) {
    const trial = await getActiveTrial(db, workspaceId);
    if (trial) {
      return {
        planId: trial.planId,
        billedBy: "trial",
        shopifyShop: null,
        trialEndsAt: trial.endsAt,
        grandfathered: false,
        unlimited: false,
        status: "trialing",
        cancelAtPeriodEnd: false,
        currentPeriodEnd: trial.endsAt,
        dodoCustomerId: sub?.dodoCustomerId ?? null,
        dodoSubscriptionId: sub?.dodoSubscriptionId ?? null,
      };
    }
  }
  if (!sub && !shopify) return null;
  // A store paying through Shopify grants its plan to the workspace it is
  // linked to; if the workspace also pays MyKavo directly, the higher wins.
  const fromShopify = shopify !== null && higherPlan(dodoPlan, shopify.planId) !== dodoPlan;
  if (!sub || fromShopify) {
    return {
      planId: shopify!.planId,
      billedBy: "shopify",
      shopifyShop: shopify!.shop,
      grandfathered: false,
      unlimited: false,
      status: "active",
      cancelAtPeriodEnd: shopify!.cancelAtEnd,
      currentPeriodEnd: shopify!.periodEnd,
      dodoCustomerId: sub?.dodoCustomerId ?? null,
      dodoSubscriptionId: sub?.dodoSubscriptionId ?? null,
    };
  }
  const planId = dodoPlan;
  const paid = planId === "free" ? null : planId;
  return {
    planId: paid ?? "free",
    billedBy: paid ? "dodo" : null,
    shopifyShop: null,
    grandfathered: paid !== null && isGrandfatheredPro(paid, sub.createdAt),
    unlimited: false,
    status: sub.status,
    cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
    currentPeriodEnd: sub.currentPeriodEnd,
    dodoCustomerId: sub.dodoCustomerId,
    dodoSubscriptionId: sub.dodoSubscriptionId,
  };
}

export interface UpgradeInput {
  workspaceId: string;
  /** Which paid plan to grant. */
  planId: PaidPlanId;
  status: string;
  dodoCustomerId?: string | null;
  dodoSubscriptionId?: string | null;
  currentPeriodEnd?: Date | null;
  cancelAtPeriodEnd?: boolean;
  /** Logical event time - used to reject stale, out-of-order events. */
  eventAt?: Date | null;
}

/** The paid plan a workspace's subscription row currently records, if any. */
export async function getRecordedPaidPlan(
  db: Db,
  workspaceId: string,
): Promise<PaidPlanId | null> {
  const sub = await db.subscription.findUnique({
    where: { workspaceId },
    select: { planId: true },
  });
  return sub ? toPaidPlanId(sub.planId) : null;
}

/** True when the incoming event is older than the last one applied. */
function isStale(existingLastEventAt: Date | null, eventAt?: Date | null): boolean {
  return !!eventAt && !!existingLastEventAt && eventAt < existingLastEventAt;
}

/** Grant a paid plan (from a verified active/renewed/paid/plan-changed webhook). */
export async function grantPaidPlan(db: Db, input: UpgradeInput): Promise<void> {
  const existing = await db.subscription.findUnique({
    where: { workspaceId: input.workspaceId },
  });
  if (existing && isStale(existing.lastEventAt, input.eventAt)) return; // out-of-order guard

  const data = {
    planId: input.planId,
    status: input.status,
    dodoCustomerId: input.dodoCustomerId ?? undefined,
    dodoSubscriptionId: input.dodoSubscriptionId ?? undefined,
    currentPeriodEnd: input.currentPeriodEnd ?? undefined,
    cancelAtPeriodEnd: input.cancelAtPeriodEnd ?? false,
    lastEventAt: input.eventAt ?? undefined,
  };

  await db.subscription.upsert({
    where: { workspaceId: input.workspaceId },
    create: {
      workspaceId: input.workspaceId,
      provider: "dodo",
      planId: input.planId,
      status: input.status,
      dodoCustomerId: input.dodoCustomerId ?? null,
      dodoSubscriptionId: input.dodoSubscriptionId ?? null,
      currentPeriodEnd: input.currentPeriodEnd ?? null,
      cancelAtPeriodEnd: input.cancelAtPeriodEnd ?? false,
      lastEventAt: input.eventAt ?? null,
    },
    update: data,
  });
}

/**
 * Downgrade to Free (cancelled/expired/failed/on_hold). Existing websites are
 * kept (spec §39), but daily scan frequency is reset to weekly. Runs its two
 * writes sequentially so it composes inside an outer transaction.
 */
export async function downgradeWorkspaceToFree(
  db: Db,
  input: {
    workspaceId: string;
    status: string;
    dodoSubscriptionId?: string | null;
    eventAt?: Date | null;
  },
): Promise<void> {
  const existing = await db.subscription.findUnique({
    where: { workspaceId: input.workspaceId },
  });
  if (existing && isStale(existing.lastEventAt, input.eventAt)) return; // out-of-order guard

  await db.subscription.upsert({
    where: { workspaceId: input.workspaceId },
    create: {
      workspaceId: input.workspaceId,
      provider: "dodo",
      planId: "free",
      status: input.status,
      dodoSubscriptionId: input.dodoSubscriptionId ?? null,
      lastEventAt: input.eventAt ?? null,
    },
    update: {
      planId: "free",
      status: input.status,
      cancelAtPeriodEnd: false,
      lastEventAt: input.eventAt ?? undefined,
    },
  });
  // A store paying through Shopify can still keep the workspace on a paid plan.
  if (await getShopifyPaidPlan(db, input.workspaceId)) return;
  await db.website.updateMany({
    where: { workspaceId: input.workspaceId, scanFrequency: "DAILY" },
    data: { scanFrequency: "WEEKLY" },
  });
}

export async function findWorkspaceByDodoSubscription(
  db: Db,
  dodoSubscriptionId: string,
): Promise<string | null> {
  const sub = await db.subscription.findUnique({
    where: { dodoSubscriptionId },
    select: { workspaceId: true },
  });
  return sub?.workspaceId ?? null;
}

/* ---------- Website capacity add-ons (Phase 8.1) ---------- */

export interface WebsiteAddonInput {
  workspaceId: string;
  dodoSubscriptionId: string;
  dodoCustomerId?: string | null;
  status: string;
  websitesGranted?: number;
  currentPeriodEnd?: Date | null;
  cancelAtPeriodEnd?: boolean;
  /** Logical event time - used to reject stale, out-of-order events. */
  eventAt?: Date | null;
}

/**
 * Activate/refresh a website add-on from a verified active/renewed/paid
 * webhook. Keyed by its own Dodo subscription id, so a workspace can hold
 * several. The workspace binding is set once at creation and never rewritten
 * on update (an add-on can't be moved to another workspace).
 */
export async function applyWebsiteAddon(db: Db, input: WebsiteAddonInput): Promise<void> {
  const existing = await db.websiteAddon.findUnique({
    where: { dodoSubscriptionId: input.dodoSubscriptionId },
  });
  if (existing && isStale(existing.lastEventAt, input.eventAt)) return; // out-of-order guard

  await db.websiteAddon.upsert({
    where: { dodoSubscriptionId: input.dodoSubscriptionId },
    create: {
      workspaceId: input.workspaceId,
      dodoSubscriptionId: input.dodoSubscriptionId,
      dodoCustomerId: input.dodoCustomerId ?? null,
      status: input.status,
      // Each $6/mo add-on unit grants one extra website (mirrors
      // WEBSITE_ADDON.websitesPerUnit in the web app's plans config).
      websitesGranted: input.websitesGranted ?? 1,
      currentPeriodEnd: input.currentPeriodEnd ?? null,
      cancelAtPeriodEnd: input.cancelAtPeriodEnd ?? false,
      lastEventAt: input.eventAt ?? null,
    },
    // Never rewrite workspaceId here - the add-on stays bound to its buyer.
    update: {
      status: input.status,
      dodoCustomerId: input.dodoCustomerId ?? undefined,
      websitesGranted: input.websitesGranted ?? undefined,
      currentPeriodEnd: input.currentPeriodEnd ?? undefined,
      cancelAtPeriodEnd: input.cancelAtPeriodEnd ?? false,
      lastEventAt: input.eventAt ?? undefined,
    },
  });
}

/** Deactivate a website add-on (cancelled/expired/failed/on_hold). */
export async function revokeWebsiteAddon(
  db: Db,
  input: { dodoSubscriptionId: string; status: string; eventAt?: Date | null },
): Promise<void> {
  const existing = await db.websiteAddon.findUnique({
    where: { dodoSubscriptionId: input.dodoSubscriptionId },
  });
  if (!existing) return; // nothing to revoke
  if (isStale(existing.lastEventAt, input.eventAt)) return; // out-of-order guard
  await db.websiteAddon.update({
    where: { dodoSubscriptionId: input.dodoSubscriptionId },
    data: {
      status: input.status,
      cancelAtPeriodEnd: false,
      lastEventAt: input.eventAt ?? undefined,
    },
  });
}

export async function findWorkspaceByAddonSubscription(
  db: Db,
  dodoSubscriptionId: string,
): Promise<string | null> {
  const addon = await db.websiteAddon.findUnique({
    where: { dodoSubscriptionId },
    select: { workspaceId: true },
  });
  return addon?.workspaceId ?? null;
}

export interface ActiveWebsiteAddon {
  dodoSubscriptionId: string;
  websitesGranted: number;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
}

/** Active add-ons for a workspace (for billing display). */
export async function listActiveWebsiteAddons(
  db: Db,
  workspaceId: string,
): Promise<ActiveWebsiteAddon[]> {
  const rows = await db.websiteAddon.findMany({
    where: { workspaceId, status: { in: [...ACTIVE_STATUSES] } },
    select: {
      dodoSubscriptionId: true,
      websitesGranted: true,
      currentPeriodEnd: true,
      cancelAtPeriodEnd: true,
    },
    orderBy: { createdAt: "asc" },
  });
  return rows;
}

/** Total extra websites granted by a workspace's active add-ons. */
export async function getWorkspaceAddonWebsites(
  db: Db,
  workspaceId: string,
): Promise<number> {
  const rows = await db.websiteAddon.findMany({
    where: { workspaceId, status: { in: [...ACTIVE_STATUSES] } },
    select: { websitesGranted: true },
  });
  return rows.reduce((sum, r) => sum + r.websitesGranted, 0);
}

/* ---------- Checkout intents (unforgeable attribution) ---------- */

/** Create a checkout intent and return its unguessable token. */
export async function createCheckoutIntent(
  db: Db,
  params: {
    token: string;
    workspaceId: string;
    userId: string;
    /** The plan being bought: "pro" | "agency". Defaults to "pro". */
    kind?: string;
    ttlMinutes?: number;
  },
): Promise<void> {
  const ttl = params.ttlMinutes ?? 60;
  await db.checkoutIntent.create({
    data: {
      token: params.token,
      workspaceId: params.workspaceId,
      userId: params.userId,
      kind: params.kind ?? "pro",
      expiresAt: new Date(Date.now() + ttl * 60_000),
    },
  });
}

export interface ConsumedIntent {
  workspaceId: string;
  /** What was purchased: "pro" | "agency" (legacy rows: "website_addon"). */
  kind: string;
}

/**
 * Resolve + consume a checkout token → { workspace, kind }. Returns null when
 * the token is unknown, expired, or already consumed. Marks it consumed so a
 * token can attribute at most one workspace binding. `kind` is server-issued
 * (never client-editable), so the webhook trusts it to route the payment to
 * the base-plan vs add-on handler.
 */
export async function consumeCheckoutIntent(
  db: Db,
  token: string,
  now: Date = new Date(),
): Promise<ConsumedIntent | null> {
  const intent = await db.checkoutIntent.findUnique({ where: { token } });
  if (!intent || intent.consumedAt || intent.expiresAt < now) return null;
  await db.checkoutIntent.update({
    where: { token },
    data: { consumedAt: now },
  });
  return { workspaceId: intent.workspaceId, kind: intent.kind };
}

/* ---------- Shopify App Pricing ---------- */

export interface ShopifyBillingSnapshot {
  plan: PaidPlanId | null;
  handle: string | null;
  periodEnd: Date | null;
  cancelAtEnd: boolean;
}

/**
 * Store what the Partner API says a Shopify store pays for. When that takes
 * the workspace it is linked to down to Free, daily scans go back to weekly,
 * exactly as when a MyKavo subscription ends.
 */
export async function applyShopifyBilling(
  db: Db,
  shopifyShopId: string,
  snapshot: ShopifyBillingSnapshot,
  checkedAt: Date = new Date(),
): Promise<{ changed: boolean; workspaceId: string | null }> {
  const before = await db.shopifyShop.findUnique({
    where: { id: shopifyShopId },
    select: { billingPlan: true, siteConnection: { select: { workspaceId: true, revokedAt: true } } },
  });
  if (!before) return { changed: false, workspaceId: null };
  await db.shopifyShop.update({
    where: { id: shopifyShopId },
    data: {
      billingPlan: snapshot.plan,
      billingPlanHandle: snapshot.handle,
      billingPeriodEnd: snapshot.periodEnd,
      billingCancelAtEnd: snapshot.cancelAtEnd,
      billingCheckedAt: checkedAt,
    },
  });
  const link = before.siteConnection && !before.siteConnection.revokedAt ? before.siteConnection : null;
  const changed = (before.billingPlan ?? null) !== snapshot.plan;
  if (changed && link && toPaidPlanId(before.billingPlan ?? "") && !snapshot.plan) {
    await resetDailyScansIfFree(db, link.workspaceId);
  }
  return { changed, workspaceId: link?.workspaceId ?? null };
}

/** After a store stops paying (or uninstalls): weekly scans again, if nothing else pays. */
export async function resetDailyScansIfFree(db: Db, workspaceId: string): Promise<void> {
  const entitlement = await getWorkspaceEntitlement(db, workspaceId);
  if ((entitlement?.planId ?? "free") !== "free") return;
  await db.website.updateMany({
    where: { workspaceId, scanFrequency: "DAILY" },
    data: { scanFrequency: "WEEKLY" },
  });
}
