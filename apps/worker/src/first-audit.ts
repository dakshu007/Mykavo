/**
 * Day-one site audit. When a new website's first baseline is ready, run the
 * same technical SEO site audit a customer can start from the dashboard,
 * once, automatically. The activation sweep then emails the score and the
 * top issues ("First site audit" in Admin > Automations).
 *
 * Why: a quiet site can go two weeks without a single change, and a new
 * account that saw nothing looks like a product that did nothing. 6 of 15 trial
 * websites with a baseline never saw a change. An audit gives every new
 * account something real about their own site on day one.
 *
 * Runs with the hourly activation sweep. Only websites added in the last
 * 7 days with no audit at all, so it never back-fills old sites, and a site
 * whose owner already ran an audit is left alone. The audit counts towards
 * that day's plan quota like a manual one.
 */

import type { PgBoss } from "pg-boss";
import { prisma, getWorkspaceEntitlement } from "@mykavo/database";
import { SITE_AUDIT_QUEUE, type SiteAuditJob } from "@mykavo/shared";
import { PLAN_SITE_AUDIT_PAGES, type PlanTier } from "@mykavo/shared/plan-tier";
import { logger } from "./logger";

const DAY_MS = 24 * 60 * 60 * 1000;
/** New websites only. */
const NEW_WEBSITE_DAYS = 7;
/** Audits queue one at a time anyway; this bounds a backlog after downtime. */
const PER_RUN = 10;
/** Seconds between queued audits, so they don't all start at once. */
const STAGGER_SECONDS = 90;

export function auditPagesFor(planId: string | null | undefined): number {
  return PLAN_SITE_AUDIT_PAGES[(planId ?? "free") as PlanTier] ?? PLAN_SITE_AUDIT_PAGES.free;
}

export async function queueFirstSiteAudits(boss: PgBoss): Promise<number> {
  const websites = await prisma.website.findMany({
    where: {
      status: "ACTIVE",
      createdAt: { gte: new Date(Date.now() - NEW_WEBSITE_DAYS * DAY_MS) },
      siteAudits: { none: {} },
      scans: { some: { triggerType: "BASELINE", status: { in: ["COMPLETED", "PARTIAL"] }, pagesScanned: { gt: 0 } } },
    },
    orderBy: { createdAt: "asc" },
    take: PER_RUN,
    select: { id: true, workspaceId: true },
  });

  let queued = 0;
  for (const site of websites) {
    try {
      const entitlement = await getWorkspaceEntitlement(prisma, site.workspaceId);
      const audit = await prisma.siteAudit.create({ data: { websiteId: site.id }, select: { id: true } });
      const job: SiteAuditJob = { siteAuditId: audit.id, maxPages: auditPagesFor(entitlement?.planId) };
      await boss.send(SITE_AUDIT_QUEUE, { ...job }, { startAfter: queued * STAGGER_SECONDS });
      queued++;
    } catch (err) {
      logger.error("first site audit could not be queued", { websiteId: site.id, workspaceId: site.workspaceId }, err);
    }
  }
  if (queued > 0) logger.info("first site audits queued", { queued });
  return queued;
}
