/**
 * LIGHTHOUSE_AUDIT job: runs a Lighthouse performance audit (on-demand or from
 * the weekly sweep) for one PerformanceAudit row and persists the scores.
 * Idempotent — a row already in a terminal state is skipped. The URL is
 * re-validated through the SSRF guard immediately before auditing (spec §11)
 * since Chrome will fetch it directly.
 *
 * After a successful run, the score is compared against the previous completed
 * audit of the SAME url; a fall that passes shouldAlertPerformanceDrop
 * (@mykavo/shared — ≥15 points off a baseline ≥30) sends a performance-drop
 * alert through the same email + channel path as the health sweep.
 */

import { prisma } from "@mykavo/database";
import { runLighthouse, LighthouseError, type LighthouseResult } from "@mykavo/scanner";
import { assertSafeUrl, UnsafeUrlError, shouldAlertPerformanceDrop } from "@mykavo/shared";
import { sendEmail, performanceDropEmail, type PerformanceDropSnapshot } from "@mykavo/email";
import { resolveEmailConfig, fanOutToChannels } from "./notify";
import { logger } from "./logger";

const dashboardBase = process.env.APP_URL ?? "http://localhost:3000";

/** Previous completed audit of the same page, for the drop comparison. */
interface PreviousAudit {
  performanceScore: number | null;
  accessibilityScore: number | null;
  bestPracticesScore: number | null;
  seoScore: number | null;
  lcpMs: number | null;
}

function fmtScoreLine(name: string, prev: number | null, curr: number | null): string {
  if (prev === null || curr === null) return `${name}: —`;
  const d = curr - prev;
  const signed = d === 0 ? "±0" : d > 0 ? `+${d}` : String(d);
  return `${name}: ${prev} → ${curr} (${signed})`;
}

/**
 * Send the performance-drop alert for a just-completed audit. Mirrors
 * alertHealth (apps/worker/src/health.ts): muteAlertsUntil suppression, email
 * gated on the workspace's failureAlerts flag with Notification bookkeeping,
 * then fan-out to chat channels. Never throws to the caller.
 */
async function alertPerformanceDrop(
  audit: { id: string; websiteId: string; url: string },
  previous: PreviousAudit & { performanceScore: number },
  current: LighthouseResult & { performanceScore: number },
): Promise<void> {
  const website = await prisma.website.findUnique({
    where: { id: audit.websiteId },
    select: { id: true, name: true, url: true, workspaceId: true, muteAlertsUntil: true },
  });
  if (!website) return;

  // Maintenance window (spec §25): scores are already persisted — just don't
  // send anything (no emails, channels, or rows).
  if (website.muteAlertsUntil && website.muteAlertsUntil > new Date()) {
    logger.info("alerts muted, skipped", {
      auditId: audit.id,
      websiteId: website.id,
      workspaceId: website.workspaceId,
      muteAlertsUntil: website.muteAlertsUntil.toISOString(),
    });
    return;
  }

  const host = (() => {
    try {
      return new URL(website.url).hostname;
    } catch {
      return website.url;
    }
  })();
  const pagePath = (() => {
    try {
      const u = new URL(audit.url);
      return u.pathname + u.search;
    } catch {
      return "/";
    }
  })();
  const dashboardUrl = `${dashboardBase}/dashboard/websites/${website.id}`;

  const prevSnapshot: PerformanceDropSnapshot = {
    performance: previous.performanceScore,
    accessibility: previous.accessibilityScore,
    bestPractices: previous.bestPracticesScore,
    seo: previous.seoScore,
    lcpMs: previous.lcpMs,
  };
  const currSnapshot: PerformanceDropSnapshot = {
    performance: current.performanceScore,
    accessibility: current.accessibilityScore,
    bestPractices: current.bestPracticesScore,
    seo: current.seoScore,
    lcpMs: current.lcpMs,
  };

  const email = performanceDropEmail({
    websiteName: website.name,
    websiteHost: host,
    pagePath,
    previous: prevSnapshot,
    current: currSnapshot,
    dashboardUrl,
  });

  const config = await resolveEmailConfig(website.workspaceId);
  if (config?.failureAlerts) {
    const result = await sendEmail({
      to: config.recipients,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });
    await prisma.notification.create({
      data: {
        workspaceId: website.workspaceId,
        websiteId: website.id,
        channelType: "EMAIL",
        recipient: config.recipients.join(", "),
        subject: email.subject,
        status: result.ok ? "SENT" : "FAILED",
        sentAt: result.ok ? new Date() : null,
        errorMessage: result.error ?? null,
      },
    });
    logger.info("performance drop alert sent", {
      auditId: audit.id,
      websiteId: website.id,
      workspaceId: website.workspaceId,
      ok: result.ok,
      previous: previous.performanceScore,
      current: current.performanceScore,
    });
  }

  await fanOutToChannels(website.workspaceId, website.id, null, {
    title: `\u{1F4C9} Performance dropped on ${host}: ${previous.performanceScore} → ${current.performanceScore}`,
    lines: [
      `Page: ${host}${pagePath}`,
      fmtScoreLine("Performance", previous.performanceScore, current.performanceScore),
      fmtScoreLine("Accessibility", previous.accessibilityScore, current.accessibilityScore),
      fmtScoreLine("Best Practices", previous.bestPracticesScore, current.bestPracticesScore),
      fmtScoreLine("SEO", previous.seoScore, current.seoScore),
    ],
    url: dashboardUrl,
    severity: "HIGH",
  });
}

export async function runLighthouseAuditJob(auditId: string): Promise<void> {
  const audit = await prisma.performanceAudit.findUnique({ where: { id: auditId } });
  if (!audit) {
    logger.warn("audit not found — dropping job", { auditId });
    return;
  }
  if (audit.status === "COMPLETED" || audit.status === "FAILED") {
    logger.info("audit already finished — skipping", { auditId, status: audit.status });
    return;
  }

  const log = { auditId, websiteId: audit.websiteId };
  await prisma.performanceAudit.update({ where: { id: auditId }, data: { status: "RUNNING" } });

  // SSRF revalidation right before Chrome fetches the URL (spec §11).
  try {
    await assertSafeUrl(audit.url);
  } catch (err) {
    const code =
      err instanceof UnsafeUrlError && err.code === "DNS_FAILURE" ? "DNS_FAILURE" : "UNSAFE_URL";
    await prisma.performanceAudit.update({
      where: { id: auditId },
      data: {
        status: "FAILED",
        errorCode: code,
        errorMessage: err instanceof Error ? err.message.slice(0, 500) : "Unsafe URL",
        completedAt: new Date(),
      },
    });
    logger.warn("audit URL rejected by SSRF guard", { ...log, code });
    return;
  }

  try {
    const result = await runLighthouse(audit.url);
    await prisma.performanceAudit.update({
      where: { id: auditId },
      data: { status: "COMPLETED", ...result, completedAt: new Date() },
    });
    logger.info("audit completed", { ...log, performance: result.performanceScore });

    // Performance-drop check against the previous completed audit of the SAME
    // url. First audits, missing scores, and low baselines never alert
    // (shouldAlertPerformanceDrop, unit-tested in @mykavo/shared).
    const previous = await prisma.performanceAudit.findFirst({
      where: {
        websiteId: audit.websiteId,
        url: audit.url,
        status: "COMPLETED",
        id: { not: audit.id },
        createdAt: { lt: audit.createdAt },
      },
      orderBy: { createdAt: "desc" },
      select: {
        performanceScore: true,
        accessibilityScore: true,
        bestPracticesScore: true,
        seoScore: true,
        lcpMs: true,
      },
    });
    if (
      previous !== null &&
      previous.performanceScore !== null &&
      result.performanceScore !== null &&
      shouldAlertPerformanceDrop(previous.performanceScore, result.performanceScore)
    ) {
      try {
        await alertPerformanceDrop(
          { id: audit.id, websiteId: audit.websiteId, url: audit.url },
          { ...previous, performanceScore: previous.performanceScore },
          { ...result, performanceScore: result.performanceScore },
        );
      } catch (alertErr) {
        // The audit itself succeeded — a notification failure must never fail
        // the job (a retry would just skip the terminal row anyway).
        logger.error("performance drop alert failed", log, alertErr as Error);
      }
    }
  } catch (err) {
    const code = err instanceof LighthouseError ? err.code : "AUDIT_FAILED";
    await prisma.performanceAudit.update({
      where: { id: auditId },
      data: {
        status: "FAILED",
        errorCode: code,
        errorMessage: err instanceof Error ? err.message.slice(0, 500) : "Audit failed",
        completedAt: new Date(),
      },
    });
    logger.error("audit failed", { ...log, code }, err);
  }
}
