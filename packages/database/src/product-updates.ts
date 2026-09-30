import type { PrismaClient } from "@prisma/client";
import { isMissingTableError } from "./automations";

/**
 * Rows for the "update available" emails, shared by the worker (which sends
 * them) and the admin page (which shows who would get one). Version logic
 * lives in @mykavo/shared (product-updates.ts); this only reads the database.
 */

type Db = PrismaClient;

export interface PluginInstallRow {
  userId: string;
  email: string;
  name: string;
  workspaceId: string;
  siteUrl: string;
  siteName: string | null;
  pluginVersion: string | null;
}

/**
 * Every connected WordPress site, with the person to tell: whoever approved
 * the connection, or the workspace owner when that is unknown.
 */
export async function loadPluginInstalls(db: Db): Promise<PluginInstallRow[]> {
  const rows = await db.siteConnection.findMany({
    where: { platform: "wordpress", connectedAt: { not: null }, revokedAt: null },
    select: {
      workspaceId: true,
      siteUrl: true,
      siteName: true,
      pluginVersion: true,
      createdByUser: { select: { id: true, email: true, name: true } },
      workspace: { select: { owner: { select: { id: true, email: true, name: true } } } },
    },
  });
  return rows.map((r) => {
    const person = r.createdByUser ?? r.workspace.owner;
    return {
      userId: person.id,
      email: person.email,
      name: person.name,
      workspaceId: r.workspaceId,
      siteUrl: r.siteUrl,
      siteName: r.siteName,
      pluginVersion: r.pluginVersion,
    };
  });
}

export interface AppUserRow {
  userId: string;
  email: string;
  name: string;
  workspaceId: string;
  /** Last version the app reported (1.0.2 and later say), or null. */
  version: string | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * People who use the Android app: an Android push device, an app sign-in, or
 * Android activity in the last 90 days - with the version it last reported.
 */
export async function loadAndroidAppUsers(db: Db): Promise<AppUserRow[]> {
  const since = new Date(Date.now() - 90 * DAY_MS);
  const [devices, sessions, days] = await Promise.all([
    db.pushDevice.findMany({ where: { platform: "android" }, select: { userId: true } }),
    db.session.findMany({ where: { userAgent: { startsWith: "okhttp/" } }, select: { userId: true } }),
    db.userActivityDay
      .findMany({ where: { channel: "android", day: { gte: since } }, select: { userId: true } })
      .catch((err: unknown) => {
        if (isMissingTableError(err)) return [];
        throw err;
      }),
  ]);
  const ids = [...new Set([...devices, ...sessions, ...days].map((r) => r.userId))];
  if (ids.length === 0) return [];

  const [users, events] = await Promise.all([
    db.user.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        email: true,
        name: true,
        memberships: { select: { workspaceId: true, role: true }, orderBy: { createdAt: "asc" } },
      },
    }),
    db.activityEvent
      .findMany({
        where: { userId: { in: ids }, channel: "android", createdAt: { gte: since } },
        select: { userId: true, meta: true },
        orderBy: { createdAt: "desc" },
        take: 5000,
      })
      .catch((err: unknown) => {
        if (isMissingTableError(err)) return [];
        throw err;
      }),
  ]);
  const version = new Map<string, string>();
  for (const e of events) {
    const v = (e.meta as { version?: unknown } | null)?.version;
    if (typeof v === "string" && v && !version.has(e.userId)) version.set(e.userId, v);
  }
  return users.flatMap((u) => {
    const ws = u.memberships.find((m) => m.role === "OWNER") ?? u.memberships[0];
    return ws ? [{ userId: u.id, email: u.email, name: u.name, workspaceId: ws.workspaceId, version: version.get(u.id) ?? null }] : [];
  });
}

export interface UpdateNoticeState {
  /** People already told about this version. */
  notified: Set<string>;
  /** People told about any update recently. */
  recentlyNotified: Set<string>;
  optedOut: Set<string>;
}

export async function loadUpdateNoticeState(db: Db, product: string, version: string, spacingMs: number): Promise<UpdateNoticeState> {
  const [forVersion, recent, optOuts] = await Promise.all([
    db.productUpdateNotice.findMany({ where: { product, version }, select: { userId: true } }),
    db.productUpdateNotice.findMany({ where: { createdAt: { gte: new Date(Date.now() - spacingMs) } }, select: { userId: true } }),
    db.emailOptOut.findMany({ select: { email: true } }).catch((err: unknown) => {
      if (isMissingTableError(err)) return [];
      throw err;
    }),
  ]);
  return {
    notified: new Set(forVersion.map((n) => n.userId)),
    recentlyNotified: new Set(recent.map((n) => n.userId)),
    optedOut: new Set(optOuts.map((o) => o.email.trim().toLowerCase())),
  };
}
