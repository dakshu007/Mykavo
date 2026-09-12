import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { CheckCircle2, ExternalLink, ShieldCheck, TriangleAlert } from "lucide-react";
import { prisma, getLatestHealthCheck, getUptimeStats } from "@mykavo/database";
import { Logo } from "@/components/brand/logo";
import { getWorkspacePlan } from "@/lib/billing/subscription";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/lib/status-page";
import {
  REPORT_WINDOW_DAYS,
  buildSeverityRows,
  contrastTextClass,
  formatReportPeriod,
  formatReportUptime,
  sslSummary,
} from "@/lib/client-report";
import { PrintButton } from "./print-button";

/**
 * Public white-label client report (spec §37 "client-ready reports") - the
 * document an agency forwards to prove the value of a maintenance retainer.
 * The opaque reportToken is the ONLY identifier (website ids never appear)
 * and reportEnabled gates access; regenerating the token revokes old links.
 *
 * Branding: on Pro with branding configured, the agency's name/logo/accent
 * replace MyKavo entirely (white-label). Free reports carry MyKavo branding
 * and a CTA - the growth loop when the report lands in a client's inbox.
 */

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ token: string }> };

const getReportWebsite = cache(async (token: string) =>
  prisma.website.findFirst({
    where: { reportToken: token, reportEnabled: true },
    select: {
      id: true,
      name: true,
      url: true,
      scanFrequency: true,
      workspaceId: true,
      workspace: {
        select: { brandName: true, brandLogoUrl: true, brandColor: true },
      },
    },
  }),
);

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { token } = await params;
  const website = await getReportWebsite(token);
  // Client reports must never surface in search results.
  const robots = { index: false, follow: false } as const;
  if (!website) return { robots };
  return {
    title: { absolute: `${website.name} - website monitoring report` },
    description: `Monitoring report for ${website.name}: uptime, changes caught, and performance for the last ${REPORT_WINDOW_DAYS} days.`,
    robots,
  };
}

const SEVERITY_BAR_CLASS: Record<string, string> = {
  CRITICAL: "bg-critical",
  HIGH: "bg-orange",
  MEDIUM: "bg-warning",
  LOW: "bg-info",
  INFO: "bg-ink-faint",
};

function scoreTone(score: number | null): string {
  if (score === null) return "text-ink-faint";
  if (score >= 90) return "text-success-strong";
  if (score >= 50) return "text-warning-strong";
  return "text-critical-strong";
}

export default async function ClientReportPage({ params }: Params) {
  const { token } = await params;
  const website = await getReportWebsite(token);
  if (!website) notFound();

  const now = new Date();
  const since = new Date(now.getTime() - REPORT_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const [
    plan,
    uptime,
    latestCheck,
    downtimeIncidents,
    severityCounts,
    resolvedCount,
    scansCompleted,
    pagesMonitored,
    latestAudit,
  ] = await Promise.all([
    getWorkspacePlan(website.workspaceId),
    getUptimeStats(prisma, { websiteId: website.id, since }),
    getLatestHealthCheck(prisma, website.id),
    prisma.healthIncident.findMany({
      where: {
        websiteId: website.id,
        kind: "DOWN",
        OR: [{ openedAt: { gte: since } }, { resolvedAt: null }],
      },
      select: { openedAt: true, resolvedAt: true },
      orderBy: { openedAt: "desc" },
      take: 100,
    }),
    prisma.changeEvent.groupBy({
      by: ["severity"],
      where: { websiteId: website.id, detectedAt: { gte: since } },
      _count: { _all: true },
    }),
    prisma.changeEvent.count({
      where: {
        websiteId: website.id,
        detectedAt: { gte: since },
        status: { in: ["RESOLVED", "APPROVED"] },
      },
    }),
    prisma.scan.count({
      where: {
        websiteId: website.id,
        createdAt: { gte: since },
        status: { in: ["COMPLETED", "PARTIAL"] },
      },
    }),
    prisma.monitoredPage.count({ where: { websiteId: website.id, enabled: true } }),
    prisma.performanceAudit.findFirst({
      where: { websiteId: website.id, status: "COMPLETED" },
      orderBy: { createdAt: "desc" },
      select: {
        performanceScore: true,
        accessibilityScore: true,
        bestPracticesScore: true,
        seoScore: true,
        completedAt: true,
      },
    }),
  ]);

  const hostname = new URL(website.url).hostname;

  // White-label only when the plan includes it AND branding is configured -
  // a downgraded workspace's report falls back to MyKavo branding.
  const brand = website.workspace;
  const whiteLabel = plan.limits.whiteLabelReports && Boolean(brand.brandName);
  const accent = whiteLabel && brand.brandColor ? brand.brandColor : null;
  const accentText = accent ? contrastTextClass(accent) : "text-[#101010]";

  const severityRows = buildSeverityRows(
    severityCounts.map((c) => ({ severity: c.severity, count: c._count._all })),
  );
  const totalChanges = severityRows.reduce((sum, row) => sum + row.count, 0);
  const importantChanges = severityRows
    .filter((row) => row.severity === "CRITICAL" || row.severity === "HIGH")
    .reduce((sum, row) => sum + row.count, 0);

  const downtimeMs = downtimeIncidents.reduce((sum, incident) => {
    const start = Math.max(incident.openedAt.getTime(), since.getTime());
    const end = (incident.resolvedAt ?? now).getTime();
    return sum + Math.max(0, end - start);
  }, 0);

  const ssl = sslSummary(latestCheck?.sslValidTo ?? null, now);

  const headline: { label: string; value: string; sub?: string }[] = [
    {
      label: `Uptime · ${REPORT_WINDOW_DAYS}d`,
      value: formatReportUptime(uptime.uptimePercent),
      sub: uptime.totalChecks > 0 ? `${uptime.totalChecks.toLocaleString("en-US")} checks` : "No checks yet",
    },
    {
      label: "Avg response",
      value:
        uptime.avgResponseTimeMs === null
          ? "–"
          : `${Math.round(uptime.avgResponseTimeMs)} ms`,
    },
    {
      label: "Changes caught",
      value: totalChanges.toLocaleString("en-US"),
      sub: importantChanges > 0 ? `${importantChanges} important` : "None critical",
    },
    {
      label: "Scans run",
      value: scansCompleted.toLocaleString("en-US"),
      sub: `${pagesMonitored} page${pagesMonitored === 1 ? "" : "s"} monitored`,
    },
  ];

  const audits: { label: string; score: number | null }[] = latestAudit
    ? [
        { label: "Performance", score: latestAudit.performanceScore },
        { label: "Accessibility", score: latestAudit.accessibilityScore },
        { label: "Best practices", score: latestAudit.bestPracticesScore },
        { label: "SEO", score: latestAudit.seoScore },
      ]
    : [];

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-10 sm:px-6 sm:py-14 print:max-w-none print:space-y-4 print:py-0">
      {/* Accent keyline: the agency's color on white-label, MyKavo gold otherwise. */}
      <div
        aria-hidden
        className="h-1.5 rounded-full"
        style={{ backgroundColor: accent ?? "#FFD400" }}
      />

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          {whiteLabel ? (
            <div className="flex items-center gap-3">
              {brand.brandLogoUrl && (
                // eslint-disable-next-line @next/next/no-img-element -- R2-served, size-capped upload; next/image adds nothing here
                <img
                  src={brand.brandLogoUrl}
                  alt={`${brand.brandName} logo`}
                  className="size-10 rounded-tile object-contain"
                />
              )}
              <p className="text-lg font-semibold tracking-tight text-ink">
                {brand.brandName}
              </p>
            </div>
          ) : (
            <Logo markSize={22} wordmarkClassName="text-[17px]" />
          )}
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-ink">
            Website monitoring report
          </h1>
          <p className="mt-1 text-sm text-ink-secondary">
            {website.name}
            <span className="mx-2 text-ink-faint">·</span>
            <a
              href={website.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-mono text-[13px] text-ink-secondary hover:text-accent"
            >
              {hostname}
              <ExternalLink className="size-3 print:hidden" aria-hidden />
            </a>
          </p>
          <p className="mt-1 text-[13px] text-ink-faint">
            {formatReportPeriod(since, now)} · last {REPORT_WINDOW_DAYS} days
          </p>
        </div>
        <PrintButton />
      </header>

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4 print:grid-cols-4">
        {headline.map((stat) => (
          <div key={stat.label} className="rounded-card bg-card p-5 shadow-card print:border print:border-line print:shadow-none">
            <p className="label-micro mb-1.5">{stat.label}</p>
            <p className="text-2xl font-semibold tracking-tight text-ink">{stat.value}</p>
            {stat.sub && <p className="mt-1 text-[12px] text-ink-faint">{stat.sub}</p>}
          </div>
        ))}
      </section>

      <section className="rounded-card bg-card p-6 shadow-card print:border print:border-line print:shadow-none">
        <h2 className="mb-4 text-[15px] font-semibold text-ink">Availability</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-tile bg-surface px-4 py-3">
            <p className="text-[13px] text-ink-secondary">Downtime</p>
            <p className="mt-0.5 text-sm font-medium text-ink">
              {downtimeIncidents.length === 0
                ? "None recorded"
                : `${downtimeIncidents.length} incident${downtimeIncidents.length === 1 ? "" : "s"} · ${formatDuration(downtimeMs)}`}
            </p>
          </div>
          <div className="rounded-tile bg-surface px-4 py-3">
            <p className="text-[13px] text-ink-secondary">SSL certificate</p>
            <p
              className={cn(
                "mt-0.5 inline-flex items-center gap-1.5 text-sm font-medium",
                ssl.tone === "warn" ? "text-warning-strong" : "text-ink",
              )}
            >
              {ssl.tone === "ok" && (
                <ShieldCheck className="size-4 text-success-strong" aria-hidden />
              )}
              {ssl.tone === "warn" && <TriangleAlert className="size-4" aria-hidden />}
              {ssl.label}
            </p>
          </div>
          <div className="rounded-tile bg-surface px-4 py-3">
            <p className="text-[13px] text-ink-secondary">Monitoring cadence</p>
            <p className="mt-0.5 text-sm font-medium text-ink">
              {website.scanFrequency === "DAILY" ? "Daily scans" : "Weekly scans"} ·
              uptime checks every 5 min
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-card bg-card p-6 shadow-card print:border print:border-line print:shadow-none">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-[15px] font-semibold text-ink">Changes caught</h2>
          <p className="text-[13px] text-ink-secondary">
            {resolvedCount > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5 text-success-strong" aria-hidden />
                {resolvedCount} resolved or approved
              </span>
            )}
          </p>
        </div>
        {totalChanges === 0 ? (
          <p className="py-1 text-sm text-ink-secondary">
            No unexpected changes detected in the last {REPORT_WINDOW_DAYS} days -
            every scan matched the approved baseline.
          </p>
        ) : (
          <ul className="space-y-2.5">
            {severityRows.map((row) => (
              <li key={row.severity} className="flex items-center gap-3">
                <span className="w-16 shrink-0 text-[12px] font-medium text-ink-secondary">
                  {row.label}
                </span>
                <span className="h-4 flex-1 overflow-hidden rounded-[3px] bg-surface">
                  <span
                    className={cn("block h-full rounded-[3px]", SEVERITY_BAR_CLASS[row.severity])}
                    style={{ width: `${row.barPercent}%` }}
                  />
                </span>
                <span className="w-8 shrink-0 text-right text-sm font-semibold tabular-nums text-ink">
                  {row.count}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {audits.length > 0 && (
        <section className="rounded-card bg-card p-6 shadow-card print:border print:border-line print:shadow-none">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-[15px] font-semibold text-ink">Performance audit</h2>
            {latestAudit?.completedAt && (
              <p className="text-[12px] text-ink-faint">
                Lighthouse ·{" "}
                {latestAudit.completedAt.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  timeZone: "UTC",
                })}
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {audits.map((audit) => (
              <div key={audit.label} className="rounded-tile bg-surface px-4 py-3 text-center">
                <p className={cn("text-2xl font-semibold tabular-nums", scoreTone(audit.score))}>
                  {audit.score ?? "–"}
                </p>
                <p className="mt-0.5 text-[12px] text-ink-secondary">{audit.label}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5 pb-4">
        {whiteLabel ? (
          <>
            <p className="text-[13px] text-ink-secondary">
              Prepared by <span className="font-medium text-ink">{brand.brandName}</span>
            </p>
            {accent && (
              <span
                className={cn(
                  "rounded-full px-3 py-1 text-[11px] font-semibold",
                  accentText,
                )}
                style={{ backgroundColor: accent }}
              >
                Monitored 24/7
              </span>
            )}
          </>
        ) : (
          <>
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-[13px] text-ink-faint transition-colors hover:text-ink"
            >
              Powered by
              <Logo markSize={18} wordmarkClassName="text-[14px]" />
            </Link>
            <Link
              href="/?utm_source=client-report"
              className="text-[13px] font-medium text-accent hover:underline print:hidden"
            >
              Monitor your website with MyKavo →
            </Link>
          </>
        )}
      </footer>
    </main>
  );
}
