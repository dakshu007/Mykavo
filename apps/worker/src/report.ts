/**
 * Weekly report sweep (spec §37 "client-ready reports"). Runs on a pg-boss
 * cron every REPORT_CRON (default Monday 08:00 UTC): for every ACTIVE website
 * whose workspace has weekly reports enabled, gather the last 7 days —
 * scans run/failed, changes by severity, uptime, SSL expiry, latest
 * Lighthouse scores — and send ONE client-forwardable email per website.
 * All presentation shaping lives in @mykavo/shared `buildReportModel`
 * (pure, unit-tested); this module only does the IO.
 */

import { prisma, getUptimeStats } from "@mykavo/database";
import { sendEmail, weeklyReportEmail } from "@mykavo/email";
import { buildReportModel, type ReportRawData, type ReportSeverity } from "@mykavo/shared";
import { resolveEmailConfig } from "./notify";
import { logger } from "./logger";

const DAY_MS = 24 * 60 * 60 * 1000;
const REPORT_WINDOW_DAYS = 7;

const dashboardBase = process.env.APP_URL ?? "http://localhost:3000";

interface ReportWebsite {
  id: string;
  name: string;
  url: string;
  workspaceId: string;
}

interface WorkspaceReportConfig {
  recipients: string[];
  weeklyReports: boolean;
}

/**
 * Resolve recipients (via the shared email-channel resolution in ./notify)
 * plus the weekly-report preference. `weeklyReports` defaults to TRUE when
 * absent from the channel configuration — existing workspaces opt out, not in.
 */
async function resolveReportConfig(workspaceId: string): Promise<WorkspaceReportConfig | null> {
  const emailConfig = await resolveEmailConfig(workspaceId);
  if (!emailConfig) return null;

  const channel = await prisma.notificationChannel.findUnique({
    where: { workspaceId_type: { workspaceId, type: "EMAIL" } },
    select: { configuration: true },
  });
  const cfg = channel?.configuration as { weeklyReports?: boolean } | null | undefined;
  return {
    recipients: emailConfig.recipients,
    weeklyReports: cfg?.weeklyReports ?? true,
  };
}

/** Gather the raw 7-day numbers for one website. */
async function gatherRawData(
  website: ReportWebsite,
  since: Date,
  now: Date,
): Promise<ReportRawData> {
  const host = (() => {
    try {
      return new URL(website.url).hostname;
    } catch {
      return website.url;
    }
  })();

  const scanWindow = { websiteId: website.id, createdAt: { gte: since } };
  const [scansRun, scansFailed, severityGroups, uptime, sslCheck, audit] = await Promise.all([
    prisma.scan.count({ where: scanWindow }),
    prisma.scan.count({ where: { ...scanWindow, status: "FAILED" } }),
    prisma.changeEvent.groupBy({
      by: ["severity"],
      where: { websiteId: website.id, detectedAt: { gte: since } },
      _count: { _all: true },
    }),
    getUptimeStats(prisma, { websiteId: website.id, since }),
    prisma.healthCheck.findFirst({
      where: { websiteId: website.id, sslValidTo: { not: null } },
      orderBy: { checkedAt: "desc" },
      select: { sslValidTo: true },
    }),
    prisma.performanceAudit.findFirst({
      where: { websiteId: website.id, status: "COMPLETED" },
      orderBy: { createdAt: "desc" },
      select: {
        performanceScore: true,
        accessibilityScore: true,
        bestPracticesScore: true,
        seoScore: true,
      },
    }),
  ]);

  const changesBySeverity: Partial<Record<ReportSeverity, number>> = {};
  for (const group of severityGroups) {
    changesBySeverity[group.severity as ReportSeverity] = group._count._all;
  }

  return {
    websiteName: website.name,
    websiteHost: host,
    periodStart: since,
    periodEnd: now,
    scansRun,
    scansFailed,
    changesBySeverity,
    uptimePercent: uptime.uptimePercent,
    avgResponseTimeMs: uptime.avgResponseTimeMs,
    sslValidTo: sslCheck?.sslValidTo ?? null,
    lighthouse: audit
      ? {
          performance: audit.performanceScore,
          accessibility: audit.accessibilityScore,
          bestPractices: audit.bestPracticesScore,
          seo: audit.seoScore,
        }
      : null,
    dashboardUrl: `${dashboardBase}/dashboard/websites/${website.id}`,
  };
}

/** Build and send one website's report, recording a Notification row. */
async function reportWebsite(
  website: ReportWebsite,
  recipients: string[],
  since: Date,
  now: Date,
): Promise<void> {
  const raw = await gatherRawData(website, since, now);
  const email = weeklyReportEmail(buildReportModel(raw, now));

  const result = await sendEmail({
    to: recipients,
    subject: email.subject,
    html: email.html,
    text: email.text,
  });
  // Mirror ./notify bookkeeping — one Notification row per send, scanId null
  // (a report summarizes a period, not a single scan).
  await prisma.notification.create({
    data: {
      workspaceId: website.workspaceId,
      websiteId: website.id,
      scanId: null,
      channelType: "EMAIL",
      recipient: recipients.join(", "),
      subject: email.subject,
      status: result.ok ? "SENT" : "FAILED",
      sentAt: result.ok ? new Date() : null,
      errorMessage: result.error ?? null,
    },
  });
  logger.info("weekly report sent", {
    websiteId: website.id,
    workspaceId: website.workspaceId,
    ok: result.ok,
    provider: result.provider,
    allQuiet: raw.scansRun === 0 && Object.keys(raw.changesBySeverity).length === 0,
  });
}

/**
 * Send weekly reports for every eligible ACTIVE website. One website failing
 * never aborts the sweep. Websites created less than 24h ago are skipped —
 * a report covering a few hours of data reads as broken, not reassuring.
 */
export async function runReportSweep(now: Date = new Date()): Promise<void> {
  const since = new Date(now.getTime() - REPORT_WINDOW_DAYS * DAY_MS);
  const websites = await prisma.website.findMany({
    where: { status: "ACTIVE", createdAt: { lte: new Date(now.getTime() - DAY_MS) } },
    select: { id: true, name: true, url: true, workspaceId: true },
    orderBy: { createdAt: "asc" },
  });
  if (websites.length === 0) {
    logger.info("report sweep finished", { websites: 0, sent: 0, skipped: 0, failures: 0 });
    return;
  }

  // Resolve each workspace's config once, not once per website.
  const configByWorkspace = new Map<string, WorkspaceReportConfig | null>();
  let sent = 0;
  let skipped = 0;
  let failures = 0;

  for (const website of websites) {
    try {
      let config = configByWorkspace.get(website.workspaceId);
      if (config === undefined) {
        config = await resolveReportConfig(website.workspaceId);
        configByWorkspace.set(website.workspaceId, config);
      }
      if (!config || !config.weeklyReports || config.recipients.length === 0) {
        skipped++;
        continue;
      }
      await reportWebsite(website, config.recipients, since, now);
      sent++;
    } catch (err) {
      failures++;
      logger.error(
        "weekly report failed",
        { websiteId: website.id, workspaceId: website.workspaceId },
        err as Error,
      );
    }
  }

  logger.info("report sweep finished", { websites: websites.length, sent, skipped, failures });
}
