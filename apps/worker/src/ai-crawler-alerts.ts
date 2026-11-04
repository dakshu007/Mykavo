/**
 * Daily AI crawler alerts for connected WordPress sites (AI Insights:
 * Starter, Pro, Agency). Reads the visits the MyKavo plugin uploads
 * (ai_crawler_visit) and emails the owner when
 *
 *   - an AI crawler appears on the site for the first time ever, or
 *   - AI crawlers were answered with errors on 5 or more visits in a day.
 *
 * What counts is decided in @mykavo/shared pickAiCrawlerAlerts (pure,
 * tested). At most one email per website a day; every new crawler and every
 * error day is alerted on once (ai_crawler_alert). Spends the ACTIVATION
 * share of the email budget and is skipped for workspaces that switched
 * email off and for websites with alerts muted.
 */

import { Prisma, getWorkspaceEntitlement, prisma } from "@mykavo/database";
import { aiCrawlerAlertEmail, sendEmail } from "@mykavo/email";
import {
  aiAlertKey,
  aiVisitAgent,
  includesWpAiInsights,
  pickAiCrawlerAlerts,
  shiftDay,
  toPlanTier,
  AI_ALERT_ERROR_DAYS,
  AI_ALERT_NEW_AGENT_LOOKBACK_DAYS,
} from "@mykavo/shared";
import { activationEmailAllowance } from "./activation-email";
import { resolveEmailConfig } from "./notify";
import { logger } from "./logger";

const SEND_GAP_MS = 700;
const appBase = (process.env.APP_URL ?? "https://mykavo.app").replace(/\/+$/, "");
const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const asDate = (day: string) => new Date(`${day}T00:00:00Z`);
const asDay = (date: Date) => date.toISOString().slice(0, 10);

function hostOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function isUniqueViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}

export async function runAiCrawlerAlertSweep(now: Date = new Date()): Promise<void> {
  const today = asDay(now);
  const recentSince = asDate(shiftDay(today, Math.max(AI_ALERT_NEW_AGENT_LOOKBACK_DAYS, AI_ALERT_ERROR_DAYS)));

  const websites = await prisma.website.findMany({
    where: {
      siteConnections: { some: { platform: "wordpress", revokedAt: null } },
      aiCrawlerVisits: { some: { day: { gte: recentSince } } },
    },
    select: {
      id: true,
      name: true,
      url: true,
      workspaceId: true,
      muteAlertsUntil: true,
      workspace: { select: { owner: { select: { email: true } } } },
    },
    orderBy: { createdAt: "asc" },
  });
  if (websites.length === 0) {
    logger.info("ai crawler alert sweep finished", { websites: 0, emails: 0 });
    return;
  }

  let budget = await activationEmailAllowance();
  const planByWorkspace = new Map<string, boolean>();
  let emails = 0;

  for (const site of websites) {
    if (budget <= 0) break;
    try {
      if (site.muteAlertsUntil && site.muteAlertsUntil > now) continue;

      let allowed = planByWorkspace.get(site.workspaceId);
      if (allowed === undefined) {
        const ent = await getWorkspaceEntitlement(prisma, site.workspaceId);
        allowed = ent ? includesWpAiInsights(toPlanTier(ent.planId)) : false;
        planByWorkspace.set(site.workspaceId, allowed);
      }
      if (!allowed) continue;

      const [first, errorRows, alertRows] = await Promise.all([
        prisma.aiCrawlerVisit.groupBy({ by: ["agent"], where: { websiteId: site.id }, _min: { day: true } }),
        prisma.aiCrawlerVisit.groupBy({
          by: ["day"],
          where: { websiteId: site.id, day: { gte: asDate(shiftDay(today, AI_ALERT_ERROR_DAYS)), lt: asDate(today) } },
          _sum: { errors: true },
        }),
        prisma.aiCrawlerAlert.findMany({
          where: { websiteId: site.id, kind: { in: ["new_agent", "errors"] }, day: { gte: asDate(shiftDay(today, 30)) } },
          select: { kind: true, agent: true, day: true },
        }),
      ]);

      const firstSeen: Record<string, string> = {};
      for (const f of first) if (f._min.day) firstSeen[f.agent] = asDay(f._min.day);
      const errorsByDay: Record<string, number> = {};
      for (const e of errorRows) errorsByDay[asDay(e.day)] = e._sum.errors ?? 0;
      const alerted = new Set(
        alertRows.map((a) => aiAlertKey(a.kind === "errors" ? "errors" : "new_agent", a.agent, asDay(a.day))),
      );

      const pick = pickAiCrawlerAlerts({ firstSeen, errorsByDay, alerted, today });
      if (pick.newAgents.length === 0 && pick.errorDays.length === 0) continue;

      const owner = site.workspace.owner.email;
      const config = await resolveEmailConfig(site.workspaceId);
      if (!owner || !config) continue; // email switched off

      // One email per website a day: the claim row is unique per day.
      try {
        await prisma.aiCrawlerAlert.create({ data: { websiteId: site.id, kind: "email", agent: "*", day: asDate(today) } });
      } catch (err) {
        if (isUniqueViolation(err)) continue;
        throw err;
      }
      const items = [
        ...pick.newAgents.map((a) => ({ websiteId: site.id, kind: "new_agent", agent: a.agent, day: asDate(a.day) })),
        ...pick.errorDays.map((d) => ({ websiteId: site.id, kind: "errors", agent: "*", day: asDate(d.day) })),
      ];
      await prisma.aiCrawlerAlert.createMany({ data: items, skipDuplicates: true });

      const host = hostOf(site.url);
      const mail = aiCrawlerAlertEmail({
        websiteName: site.name,
        websiteHost: host,
        newAgents: pick.newAgents.map((a) => ({ ...a, owner: aiVisitAgent(a.agent)?.owner ?? null })),
        errorDays: pick.errorDays,
        dashboardUrl: `${appBase}/dashboard/websites/${site.id}`,
      });

      if (emails > 0) await pause(SEND_GAP_MS);
      const result = await sendEmail({ to: [owner], subject: mail.subject, html: mail.html, text: mail.text });
      await prisma.notification.create({
        data: {
          workspaceId: site.workspaceId,
          websiteId: site.id,
          channelType: "EMAIL",
          recipient: owner,
          subject: mail.subject,
          status: result.ok ? "SENT" : "FAILED",
          sentAt: result.ok ? new Date() : null,
          errorMessage: result.error ?? null,
        },
      });
      budget--;
      if (!result.ok) {
        // Not sent: release the claims so tomorrow's run can try again.
        await prisma.aiCrawlerAlert.deleteMany({
          where: {
            websiteId: site.id,
            OR: [{ kind: "email", agent: "*", day: asDate(today) }, ...items.map(({ kind, agent, day }) => ({ kind, agent, day }))],
          },
        });
        logger.warn("ai crawler alert email failed; stopping this run", { websiteId: site.id, error: result.error });
        break;
      }
      emails++;
      logger.info("ai crawler alert sent", {
        websiteId: site.id,
        workspaceId: site.workspaceId,
        newAgents: pick.newAgents.length,
        errorDays: pick.errorDays.length,
      });
    } catch (err) {
      logger.error("ai crawler alert failed", { websiteId: site.id, workspaceId: site.workspaceId }, err);
    }
  }

  logger.info("ai crawler alert sweep finished", { websites: websites.length, emails });
}
