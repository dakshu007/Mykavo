import { CHANNELS, describeUserAgent, lastDays, pageLabel, routeOf, utcDay, type Channel } from "@/lib/activity/core";

/**
 * Admin tracking - turning what the database knows into "where is this person
 * using MyKavo, and how far did they get". Pure; the loader in tracking.ts
 * fetches the rows.
 *
 * Much of it is derived from tables that already existed (sessions, push
 * devices, app requests, plugin connections, API keys), so users who signed
 * up before tracking was switched on still have a history.
 */

export const ACTIVE_WINDOW_DAYS = 7;
const DAY_MS = 86_400_000;

export type ChannelStatus = "active" | "installed" | "pending" | "started" | "stopped" | "none";

export interface ChannelState {
  status: ChannelStatus;
  /** Short state, e.g. "Using the app". */
  label: string;
  /** Supporting fact, e.g. "v1.0.2 · 3 devices". */
  detail: string | null;
  lastAt: string | null;
}

export interface RawUser {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}
export interface RawWorkspace {
  id: string;
  name: string;
  ownerId: string;
  memberIds: string[];
  planId: string;
  subscriptionStatus: string | null;
  websites: Array<{ id: string; name: string; url: string; createdAt: Date; lastScanAt: Date | null }>;
}
export interface RawSession {
  userId: string;
  userAgent: string | null;
  createdAt: Date;
  updatedAt: Date;
}
export interface RawPushDevice {
  userId: string;
  platform: string;
  deviceName: string | null;
  enabled: boolean;
  createdAt: Date;
  lastSeenAt: Date;
}
export interface RawAppRequest {
  email: string;
  status: "PENDING" | "APPROVED" | "DECLINED";
  requestedAt: Date;
  decidedAt: Date | null;
  firstDownloadAt: Date | null;
  downloadCount: number;
}
export interface RawConnection {
  workspaceId: string;
  createdByUserId: string | null;
  platform: string;
  siteUrl: string;
  siteName: string | null;
  createdAt: Date;
  connectedAt: Date | null;
  lastUsedAt: Date | null;
  pluginVersion: string | null;
  revokedAt: Date | null;
}
export interface RawApiKey {
  workspaceId: string;
  createdByUserId: string | null;
  name: string;
  createdAt: Date;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
}
export interface RawActivityDay {
  userId: string;
  day: Date;
  channel: string;
  pings: number;
  lastAt: Date;
}
export interface RawEvent {
  userId: string;
  channel: string;
  type: string;
  path: string | null;
  label: string | null;
  meta: unknown;
  createdAt: Date;
}

export interface TrackingInput {
  users: RawUser[];
  workspaces: RawWorkspace[];
  sessions: RawSession[];
  pushDevices: RawPushDevice[];
  appRequests: RawAppRequest[];
  connections: RawConnection[];
  apiKeys: RawApiKey[];
  activityDays: RawActivityDay[];
  /** Tracking events worth summarising per user (connect attempts, app opens). */
  events: RawEvent[];
  isInternal: (email: string) => boolean;
  now?: Date;
}

export interface TrackingRow {
  id: string;
  name: string;
  email: string;
  internal: boolean;
  signedUpAt: string;
  plan: string;
  paid: boolean;
  websites: number;
  monitoring: boolean;
  lastActiveAt: string | null;
  lastChannel: Channel | null;
  activeDays30: number;
  /** Last 14 days, oldest first: the channels the user was active on each day. */
  spark: Channel[][];
  channels: Record<Channel, ChannelState>;
}

const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);
const maxDate = (...ds: Array<Date | null | undefined>): Date | null =>
  ds.reduce<Date | null>((m, d) => (d && (!m || d > m) ? d : m), null);

export function ago(at: Date | string | null, now: Date = new Date()): string {
  if (!at) return "never";
  const ms = now.getTime() - new Date(at).getTime();
  if (ms < 60_000) return "just now";
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < DAY_MS) return `${Math.floor(ms / 3_600_000)}h ago`;
  const days = Math.floor(ms / DAY_MS);
  if (days < 60) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function recent(d: Date | null, now: Date): boolean {
  return !!d && now.getTime() - d.getTime() <= ACTIVE_WINDOW_DAYS * DAY_MS;
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** The workspaces a user belongs to, owned first. */
function workspacesOf(userId: string, all: RawWorkspace[]): RawWorkspace[] {
  return all
    .filter((w) => w.memberIds.includes(userId))
    .sort((a, b) => Number(b.ownerId === userId) - Number(a.ownerId === userId));
}

/** Connections and keys are the creator's, or the owner's when unrecorded. */
function belongsTo(userId: string, row: { workspaceId: string; createdByUserId: string | null }, ws: RawWorkspace[]) {
  if (row.createdByUserId) return row.createdByUserId === userId;
  return ws.some((w) => w.id === row.workspaceId && w.ownerId === userId);
}

function appVersionOf(events: RawEvent[]): string | null {
  for (const e of events) {
    if (e.channel !== "android") continue;
    const v = (e.meta as { version?: unknown } | null)?.version;
    if (typeof v === "string" && v) return v;
  }
  return null;
}

function webState(lastAt: Date | null, now: Date): ChannelState {
  if (!lastAt) return { status: "none", label: "Never signed in", detail: null, lastAt: null };
  return recent(lastAt, now)
    ? { status: "active", label: "Active", detail: `Last seen ${ago(lastAt, now)}`, lastAt: iso(lastAt) }
    : { status: "installed", label: "Not seen lately", detail: `Last seen ${ago(lastAt, now)}`, lastAt: iso(lastAt) };
}

function androidState(
  args: {
    lastActive: Date | null;
    devices: RawPushDevice[];
    appSessions: RawSession[];
    request: RawAppRequest | undefined;
    version: string | null;
  },
  now: Date,
): ChannelState {
  const { lastActive, devices, appSessions, request, version } = args;
  const lastAt = maxDate(lastActive, ...devices.map((d) => d.lastSeenAt), ...appSessions.map((s) => s.updatedAt));
  const facts = [
    version ? `v${version}` : null,
    devices.length ? plural(devices.length, "device") : null,
    devices.length && devices.every((d) => !d.enabled) ? "push off" : null,
  ].filter(Boolean);
  const detail = [facts.join(" · "), lastAt ? `last opened ${ago(lastAt, now)}` : null].filter(Boolean).join(" · ") || null;
  if (recent(lastAt, now) && (lastActive || devices.length || appSessions.length)) {
    return { status: "active", label: "Using the app", detail, lastAt: iso(lastAt) };
  }
  if (devices.length || appSessions.length || lastActive) {
    return { status: "installed", label: "Installed, not used lately", detail, lastAt: iso(lastAt) };
  }
  if (request?.status === "APPROVED") {
    return request.downloadCount > 0
      ? {
          status: "pending",
          label: "Downloaded, never signed in",
          detail: `Downloaded ${plural(request.downloadCount, "time")} · first ${ago(request.firstDownloadAt, now)}`,
          lastAt: iso(request.firstDownloadAt),
        }
      : { status: "pending", label: "Approved, not downloaded", detail: `Approved ${ago(request.decidedAt, now)}`, lastAt: iso(request.decidedAt) };
  }
  if (request?.status === "PENDING") {
    return { status: "started", label: "Requested access", detail: `Waiting since ${ago(request.requestedAt, now)}`, lastAt: iso(request.requestedAt) };
  }
  if (request?.status === "DECLINED") {
    return { status: "none", label: "Request declined", detail: null, lastAt: iso(request.decidedAt) };
  }
  return { status: "none", label: "Not installed", detail: null, lastAt: null };
}

function pluginState(
  platform: "wordpress" | "shopify" | "chrome",
  conns: RawConnection[],
  lastActive: Date | null,
  connectStarts: RawEvent[],
  now: Date,
): ChannelState {
  const live = conns.filter((c) => c.connectedAt && !c.revokedAt);
  const noun = platform === "shopify" ? "store" : "site";
  if (live.length) {
    const lastAt = maxDate(lastActive, ...live.map((c) => c.lastUsedAt));
    const versions = [...new Set(live.map((c) => c.pluginVersion).filter(Boolean))];
    const detail = [
      live.map((c) => c.siteName || hostOf(c.siteUrl)).slice(0, 2).join(", ") + (live.length > 2 ? ` +${live.length - 2}` : ""),
      versions.length && platform !== "shopify" ? `${platform === "chrome" ? "extension" : "plugin"} ${versions.join("/")}` : null,
      lastAt ? `used ${ago(lastAt, now)}` : null,
    ]
      .filter(Boolean)
      .join(" · ");
    return recent(lastAt, now)
      ? { status: "active", label: `Connected, in use`, detail, lastAt: iso(lastAt) }
      : { status: "installed", label: `Connected`, detail, lastAt: iso(lastAt) };
  }
  const unfinished = conns.filter((c) => !c.connectedAt && !c.revokedAt);
  if (unfinished.length) {
    const c = unfinished[0];
    return {
      status: "pending",
      label: "Approved, plugin never finished",
      detail: `${hostOf(c.siteUrl)} · approved ${ago(c.createdAt, now)}`,
      lastAt: iso(c.createdAt),
    };
  }
  if (conns.length) {
    const last = maxDate(...conns.map((c) => c.revokedAt));
    return { status: "stopped", label: "Disconnected", detail: `${plural(conns.length, noun)} · ${ago(last, now)}`, lastAt: iso(last) };
  }
  if (platform !== "shopify" && connectStarts.length) {
    const e = connectStarts[0];
    return {
      status: "started",
      label: "Opened Connect, didn't approve",
      detail: `${e.label ?? "site"} · ${ago(e.createdAt, now)}`,
      lastAt: iso(e.createdAt),
    };
  }
  return { status: "none", label: "Not installed", detail: null, lastAt: null };
}

function mcpState(keys: RawApiKey[], lastActive: Date | null, now: Date): ChannelState {
  const live = keys.filter((k) => !k.revokedAt);
  const lastAt = maxDate(lastActive, ...keys.map((k) => k.lastUsedAt));
  if (live.length && lastAt) {
    return recent(lastAt, now)
      ? { status: "active", label: "Asking questions", detail: `${plural(live.length, "key")} · used ${ago(lastAt, now)}`, lastAt: iso(lastAt) }
      : { status: "installed", label: "Set up", detail: `${plural(live.length, "key")} · used ${ago(lastAt, now)}`, lastAt: iso(lastAt) };
  }
  if (live.length) {
    return { status: "pending", label: "Key created, never used", detail: `created ${ago(live[0].createdAt, now)}`, lastAt: iso(live[0].createdAt) };
  }
  if (keys.length) return { status: "stopped", label: "Keys revoked", detail: null, lastAt: iso(lastAt) };
  return { status: "none", label: "Not set up", detail: null, lastAt: null };
}

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

const PAID_STATUSES = new Set(["active", "on_hold"]);

export function buildTrackingRows(input: TrackingInput): TrackingRow[] {
  const now = input.now ?? new Date();
  const days14 = lastDays(14, now);
  const since30 = utcDay(new Date(now.getTime() - 29 * DAY_MS));

  return input.users.map((u) => {
    const ws = workspacesOf(u.id, input.workspaces);
    const primary = ws[0];
    const myDays = input.activityDays.filter((d) => d.userId === u.id);
    const lastBy = (ch: Channel) =>
      maxDate(...myDays.filter((d) => d.channel === ch).map((d) => d.lastAt));
    const myEvents = input.events.filter((e) => e.userId === u.id).sort((a, b) => +b.createdAt - +a.createdAt);
    const mySessions = input.sessions.filter((s) => s.userId === u.id);
    const appSessions = mySessions.filter((s) => describeUserAgent(s.userAgent).app);
    const webSessions = mySessions.filter((s) => !describeUserAgent(s.userAgent).app);
    const conns = input.connections.filter((c) => belongsTo(u.id, c, ws));
    const email = u.email.toLowerCase();

    const channels: Record<Channel, ChannelState> = {
      web: webState(maxDate(lastBy("web"), ...webSessions.map((s) => s.updatedAt)), now),
      android: androidState(
        {
          lastActive: lastBy("android"),
          devices: input.pushDevices.filter((d) => d.userId === u.id && d.platform === "android"),
          appSessions,
          request: input.appRequests.find((r) => r.email.toLowerCase() === email),
          version: appVersionOf(myEvents),
        },
        now,
      ),
      wordpress: pluginState(
        "wordpress",
        conns.filter((c) => c.platform === "wordpress"),
        lastBy("wordpress"),
        myEvents.filter((e) => e.type === "wordpress_connect_started"),
        now,
      ),
      shopify: pluginState("shopify", conns.filter((c) => c.platform === "shopify"), lastBy("shopify"), [], now),
      chrome: pluginState(
        "chrome",
        conns.filter((c) => c.platform === "chrome"),
        lastBy("chrome"),
        myEvents.filter((e) => e.type === "extension_connect_started"),
        now,
      ),
      mcp: mcpState(input.apiKeys.filter((k) => belongsTo(u.id, k, ws)), lastBy("mcp"), now),
    };

    let lastActiveAt: string | null = null;
    let lastChannel: Channel | null = null;
    for (const ch of CHANNELS) {
      const at = channels[ch].status === "active" || channels[ch].status === "installed" ? channels[ch].lastAt : null;
      if (at && (!lastActiveAt || at > lastActiveAt)) {
        lastActiveAt = at;
        lastChannel = ch;
      }
    }

    const websites = ws.flatMap((w) => w.websites);
    const paidWs = ws.find((w) => w.planId !== "free" && PAID_STATUSES.has(w.subscriptionStatus ?? ""));
    const activeDaySet = new Set(myDays.filter((d) => utcDay(d.day) >= since30).map((d) => utcDay(d.day)));
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      internal: input.isInternal(u.email),
      signedUpAt: u.createdAt.toISOString(),
      plan: (paidWs ?? primary)?.planId ?? "free",
      paid: !!paidWs,
      websites: websites.length,
      monitoring: websites.some((w) => w.lastScanAt),
      lastActiveAt,
      lastChannel,
      activeDays30: activeDaySet.size,
      spark: days14.map((day) =>
        CHANNELS.filter((ch) => myDays.some((d) => d.channel === ch && utcDay(d.day) === day)),
      ),
      channels,
    };
  });
}

export interface TrackingKpis {
  users: number;
  activeToday: number;
  active7d: number;
  active30d: number;
  byChannel: Record<Channel, { adopted: number; active: number; stuck: number }>;
  funnel: Array<{ label: string; count: number }>;
}

export function summarizeRows(rows: TrackingRow[], now: Date = new Date()): TrackingKpis {
  const within = (at: string | null, days: number) => !!at && now.getTime() - new Date(at).getTime() <= days * DAY_MS;
  const today = utcDay(now);
  const byChannel = Object.fromEntries(
    CHANNELS.map((ch) => [
      ch,
      {
        adopted: rows.filter((r) => ["active", "installed"].includes(r.channels[ch].status)).length,
        active: rows.filter((r) => r.channels[ch].status === "active").length,
        stuck: rows.filter((r) => ["pending", "started"].includes(r.channels[ch].status)).length,
      },
    ]),
  ) as TrackingKpis["byChannel"];
  const adopted = (r: TrackingRow, ch: Channel) => ["active", "installed"].includes(r.channels[ch].status);
  return {
    users: rows.length,
    activeToday: rows.filter((r) => r.lastActiveAt?.slice(0, 10) === today).length,
    active7d: rows.filter((r) => within(r.lastActiveAt, 7)).length,
    active30d: rows.filter((r) => within(r.lastActiveAt, 30)).length,
    byChannel,
    funnel: [
      { label: "Signed up", count: rows.length },
      { label: "Added a website", count: rows.filter((r) => r.websites > 0).length },
      { label: "Monitoring live", count: rows.filter((r) => r.monitoring).length },
      { label: "Active in last 7 days", count: rows.filter((r) => within(r.lastActiveAt, 7)).length },
      { label: "Uses Android app", count: rows.filter((r) => adopted(r, "android")).length },
      { label: "WordPress plugin connected", count: rows.filter((r) => adopted(r, "wordpress")).length },
      { label: "Chrome extension connected", count: rows.filter((r) => adopted(r, "chrome")).length },
      { label: "Paid", count: rows.filter((r) => r.paid).length },
    ],
  };
}

/* ------------------------------------------------------------ timeline -- */

export interface TimelineItem {
  at: string;
  channel: Channel | "account";
  title: string;
  detail: string | null;
}

const SESSION_GAP_MS = 30 * 60_000;

/**
 * Page views and app screens, grouped into visits: views less than 30
 * minutes apart are one visit, summarised as the pages it covered.
 */
export function groupVisits(events: RawEvent[]): TimelineItem[] {
  const views = events
    .filter((e) => e.type === "page_view" || e.type === "screen_view" || e.type === "app_open")
    .sort((a, b) => +a.createdAt - +b.createdAt);
  const out: TimelineItem[] = [];
  let group: RawEvent[] = [];
  const flush = () => {
    if (!group.length) return;
    const channel = group[0].channel === "android" ? "android" : "web";
    const names = group
      .filter((e) => e.type !== "app_open")
      .map((e) => (e.type === "page_view" && e.path ? pageLabel(routeOf(e.path)) : (e.label ?? "")))
      .filter(Boolean);
    const distinct = [...new Set(names)];
    const version = appVersionOf(group);
    const mins = Math.max(1, Math.round((+group[group.length - 1].createdAt - +group[0].createdAt) / 60_000));
    out.push({
      at: group[0].createdAt.toISOString(),
      channel,
      title:
        channel === "android"
          ? `Opened the Android app${version ? ` (v${version})` : ""}`
          : `Visited the dashboard - ${plural(names.length, "page")}`,
      detail: [distinct.slice(0, 6).join(", ") + (distinct.length > 6 ? ` +${distinct.length - 6} more` : ""), names.length > 1 ? `about ${mins} min` : null]
        .filter(Boolean)
        .join(" · ") || null,
    });
    group = [];
  };
  for (const e of views) {
    const last = group[group.length - 1];
    const sameChannel = !last || (last.channel === "android") === (e.channel === "android");
    if (last && (!sameChannel || +e.createdAt - +last.createdAt > SESSION_GAP_MS)) flush();
    group.push(e);
  }
  flush();
  return out.reverse();
}

/** Page views grouped by page, most viewed first. */
export function topPages(events: RawEvent[]): Array<{ label: string; route: string; views: number; lastAt: string }> {
  const m = new Map<string, { label: string; route: string; views: number; lastAt: string }>();
  for (const e of events) {
    if (e.type !== "page_view" || !e.path) continue;
    const route = routeOf(e.path);
    const at = e.createdAt.toISOString();
    const prev = m.get(route);
    m.set(route, {
      label: pageLabel(route),
      route,
      views: (prev?.views ?? 0) + 1,
      lastAt: prev && prev.lastAt > at ? prev.lastAt : at,
    });
  }
  return [...m.values()].sort((a, b) => b.views - a.views);
}

/* ------------------------------------------------- extension funnel -- */

export interface RawExtensionInstall {
  opens: number;
  pageChecks: number;
  monitorClicks: number;
  dashboardOpens: number;
  connectStartedAt: Date | null;
  signedUpAt: Date | null;
  connectedAt: Date | null;
  userId: string | null;
}

export interface ExtensionFunnel {
  installs: number;
  steps: Array<{ label: string; count: number }>;
}

/**
 * The Chrome extension's acquisition funnel, install by install: from
 * installing to a connected website, a return visit and a paid plan.
 * "Came back" is a connected user whose extension talked to MyKavo again
 * a day or more after connecting.
 */
export function buildExtensionFunnel(
  installs: RawExtensionInstall[],
  returnedUserIds: Set<string>,
  paidUserIds: Set<string>,
): ExtensionFunnel {
  const n = (pred: (i: RawExtensionInstall) => boolean) => installs.filter(pred).length;
  const connected = (i: RawExtensionInstall) => !!i.connectedAt;
  return {
    installs: installs.length,
    steps: [
      { label: "Installed", count: installs.length },
      { label: "Opened the popup", count: n((i) => i.opens > 0) },
      { label: "Checked a page", count: n((i) => i.pageChecks > 0) },
      { label: "Clicked Protect", count: n((i) => i.monitorClicks > 0 || !!i.connectStartedAt) },
      { label: "Reached MyKavo", count: n((i) => !!i.connectStartedAt) },
      { label: "Created an account", count: n((i) => !!i.signedUpAt) },
      { label: "Connected a website", count: n(connected) },
      { label: "Opened the dashboard", count: n((i) => connected(i) && i.dashboardOpens > 0) },
      { label: "Came back", count: n((i) => connected(i) && !!i.userId && returnedUserIds.has(i.userId)) },
      { label: "Paid", count: n((i) => connected(i) && !!i.userId && paidUserIds.has(i.userId)) },
    ],
  };
}
