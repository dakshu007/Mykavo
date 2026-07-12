import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import {
  prisma,
  getLatestHealthCheck,
  getUptimeStats,
  getDailyHealthRollups,
  getResponseTimeSeries,
  getRecentHealthIncidents,
  type HealthIncidentKind,
} from "@fluxen/database";
import { daysUntil, parseSelectorList } from "@fluxen/shared";
import { requireSession, getCurrentWorkspace } from "@/lib/session";
import { Card, CardHeader } from "@/components/ui/card";
import { WebsiteStatusBadge } from "@/components/dashboard/website-status";
import { ScanStatusBadge } from "@/components/dashboard/scan-status";
import { ChangeSeverityBadge } from "@/components/dashboard/change-badges";
import { RunScanButton } from "@/components/dashboard/run-scan-button";
import {
  PerformanceAuditPanel,
  type AuditView,
} from "@/components/dashboard/performance-audit-panel";
import { parseTags } from "@/lib/tags";
import {
  HEALTH_WINDOWS,
  bucketMinutesForWindow,
  formatDuration,
  parseHealthWindow,
} from "@/lib/health-charts";
import { UptimeBars } from "@/components/charts/uptime-bars";
import { ResponseTimeChart } from "@/components/charts/response-time-chart";
import { WebsiteActions } from "./website-actions";
import { TagEditor } from "./tag-editor";
import { MutedAlertsBanner, MuteAlertsControl } from "./mute-alerts";
import { ComparisonSettings } from "./comparison-settings";
import { StatusBadgeSettings } from "./status-badge-settings";
import { StatusPageSettings } from "./status-page-settings";

/** Time windows for the health queries — one clock read per request. */
function healthWindows(windowDays: number): {
  now: Date;
  since24h: Date;
  since7d: Date;
  sinceWindow: Date;
} {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  return {
    now: new Date(now),
    since24h: new Date(now - day),
    since7d: new Date(now - 7 * day),
    sinceWindow: new Date(now - windowDays * day),
  };
}

/** Incident-kind chip: colour always paired with a text label. */
function IncidentKindChip({ kind }: { kind: HealthIncidentKind }) {
  return kind === "DOWN" ? (
    <span className="inline-flex shrink-0 rounded-full bg-critical-soft px-2.5 py-0.5 text-[11px] font-semibold text-red-700">
      Down
    </span>
  ) : (
    <span className="inline-flex shrink-0 rounded-full bg-warning-soft px-2.5 py-0.5 text-[11px] font-semibold text-amber-700">
      SSL
    </span>
  );
}

export default async function WebsiteDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ health?: string | string[] }>;
}) {
  const session = await requireSession();
  const workspace = await getCurrentWorkspace(session.user.id, session.user.name);
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const windowDays = parseHealthWindow(sp.health);
  const bucketMinutes = bucketMinutesForWindow(windowDays);

  const { now, since24h, since7d, sinceWindow } = healthWindows(windowDays);
  // All queries scope to the workspace/route param, so they run in parallel.
  const [
    website,
    openChanges,
    latestHealth,
    uptime24h,
    uptime7d,
    healthRollups,
    responseSeries,
    incidents,
  ] = await Promise.all([
    prisma.website.findFirst({
      where: { id, workspaceId: workspace.id },
      include: {
        monitoredPages: {
          orderBy: { createdAt: "asc" },
          include: {
            baselines: {
              where: { status: "ACTIVE" },
              select: { version: true },
            },
          },
        },
        scans: { orderBy: { createdAt: "desc" }, take: 5 },
        performanceAudits: { orderBy: { createdAt: "desc" }, take: 25 },
      },
    }),
    prisma.changeEvent.findMany({
      where: {
        websiteId: id,
        website: { workspaceId: workspace.id },
        status: { in: ["NEW", "REVIEWED"] },
      },
      select: { severity: true },
    }),
    getLatestHealthCheck(prisma, id),
    getUptimeStats(prisma, { websiteId: id, since: since24h }),
    getUptimeStats(prisma, { websiteId: id, since: since7d }),
    getDailyHealthRollups(prisma, { websiteId: id, days: windowDays, now }),
    getResponseTimeSeries(prisma, { websiteId: id, since: sinceWindow, bucketMinutes }),
    getRecentHealthIncidents(prisma, { websiteId: id, limit: 10 }),
  ]);
  if (!website) notFound();

  const sslDaysLeft = latestHealth?.sslValidTo
    ? daysUntil(latestHealth.sslValidTo, now)
    : null;
  const formatUptime = (p: number | null) =>
    p === null ? "—" : `${p === 100 ? "100" : p.toFixed(1)}%`;

  const auditViews: AuditView[] = website.performanceAudits.map((a) => ({
    id: a.id,
    status: a.status,
    url: a.url,
    performanceScore: a.performanceScore,
    accessibilityScore: a.accessibilityScore,
    bestPracticesScore: a.bestPracticesScore,
    seoScore: a.seoScore,
    lcpMs: a.lcpMs,
    fcpMs: a.fcpMs,
    tbtMs: a.tbtMs,
    ttiMs: a.ttiMs,
    speedIndexMs: a.speedIndexMs,
    cls: a.cls,
    errorCode: a.errorCode,
    createdAt: a.createdAt.toISOString(),
  }));

  const homepageUrl = new URL(website.url);
  const hostname = homepageUrl.hostname;
  // Page picker options for the audit panel (serializable strings only).
  const homepagePath = homepageUrl.pathname + homepageUrl.search;
  const auditPagePaths = Array.from(
    new Set(
      website.monitoredPages.map((p) => {
        const u = new URL(p.url);
        return u.pathname + u.search;
      }),
    ),
  ).filter((p) => p !== homepagePath);
  const hasFinishedScan = website.scans.some(
    (s) => s.status === "COMPLETED" || s.status === "PARTIAL",
  );
  const pagesWithBaseline = website.monitoredPages.filter(
    (p) => p.baselines.length > 0,
  ).length;

  // Maintenance window: a past muteAlertsUntil simply means not muted.
  const mutedUntil =
    website.muteAlertsUntil && website.muteAlertsUntil > now
      ? website.muteAlertsUntil
      : null;
  const appBase = process.env.APP_URL ?? "http://localhost:3000";
  const badgeUrl = website.publicToken
    ? `${appBase}/api/badge/${website.publicToken}`
    : null;
  const statusPageUrl = website.publicToken
    ? `${appBase}/status/${website.publicToken}`
    : null;

  const severityRank = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1, INFO: 0 } as const;
  const highestSeverity =
    openChanges.length > 0
      ? openChanges.reduce(
          (top, c) => (severityRank[c.severity] > severityRank[top] ? c.severity : top),
          "INFO" as (typeof openChanges)[number]["severity"],
        )
      : null;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/websites"
          className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-secondary hover:text-ink"
        >
          <ArrowLeft className="size-3.5" aria-hidden /> Websites
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-ink">
              {website.name}
            </h1>
            <a
              href={website.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-0.5 inline-flex items-center gap-1.5 font-mono text-[13px] text-ink-secondary hover:text-primary"
            >
              {hostname}
              <ExternalLink className="size-3" aria-hidden />
            </a>
          </div>
          <div className="flex items-center gap-4">
            <WebsiteStatusBadge status={website.status} />
            {website.monitoredPages.length > 0 && (
              <RunScanButton websiteId={website.id} isFirstScan={!hasFinishedScan} />
            )}
          </div>
        </div>
      </div>

      {mutedUntil && (
        <MutedAlertsBanner
          websiteId={website.id}
          mutedUntilIso={mutedUntil.toISOString()}
        />
      )}

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <p className="label-micro mb-2">Monitored pages</p>
          <p className="text-4xl font-semibold tracking-tight text-ink">
            {website.monitoredPages.length}
          </p>
        </Card>
        <Card>
          <p className="label-micro mb-2">Baselined</p>
          <p className="text-4xl font-semibold tracking-tight text-ink">
            {pagesWithBaseline}
            <span className="text-lg text-ink-faint">/{website.monitoredPages.length}</span>
          </p>
          {website.monitoredPages.length > 0 && pagesWithBaseline < website.monitoredPages.length && (
            <p className="mt-1 text-[13px] text-ink-faint">
              Run a baseline scan to capture the rest.
            </p>
          )}
        </Card>
        <Card>
          <div className="flex items-start justify-between">
            <p className="label-micro mb-2">Open changes</p>
            {openChanges.length > 0 && (
              <Link
                href={`/dashboard/changes?website=${website.id}`}
                className="text-[13px] font-medium text-primary hover:underline"
              >
                View
              </Link>
            )}
          </div>
          <p className="text-4xl font-semibold tracking-tight text-ink">{openChanges.length}</p>
          {highestSeverity && (
            <div className="mt-2">
              <ChangeSeverityBadge severity={highestSeverity} />
            </div>
          )}
        </Card>
        <Card>
          <p className="label-micro mb-2">Last scan</p>
          <p className="text-3xl font-semibold tracking-tight text-ink">
            {website.lastScanAt
              ? website.lastScanAt.toLocaleDateString("en-US", { dateStyle: "medium" })
              : "—"}
          </p>
        </Card>
      </div>

      {/* Site health: availability + SSL (5-minute worker sweep) */}
      <Card>
        <CardHeader title="Health" />
        {latestHealth === null ? (
          <p className="py-2 text-sm text-ink-secondary">
            First health check runs within 5 minutes of monitoring starting.
          </p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            <div>
              <p className="label-micro mb-2">Status</p>
              <p className="flex items-center gap-2 text-xl font-semibold tracking-tight text-ink">
                <span
                  aria-hidden
                  className={`inline-block size-2.5 rounded-full ${latestHealth.up ? "bg-green-500" : "bg-red-500"}`}
                />
                {latestHealth.up ? "Up" : "Down"}
              </p>
              <p className="mt-1 text-[13px] text-ink-faint">
                {latestHealth.httpStatus !== null
                  ? `HTTP ${latestHealth.httpStatus}`
                  : (latestHealth.errorCode ?? "No response")}
                {" · checked "}
                {latestHealth.checkedAt.toLocaleTimeString("en-US", { timeStyle: "short" })}
              </p>
            </div>
            <div>
              <p className="label-micro mb-2">Uptime · 24h</p>
              <p className="text-xl font-semibold tracking-tight text-ink">
                {formatUptime(uptime24h.uptimePercent)}
              </p>
              {uptime24h.avgResponseTimeMs !== null && (
                <p className="mt-1 text-[13px] text-ink-faint">
                  {Math.round(uptime24h.avgResponseTimeMs)} ms avg response
                </p>
              )}
            </div>
            <div>
              <p className="label-micro mb-2">Uptime · 7d</p>
              <p className="text-xl font-semibold tracking-tight text-ink">
                {formatUptime(uptime7d.uptimePercent)}
              </p>
              <p className="mt-1 text-[13px] text-ink-faint">
                {uptime7d.totalChecks.toLocaleString("en-US")} checks
              </p>
            </div>
            <div>
              <p className="label-micro mb-2">SSL certificate</p>
              {latestHealth.sslValidTo ? (
                <>
                  <p
                    className={`text-xl font-semibold tracking-tight ${
                      sslDaysLeft !== null && sslDaysLeft <= 14
                        ? "text-red-600"
                        : sslDaysLeft !== null && sslDaysLeft <= 30
                          ? "text-amber-600"
                          : "text-ink"
                    }`}
                  >
                    {sslDaysLeft !== null && sslDaysLeft <= 0
                      ? "Expired"
                      : `${sslDaysLeft} days left`}
                  </p>
                  <p className="mt-1 text-[13px] text-ink-faint">
                    Valid until{" "}
                    {latestHealth.sslValidTo.toLocaleDateString("en-US", { dateStyle: "medium" })}
                  </p>
                </>
              ) : (
                <p className="text-xl font-semibold tracking-tight text-ink-faint">
                  {website.url.startsWith("https:") ? "—" : "No HTTPS"}
                </p>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* Uptime & response-time analytics over the selected window */}
      <Card>
        <CardHeader
          title="Uptime & performance"
          action={
            <nav aria-label="Time window" className="flex gap-1.5">
              {HEALTH_WINDOWS.map((w) => (
                <Link
                  key={w.param}
                  href={`/dashboard/websites/${website.id}?health=${w.param}`}
                  aria-current={windowDays === w.days ? "page" : undefined}
                  className={
                    windowDays === w.days
                      ? "rounded-full bg-ink px-3 py-1 text-[12px] font-medium text-white"
                      : "rounded-full border border-line px-3 py-1 text-[12px] font-medium text-ink-secondary hover:text-ink"
                  }
                >
                  {w.label}
                </Link>
              ))}
            </nav>
          }
        />
        <UptimeBars days={healthRollups} windowDays={windowDays} />

        <div className="mt-6 border-t border-line pt-4">
          <h3 className="mb-2 text-[13px] font-semibold text-ink">Response time</h3>
          <ResponseTimeChart
            points={responseSeries.map((b) => ({
              t: b.bucketStart.getTime(),
              avgMs: b.avgResponseTimeMs,
            }))}
            windowDays={windowDays}
            bucketMinutes={bucketMinutes}
            domainStart={sinceWindow.getTime()}
            domainEnd={now.getTime()}
          />
        </div>

        <div className="mt-6 border-t border-line pt-4">
          <h3 className="text-[13px] font-semibold text-ink">Incident history</h3>
          {incidents.length === 0 ? (
            <p className="py-3 text-[13px] text-ink-secondary">
              No incidents recorded — downtime and expiring SSL certificates will show
              up here.
            </p>
          ) : (
            <ul className="mt-1 divide-y divide-line">
              {incidents.map((incident) => (
                <li
                  key={incident.id}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5"
                >
                  <IncidentKindChip kind={incident.kind} />
                  <span className="text-[13px] text-ink">
                    {incident.openedAt.toLocaleString("en-US", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </span>
                  {incident.detail && (
                    <span className="min-w-0 flex-1 truncate text-[13px] text-ink-secondary">
                      {incident.detail}
                    </span>
                  )}
                  <span className="ml-auto shrink-0 text-[13px] tabular-nums">
                    {incident.resolvedAt ? (
                      <span className="text-ink-secondary">
                        {formatDuration(
                          incident.resolvedAt.getTime() - incident.openedAt.getTime(),
                        )}
                      </span>
                    ) : (
                      <span className="font-medium text-red-700">Ongoing</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>

      {/* Lighthouse performance audit (on-demand) */}
      <Card>
        <PerformanceAuditPanel
          websiteId={website.id}
          hostname={hostname}
          homepagePath={homepagePath}
          pagePaths={auditPagePaths}
          initialAudits={auditViews}
        />
      </Card>

      {/* SEO health report (built from the latest scan — no extra queries here) */}
      <Card>
        <CardHeader
          title="SEO health"
          action={
            <Link
              href={`/dashboard/websites/${website.id}/seo`}
              className="text-[13px] font-medium text-primary hover:underline"
            >
              View report →
            </Link>
          }
        />
        <p className="text-sm text-ink-secondary">
          Title, description, H1, canonical and indexability checks from your latest scan.
        </p>
      </Card>

      <Card>
        <CardHeader
          title="Monitored pages"
          action={
            <Link
              href={`/dashboard/websites/${website.id}/pages`}
              className="rounded-full border border-line px-4 py-2 text-[13px] font-medium text-ink-secondary transition-colors hover:text-ink"
            >
              Edit pages
            </Link>
          }
        />
        {website.monitoredPages.length === 0 ? (
          <p className="py-4 text-sm text-ink-secondary">
            No pages selected yet.{" "}
            <Link
              href={`/dashboard/websites/${website.id}/pages`}
              className="font-medium text-primary hover:underline"
            >
              Choose pages to monitor →
            </Link>
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {website.monitoredPages.map((page) => {
              const path = new URL(page.url).pathname + new URL(page.url).search;
              const baselineVersion = page.baselines[0]?.version;
              return (
                <li key={page.id}>
                  <Link
                    href={`/dashboard/websites/${website.id}/pages/${page.id}`}
                    className="group flex items-center gap-4 py-3"
                  >
                    <span className="min-w-0 flex-1 truncate font-mono text-[13px] text-ink group-hover:text-primary">
                      {path === "/" ? "/ (homepage)" : path}
                    </span>
                    {baselineVersion ? (
                      <span className="shrink-0 rounded-full bg-success-soft px-2.5 py-0.5 text-[11px] font-semibold text-green-700">
                        Baseline v{baselineVersion}
                      </span>
                    ) : (
                      <span className="shrink-0 rounded-full bg-info-soft px-2.5 py-0.5 text-[11px] font-semibold text-info">
                        No baseline
                      </span>
                    )}
                    <ExternalLink
                      className="size-4 shrink-0 text-ink-faint group-hover:text-primary"
                      aria-hidden
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {website.scans.length > 0 && (
        <Card>
          <CardHeader
            title="Recent scans"
            action={
              <Link
                href="/dashboard/scans"
                className="text-[13px] font-medium text-primary hover:underline"
              >
                All scans →
              </Link>
            }
          />
          <ul className="divide-y divide-line">
            {website.scans.map((scan) => (
              <li key={scan.id}>
                <Link
                  href={`/dashboard/scans/${scan.id}`}
                  className="group flex items-center gap-4 py-3"
                >
                  <span className="flex-1 text-sm text-ink group-hover:text-primary">
                    {scan.triggerType === "BASELINE" ? "Baseline scan" : "Scan"}
                    <span className="ml-2 text-xs text-ink-faint">
                      {scan.createdAt.toLocaleString("en-US", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </span>
                  </span>
                  <span className="text-xs text-ink-secondary">
                    {scan.pagesScanned}/{scan.pagesRequested} pages
                  </span>
                  <ScanStatusBadge status={scan.status} />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card>
        <CardHeader title="Tags" />
        <TagEditor websiteId={website.id} initialTags={parseTags(website.tags)} />
      </Card>

      <Card>
        <CardHeader title="Mute alerts" />
        <MuteAlertsControl
          websiteId={website.id}
          mutedUntilIso={mutedUntil ? mutedUntil.toISOString() : null}
        />
      </Card>

      <Card>
        <CardHeader title="Comparison settings" />
        <ComparisonSettings
          websiteId={website.id}
          initialIgnored={parseSelectorList(website.ignoredSelectors)}
          initialMasks={parseSelectorList(website.screenshotMasks)}
        />
      </Card>

      <Card>
        <CardHeader title="Public status badge" />
        <StatusBadgeSettings
          websiteId={website.id}
          siteUrl={website.url}
          badgeUrl={badgeUrl}
          enabled={website.badgeEnabled}
        />
      </Card>

      <Card>
        <CardHeader title="Public status page" />
        <StatusPageSettings
          websiteId={website.id}
          statusPageUrl={statusPageUrl}
          enabled={website.statusPageEnabled}
        />
      </Card>

      <Card>
        <CardHeader title="Danger zone" />
        <WebsiteActions
          websiteId={website.id}
          websiteName={website.name}
          paused={website.status === "PAUSED"}
        />
      </Card>
    </div>
  );
}
