/**
 * Subscription persistence (Phase 8 — Dodo Payments). DB-level mutations
 * shared by the webhook handler and billing APIs. Entitlement mapping to
 * plan features lives in the web app; this module is pure persistence.
 *
 * All mutations accept a Prisma client OR an interactive transaction client
 * (`Tx`) so the webhook can apply the dedupe record + the entitlement change
 * atomically (security review: durability gap).
 */

import type { PrismaClient, Prisma } from "@prisma/client";

type Db = PrismaClient | Prisma.TransactionClient;

/** Dodo statuses that grant paid access. */
const ACTIVE_STATUSES = new Set(["active"]);

export interface Entitlement {
  planId: "free" | "pro";
  status: string;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: Date | null;
  dodoCustomerId: string | null;
  dodoSubscriptionId: string | null;
}

export async function getWorkspaceEntitlement(
  db: Db,
  workspaceId: string,
): Promise<Entitlement | null> {
  const sub = await db.subscription.findUnique({ where: { workspaceId } });
  if (!sub) return null;
  const grantsPro = sub.planId === "pro" && ACTIVE_STATUSES.has(sub.status);
  return {
    planId: grantsPro ? "pro" : "free",
    status: sub.status,
    cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
    currentPeriodEnd: sub.currentPeriodEnd,
    dodoCustomerId: sub.dodoCustomerId,
    dodoSubscriptionId: sub.dodoSubscriptionId,
  };
}

export interface UpgradeInput {
  workspaceId: string;
  status: string;
  dodoCustomerId?: string | null;
  dodoSubscriptionId?: string | null;
  currentPeriodEnd?: Date | null;
  cancelAtPeriodEnd?: boolean;
  /** Logical event time — used to reject stale, out-of-order events. */
  eventAt?: Date | null;
}

/** True when the incoming event is older than the last one applied. */
function isStale(existingLastEventAt: Date | null, eventAt?: Date | null): boolean {
  return !!eventAt && !!existingLastEventAt && eventAt < existingLastEventAt;
}

/** Grant Pro (from a verified active/renewed/paid webhook). */
export async function upgradeWorkspaceToPro(db: Db, input: UpgradeInput): Promise<void> {
  const existing = await db.subscription.findUnique({
    where: { workspaceId: input.workspaceId },
  });
  if (existing && isStale(existing.lastEventAt, input.eventAt)) return; // out-of-order guard

  const data = {
    planId: "pro",
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
      planId: "pro",
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
  /** Logical event time — used to reject stale, out-of-order events. */
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
    // Never rewrite workspaceId here — the add-on stays bound to its buyer.
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
    /** "pro" (base plan) | "website_addon". Defaults to "pro". */
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
  /** What was purchased: "pro" | "website_addon". */
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
