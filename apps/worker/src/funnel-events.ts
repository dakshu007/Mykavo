import { platformSetupOf, prisma } from "@mykavo/database";
import { hoursBetween } from "@mykavo/shared/product-events";
import { trackWorkspaceEvent } from "./product-events";

/**
 * The worker's side of the Mixpanel funnel: baseline started and completed,
 * monitoring activated, the first change ever detected, and a trial ending.
 * Each event's dedupe key makes it count once however often a job retries.
 * Every function swallows its own errors (trackWorkspaceEvent never throws,
 * and the lookups here are wrapped), so a scan never fails because of them.
 */

async function safely(fn: () => Promise<void>): Promise<void> {
  if (!process.env.MIXPANEL_TOKEN) return;
  try {
    await fn();
  } catch {
    // Analytics only: the scan's own logging covers real failures.
  }
}

async function websiteCount(workspaceId: string): Promise<number> {
  return prisma.website.count({ where: { workspaceId } });
}

/** A website's first baseline scan began. */
export function baselineStarted(input: {
  workspaceId: string;
  websiteId: string;
  pages: number;
  /** The baseline scan's creation time: stable across job retries. */
  scanCreatedAt: Date;
}): Promise<void> {
  return safely(async () => {
    const [platform, websites] = await Promise.all([platformSetupOf(prisma, input.websiteId), websiteCount(input.workspaceId)]);
    await trackWorkspaceEvent(input.workspaceId, "baseline_funnel_started", input.websiteId, () => ({
      platform_setup: platform,
      websites_count: websites,
      pages_count: input.pages,
    }), input.scanCreatedAt);
  });
}

/**
 * A baseline scan finished with pages saved, and (unless the website is
 * paused) monitoring is now on. Sends baseline_funnel_completed and
 * monitoring_activated, once per website each.
 */
export function baselineFinished(input: {
  workspaceId: string;
  websiteId: string;
  websiteCreatedAt: Date;
  pagesScanned: number;
  finishedAt: Date;
  monitoringOn: boolean;
  scanFrequency: string;
}): Promise<void> {
  return safely(async () => {
    const [platform, websites] = await Promise.all([platformSetupOf(prisma, input.websiteId), websiteCount(input.workspaceId)]);
    await trackWorkspaceEvent(input.workspaceId, "baseline_funnel_completed", input.websiteId, (ctx) => ({
      time_to_baseline_hours: hoursBetween(ctx.ownerCreatedAt, input.finishedAt),
      hours_since_website_added: hoursBetween(input.websiteCreatedAt, input.finishedAt),
      websites_count: websites,
      pages_count_per_website: input.pagesScanned,
      platform_setup: platform,
    }), input.finishedAt);
    if (!input.monitoringOn) return;
    await trackWorkspaceEvent(input.workspaceId, "monitoring_activated", input.websiteId, () => ({
      scan_frequency: input.scanFrequency.toLowerCase(),
      websites_count: websites,
      platform_setup: platform,
    }), input.finishedAt);
  });
}

const SEVERITY_RANK: Record<string, number> = { INFO: 0, LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };

/**
 * A comparison scan created change events. When they are the workspace's
 * first ever, sends first_change_detected (once per workspace).
 */
export function changesDetected(input: { workspaceId: string; scanId: string }): Promise<void> {
  return safely(async () => {
    const first = await prisma.changeEvent.findFirst({
      where: { website: { workspaceId: input.workspaceId } },
      orderBy: { createdAt: "asc" },
      select: { scanId: true, createdAt: true },
    });
    if (!first || first.scanId !== input.scanId) return;
    const [events, firstBaseline, channels] = await Promise.all([
      prisma.changeEvent.findMany({ where: { scanId: input.scanId }, select: { severity: true, category: true } }),
      prisma.baseline.findFirst({
        where: { website: { workspaceId: input.workspaceId } },
        orderBy: { createdAt: "asc" },
        select: { createdAt: true },
      }),
      prisma.notificationChannel.findMany({
        where: { workspaceId: input.workspaceId, enabled: true },
        select: { type: true },
      }),
    ]);
    const top = events.reduce<{ severity: string; category: string } | null>(
      (best, e) => (!best || SEVERITY_RANK[e.severity] > SEVERITY_RANK[best.severity] ? e : best),
      null,
    );
    const types = [...new Set(channels.map((c) => c.type.toLowerCase()))].sort();
    await trackWorkspaceEvent(input.workspaceId, "first_change_detected", input.workspaceId, (ctx) => ({
      time_to_first_change_hours: hoursBetween(firstBaseline?.createdAt ?? ctx.ownerCreatedAt, first.createdAt),
      alert_severity: top?.severity.toLowerCase() ?? null,
      change_category: top?.category.toLowerCase() ?? null,
      changes_count: events.length,
      integration_type: types.length ? types.join(",") : "email",
    }), first.createdAt);
  });
}

/** The trial sweep closed a trial. Sends trial_ended once per workspace. */
export function trialEnded(input: { workspaceId: string; planAfter: string; endedAt: Date }): Promise<void> {
  return safely(async () => {
    const [websites, pages, channels] = await Promise.all([
      prisma.website.count({ where: { workspaceId: input.workspaceId, status: { not: "PAUSED" } } }),
      prisma.monitoredPage.count({ where: { enabled: true, website: { workspaceId: input.workspaceId } } }),
      prisma.notificationChannel.count({
        where: { workspaceId: input.workspaceId, enabled: true, type: { not: "EMAIL" } },
      }),
    ]);
    await trackWorkspaceEvent(input.workspaceId, "trial_ended", input.workspaceId, (ctx) => ({
      trial_end_reason: input.planAfter === "free" ? "expired" : "upgraded",
      plan_after: input.planAfter,
      trial_length_days: Math.round((hoursBetween(ctx.trialStartedAt, ctx.trialEndsAt) ?? 0) / 24),
      monitored_websites_count: websites,
      configured_pages_count_total: pages,
      integrations_connected_count: channels,
    }), input.endedAt);
  });
}
