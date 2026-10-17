import {
  prisma,
  autoPauseReasons,
  getLatestHealthChecksForWorkspace,
  OPEN_STATUSES,
  type WebsiteStatus,
  type Workspace,
} from "@mykavo/database";
import { logger } from "@/lib/logger";
import {
  ATTENTION_SEVERITIES,
  buildAttention,
  summarizeWebsiteHealth,
  type AttentionResult,
  type AutoPauseReason,
  type LatestScan,
  type WebsiteHealthSummary,
} from "./attention";
import { deriveSetupGuide, type SetupGuide } from "./setup-guide-steps";

/**
 * Everything the Overview page shows, loaded in two parallel waves and
 * scoped to one workspace in every query.
 *
 * Wave 1 is what every visit needs. Wave 2 depends on wave 1: which websites
 * are paused (for the auto-pause lookup) and whether the setup guide could
 * show at all (its counts are skipped for established workspaces).
 */

/** A workspace this young still counts as new for the setup guide. */
export const NEW_WORKSPACE_DAYS = 30;
/** How many open attention changes to load; the list shows at most 8. */
const OPEN_CHANGE_FETCH = 40;
/** WordPress detection looks at snapshots this recent. */
const WORDPRESS_LOOKBACK_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

export interface OverviewWebsite {
  id: string;
  name: string;
  url: string;
  status: WebsiteStatus;
  lastScanAt: Date | null;
  nextScanAt: Date | null;
  monitoredPages: number;
  /** Latest uptime check: true up, false down, null never checked. */
  up: boolean | null;
}

export interface OverviewData {
  now: Date;
  websites: OverviewWebsite[];
  attention: AttentionResult;
  health: WebsiteHealthSummary;
  /** Open LOW / INFO changes, which the attention list does not show. */
  lowerPriorityOpen: number;
  monitoredPages: number;
  scansLast7Days: number;
  changesLast30Days: number;
  /** The most recent scan of any website. */
  lastScan: { at: Date; websiteName: string } | null;
  /** The soonest scheduled scan of a monitored (ACTIVE) website. */
  nextScan: { at: Date; websiteName: string } | null;
  /** Null when the guide is not shown (complete, dismissed, or established). */
  setupGuide: SetupGuide | null;
}

interface LatestScanRow {
  id: string;
  websiteId: string;
  status: string;
  errorMessage: string | null;
  completedAt: Date | null;
  createdAt: Date;
}

function isFinishedStatus(status: string): status is LatestScan["status"] {
  return status === "COMPLETED" || status === "PARTIAL" || status === "FAILED";
}

/**
 * The latest finished scan per website in one query. DISTINCT ON keeps this
 * to one row per website in the database; Prisma's `distinct` would pull
 * every scan the workspace ever ran into memory first.
 */
async function loadLatestScans(workspaceId: string): Promise<Map<string, LatestScan>> {
  try {
    const rows = await prisma.$queryRaw<LatestScanRow[]>`
      SELECT DISTINCT ON (s."websiteId")
        s."id", s."websiteId", s."status"::text AS "status", s."errorMessage",
        s."completedAt", s."createdAt"
      FROM "scan" s
      JOIN "website" w ON w."id" = s."websiteId"
      WHERE w."workspaceId" = ${workspaceId}
        AND s."status" IN ('COMPLETED', 'PARTIAL', 'FAILED')
      ORDER BY s."websiteId", s."createdAt" DESC
    `;
    const map = new Map<string, LatestScan>();
    for (const r of rows) {
      if (!isFinishedStatus(r.status)) continue;
      map.set(r.websiteId, {
        id: r.id,
        status: r.status,
        errorMessage: r.errorMessage,
        finishedAt: r.completedAt ?? r.createdAt,
      });
    }
    return map;
  } catch (err) {
    // The list loses its failed-scan rows; the rest of the page still works.
    logger.error("overview: latest scans query failed", { workspaceId }, err);
    return new Map();
  }
}

interface SetupExtras {
  enabledAlertChannels: number;
  members: number;
  pendingInvites: number;
  wordpressConnected: boolean;
  extensionConnected: boolean;
  wordpressDetected: boolean;
  defaultAlertEmail: string;
}

/** Counts only the setup guide needs. Each one degrades to "not done". */
async function loadSetupExtras(
  workspace: Workspace,
  user: { id: string; email: string },
  /** Websites whose snapshots to check for WordPress; empty skips the check. */
  snapshotWebsiteIds: string[],
  now: Date,
): Promise<SetupExtras> {
  const workspaceId = workspace.id;
  const soft = <T>(label: string, fallback: T) => (err: unknown) => {
    logger.warn("overview: setup guide query failed", {
      workspaceId,
      query: label,
      error: err instanceof Error ? err.message : String(err),
    });
    return fallback;
  };

  const [channels, members, invites, connections, extensionInstalls, wordpressSnapshot, owner] =
    await Promise.all([
      prisma.notificationChannel
        .count({ where: { workspaceId, enabled: true } })
        .catch(soft("channels", 0)),
      prisma.workspaceMember.count({ where: { workspaceId } }).catch(soft("members", 1)),
      prisma.workspaceInvite
        .count({ where: { workspaceId, acceptedAt: null, expiresAt: { gt: now } } })
        .catch(soft("invites", 0)),
      prisma.siteConnection
        .groupBy({
          by: ["platform"],
          where: { workspaceId, connectedAt: { not: null }, revokedAt: null },
          _count: { _all: true },
        })
        .catch(soft("connections", [] as { platform: string; _count: { _all: number } }[])),
      prisma.extensionInstall
        .count({ where: { userId: user.id } })
        .catch(soft("extension", 0)),
      snapshotWebsiteIds.length > 0
        ? prisma.pageSnapshot
            .findFirst({
              where: {
                // PageSnapshot has no website relation; ids come from this workspace.
                websiteId: { in: snapshotWebsiteIds },
                createdAt: { gte: new Date(now.getTime() - WORDPRESS_LOOKBACK_DAYS * DAY_MS) },
                platformFingerprint: { path: ["platform"], equals: "wordpress" },
              },
              select: { id: true },
            })
            .catch(soft("wordpress-detect", null))
        : Promise.resolve(null),
      workspace.ownerId === user.id
        ? Promise.resolve({ email: user.email })
        : prisma.user
            .findUnique({ where: { id: workspace.ownerId }, select: { email: true } })
            .catch(soft("owner", null)),
    ]);

  const connected = new Set(connections.filter((c) => c._count._all > 0).map((c) => c.platform));
  return {
    enabledAlertChannels: channels,
    members,
    pendingInvites: invites,
    wordpressConnected: connected.has("wordpress"),
    extensionConnected: connected.has("chrome") || extensionInstalls > 0,
    wordpressDetected: wordpressSnapshot !== null,
    defaultAlertEmail: owner?.email ?? user.email,
  };
}

export async function loadOverview({
  workspace,
  user,
  setupDismissed,
}: {
  workspace: Workspace;
  user: { id: string; email: string };
  /** The workspace dismissed the earlier checklist card (cookie). */
  setupDismissed: boolean;
}): Promise<OverviewData> {
  const now = new Date();
  const workspaceId = workspace.id;
  const inWorkspace = { website: { workspaceId } };

  const [
    websiteRows,
    openChanges,
    openTotals,
    latestScans,
    healthChecks,
    scansLast7Days,
    changesLast30Days,
    activeBaselines,
  ] = await Promise.all([
    prisma.website.findMany({
      where: { workspaceId },
      select: {
        id: true,
        name: true,
        url: true,
        status: true,
        lastScanAt: true,
        nextScanAt: true,
        _count: { select: { monitoredPages: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.changeEvent.findMany({
      where: {
        ...inWorkspace,
        status: { in: OPEN_STATUSES },
        severity: { in: [...ATTENTION_SEVERITIES] },
      },
      // Postgres orders the enum by declaration (INFO..CRITICAL): desc is worst first.
      orderBy: [{ severity: "desc" }, { detectedAt: "desc" }],
      take: OPEN_CHANGE_FETCH,
      select: {
        id: true,
        websiteId: true,
        title: true,
        severity: true,
        detectedAt: true,
        monitoredPage: { select: { url: true } },
      },
    }),
    prisma.changeEvent.groupBy({
      by: ["websiteId", "severity"],
      where: { ...inWorkspace, status: { in: OPEN_STATUSES } },
      _count: { _all: true },
    }),
    loadLatestScans(workspaceId),
    getLatestHealthChecksForWorkspace(prisma, workspaceId),
    prisma.scan.count({
      where: {
        ...inWorkspace,
        status: { in: ["COMPLETED", "PARTIAL"] },
        completedAt: { gte: new Date(now.getTime() - 7 * DAY_MS) },
      },
    }),
    prisma.changeEvent.count({
      where: { ...inWorkspace, detectedAt: { gte: new Date(now.getTime() - 30 * DAY_MS) } },
    }),
    prisma.baseline.count({ where: { ...inWorkspace, status: "ACTIVE" } }),
  ]);

  // Setup guide candidates: not dismissed, and either a new workspace or one
  // that never got as far as a baseline. Established workspaces skip the
  // guide's queries entirely.
  const isNewWorkspace = now.getTime() - workspace.createdAt.getTime() < NEW_WORKSPACE_DAYS * DAY_MS;
  const setupCandidate = !setupDismissed && (isNewWorkspace || activeBaselines === 0);
  const pausedIds = websiteRows.filter((w) => w.status === "PAUSED").map((w) => w.id);

  const [autoPause, setupExtras] = await Promise.all([
    autoPauseReasons(prisma, pausedIds).catch((err: unknown) => {
      logger.error("overview: auto-pause lookup failed", { workspaceId }, err);
      return new Map<string, AutoPauseReason>();
    }),
    setupCandidate
      ? loadSetupExtras(
          workspace,
          user,
          activeBaselines > 0 ? websiteRows.map((w) => w.id) : [],
          now,
        )
      : null,
  ]);

  const upByWebsite = new Map(healthChecks.map((h) => [h.websiteId, h]));
  const down = new Map<string, Date>();
  for (const h of healthChecks) if (!h.up) down.set(h.websiteId, h.checkedAt);

  const attentionTotals = new Map<string, number>();
  let lowerPriorityOpen = 0;
  for (const row of openTotals) {
    if ((ATTENTION_SEVERITIES as readonly string[]).includes(row.severity)) {
      attentionTotals.set(row.websiteId, (attentionTotals.get(row.websiteId) ?? 0) + row._count._all);
    } else {
      lowerPriorityOpen += row._count._all;
    }
  }

  const attention = buildAttention({
    websites: websiteRows,
    openChanges: openChanges.map((c) => ({
      id: c.id,
      websiteId: c.websiteId,
      title: c.title,
      severity: c.severity,
      detectedAt: c.detectedAt,
      pageUrl: c.monitoredPage?.url ?? null,
    })),
    openAttentionTotals: attentionTotals,
    latestScans,
    autoPause,
    down,
  });

  const websites: OverviewWebsite[] = websiteRows.map((w) => ({
    id: w.id,
    name: w.name,
    url: w.url,
    status: w.status,
    lastScanAt: w.lastScanAt,
    nextScanAt: w.nextScanAt,
    monitoredPages: w._count.monitoredPages,
    up: upByWebsite.get(w.id)?.up ?? null,
  }));

  let lastScan: OverviewData["lastScan"] = null;
  let nextScan: OverviewData["nextScan"] = null;
  for (const w of websites) {
    if (w.lastScanAt && (!lastScan || w.lastScanAt > lastScan.at)) {
      lastScan = { at: w.lastScanAt, websiteName: w.name };
    }
    if (w.status === "ACTIVE" && w.nextScanAt && (!nextScan || w.nextScanAt < nextScan.at)) {
      nextScan = { at: w.nextScanAt, websiteName: w.name };
    }
  }

  let setupGuide: SetupGuide | null = null;
  if (setupExtras) {
    const guide = deriveSetupGuide({
      websites: websites.length,
      firstWebsiteId: websites[0]?.id ?? null,
      activeBaselines,
      baselineInProgress: websites.some(
        (w) => w.status === "DISCOVERING" || w.status === "BASELINING",
      ),
      ...setupExtras,
    });
    setupGuide = guide.complete ? null : guide;
  }

  return {
    now,
    websites,
    attention,
    health: summarizeWebsiteHealth(websites, attention.websiteIds),
    lowerPriorityOpen,
    monitoredPages: websites.reduce((sum, w) => sum + w.monitoredPages, 0),
    scansLast7Days,
    changesLast30Days,
    lastScan,
    nextScan,
    setupGuide,
  };
}
