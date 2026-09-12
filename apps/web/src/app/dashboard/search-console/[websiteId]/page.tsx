import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, ExternalLink } from "lucide-react";
import { prisma } from "@mykavo/database";
import { loadTrafficDrops } from "@/lib/traffic-drops";
import { TrafficDrops } from "@/components/dashboard/traffic-drops";
import { SearchPerformanceChart } from "@/components/charts/search-performance-chart";
import {
  buildOpportunities,
  isGscReauthMessage,
  mergePeriods,
  type DimensionMetrics,
  type PageAuditFacts,
} from "@mykavo/shared";
import { AUDIT_CHECKS, type AuditIssueGroup } from "@mykavo/seo-audit";
import { Card, CardHeader } from "@/components/ui/card";
import { getGscConnection, gscConfigured } from "@/lib/gsc";
import { requireSession, getCurrentWorkspace } from "@/lib/session";
import { PropertyPicker, SyncButton, SitemapsPanel, InspectBox } from "../gsc-client";

export const metadata: Metadata = { title: "Search Console - MyKavo" };

type Params = { params: Promise<{ websiteId: string }>; searchParams: Promise<{ range?: string }> };

const fmt = (n: number) => n.toLocaleString("en-US");

/** One clock read per request (module-level fn keeps the compiler happy). */
function sinceDate(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

function DeltaBadge({ delta, invert = false }: { delta: number | null; invert?: boolean }) {
  if (delta === null || delta === 0) return <span className="text-ink-faint">-</span>;
  const good = invert ? delta < 0 : delta > 0;
  return (
    <span className={good ? "text-success-strong" : "text-critical-strong"}>
      {delta > 0 ? "↑" : "↓"}{Math.abs(delta) % 1 === 0 ? fmt(Math.abs(delta)) : Math.abs(delta).toFixed(1)}
    </span>
  );
}

/** The GSC dashboard: search data joined with Site Audit into one view. */
export default async function GscDashboardPage({ params, searchParams }: Params) {
  const session = await requireSession();
  const workspace = await getCurrentWorkspace(session.user.id, session.user.name);
  const { websiteId } = await params;
  const { range } = await searchParams;
  const rangeDays = range === "7" ? 7 : range === "90" ? 90 : 28;

  const website = await prisma.website.findFirst({
    where: { id: websiteId, workspaceId: workspace.id },
    select: { id: true, name: true, url: true },
  });
  if (!website) notFound();
  const connection = await getGscConnection(workspace.id, website.id);

  const hostname = (() => { try { return new URL(website.url).hostname; } catch { return website.url; } })();

  // ----- Setup states -----
  if (!gscConfigured() || !connection || !connection.property) {
    return (
      <div className="space-y-6">
        <Link href="/dashboard/search-console" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-secondary hover:text-ink">
          <ArrowLeft className="size-3.5" aria-hidden /> Search Console
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{website.name}</h1>
        <Card>
          {!gscConfigured() ? (
            <p className="text-sm leading-6 text-ink-secondary">Google OAuth is not configured on this deployment yet.</p>
          ) : !connection ? (
            <div className="space-y-3">
              <p className="text-sm leading-6 text-ink-secondary">
                Connect the Google account that owns <span className="font-mono text-[13px]">{hostname}</span> in Search Console.
                MyKavo asks for read-only access and stores tokens encrypted.
              </p>
              <a href={`/api/gsc/connect?website=${website.id}`} className="inline-flex h-10 items-center rounded-full bg-primary px-5 text-[13px] font-medium text-primary-contrast hover:bg-primary-hover">
                Connect Google Search Console
              </a>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm leading-6 text-ink-secondary">Google connected. Pick the Search Console property that matches this website:</p>
              <PropertyPicker websiteId={website.id} />
            </div>
          )}
        </Card>
      </div>
    );
  }

  // ----- Data -----
  const since = sinceDate(rangeDays);
  const [daily, dimensionRows, latestAudit, syncPending, trafficDrops] = await Promise.all([
    prisma.gscDaily.findMany({
      where: { websiteId: website.id, date: { gte: since } },
      orderBy: { date: "asc" },
    }),
    prisma.gscDimensionRow.findMany({ where: { websiteId: website.id } }),
    prisma.siteAudit.findFirst({
      where: { websiteId: website.id, status: "COMPLETED" },
      orderBy: { createdAt: "desc" },
      select: { id: true, issues: true, healthScore: true },
    }),
    Promise.resolve(!connection.lastSyncAt),
    loadTrafficDrops(website.id),
  ]);

  const dim = (dimension: string, period: string): DimensionMetrics[] =>
    dimensionRows
      .filter((r) => r.dimension === dimension && r.period === period)
      .sort((a, b) => b.clicks - a.clicks)
      .map((r) => ({ key: r.key, clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position }));

  const queries = mergePeriods(dim("QUERY", "CURRENT"), dim("QUERY", "PREVIOUS")).slice(0, 20);
  const pages = mergePeriods(dim("PAGE", "CURRENT"), dim("PAGE", "PREVIOUS"));
  const countries = mergePeriods(dim("COUNTRY", "CURRENT"), dim("COUNTRY", "PREVIOUS")).slice(0, 8);
  const devices = mergePeriods(dim("DEVICE", "CURRENT"), dim("DEVICE", "PREVIOUS"));
  const appearance = mergePeriods(dim("APPEARANCE", "CURRENT"), dim("APPEARANCE", "PREVIOUS"));

  // Audit issues per URL for the correlation engine.
  const auditByUrl = new Map<string, PageAuditFacts>();
  const groups = (Array.isArray(latestAudit?.issues) ? latestAudit.issues : []) as unknown as AuditIssueGroup[];
  for (const group of groups) {
    const def = AUDIT_CHECKS[group.checkId];
    if (!def) continue;
    for (const entry of group.urls) {
      const facts = auditByUrl.get(entry.url) ?? { issues: [] };
      facts.issues.push({ title: def.title, severity: def.severity, checkId: group.checkId });
      auditByUrl.set(entry.url, facts);
    }
  }
  const opportunities = buildOpportunities(pages, auditByUrl);
  const issueCountFor = (url: string) =>
    (auditByUrl.get(url) ?? auditByUrl.get(url.replace(/\/$/, "")))?.issues.filter((i) => i.severity !== "NOTICE").length ?? 0;

  const totals = daily.reduce(
    (acc, d) => ({ clicks: acc.clicks + d.clicks, impressions: acc.impressions + d.impressions }),
    { clicks: 0, impressions: 0 },
  );
  const avgCtr = totals.impressions > 0 ? totals.clicks / totals.impressions : 0;
  const avgPosition = daily.length > 0 ? daily.reduce((s, d) => s + d.position, 0) / daily.length : 0;

  // Chart points. Shaped here so the client component receives plain data and
  // never a Date - Dates do not survive the server/client boundary intact.
  const chartPoints = daily.map((d) => ({
    date: d.date.toISOString().slice(0, 10),
    clicks: d.clicks,
    impressions: d.impressions,
    ctr: d.ctr,
    position: d.position,
  }));

  const cards = [
    { label: `Clicks · ${rangeDays}d`, value: fmt(totals.clicks) },
    { label: "Impressions", value: fmt(totals.impressions) },
    { label: "Average CTR", value: pct(avgCtr) },
    { label: "Average position", value: avgPosition ? avgPosition.toFixed(1) : "-" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/search-console" className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-secondary hover:text-ink">
          <ArrowLeft className="size-3.5" aria-hidden /> Search Console
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-ink">{website.name}</h1>
            <p className="mt-0.5 font-mono text-[13px] text-ink-secondary">{connection.property}</p>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-[13px] text-ink-faint">
              {connection.lastSyncAt
                ? `Synced ${connection.lastSyncAt.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}`
                : "First sync in progress…"}
            </p>
            <SyncButton websiteId={website.id} />
          </div>
        </div>
        {connection.lastError &&
          (isGscReauthMessage(connection.lastError) ? (
            <div className="mt-2 flex flex-wrap items-center justify-between gap-3 rounded-tile bg-warning-soft px-4 py-3">
              <p className="text-[12.5px] text-warning-strong">
                Google revoked this connection, so syncing has stopped. Reconnect to resume - your
                stored history is kept.
              </p>
              <a
                href={`/api/gsc/connect?website=${website.id}`}
                className="inline-flex h-9 shrink-0 items-center rounded-full bg-primary px-4 text-[13px] font-medium text-primary-contrast hover:bg-primary-hover"
              >
                Reconnect
              </a>
            </div>
          ) : (
            <p className="mt-2 rounded-tile bg-critical-soft px-4 py-2.5 text-[12.5px] text-critical-strong">Last sync failed: {connection.lastError}</p>
          ))}
      </div>

      {syncPending || daily.length === 0 ? (
        <Card>
          <p className="py-2 text-sm text-ink-secondary">
            {syncPending
              ? "The first sync is running - data appears within a couple of minutes. Refresh shortly."
              : "No search data stored yet for this range. Google reports with a ~2 day delay; try Sync now."}
          </p>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            {cards.map((c) => (
              <Card key={c.label}>
                <p className="label-micro mb-2">{c.label}</p>
                <p className="text-3xl font-semibold tabular-nums tracking-tight text-ink">{c.value}</p>
              </Card>
            ))}
          </div>

          <Card>
            <div className="mb-3 flex items-center justify-between gap-3">
              <CardHeader title="Performance" />
              <div className="flex gap-1.5">
                {[7, 28, 90].map((d) => (
                  <Link key={d} href={`?range=${d}`} className={`rounded-full px-3 py-1 text-[12px] font-medium ${rangeDays === d ? "bg-primary text-primary-contrast" : "border border-line text-ink-secondary hover:text-ink"}`}>
                    {d}d
                  </Link>
                ))}
              </div>
            </div>
            <SearchPerformanceChart daily={chartPoints} />
          </Card>

          {/* Search data x CHANGE HISTORY. Above Priority Opportunities on
              purpose: that answers "what is wrong now", this answers "what did
              we do", and a drop already happening is the more urgent of the
              two. Renders nothing when no page has dropped. */}
          <TrafficDrops drops={trafficDrops} />

          {/* THE differentiator: search data × audit issues */}
          <Card>
            <CardHeader title="Priority Opportunities" />
            {opportunities.length === 0 ? (
              <p className="py-1 text-sm text-ink-secondary">
                Nothing urgent - no high-traffic pages carry audit issues right now.
                {!latestAudit && " Run a Site Audit to unlock issue correlation."}
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {opportunities.map((opp) => (
                  <li key={opp.page + opp.reason} className="py-3.5">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${opp.priority === "HIGH" ? "bg-critical-soft text-critical-strong" : "bg-warning-soft text-warning-strong"}`}>
                        {opp.priority === "HIGH" ? "High priority" : "Medium"}
                      </span>
                      <a href={opp.page} target="_blank" rel="noopener noreferrer" className="min-w-0 break-all font-mono text-[12.5px] text-ink hover:text-accent">
                        {opp.page.replace(/^https?:\/\/[^/]+/, "") || "/"}
                      </a>
                      <span className="ml-auto text-[12px] tabular-nums text-ink-faint">
                        {fmt(opp.clicks)} clicks · {fmt(opp.impressions)} impr · pos {opp.position}
                      </span>
                    </div>
                    <p className="mt-1.5 text-sm text-ink">{opp.reason}</p>
                    <p className="mt-0.5 text-[12.5px] text-ink-secondary">→ {opp.action}</p>
                    {opp.issues.length > 0 && (
                      <p className="mt-1 text-[12px] text-critical-strong">{opp.issues.join(" · ")}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <div className="grid gap-4 xl:grid-cols-2">
            <Card>
              <div className="mb-1 flex items-center justify-between">
                <CardHeader title="Top queries" />
                <a href={`/api/gsc/export?website=${website.id}&dimension=QUERY`} download className="inline-flex items-center gap-1 text-[12px] font-medium text-ink-secondary hover:text-ink"><Download className="size-3" aria-hidden /> CSV</a>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-120 text-left">
                  <thead><tr className="label-micro border-b border-line">
                    <th className="py-2 pr-3 font-semibold">Query</th><th className="py-2 pr-3 font-semibold">Clicks</th>
                    <th className="py-2 pr-3 font-semibold">Impr</th><th className="py-2 pr-3 font-semibold">CTR</th>
                    <th className="py-2 pr-3 font-semibold">Pos</th><th className="py-2 font-semibold">Δ</th>
                  </tr></thead>
                  <tbody className="divide-y divide-line">
                    {queries.map((q) => (
                      <tr key={q.key}>
                        <td className="max-w-52 truncate py-2.5 pr-3 text-[13px] text-ink" title={q.key}>{q.key}</td>
                        <td className="py-2.5 pr-3 text-[13px] tabular-nums">{fmt(q.clicks)}</td>
                        <td className="py-2.5 pr-3 text-[13px] tabular-nums text-ink-secondary">{fmt(q.impressions)}</td>
                        <td className="py-2.5 pr-3 text-[13px] tabular-nums text-ink-secondary">{pct(q.ctr)}</td>
                        <td className="py-2.5 pr-3 text-[13px] tabular-nums">{q.position.toFixed(1)}</td>
                        <td className="py-2.5 text-[13px] tabular-nums"><DeltaBadge delta={q.positionDelta} invert /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card>
              <div className="mb-1 flex items-center justify-between">
                <CardHeader title="Top pages" />
                <a href={`/api/gsc/export?website=${website.id}&dimension=PAGE`} download className="inline-flex items-center gap-1 text-[12px] font-medium text-ink-secondary hover:text-ink"><Download className="size-3" aria-hidden /> CSV</a>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-120 text-left">
                  <thead><tr className="label-micro border-b border-line">
                    <th className="py-2 pr-3 font-semibold">Page</th><th className="py-2 pr-3 font-semibold">Clicks</th>
                    <th className="py-2 pr-3 font-semibold">CTR</th><th className="py-2 pr-3 font-semibold">Pos</th>
                    <th className="py-2 font-semibold">Audit issues</th>
                  </tr></thead>
                  <tbody className="divide-y divide-line">
                    {pages.slice(0, 20).map((p) => {
                      const issues = issueCountFor(p.key);
                      return (
                        <tr key={p.key}>
                          <td className="max-w-56 truncate py-2.5 pr-3 font-mono text-[12px] text-ink" title={p.key}>
                            {p.key.replace(/^https?:\/\/[^/]+/, "") || "/"}
                          </td>
                          <td className="py-2.5 pr-3 text-[13px] tabular-nums">{fmt(p.clicks)}</td>
                          <td className="py-2.5 pr-3 text-[13px] tabular-nums text-ink-secondary">{pct(p.ctr)}</td>
                          <td className="py-2.5 pr-3 text-[13px] tabular-nums">{p.position.toFixed(1)}</td>
                          <td className="py-2.5 text-[13px]">
                            {latestAudit ? (
                              issues > 0 ? (
                                <Link href={`/dashboard/site-audit/${latestAudit.id}`} className="font-medium text-critical-strong hover:underline">{issues}</Link>
                              ) : (
                                <span className="text-success-strong">0</span>
                              )
                            ) : (
                              <span className="text-ink-faint">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            {[
              { title: "Countries", rows: countries },
              { title: "Devices", rows: devices },
              { title: "Search appearance", rows: appearance },
            ].map((section) => (
              <Card key={section.title}>
                <CardHeader title={section.title} />
                {section.rows.length === 0 ? (
                  <p className="py-1 text-sm text-ink-faint">No data.</p>
                ) : (
                  <ul className="divide-y divide-line">
                    {section.rows.map((row) => (
                      <li key={row.key} className="flex items-center justify-between gap-3 py-2">
                        <span className="min-w-0 truncate text-[13px] uppercase text-ink">{row.key}</span>
                        <span className="shrink-0 text-[12.5px] tabular-nums text-ink-secondary">
                          {fmt(row.clicks)} clicks · {pct(row.ctr)} · pos {row.position.toFixed(1)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            ))}
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader title="Sitemaps" />
              <SitemapsPanel websiteId={website.id} />
            </Card>
            <Card>
              <CardHeader title="URL inspection" />
              <InspectBox websiteId={website.id} baseUrl={website.url} />
            </Card>
          </div>

          <p className="text-[12px] leading-5 text-ink-faint">
            Data syncs daily from Google (reported with a ~2 day delay). Index-coverage totals, mobile
            usability, and Core Web Vitals buckets are not exposed by Google&apos;s API - use URL inspection
            above for per-page index status, and MyKavo&apos;s own Lighthouse audits for performance.
            {" "}<a href={website.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-ink-secondary hover:text-ink">Open site <ExternalLink className="size-3" aria-hidden /></a>
          </p>
        </>
      )}
    </div>
  );
}
