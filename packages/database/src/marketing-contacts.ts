/**
 * MyKavo accounts as email-marketing contacts, for the Brevo sync. Read
 * here once, used by both the worker (hourly and daily syncs) and the web
 * app ("Sync now" in Admin > Email marketing), so the two never disagree
 * about who is in which list.
 */

import type { Prisma, PrismaClient } from "@prisma/client";
import { isMissingTableError } from "./automations";
import { getWorkspaceEntitlement } from "./subscription";

type Db = PrismaClient | Prisma.TransactionClient;

export interface MarketingContact {
  email: string;
  userId: string;
  firstName: string;
  lastName: string;
  plan: string;
  paid: boolean;
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
 * signed up, added a website or unsubscribed since then.
 */
export async function loadMarketingContacts(db: Db, since: Date | null): Promise<MarketingContact[]> {
  const optOuts = await db.emailOptOut.findMany({ select: { email: true, createdAt: true } });
  const optedOut = new Set(optOuts.map((o) => o.email.toLowerCase()));
  const recentlyOptedOut = since ? optOuts.filter((o) => o.createdAt >= since).map((o) => o.email) : [];

  const users = await db.user.findMany({
    where: {
      ownedWorkspaces: { some: {} },
      ...(since
        ? {
            OR: [
              { createdAt: { gte: since } },
              { ownedWorkspaces: { some: { websites: { some: { createdAt: { gte: since } } } } } },
              ...(recentlyOptedOut.length ? [{ email: { in: recentlyOptedOut, mode: "insensitive" as const } }] : []),
            ],
          }
        : {}),
    },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      ownedWorkspaces: { select: { id: true, _count: { select: { websites: true } } }, orderBy: { createdAt: "asc" }, take: 1 },
    },
  });

  const out: MarketingContact[] = [];
  for (const u of users) {
    const ws = u.ownedWorkspaces[0];
    if (!ws || !u.email) continue;
    const email = u.email.trim().toLowerCase();
    const plan = (await getWorkspaceEntitlement(db, ws.id))?.planId ?? "free";
    out.push({
      email,
      userId: u.id,
      ...marketingName(u.name),
      plan,
      paid: plan !== "free",
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
  const res = await db.emailOptOut.createMany({ data: emails.map((email) => ({ email, source })), skipDuplicates: true });
  return res.count;
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
