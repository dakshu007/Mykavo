/**
 * MyKavo accounts as email-marketing contacts, for the Brevo sync. Read
 * here once, used by both the worker (hourly and daily syncs) and the web
 * app ("Sync now" in Admin > Email marketing), so the two never disagree
 * about who is in which list.
 */

import type { Prisma, PrismaClient } from "@prisma/client";
import { isMissingTableError } from "./automations";
import { isInternalEmail } from "./platform-admin";
import { higherPlan, planIdFromSubscription, type PaidPlanId } from "./subscription";

type Db = PrismaClient | Prisma.TransactionClient;

export interface MarketingContact {
  email: string;
  userId: string;
  firstName: string;
  lastName: string;
  plan: string;
  paid: boolean;
  /** On a free Pro trial (nothing paid): in neither the Free nor the Paid list. */
  trial: boolean;
  websites: number;
  signedUpAt: Date;
  optedOut: boolean;
}

/** First and last name from what was stored at signup; nothing when it is empty or just an address. */
export function marketingName(name: string | null): { firstName: string; lastName: string } {
  const clean = (name ?? "").trim();
  if (!clean || clean.includes("@")) return { firstName: "", lastName: "" };
  const parts = clean.split(/\s+/);
  return { firstName: parts[0].slice(0, 60), lastName: parts.slice(1).join(" ").slice(0, 80) };
}

/**
 * Account holders as contacts: all of them, or (with `since`) only those who
 * signed up, added a website, unsubscribed, or started or ended a Pro trial
 * since then.
 */
export async function loadMarketingContacts(db: Db, since: Date | null): Promise<MarketingContact[]> {
  // Before the email_opt_out migration nobody can have unsubscribed through
  // MyKavo (there was nowhere to record it), so a missing table means none.
  const optOuts = await db.emailOptOut.findMany({ select: { email: true, createdAt: true } }).catch((err: unknown) => {
    if (isMissingTableError(err)) return [];
    throw err;
  });
  const optedOut = new Set(optOuts.map((o) => o.email.toLowerCase()));
  const recentlyOptedOut = since ? optOuts.filter((o) => o.createdAt >= since).map((o) => o.email) : [];

  // Workspaces on a running Pro trial. They pay nothing but are not on Free
  // either, so they must not get Free-plan campaigns. The trial only counts
  // when nothing is paid (getWorkspaceEntitlement), checked per contact
  // below. A trial starting or ending moves an account between lists with
  // nothing else changing, so those count as changed too. A missing table
  // means no trials yet. Only trials ending at or after `since` (now, on a
  // full sync) can be running or have changed: one that started since then
  // also ends after it.
  const now = new Date();
  const trials = await db.workspaceTrial
    .findMany({ where: { endsAt: { gte: since ?? now } }, select: { workspaceId: true, startedAt: true, endsAt: true } })
    .catch((err: unknown) => {
      if (isMissingTableError(err)) return [];
      throw err;
    });
  const trialing = new Set(trials.filter((t) => t.endsAt > now).map((t) => t.workspaceId));
  const trialChanged = since
    ? trials.filter((t) => t.startedAt >= since || (t.endsAt >= since && t.endsAt <= now)).map((t) => t.workspaceId)
    : [];

  const users = await db.user.findMany({
    where: {
      ownedWorkspaces: { some: {} },
      ...(since
        ? {
            OR: [
              { createdAt: { gte: since } },
              { ownedWorkspaces: { some: { websites: { some: { createdAt: { gte: since } } } } } },
              ...(recentlyOptedOut.length ? [{ email: { in: recentlyOptedOut, mode: "insensitive" as const } }] : []),
              ...(trialChanged.length ? [{ ownedWorkspaces: { some: { id: { in: trialChanged } } } }] : []),
            ],
          }
        : {}),
    },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      // Plan and website count come with the user in this one query: the
      // admin's "Sync now" runs inside a short-lived web request, and a
      // query per account would not finish in time.
      ownedWorkspaces: {
        select: { id: true, subscription: { select: { planId: true, status: true } }, _count: { select: { websites: true } } },
        orderBy: { createdAt: "asc" },
        take: 1,
      },
    },
  });

  // Plans paid through a linked Shopify store, read once for everyone. Same
  // rule as getWorkspaceEntitlement: the store only counts while the app is
  // installed and its link to the workspace is live, and the higher plan wins.
  const shopifyPlans = new Map<string, PaidPlanId>();
  const shops = await db.shopifyShop.findMany({
    where: { billingPlan: { in: ["pro", "agency"] }, uninstalledAt: null, siteConnection: { is: { revokedAt: null } } },
    select: { billingPlan: true, siteConnection: { select: { workspaceId: true } } },
  });
  for (const shop of shops) {
    const planId = shop.billingPlan;
    const workspaceId = shop.siteConnection?.workspaceId;
    if (!workspaceId || (planId !== "pro" && planId !== "agency")) continue;
    const prev = shopifyPlans.get(workspaceId);
    if (!prev || higherPlan(prev, planId) === planId) shopifyPlans.set(workspaceId, planId);
  }

  const out: MarketingContact[] = [];
  for (const u of users) {
    const ws = u.ownedWorkspaces[0];
    if (!ws || !u.email) continue;
    const email = u.email.trim().toLowerCase();
    // The team's own accounts are not an audience. Leaving them out here also
    // makes the full sync's prune take them OUT of the lists.
    if (isInternalEmail(email)) continue;
    const plan = higherPlan(planIdFromSubscription(ws.subscription), shopifyPlans.get(ws.id) ?? "free");
    const trial = plan === "free" && trialing.has(ws.id);
    out.push({
      email,
      userId: u.id,
      ...marketingName(u.name),
      plan: trial ? "pro_trial" : plan,
      paid: plan !== "free",
      trial,
      websites: ws._count.websites,
      signedUpAt: u.createdAt,
      optedOut: optedOut.has(email),
    });
  }
  return out;
}

/** Record addresses Brevo unsubscribed. Returns how many were new. */
export async function saveMarketingOptOuts(db: Db, emails: string[], source: string): Promise<number> {
  if (!emails.length) return 0;
  try {
    const res = await db.emailOptOut.createMany({ data: emails.map((email) => ({ email, source })), skipDuplicates: true });
    return res.count;
  } catch (err) {
    // No table yet: those addresses stay blocklisted in Brevo, and the first
    // full sync after the migration pulls them all again.
    if (isMissingTableError(err)) return 0;
    throw err;
  }
}

/** Start a brevo_sync_run row; null when the table does not exist yet. */
export async function startBrevoSyncLog(db: Db, kind: string, requestedByEmail?: string): Promise<string | null> {
  try {
    return (await db.brevoSyncRun.create({ data: { kind, requestedByEmail: requestedByEmail ?? null }, select: { id: true } })).id;
  } catch (err) {
    if (isMissingTableError(err)) return null;
    throw err;
  }
}

export async function finishBrevoSyncLog(
  db: Db,
  id: string | null,
  data: { status: "OK" | "FAILED"; contacts?: number; blocklisted?: number; removed?: number; pulledUnsubscribes?: number; error?: string },
): Promise<void> {
  if (!id) return;
  await db.brevoSyncRun.update({ where: { id }, data: { ...data, finishedAt: new Date() } }).catch(() => {});
}
