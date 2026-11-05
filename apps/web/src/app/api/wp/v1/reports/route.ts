import { NextResponse } from "next/server";
import { prisma, getLatestHealthCheck, getUptimeStats } from "@mykavo/database";
import { appBaseUrl } from "@/lib/app-url";
import { getWorkspacePlan } from "@/lib/limits";
import { formatReportPeriod, REPORT_WINDOW_DAYS } from "@/lib/client-report";
import { authenticateSiteRequest, unauthorizedSite } from "@/lib/integrations/site-auth";
import { buildReportSummary } from "@/lib/integrations/wp-reports";

/**
 * WordPress plugin 1.3.0, Reports tab: this website's white-label client
 * report (the live /r/[token] page, last 30 days) with its headline numbers,
 * and the workspace branding it uses. Plans with white-label reports only.
 */
export async function GET(request: Request) {
  const ctx = await authenticateSiteRequest(request);
  if (!ctx) return unauthorizedSite();
  const plan = await getWorkspacePlan(ctx.workspaceId);
  if (!plan.limits.whiteLabelReports) {
    return NextResponse.json(
      { error: "White-label client reports come with the Agency plan.", reason: "PLAN" },
      { status: 403 },
    );
  }

  const websiteId = ctx.website.id;
  const now = new Date();
  const since = new Date(now.getTime() - REPORT_WINDOW_DAYS * 86_400_000);
  const [website, workspace, updates, uptime, latestCheck, changesCaught, aiVisits] = await Promise.all([
    prisma.website.findUnique({ where: { id: websiteId }, select: { id: true, reportEnabled: true, reportToken: true } }),
    prisma.workspace.findUnique({
      where: { id: ctx.workspaceId },
      select: { brandName: true, brandLogoUrl: true, brandColor: true },
    }),
    prisma.siteUpdateEvent.findMany({
      where: { websiteId, createdAt: { gte: since } },
      select: { items: true },
      take: 500,
    }),
    getUptimeStats(prisma, { websiteId, since }),
    getLatestHealthCheck(prisma, websiteId),
    prisma.changeEvent.count({ where: { websiteId, detectedAt: { gte: since } } }),
    prisma.aiCrawlerVisit.aggregate({ where: { websiteId, day: { gte: since } }, _sum: { hits: true } }),
  ]);
  if (!website) return unauthorizedSite();

  const base = appBaseUrl();
  const logo = workspace?.brandLogoUrl ?? null;
  const enabled = website.reportEnabled && Boolean(website.reportToken);
  return NextResponse.json(
    {
      enabled,
      settingsUrl: `${base}/dashboard/websites/${website.id}`,
      brandingUrl: `${base}/dashboard/settings`,
      branding: {
        name: workspace?.brandName ?? null,
        logoUrl: logo ? (logo.startsWith("http") ? logo : `${base}${logo}`) : null,
        color: workspace?.brandColor ?? null,
      },
      reports: enabled
        ? [
            {
              month: formatReportPeriod(since, now),
              url: `${base}/r/${website.reportToken}`,
              pdfUrl: null,
              summary: buildReportSummary({
                updates,
                uptimePercent: uptime.uptimePercent,
                sslValidTo: latestCheck?.sslValidTo ?? null,
                changesCaught,
                aiVisits: aiVisits._sum.hits ?? 0,
                now,
              }),
            },
          ]
        : [],
    },
    { headers: { "cache-control": "no-store" } },
  );
}
