/**
 * Notification engine (spec §27). After a scan, send ONE grouped email per
 * website summarizing changes at or above the workspace's severity threshold,
 * or a failure alert when the scan failed. Records every send as a
 * Notification row. Never one email per change.
 */

import { prisma, type ChangeSeverity } from "@fluxen/database";
import {
  sendEmail,
  scanSummaryEmail,
  failureAlertEmail,
  type ChangeLine,
  type Severity,
} from "@fluxen/email";
import { logger } from "./logger";

const SEVERITY_RANK: Record<Severity, number> = {
  INFO: 0,
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4,
};

interface ChannelConfig {
  recipients: string[];
  minSeverity: Severity;
  failureAlerts: boolean;
}

const DEFAULT_MIN_SEVERITY: Severity = "HIGH";

/** Resolve the workspace's email channel config, falling back to owner email. */
async function resolveEmailConfig(workspaceId: string): Promise<ChannelConfig | null> {
  const channel = await prisma.notificationChannel.findUnique({
    where: { workspaceId_type: { workspaceId, type: "EMAIL" } },
  });

  if (channel) {
    if (!channel.enabled) return null;
    const cfg = channel.configuration as Partial<ChannelConfig> | null;
    const recipients = Array.isArray(cfg?.recipients) ? cfg!.recipients : [];
    if (recipients.length === 0) return null;
    return {
      recipients,
      minSeverity: cfg?.minSeverity ?? DEFAULT_MIN_SEVERITY,
      failureAlerts: cfg?.failureAlerts ?? true,
    };
  }

  // No channel configured yet — default to the workspace owner's email.
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    include: { owner: { select: { email: true } } },
  });
  if (!workspace?.owner.email) return null;
  return {
    recipients: [workspace.owner.email],
    minSeverity: DEFAULT_MIN_SEVERITY,
    failureAlerts: true,
  };
}

function pagePath(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname + u.search;
  } catch {
    return url;
  }
}

const dashboardBase = process.env.APP_URL ?? "http://localhost:3000";

async function record(
  workspaceId: string,
  websiteId: string,
  scanId: string,
  recipients: string[],
  subject: string,
  result: { ok: boolean; error?: string },
): Promise<void> {
  await prisma.notification.create({
    data: {
      workspaceId,
      websiteId,
      scanId,
      channelType: "EMAIL",
      recipient: recipients.join(", "),
      subject,
      status: result.ok ? "SENT" : "FAILED",
      sentAt: result.ok ? new Date() : null,
      errorMessage: result.error ?? null,
    },
  });
}

/**
 * Send notifications for a finished scan. Returns whether an email was sent.
 */
export async function notifyForScan(scanId: string): Promise<boolean> {
  const scan = await prisma.scan.findUnique({
    where: { id: scanId },
    include: {
      website: { select: { id: true, name: true, url: true, workspaceId: true } },
    },
  });
  if (!scan) return false;

  const { website } = scan;
  const host = (() => {
    try {
      return new URL(website.url).hostname;
    } catch {
      return website.url;
    }
  })();
  const scanTime = (scan.completedAt ?? scan.createdAt).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const config = await resolveEmailConfig(website.workspaceId);
  if (!config) return false;

  // Failure alert (spec §27 failure alerts).
  if (scan.status === "FAILED") {
    if (!config.failureAlerts) return false;
    const email = failureAlertEmail({
      websiteName: website.name,
      websiteHost: host,
      scanTime,
      reason:
        scan.errorMessage ??
        "Every monitored page failed to scan. The site may be down or blocking requests.",
      dashboardUrl: `${dashboardBase}/dashboard/websites/${website.id}`,
    });
    const result = await sendEmail({ to: config.recipients, subject: email.subject, html: email.html, text: email.text });
    await record(website.workspaceId, website.id, scan.id, config.recipients, email.subject, result);
    logger.info("failure alert sent", { scanId, ok: result.ok, provider: result.provider });
    return result.ok;
  }

  // Change summary — only NEW changes at or above the threshold.
  const minRank = SEVERITY_RANK[config.minSeverity];
  const changes = await prisma.changeEvent.findMany({
    where: { scanId, status: "NEW" },
    include: { monitoredPage: { select: { url: true } } },
    orderBy: { detectedAt: "desc" },
  });
  const eligible = changes.filter(
    (c) => SEVERITY_RANK[c.severity as Severity] >= minRank,
  );
  if (eligible.length === 0) return false;

  const severityRank = (s: ChangeSeverity) => SEVERITY_RANK[s as Severity];
  const highest = eligible.reduce<Severity>(
    (top, c) => (severityRank(c.severity) > SEVERITY_RANK[top] ? (c.severity as Severity) : top),
    "INFO",
  );

  const lines: ChangeLine[] = eligible
    .slice(0, 20)
    .map((c) => ({
      severity: c.severity as Severity,
      title: c.title,
      pagePath: pagePath(c.monitoredPage.url),
    }));

  const email = scanSummaryEmail({
    websiteName: website.name,
    websiteHost: host,
    scanTime,
    totalChanges: eligible.length,
    highestSeverity: highest,
    changes: lines,
    dashboardUrl: `${dashboardBase}/dashboard/changes?website=${website.id}`,
  });

  const result = await sendEmail({ to: config.recipients, subject: email.subject, html: email.html, text: email.text });
  await record(website.workspaceId, website.id, scan.id, config.recipients, email.subject, result);
  logger.info("scan summary sent", {
    scanId,
    changes: eligible.length,
    highest,
    ok: result.ok,
    provider: result.provider,
  });
  return result.ok;
}
