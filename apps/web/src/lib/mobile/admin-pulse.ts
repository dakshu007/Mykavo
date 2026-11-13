import { prisma } from "@mykavo/database";
import { getPlan, type PlanId } from "@/config/plans";
import { loadAiControls } from "@/lib/ai/controls";
import { getWorkerLiveness } from "@/lib/usage/worker-health";
import { dailyCounts, monthlyRevenue, pulseAlerts, type PulseAlert } from "./admin-alerts";

/**
 * The phone's Command Center: one read that answers "is MyKavo healthy, who
 * is using it, and what is it earning" for the operator. Every figure is a
 * count or a small list; no customer content (page HTML, post bodies, email
 * text) leaves the server. Implements AdminPulse in apps/mobile/src/lib/types.ts.
 */

export type FeedKind = "signup" | "payment" | "scan_failed" | "change" | "ai_post" | "wp_draft" | "app_request" | "service" | "support";

export interface FeedItem {
  id: string;
  kind: FeedKind;
  title: string;
  detail: string;
  at: string;
  tone: "good" | "bad" | "neutral";
}

export interface AdminPulse {
  generatedAt: string;
  alerts: PulseAlert[];
  worker: { state: string; minutesAgo: number | null; detail: string };
  users: { total: number; today: number; week: number; activeToday: number; online: number; signups14d: number[] };
  revenue: { mrrUsd: number; paying: number; byPlan: { plan: string; count: number }[]; onHold: number; cancelling: number; trials: number };
  scans: {
    total24h: number;
    completed24h: number;
    partial24h: number;
    failed24h: number;
    running: number;
    queued: number;
    avgSeconds: number | null;
    recentFailures: { id: string; website: string; error: string; at: string }[];
  };
  monitoring: {
    websites: number;
    active: number;
    paused: number;
    errored: number;
    pages: number;
    openIncidents: number;
    changes24h: { critical: number; high: number; medium: number; low: number; info: number };
  };
  ai: {
    configured: boolean;
    paused: boolean;
    pools: { label: string; spentUsd: number; capUsd: number }[];
    spentTodayUsd: number;
    jobs24h: { running: number; queued: number; done: number; failed: number };
    posts24h: number;
    postsTotal: number;
    rollout: string;
    recentFailures: { id: string; kind: string; error: string; at: string }[];
  };
  wordpress: {
    connected: number;
    versions: { version: string; count: number }[];
    draftsQueued: number;
    draftsStuck: number;
    drafts24h: number;
    draftsFailed24h: number;
  };
  channels: { email24h: number; emailFailed24h: number; pushDevices: number; pushDisabled: number; appVersions: { version: string; count: number }[] };
  inbox: { appRequestsPending: number; serviceRequests7d: number; support24h: number };
  feed: FeedItem[];
}

const PLAN_IDS: readonly string[] = ["free", "starter", "pro", "agency"];

/** Plan name and prices, or null for an id this build does not know (never throws). */
function planInfo(id: string): { name: string; monthly: number; yearly: number } | null {
  if (!PLAN_IDS.includes(id)) return null;
  const plan = getPlan(id as PlanId);
  return { name: plan.name, monthly: plan.priceMonthlyUsd, yearly: plan.priceYearlyUsd };
}

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** "a***@gmail.com": enough to recognise a signup, not enough to leak in a screenshot. */
export function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!domain) return "someone";
  return `${user.slice(0, 1)}***@${domain}`;
}

export async function loadAdminPulse(now: Date = new Date()): Promise<AdminPulse> {
  const day = new Date(now.getTime() - DAY);
  const week = new Date(now.getTime() - 7 * DAY);
  const fortnight = new Date(now.getTime() - 14 * DAY);
  const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const fifteenMin = new Date(now.getTime() - 15 * 60_000);
  const halfHour = new Date(now.getTime() - 30 * 60_000);

  const [
    usersTotal,
    signups,
    activeToday,
    onlineRows,
    subs,
    trials,
    scanGroups,
    scansLive,
    scanDurations,
    failedScans,
    websiteGroups,
    pages,
    openIncidents,
    changeGroups,
    ai,
    spentToday,
    jobGroups,
    failedJobs,
    posts24h,
    postsTotal,
    wpConnections,
    draftsQueued,
    draftsStuck,
    drafts24h,
    draftsFailed24h,
    emailGroups,
    pushGroups,
    appVersions,
    appRequestsPending,
    serviceRequests7d,
    support24h,
    worker,
    feedSignups,
    feedPayments,
    feedChanges,
    feedPosts,
    feedDrafts,
    feedAppRequests,
    feedService,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.findMany({ where: { createdAt: { gte: fortnight } }, select: { createdAt: true } }),
    prisma.userActivityDay.findMany({ where: { day: startOfDay }, distinct: ["userId"], select: { userId: true } }),
    prisma.activityEvent.findMany({ where: { createdAt: { gte: fifteenMin } }, distinct: ["userId"], select: { userId: true } }),
    prisma.subscription.findMany({
      where: { planId: { not: "free" } },
      select: { planId: true, status: true, billingInterval: true, cancelAtPeriodEnd: true },
    }),
    prisma.workspaceTrial.count({ where: { endsAt: { gt: now } } }),
    prisma.scan.groupBy({ by: ["status"], where: { createdAt: { gte: day } }, _count: { _all: true } }),
    prisma.scan.groupBy({ by: ["status"], where: { status: { in: ["QUEUED", "RUNNING"] } }, _count: { _all: true } }),
    prisma.scan.findMany({
      where: { completedAt: { gte: day }, startedAt: { not: null } },
      select: { startedAt: true, completedAt: true },
      take: 500,
    }),
    prisma.scan.findMany({
      where: { status: "FAILED", createdAt: { gte: day } },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { id: true, errorCode: true, errorMessage: true, createdAt: true, website: { select: { url: true } } },
    }),
    prisma.website.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.monitoredPage.count({ where: { enabled: true } }),
    prisma.healthIncident.count({ where: { resolvedAt: null } }),
    prisma.changeEvent.groupBy({ by: ["severity"], where: { detectedAt: { gte: day } }, _count: { _all: true } }),
    loadAiControls(now),
    prisma.aiUsage.aggregate({ where: { createdAt: { gte: startOfDay } }, _sum: { costMicroUsd: true } }),
    prisma.aiJob.groupBy({ by: ["status"], where: { createdAt: { gte: day } }, _count: { _all: true } }),
    prisma.aiJob.findMany({
      where: { status: "failed", createdAt: { gte: day } },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, kind: true, error: true, createdAt: true },
    }),
    prisma.contentPost.count({ where: { createdAt: { gte: day } } }),
    prisma.contentPost.count(),
    prisma.siteConnection.findMany({
      where: { platform: "wordpress", revokedAt: null, connectedAt: { not: null } },
      select: { pluginVersion: true },
    }),
    prisma.wpDraft.count({ where: { status: "queued" } }),
    prisma.wpDraft.count({ where: { status: "queued", queuedAt: { lt: halfHour } } }),
    prisma.wpDraft.count({ where: { status: "delivered", deliveredAt: { gte: day } } }),
    prisma.wpDraft.count({ where: { status: "failed", updatedAt: { gte: day } } }),
    prisma.notification.groupBy({ by: ["status"], where: { createdAt: { gte: day }, channelType: "EMAIL" }, _count: { _all: true } }),
    prisma.pushDevice.groupBy({ by: ["enabled"], _count: { _all: true } }),
    prisma.$queryRaw<{ version: string | null; count: bigint }[]>`
      SELECT meta->>'version' AS version, COUNT(DISTINCT "userId") AS count
      FROM activity_event
      WHERE channel = 'android' AND "createdAt" >= ${week}
      GROUP BY 1 ORDER BY 2 DESC LIMIT 6`,
    prisma.appAccessRequest.count({ where: { status: "PENDING" } }),
    prisma.serviceRequest.count({ where: { createdAt: { gte: week } } }),
    prisma.supportQuestion.count({ where: { createdAt: { gte: day } } }),
    getWorkerLiveness(now),
    prisma.user.findMany({ where: { createdAt: { gte: week } }, orderBy: { createdAt: "desc" }, take: 8, select: { id: true, email: true, createdAt: true, emailVerified: true } }),
    prisma.subscription.findMany({
      where: { planId: { not: "free" }, updatedAt: { gte: week } },
      orderBy: { updatedAt: "desc" },
      take: 6,
      select: { id: true, planId: true, status: true, updatedAt: true, workspace: { select: { name: true } } },
    }),
    prisma.changeEvent.findMany({
      where: { detectedAt: { gte: day }, severity: { in: ["CRITICAL", "HIGH"] } },
      orderBy: { detectedAt: "desc" },
      take: 6,
      select: { id: true, title: true, severity: true, detectedAt: true, website: { select: { url: true } } },
    }),
    prisma.contentPost.findMany({
      where: { createdAt: { gte: week } },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { id: true, keyword: true, createdAt: true, website: { select: { url: true } } },
    }),
    prisma.wpDraft.findMany({
      where: { status: "delivered", deliveredAt: { gte: week } },
      orderBy: { deliveredAt: "desc" },
      take: 4,
      select: { id: true, deliveredAt: true, website: { select: { url: true } } },
    }),
    prisma.appAccessRequest.findMany({ where: { requestedAt: { gte: week } }, orderBy: { requestedAt: "desc" }, take: 4, select: { id: true, email: true, requestedAt: true, status: true } }),
    prisma.serviceRequest.findMany({ where: { createdAt: { gte: week } }, orderBy: { createdAt: "desc" }, take: 4, select: { id: true, kind: true, websiteUrl: true, createdAt: true } }),
  ]);

  type Group = { _count: { _all: number } };
  const tally = (groups: Group[], field: string, value: string): number =>
    groups
      .filter((g) => (g as unknown as Record<string, unknown>)[field] === value)
      .reduce((n, g) => n + g._count._all, 0);
  const scanCount = (status: string) => tally(scanGroups, "status", status);
  const jobCount = (status: string) => tally(jobGroups, "status", status);
  const sevCount = (s: string) => tally(changeGroups, "severity", s);
  const siteCount = (s: string) => tally(websiteGroups, "status", s);

  const activeSubs = subs.filter((s) => s.status === "active");
  const byPlan = new Map<string, number>();
  for (const s of activeSubs) byPlan.set(s.planId, (byPlan.get(s.planId) ?? 0) + 1);

  const durations = scanDurations
    .map((s) => (s.completedAt && s.startedAt ? (s.completedAt.getTime() - s.startedAt.getTime()) / 1000 : null))
    .filter((n): n is number => n !== null && n >= 0);

  const versions = new Map<string, number>();
  for (const c of wpConnections) {
    const v = c.pluginVersion ?? "unknown";
    versions.set(v, (versions.get(v) ?? 0) + 1);
  }

  const emailSent = emailGroups.filter((g) => g.status === "SENT").reduce((n, g) => n + g._count._all, 0);
  const emailFailed = emailGroups.filter((g) => g.status === "FAILED").reduce((n, g) => n + g._count._all, 0);
  const total24h = scanGroups.reduce((n, g) => n + g._count._all, 0);

  const feed: FeedItem[] = [
    ...feedSignups.map((u) => ({
      id: `u-${u.id}`,
      kind: "signup" as const,
      title: "New signup",
      detail: `${maskEmail(u.email)}${u.emailVerified ? " · verified" : ""}`,
      at: u.createdAt.toISOString(),
      tone: "good" as const,
    })),
    ...feedPayments.map((s) => ({
      id: `p-${s.id}-${s.updatedAt.getTime()}`,
      kind: "payment" as const,
      title: s.status === "active" ? `${planInfo(s.planId)?.name ?? s.planId} subscription` : `Payment ${s.status.replace("_", " ")}`,
      detail: s.workspace.name,
      at: s.updatedAt.toISOString(),
      tone: s.status === "active" ? ("good" as const) : ("bad" as const),
    })),
    ...failedScans.map((s) => ({
      id: `s-${s.id}`,
      kind: "scan_failed" as const,
      title: "Scan failed",
      detail: `${hostOf(s.website.url)} · ${s.errorCode ?? "error"}`,
      at: s.createdAt.toISOString(),
      tone: "bad" as const,
    })),
    ...feedChanges.map((c) => ({
      id: `c-${c.id}`,
      kind: "change" as const,
      title: `${c.severity === "CRITICAL" ? "Critical" : "High"}: ${c.title}`,
      detail: hostOf(c.website.url),
      at: c.detectedAt.toISOString(),
      tone: "bad" as const,
    })),
    ...feedPosts.map((p) => ({
      id: `a-${p.id}`,
      kind: "ai_post" as const,
      title: "AI wrote a post",
      detail: `“${p.keyword}” · ${hostOf(p.website.url)}`,
      at: p.createdAt.toISOString(),
      tone: "good" as const,
    })),
    ...feedDrafts.map((d) => ({
      id: `w-${d.id}`,
      kind: "wp_draft" as const,
      title: "Saved to WordPress",
      detail: hostOf(d.website.url),
      at: (d.deliveredAt ?? now).toISOString(),
      tone: "good" as const,
    })),
    ...feedAppRequests.map((r) => ({
      id: `r-${r.id}`,
      kind: "app_request" as const,
      title: r.status === "PENDING" ? "App request waiting" : "App request",
      detail: maskEmail(r.email),
      at: r.requestedAt.toISOString(),
      tone: "neutral" as const,
    })),
    ...feedService.map((r) => ({
      id: `h-${r.id}`,
      kind: "service" as const,
      title: `Help request: ${r.kind}`,
      detail: hostOf(r.websiteUrl),
      at: r.createdAt.toISOString(),
      tone: "neutral" as const,
    })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 30);

  const aiPools = ai.pools.map((p) => ({ label: p.id === "agent" ? "AI Writer" : "AI explanations", spentUsd: p.spentUsd, capUsd: p.capUsd }));

  const alerts = pulseAlerts({
    worker: { state: worker.state, minutesAgo: worker.minutesAgo },
    scans24h: { total: total24h, failed: scanCount("FAILED") },
    aiPaused: ai.paused,
    aiConfigured: ai.configured,
    aiPools,
    aiJobsFailed24h: jobCount("failed"),
    wpDraftsStuck: draftsStuck,
    emailFailed24h: emailFailed,
    paymentsOnHold: subs.filter((s) => s.status === "on_hold").length,
    appRequestsPending,
    openIncidents,
  });

  return {
    generatedAt: now.toISOString(),
    alerts,
    worker: { state: worker.state, minutesAgo: worker.minutesAgo, detail: worker.detail },
    users: {
      total: usersTotal,
      today: signups.filter((u) => u.createdAt >= startOfDay).length,
      week: signups.filter((u) => u.createdAt >= week).length,
      activeToday: activeToday.length,
      online: onlineRows.length,
      signups14d: dailyCounts(
        signups.map((u) => u.createdAt),
        14,
        now,
      ),
    },
    revenue: {
      mrrUsd: monthlyRevenue(activeSubs, (id) => planInfo(id) ?? { monthly: 0, yearly: 0 }),
      paying: activeSubs.length,
      byPlan: [...byPlan.entries()].map(([plan, n]) => ({ plan: planInfo(plan)?.name ?? plan, count: n })).sort((a, b) => b.count - a.count),
      onHold: subs.filter((s) => s.status === "on_hold").length,
      cancelling: activeSubs.filter((s) => s.cancelAtPeriodEnd).length,
      trials,
    },
    scans: {
      total24h,
      completed24h: scanCount("COMPLETED"),
      partial24h: scanCount("PARTIAL"),
      failed24h: scanCount("FAILED"),
      running: tally(scansLive, "status", "RUNNING"),
      queued: tally(scansLive, "status", "QUEUED"),
      avgSeconds: durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : null,
      recentFailures: failedScans.map((s) => ({
        id: s.id,
        website: hostOf(s.website.url),
        error: s.errorCode ?? (s.errorMessage ?? "Unknown error").slice(0, 80),
        at: s.createdAt.toISOString(),
      })),
    },
    monitoring: {
      websites: websiteGroups.reduce((n, g) => n + g._count._all, 0),
      active: siteCount("ACTIVE"),
      paused: siteCount("PAUSED"),
      errored: siteCount("ERROR"),
      pages,
      openIncidents,
      changes24h: {
        critical: sevCount("CRITICAL"),
        high: sevCount("HIGH"),
        medium: sevCount("MEDIUM"),
        low: sevCount("LOW"),
        info: sevCount("INFO"),
      },
    },
    ai: {
      configured: ai.configured,
      paused: ai.paused,
      pools: aiPools,
      spentTodayUsd: (spentToday._sum.costMicroUsd ?? 0) / 1_000_000,
      jobs24h: { running: jobCount("running"), queued: jobCount("queued"), done: jobCount("done"), failed: jobCount("failed") },
      posts24h,
      postsTotal,
      rollout: ai.rollout.mode,
      recentFailures: failedJobs.map((j) => ({ id: j.id, kind: j.kind, error: (j.error ?? "Unknown error").slice(0, 120), at: j.createdAt.toISOString() })),
    },
    wordpress: {
      connected: wpConnections.length,
      versions: [...versions.entries()].map(([version, n]) => ({ version, count: n })).sort((a, b) => b.count - a.count).slice(0, 6),
      draftsQueued,
      draftsStuck,
      drafts24h,
      draftsFailed24h,
    },
    channels: {
      email24h: emailSent,
      emailFailed24h: emailFailed,
      pushDevices: pushGroups.filter((g) => g.enabled).reduce((n, g) => n + g._count._all, 0),
      pushDisabled: pushGroups.filter((g) => !g.enabled).reduce((n, g) => n + g._count._all, 0),
      appVersions: appVersions.map((r) => ({ version: r.version ?? "older", count: Number(r.count) })),
    },
    inbox: { appRequestsPending, serviceRequests7d, support24h },
    feed,
  };
}
