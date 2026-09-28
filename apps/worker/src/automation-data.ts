/**
 * What the automated emails need to know about one account: the facts the
 * lifecycle rules and flow decisions are answered from, and the real data
 * each built-in email is rendered with. Shared by the lifecycle series and
 * the Automation Tool's flow engine so both see an account the same way.
 */

import { getWorkspaceEntitlement, prisma } from "@mykavo/database";
import { type AutomationData, type AutomationKey } from "@mykavo/email";
import { PLAN_PRICES_USD, type FlowFacts } from "@mykavo/shared";
import { resolveEmailConfig } from "./notify";

export const appBase = (process.env.APP_URL ?? "https://mykavo.app").replace(/\/+$/, "");

export interface AccountCtx {
  userId: string;
  /** Already made presentable (displayPersonName). */
  name: string;
  /** Lowercased. */
  email: string;
  workspaceId: string;
  pushDevices: number;
}

export interface AccountFacts extends FlowFacts {
  optedOut: boolean;
  /** The workspace switched email off in Notifications. */
  emailOff: boolean;
  websites: number;
}

/**
 * Throws when the email_opt_out table is missing: nobody can then be
 * checked for an unsubscribe, so callers send nothing (fail closed).
 */
export async function gatherFacts(ctx: AccountCtx): Promise<AccountFacts> {
  const inWorkspace = { website: { workspaceId: ctx.workspaceId }, status: "NEW" as const };
  const [optOut, websites, entitlement, emailConfig, appRequest, openChanges, urgentChanges] = await Promise.all([
    prisma.emailOptOut.findUnique({ where: { email: ctx.email }, select: { id: true } }),
    prisma.website.count({ where: { workspaceId: ctx.workspaceId } }),
    getWorkspaceEntitlement(prisma, ctx.workspaceId),
    resolveEmailConfig(ctx.workspaceId),
    prisma.appAccessRequest.findUnique({ where: { email: ctx.email }, select: { id: true } }),
    prisma.changeEvent.count({ where: inWorkspace }),
    prisma.changeEvent.count({ where: { ...inWorkspace, severity: { in: ["HIGH", "CRITICAL"] } } }),
  ]);
  return {
    optedOut: Boolean(optOut),
    emailOff: !emailConfig,
    websites,
    has_website: websites > 0,
    is_paid: (entitlement?.planId ?? "free") !== "free",
    has_android_app: Boolean(appRequest) || ctx.pushDevices > 0,
    has_open_changes: openChanges > 0,
    has_urgent_changes: urgentChanges > 0,
  };
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

/**
 * Real data for one built-in email to one account. Null when there is
 * nothing true to say yet - a "baseline ready" email for an account whose
 * first baseline has not finished.
 */
export async function buildAutomationData(
  key: AutomationKey,
  ctx: AccountCtx,
  unsubscribeUrl: string,
): Promise<AutomationData | null> {
  const { name } = ctx;
  switch (key) {
    case "welcome":
      return {
        key,
        data: {
          name,
          addWebsiteUrl: `${appBase}/dashboard/websites/new`,
          alertsUrl: `${appBase}/dashboard/notifications`,
          docsUrl: `${appBase}/docs`,
        },
      };
    case "first_website":
      return { key, data: { name, addWebsiteUrl: `${appBase}/dashboard/websites/new`, docsUrl: `${appBase}/docs` } };
    case "baseline_ready": {
      const scan = await prisma.scan.findFirst({
        where: {
          triggerType: "BASELINE",
          status: { in: ["COMPLETED", "PARTIAL"] },
          pagesScanned: { gt: 0 },
          website: { workspaceId: ctx.workspaceId },
        },
        orderBy: { completedAt: "desc" },
        select: {
          pagesScanned: true,
          website: { select: { id: true, name: true, url: true, scanFrequency: true, nextScanAt: true } },
        },
      });
      if (!scan) return null;
      const config = await resolveEmailConfig(ctx.workspaceId);
      const site = scan.website;
      return {
        key,
        data: {
          websiteName: site.name,
          websiteHost: hostOf(site.url),
          pagesScanned: scan.pagesScanned,
          websiteUrl: `${appBase}/dashboard/websites/${site.id}`,
          nextScan: site.nextScanAt
            ? site.nextScanAt.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" })
            : null,
          frequency: site.scanFrequency === "DAILY" ? "Daily" : "Weekly",
          alertRecipients: config?.recipients ?? [ctx.email],
          alertsUrl: `${appBase}/dashboard/notifications`,
        },
      };
    }
    case "day3_stats": {
      const websiteFilter = { website: { workspaceId: ctx.workspaceId } };
      const [websitesCount, pagesMonitored, scansCompleted, changesFound, openChanges, urgentChanges] = await Promise.all([
        prisma.website.count({ where: { workspaceId: ctx.workspaceId } }),
        prisma.monitoredPage.count({ where: { ...websiteFilter, enabled: true } }),
        prisma.scan.count({ where: { ...websiteFilter, status: { in: ["COMPLETED", "PARTIAL"] } } }),
        prisma.changeEvent.count({ where: websiteFilter }),
        prisma.changeEvent.count({ where: { ...websiteFilter, status: "NEW" } }),
        prisma.changeEvent.count({ where: { ...websiteFilter, status: "NEW", severity: { in: ["HIGH", "CRITICAL"] } } }),
      ]);
      return {
        key,
        data: {
          name,
          websitesCount,
          pagesMonitored,
          scansCompleted,
          changesFound,
          openChanges,
          urgentChanges,
          dashboardUrl: `${appBase}/dashboard`,
          changesUrl: `${appBase}/dashboard/changes`,
          unsubscribeUrl,
        },
      };
    }
    case "day3_setup":
      return {
        key,
        data: { name, addWebsiteUrl: `${appBase}/dashboard/websites/new`, tutorialsUrl: `${appBase}/video-tutorials`, unsubscribeUrl },
      };
    case "day6_android": {
      const config = await resolveEmailConfig(ctx.workspaceId);
      return {
        key,
        data: {
          name,
          androidUrl: `${appBase}/android-app`,
          alertEmail: config?.recipients[0] ?? ctx.email,
          notificationsUrl: `${appBase}/dashboard/notifications`,
          unsubscribeUrl,
        },
      };
    }
    case "day10_offer":
      // Code, percent, price and day come from the saved settings.
      return { key, data: { name, regularPrice: PLAN_PRICES_USD.pro, upgradeUrl: `${appBase}/dashboard/billing`, unsubscribeUrl } };
  }
}

/** The same data with the email's own unsubscribe link, for emails that carry one. */
export function withUnsubscribe(d: AutomationData, unsubscribeUrl: string): AutomationData {
  return "unsubscribeUrl" in d.data ? ({ ...d, data: { ...d.data, unsubscribeUrl } } as AutomationData) : d;
}
