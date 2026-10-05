import { isInternalEmail, isMissingTableError, prisma } from "@mykavo/database";
import { describeUserAgent, lastDays, utcDay, CHANNELS, type Channel } from "@/lib/activity/core";
import { logger } from "@/lib/logger";
import {
  buildExtensionFunnel,
  buildTrackingRows,
  groupVisits,
  hostOf,
  summarizeRows,
  topPages,
  type ExtensionFunnel,
  type RawActivityDay,
  type RawEvent,
  type RawExtensionInstall,
  type TimelineItem,
  type TrackingInput,
  type TrackingKpis,
  type TrackingRow,
} from "./tracking-core";

/**
 * Admin tracking - loading. Operator-only callers (the Tracking pages check
 * isPlatformAdmin before calling). Tables added by the user_activity
 * migration are read tolerantly: before it runs, the pages still show
 * everything the older tables know.
 */

const DAY_MS = 86_400_000;

function tolerant<T>(what: string, fallback: T) {
  return (err: unknown): T => {
    if (!isMissingTableError(err)) logger.error(`tracking: could not load ${what}`, {}, err);
    return fallback;
  };
}

type Scope = { userIds?: string[] };

async function loadInput(scope: Scope = {}): Promise<TrackingInput> {
  const userWhere = scope.userIds ? { id: { in: scope.userIds } } : {};
  const users = await prisma.user.findMany({
    where: userWhere,
    select: { id: true, name: true, email: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  const ids = users.map((u) => u.id);
  const emails = users.map((u) => u.email.toLowerCase());
  const since = new Date(Date.now() - 60 * DAY_MS);

  const memberships = await prisma.workspaceMember.findMany({
    where: { userId: { in: ids } },
    select: { workspaceId: true },
  });
  const wsIds = [...new Set(memberships.map((m) => m.workspaceId))];

  const [workspaces, sessions, pushDevices, appRequests, connections, apiKeys, activityDays, events] = await Promise.all([
    prisma.workspace.findMany({
      where: { id: { in: wsIds } },
      select: {
        id: true,
        name: true,
        ownerId: true,
        members: { select: { userId: true } },
        subscription: { select: { planId: true, status: true } },
        websites: { select: { id: true, name: true, url: true, createdAt: true, lastScanAt: true } },
      },
    }),
    prisma.session.findMany({
      where: { userId: { in: ids } },
      select: { userId: true, userAgent: true, createdAt: true, updatedAt: true },
    }),
    prisma.pushDevice.findMany({
      where: { userId: { in: ids } },
      select: { userId: true, platform: true, deviceName: true, enabled: true, createdAt: true, lastSeenAt: true },
    }),
    prisma.appAccessRequest.findMany({
      where: { email: { in: emails } },
      select: { email: true, status: true, requestedAt: true, decidedAt: true, firstDownloadAt: true, downloadCount: true },
    }),
    prisma.siteConnection.findMany({
      where: { workspaceId: { in: wsIds } },
      select: {
        workspaceId: true,
        createdByUserId: true,
        platform: true,
        siteUrl: true,
        siteName: true,
        createdAt: true,
        connectedAt: true,
        lastUsedAt: true,
        pluginVersion: true,
        revokedAt: true,
      },
    }),
    prisma.apiKey
      .findMany({
        where: { workspaceId: { in: wsIds } },
        select: { workspaceId: true, createdByUserId: true, name: true, createdAt: true, lastUsedAt: true, revokedAt: true },
      })
      .catch(tolerant("api keys", [])),
    prisma.userActivityDay
      .findMany({
        where: { userId: { in: ids }, day: { gte: since } },
        select: { userId: true, day: true, channel: true, pings: true, lastAt: true },
      })
      .catch(tolerant<RawActivityDay[]>("activity days", [])),
    prisma.activityEvent
      .findMany({
        where: {
          userId: { in: ids },
          type: { in: ["wordpress_connect_started", "extension_connect_started", "app_open", "screen_view"] },
          createdAt: { gte: new Date(Date.now() - 180 * DAY_MS) },
        },
        select: { userId: true, channel: true, type: true, path: true, label: true, meta: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 5000,
      })
      .catch(tolerant<RawEvent[]>("activity events", [])),
  ]);

  return {
    users,
    workspaces: workspaces.map((w) => ({
      id: w.id,
      name: w.name,
      ownerId: w.ownerId,
      memberIds: w.members.map((m) => m.userId),
      planId: w.subscription?.planId ?? "free",
      subscriptionStatus: w.subscription?.status ?? null,
      websites: w.websites,
    })),
    sessions,
    pushDevices,
    appRequests,
    connections,
    apiKeys,
    activityDays,
    events,
    isInternal: (email) => isInternalEmail(email),
  };
}

export interface TrackingOverview {
  rows: TrackingRow[];
  kpis: TrackingKpis;
  /** Active users per day, last 30 days, by channel (external users only). */
  daily: Array<{ day: string } & Record<Channel, number>>;
  /** Whether the user_activity tables exist yet. */
  recording: boolean;
  /** Chrome extension installs through to paid; null before its migration. */
  extension: ExtensionFunnel | null;
}

export async function loadTrackingOverview(includeInternal: boolean): Promise<TrackingOverview> {
  const input = await loadInput();
  const all = buildTrackingRows(input);
  const rows = includeInternal ? all : all.filter((r) => !r.internal);
  const counted = new Set(rows.map((r) => r.id));
  const days = lastDays(30);
  const daily = days.map((day) => {
    const entry = { day } as { day: string } & Record<Channel, number>;
    for (const ch of CHANNELS) {
      entry[ch] = new Set(
        input.activityDays.filter((d) => d.channel === ch && utcDay(d.day) === day && counted.has(d.userId)).map((d) => d.userId),
      ).size;
    }
    return entry;
  });
  const [recording, installs] = await Promise.all([
    prisma.userActivityDay
      .count({ take: 1 })
      .then(() => true)
      .catch(() => false),
    prisma.extensionInstall
      .findMany({
        select: {
          opens: true,
          pageChecks: true,
          monitorClicks: true,
          dashboardOpens: true,
          connectStartedAt: true,
          signedUpAt: true,
          connectedAt: true,
          userId: true,
        },
      })
      .catch(tolerant<RawExtensionInstall[] | null>("extension installs", null)),
  ]);
  const internalIds = new Set(all.filter((r) => r.internal).map((r) => r.id));
  const returned = new Set(
    input.connections
      .filter(
        (c) =>
          c.platform === "chrome" &&
          c.createdByUserId &&
          c.connectedAt &&
          c.lastUsedAt &&
          +c.lastUsedAt - +c.connectedAt >= DAY_MS,
      )
      .map((c) => c.createdByUserId as string),
  );
  const extension = installs
    ? buildExtensionFunnel(
        includeInternal ? installs : installs.filter((i) => !i.userId || !internalIds.has(i.userId)),
        returned,
        new Set(all.filter((r) => r.paid).map((r) => r.id)),
      )
    : null;
  return { rows, kpis: summarizeRows(rows), daily, recording, extension };
}

export interface UserTracking {
  row: TrackingRow;
  workspaces: Array<{ id: string; name: string; role: string; plan: string }>;
  websites: Array<{ id: string; name: string; url: string; createdAt: string; lastScanAt: string | null }>;
  /** Last 30 days x channel: pings per day (0 = not active). */
  heat: Array<{ channel: Channel; days: Array<{ day: string; pings: number }> }>;
  timeline: TimelineItem[];
  pages: ReturnType<typeof topPages>;
  devices: Array<{ label: string; app: boolean; firstAt: string; lastAt: string; kind: "session" | "push" }>;
}

export async function loadUserTracking(userId: string): Promise<UserTracking | null> {
  const input = await loadInput({ userIds: [userId] });
  const user = input.users[0];
  if (!user) return null;
  const [row] = buildTrackingRows(input);

  const [memberships, events, baselines, gsc] = await Promise.all([
    prisma.workspaceMember.findMany({
      where: { userId },
      select: { role: true, workspace: { select: { id: true, name: true, createdAt: true, subscription: { select: { planId: true, createdAt: true } } } } },
    }),
    prisma.activityEvent
      .findMany({
        where: { userId, createdAt: { gte: new Date(Date.now() - 90 * DAY_MS) } },
        select: { userId: true, channel: true, type: true, path: true, label: true, meta: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 3000,
      })
      .catch(tolerant<RawEvent[]>("user events", [])),
    prisma.scan.findMany({
      where: {
        triggerType: "BASELINE",
        status: { in: ["COMPLETED", "PARTIAL"] },
        website: { workspace: { members: { some: { userId } } } },
      },
      select: { completedAt: true, createdAt: true, website: { select: { id: true, name: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.gscConnection.findMany({
      where: { connectedById: userId },
      select: { createdAt: true, website: { select: { name: true } } },
    }),
  ]);

  const ws = input.workspaces;
  const myConnections = input.connections.filter((c) =>
    c.createdByUserId ? c.createdByUserId === userId : ws.some((w) => w.id === c.workspaceId && w.ownerId === userId),
  );
  const myKeys = input.apiKeys.filter((k) =>
    k.createdByUserId ? k.createdByUserId === userId : ws.some((w) => w.id === k.workspaceId && w.ownerId === userId),
  );
  const appRequest = input.appRequests[0];

  const items: TimelineItem[] = [];
  const add = (at: Date | null | undefined, channel: TimelineItem["channel"], title: string, detail: string | null = null) => {
    if (at) items.push({ at: at.toISOString(), channel, title, detail });
  };
  add(user.createdAt, "account", "Signed up", user.email);
  for (const m of memberships) {
    if (m.role === "OWNER") add(m.workspace.createdAt, "account", "Created workspace", m.workspace.name);
    const sub = m.workspace.subscription;
    if (sub && sub.planId !== "free") add(sub.createdAt, "account", `Subscribed - ${sub.planId}`, m.workspace.name);
  }
  for (const w of ws.flatMap((x) => x.websites)) add(w.createdAt, "web", "Added a website", `${w.name} · ${hostOf(w.url)}`);
  const firstBaseline = new Map<string, (typeof baselines)[number]>();
  for (const b of baselines) if (!firstBaseline.has(b.website.id)) firstBaseline.set(b.website.id, b);
  for (const b of firstBaseline.values()) add(b.completedAt ?? b.createdAt, "web", "Baseline finished - monitoring live", b.website.name);
  for (const g of gsc) add(g.createdAt, "web", "Connected Google Search Console", g.website.name);
  if (appRequest) {
    add(appRequest.requestedAt, "android", "Requested the Android app");
    if (appRequest.status === "APPROVED") add(appRequest.decidedAt, "android", "Android app access approved");
    if (appRequest.status === "DECLINED") add(appRequest.decidedAt, "android", "Android app request declined");
    add(appRequest.firstDownloadAt, "android", "Downloaded the Android app", `${appRequest.downloadCount} download${appRequest.downloadCount === 1 ? "" : "s"} in total`);
  }
  const appSessions = input.sessions.filter((s) => describeUserAgent(s.userAgent).app).sort((a, b) => +a.createdAt - +b.createdAt);
  if (appSessions[0]) add(appSessions[0].createdAt, "android", "Signed in on the Android app");
  for (const d of input.pushDevices) add(d.createdAt, "android", "Turned on push notifications", d.deviceName);
  for (const e of events.filter((x) => x.type === "wordpress_connect_started")) {
    add(e.createdAt, "wordpress", "Pressed Connect in the WordPress plugin", e.label);
  }
  for (const e of events.filter((x) => x.type === "extension_connect_started")) {
    add(e.createdAt, "chrome", "Pressed Protect in the Chrome extension", e.label);
  }
  for (const e of events.filter((x) => x.type === "extension_scan_triggered")) {
    add(e.createdAt, "chrome", "Ran a scan from the Chrome extension", e.label);
  }
  for (const c of myConnections) {
    const ch: Channel = c.platform === "shopify" ? "shopify" : c.platform === "chrome" ? "chrome" : "wordpress";
    const noun = ch === "shopify" ? "Shopify app" : ch === "chrome" ? "Chrome extension" : "WordPress plugin";
    add(c.createdAt, ch, `Approved the ${noun} connection`, hostOf(c.siteUrl));
    add(c.connectedAt, ch, `${noun} connected`, [hostOf(c.siteUrl), c.pluginVersion ? `plugin ${c.pluginVersion}` : null].filter(Boolean).join(" · "));
    add(c.revokedAt, ch, `${noun} disconnected`, hostOf(c.siteUrl));
  }
  for (const k of myKeys) {
    add(k.createdAt, "mcp", "Created an AI assistant key", k.name);
    add(k.revokedAt, "mcp", "Revoked an AI assistant key", k.name);
  }
  items.push(...groupVisits(events));
  items.sort((a, b) => (a.at < b.at ? 1 : -1));

  const days = lastDays(30);
  const heat = CHANNELS.map((channel) => ({
    channel,
    days: days.map((day) => ({
      day,
      pings: input.activityDays.find((d) => d.channel === channel && utcDay(d.day) === day)?.pings ?? 0,
    })),
  }));

  const devices: UserTracking["devices"] = [
    ...input.sessions.map((s) => ({
      ...describeUserAgent(s.userAgent),
      firstAt: s.createdAt.toISOString(),
      lastAt: s.updatedAt.toISOString(),
      kind: "session" as const,
    })),
    ...input.pushDevices.map((d) => ({
      label: `${d.deviceName ?? "Android device"} - push ${d.enabled ? "on" : "off"}`,
      app: true,
      firstAt: d.createdAt.toISOString(),
      lastAt: d.lastSeenAt.toISOString(),
      kind: "push" as const,
    })),
  ].sort((a, b) => (a.lastAt < b.lastAt ? 1 : -1));

  return {
    row,
    workspaces: memberships.map((m) => ({
      id: m.workspace.id,
      name: m.workspace.name,
      role: m.role,
      plan: m.workspace.subscription?.planId ?? "free",
    })),
    websites: ws.flatMap((w) =>
      w.websites.map((s) => ({
        id: s.id,
        name: s.name,
        url: s.url,
        createdAt: s.createdAt.toISOString(),
        lastScanAt: s.lastScanAt?.toISOString() ?? null,
      })),
    ),
    heat,
    timeline: items.slice(0, 200),
    pages: topPages(events).slice(0, 15),
    devices: devices.slice(0, 20),
  };
}
