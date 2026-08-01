/**
 * Scheduled client report delivery (Pro, spec §37 "client-ready reports").
 * A daily sweep finds websites with a delivery cadence configured and emails
 * the branded /r/[token] report summary straight to the AGENCY'S CLIENTS -
 * the set-and-forget version of forwarding the report by hand.
 *
 * Guards: Pro entitlement is re-checked at send time (a downgraded workspace
 * silently stops sending), the report link must still be enabled, and the
 * lastSentAt update is a guarded updateMany so concurrent sweeps can never
 * double-send. One website failing never aborts the sweep.
 */

import { prisma, getWorkspaceEntitlement } from "@mykavo/database";
import { sendEmail, clientReportDeliveryEmail } from "@mykavo/email";
import {
  buildReportModel,
  isClientReportDue,
  CLIENT_REPORT_WINDOW_DAYS,
  type ClientReportCadence,
} from "@mykavo/shared";
import { gatherRawData } from "./report";
import { logger } from "./logger";

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_RECIPIENTS = 5;

const appBase = process.env.APP_URL ?? "http://localhost:3000";

/** Defensive parse of the Json? recipients column - bad shapes become []. */
export function parseRecipients(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is string => typeof v === "string")
    .map((v) => v.trim().toLowerCase())
    .filter((v) => v.includes("@"))
    .slice(0, MAX_RECIPIENTS);
}

export async function runClientReportSweep(now: Date = new Date()): Promise<void> {
  const candidates = await prisma.website.findMany({
    where: {
      reportEnabled: true,
      reportToken: { not: null },
      reportCadence: { in: ["WEEKLY", "MONTHLY"] },
      reportRecipients: { not: { equals: null } },
    },
    select: {
      id: true,
      name: true,
      url: true,
      workspaceId: true,
      reportToken: true,
      reportCadence: true,
      reportRecipients: true,
      clientReportLastSentAt: true,
      workspace: { select: { brandName: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  let sent = 0;
  let skipped = 0;
  let failures = 0;

  // Entitlements resolved once per workspace, not once per website.
  const proByWorkspace = new Map<string, boolean>();

  for (const website of candidates) {
    try {
      const cadence = website.reportCadence as ClientReportCadence;
      if (!isClientReportDue(cadence, website.clientReportLastSentAt, now)) {
        skipped++;
        continue;
      }
      const recipients = parseRecipients(website.reportRecipients);
      if (recipients.length === 0) {
        skipped++;
        continue;
      }

      // Delivery is part of white-label reports: Pro only, re-checked live.
      let pro = proByWorkspace.get(website.workspaceId);
      if (pro === undefined) {
        const ent = await getWorkspaceEntitlement(prisma, website.workspaceId);
        pro = ent?.planId === "pro";
        proByWorkspace.set(website.workspaceId, pro);
      }
      if (!pro) {
        skipped++;
        continue;
      }

      // Claim before sending: only one sweep can flip lastSentAt past the
      // due threshold, so a concurrent sweep skips instead of double-mailing.
      const claim = await prisma.website.updateMany({
        where: {
          id: website.id,
          clientReportLastSentAt: website.clientReportLastSentAt,
        },
        data: { clientReportLastSentAt: now },
      });
      if (claim.count !== 1) {
        skipped++;
        continue;
      }

      const windowDays = CLIENT_REPORT_WINDOW_DAYS[cadence as "WEEKLY" | "MONTHLY"];
      const since = new Date(now.getTime() - windowDays * DAY_MS);
      const raw = await gatherRawData(
        { id: website.id, name: website.name, url: website.url, workspaceId: website.workspaceId },
        since,
        now,
      );
      const model = buildReportModel(raw, now);
      const email = clientReportDeliveryEmail({
        websiteName: model.websiteName,
        websiteHost: model.websiteHost,
        periodLabel: model.periodLabel,
        brandName: website.workspace.brandName,
        scansRun: model.scansRun,
        totalChanges: model.totalChanges,
        uptimePercent: model.uptimePercent,
        avgResponseMs: model.avgResponseMs,
        reportUrl: `${appBase}/r/${website.reportToken}`,
      });

      const result = await sendEmail({
        to: recipients,
        subject: email.subject,
        html: email.html,
        text: email.text,
      });
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
      logger.info("client report sent", {
        websiteId: website.id,
        workspaceId: website.workspaceId,
        cadence,
        recipients: recipients.length,
        ok: result.ok,
        provider: result.provider,
      });
      sent++;
    } catch (err) {
      failures++;
      logger.error(
        "client report delivery failed",
        { websiteId: website.id, workspaceId: website.workspaceId },
        err,
      );
    }
  }

  logger.info("client report sweep finished", {
    candidates: candidates.length,
    sent,
    skipped,
    failures,
  });
}
