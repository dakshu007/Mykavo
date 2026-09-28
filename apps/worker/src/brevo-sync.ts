/**
 * Brevo contact sync: MyKavo accounts into Brevo's "MyKavo" lists, and
 * Brevo unsubscribes back into email_opt_out. The Brevo side lives in
 * @mykavo/email brevo-sync.ts; this file reads MyKavo's database and runs it.
 *
 *   incremental - every hourly sweep: accounts created, given a first
 *                 website or unsubscribed in the last few hours, and
 *                 unsubscribes Brevo recorded in that window.
 *   full        - once a day, and whenever an admin presses "Sync now":
 *                 every account (plans change, sites get added) and every
 *                 Brevo unsubscribe, and deleted accounts leave the lists.
 *
 * Does nothing until Brevo is configured (BREVO_API_KEY, BREVO_SENDER_EMAIL).
 * Each run is logged in brevo_sync_run when that table exists.
 */

import { getWorkspaceEntitlement, isMissingTableError, prisma } from "@mykavo/database";
import {
  blocklistedContacts,
  brevoConfigured,
  ensureAttributes,
  ensureAudiences,
  pruneContacts,
  pushContacts,
  type SyncContact,
} from "@mykavo/email";
import { displayPersonName } from "@mykavo/shared";
import { logger } from "./logger";

const HOUR_MS = 60 * 60 * 1000;
/** Incremental window - wider than the hourly cadence, so a missed sweep is covered. */
const WINDOW_MS = 3 * HOUR_MS;

async function startLog(kind: string, requestedByEmail?: string): Promise<string | null> {
  try {
    const row = await prisma.brevoSyncRun.create({ data: { kind, requestedByEmail: requestedByEmail ?? null }, select: { id: true } });
    return row.id;
  } catch (err) {
    if (isMissingTableError(err)) return null;
    throw err;
  }
}

async function finishLog(id: string | null, data: { status: "OK" | "FAILED"; contacts?: number; blocklisted?: number; removed?: number; pulledUnsubscribes?: number; error?: string }) {
  if (!id) return;
  await prisma.brevoSyncRun.update({ where: { id }, data: { ...data, finishedAt: new Date() } }).catch(() => {});
}

function splitName(display: string): { firstName: string; lastName: string } {
  const parts = display.trim().split(/\s+/);
  return { firstName: parts[0] ?? "", lastName: parts.slice(1).join(" ") };
}

async function loadContacts(since: Date | null): Promise<{ contacts: SyncContact[]; allEmails: Set<string> | null }> {
  const optOuts = await prisma.emailOptOut.findMany({ select: { email: true, createdAt: true } });
  const optedOut = new Set(optOuts.map((o) => o.email.toLowerCase()));
  const recentlyOptedOut = since ? optOuts.filter((o) => o.createdAt >= since).map((o) => o.email) : [];

  const users = await prisma.user.findMany({
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

  const contacts: SyncContact[] = [];
  for (const u of users) {
    const ws = u.ownedWorkspaces[0];
    if (!ws || !u.email) continue;
    const email = u.email.trim().toLowerCase();
    const entitlement = await getWorkspaceEntitlement(prisma, ws.id);
    const plan = entitlement?.planId ?? "free";
    contacts.push({
      email,
      userId: u.id,
      ...splitName(displayPersonName(u.name, u.email)),
      plan,
      paid: plan !== "free",
      websites: ws._count.websites,
      signedUpAt: u.createdAt,
      optedOut: optedOut.has(email),
    });
  }
  return { contacts, allEmails: since ? null : new Set(contacts.map((c) => c.email)) };
}

export async function runBrevoSync(kind: "full" | "incremental", requestedByEmail?: string): Promise<void> {
  if (!brevoConfigured()) return;
  const logId = await startLog(kind, requestedByEmail);
  try {
    await ensureAttributes();
    const audiences = await ensureAudiences();
    const since = kind === "incremental" ? new Date(Date.now() - WINDOW_MS) : null;

    // Unsubscribes first: someone who opted out in a campaign must not be
    // pushed back as subscribed a moment later.
    const pulled = await blocklistedContacts(audiences.all.id, since ?? undefined);
    let newOptOuts = 0;
    if (pulled.length) {
      const res = await prisma.emailOptOut.createMany({
        data: pulled.map((email) => ({ email, source: "brevo" })),
        skipDuplicates: true,
      });
      newOptOuts = res.count;
    }

    const { contacts, allEmails } = await loadContacts(since);
    const pushed = await pushContacts(contacts, audiences);
    const removed = allEmails ? await pruneContacts(audiences, allEmails) : 0;

    await finishLog(logId, { status: "OK", contacts: pushed.contacts, blocklisted: pushed.blocklisted, removed, pulledUnsubscribes: newOptOuts });
    logger.info("brevo sync finished", { kind, ...pushed, removed, pulledUnsubscribes: newOptOuts });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await finishLog(logId, { status: "FAILED", error: message.slice(0, 500) });
    logger.error("brevo sync failed", { kind, error: message });
    throw err;
  }
}

/**
 * The daily full sync, decided inside the hourly sweep: once the last full
 * run is 20 hours old. Without the log table, every 24th sweep or so is
 * approximated by the UTC hour.
 */
export async function fullSyncDue(): Promise<boolean> {
  try {
    const last = await prisma.brevoSyncRun.findFirst({ where: { kind: "full", status: "OK" }, orderBy: { startedAt: "desc" }, select: { startedAt: true } });
    return !last || Date.now() - last.startedAt.getTime() > 20 * HOUR_MS;
  } catch (err) {
    if (isMissingTableError(err)) return new Date().getUTCHours() === 3;
    throw err;
  }
}
