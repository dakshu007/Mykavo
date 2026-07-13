import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, ExternalLink } from "lucide-react";
import { prisma } from "@fluxen/database";
import { requireSession, getCurrentWorkspace } from "@/lib/session";
import { Card, CardHeader } from "@/components/ui/card";
import {
  buildSeoReport,
  groupIssuesByCheck,
  seoScoreBand,
  SEO_CHECK_META,
  type SeoIssue,
  type SeoSeverity,
} from "@/lib/seo-report";

export const metadata = { title: "SEO health — Fluxen" };

const STALE_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

/** One clock read per request (module helper keeps the component pure). */
function isStaleScan(scanDate: Date): boolean {
  return Date.now() - scanDate.getTime() > STALE_AFTER_MS;
}

/** Score number colour per band — the label text always rides along. */
const BAND_TEXT: Record<ReturnType<typeof seoScoreBand>["tone"], string> = {
  success: "text-success-strong",
  warning: "text-warning-strong",
  critical: "text-critical-strong",
};

const BAND_CHIP: Record<ReturnType<typeof seoScoreBand>["tone"], string> = {
  success: "bg-success-soft text-success-strong",
  warning: "bg-warning-soft text-warning-strong",
  critical: "bg-critical-soft text-critical-strong",
};

/** Severity chip: colour always paired with a text label. */
function SeverityChip({ severity, count }: { severity: SeoSeverity; count: number }) {
  const styles: Record<SeoSeverity, string> = {
    critical: "bg-critical-soft text-critical-strong",
    warning: "bg-warning-soft text-warning-strong",
    info: "bg-info-soft text-info",
  };
  const labels: Record<SeoSeverity, string> = {
    critical: count === 1 ? "critical issue" : "critical issues",
    warning: count === 1 ? "warning" : "warnings",
    info: "info",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${styles[severity]}`}
    >
      {count} {labels[severity]}
    </span>
  );
}

function pagePath(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname + u.search;
    return path === "/" ? "/ (homepage)" : path;
  } catch {
    return url;
  }
}

function IssueRow({ websiteId, issue }: { websiteId: string; issue: SeoIssue }) {
  return (
    <li className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 py-2.5">
      <Link
        href={`/dashboard/websites/${websiteId}/pages/${issue.monitoredPageId}`}
        className="min-w-0 max-w-full truncate font-mono text-[13px] font-medium text-ink hover:text-primary"
      >
        {pagePath(issue.pageUrl)}
      </Link>
      <span className="min-w-0 flex-1 basis-64 text-[13px] text-ink-secondary">
        {issue.message}
      </span>
    </li>
  );
}

export default async function SeoHealthPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  const workspace = await getCurrentWorkspace(session.user.id, session.user.name);
  const { id } = await params;

  // Both queries scope to the route param + workspace, so they run in parallel.
  const [website, scan] = await Promise.all([
    prisma.website.findFirst({
      where: { id, workspaceId: workspace.id },
      select: { id: true, name: true },
    }),
    prisma.scan.findFirst({
      where: {
        websiteId: id,
        website: { workspaceId: workspace.id },
        status: { in: ["COMPLETED", "PARTIAL"] },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        createdAt: true,
        completedAt: true,
        snapshots: {
          select: {
            monitoredPageId: true,
            url: true,
            httpStatus: true,
            errorCode: true,
            title: true,
            metaDescription: true,
            canonicalUrl: true,
            robotsMeta: true,
            h1Values: true,
            // Internal link statuses from the worker's per-scan link check.
            links: {
              where: { linkType: "INTERNAL" },
              select: { normalizedUrl: true, statusCode: true },
            },
          },
        },
      },
    }),
  ]);
  if (!website) notFound();

  const header = (
    <div>
      <Link
        href={`/dashboard/websites/${website.id}`}
        className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-secondary hover:text-ink"
      >
        <ArrowLeft className="size-3.5" aria-hidden /> {website.name}
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">SEO health</h1>
      <p className="mt-1 text-sm text-ink-secondary">
        Title, description, H1, canonical and indexability checks across your monitored
        pages — from your latest scan, no extra crawling.
      </p>
    </div>
  );

  if (!scan) {
    return (
      <div className="space-y-6">
        {header}
        <Card>
          <p className="py-4 text-sm text-ink-secondary">
            No finished scan yet — the report is built from scan data.{" "}
            <Link
              href={`/dashboard/websites/${website.id}`}
              className="font-medium text-primary hover:underline"
            >
              Run your first scan →
            </Link>
          </p>
        </Card>
      </div>
    );
  }

  const report = buildSeoReport(scan.snapshots);
  const band = seoScoreBand(report.score);
  const groups = groupIssuesByCheck(report.issues);
  const scanDate = scan.completedAt ?? scan.createdAt;
  const isStale = isStaleScan(scanDate);
  const scanDateLabel = scanDate.toLocaleDateString("en-US", { dateStyle: "medium" });

  return (
    <div className="space-y-6">
      {header}

      <Card>
        <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
          <div>
            <p className="label-micro mb-2">Health score</p>
            <p className="flex items-baseline gap-3">
              <span
                className={`text-5xl font-semibold tracking-tight tabular-nums ${BAND_TEXT[band.tone]}`}
              >
                {report.score}
              </span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${BAND_CHIP[band.tone]}`}
              >
                {band.label}
              </span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {report.counts.critical > 0 && (
              <SeverityChip severity="critical" count={report.counts.critical} />
            )}
            {report.counts.warning > 0 && (
              <SeverityChip severity="warning" count={report.counts.warning} />
            )}
            {report.counts.info > 0 && (
              <SeverityChip severity="info" count={report.counts.info} />
            )}
            {report.issues.length === 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2.5 py-0.5 text-[12px] font-semibold text-success-strong">
                No issues
              </span>
            )}
          </div>
          <p className="ml-auto text-[13px] text-ink-faint">
            From the scan on {scanDateLabel} ·{" "}
            {report.pagesAnalyzed} page{report.pagesAnalyzed === 1 ? "" : "s"} analyzed
          </p>
        </div>
        <p className="mt-4 border-t border-line pt-3 text-[12px] text-ink-faint">
          Score starts at 100 and deducts 25 per critical issue, 5 per warning and 1 per
          info item.
        </p>
      </Card>

      {isStale && (
        <Card className="border border-warning-soft">
          <p className="text-sm text-ink-secondary">
            <span className="font-semibold text-warning-strong">This report may be stale</span>{" "}
            — the latest finished scan is from {scanDateLabel}, more than 7 days ago.{" "}
            <Link
              href={`/dashboard/websites/${website.id}`}
              className="font-medium text-primary hover:underline"
            >
              Run a scan for fresh results →
            </Link>
          </p>
        </Card>
      )}

      {report.pagesAnalyzed === 0 ? (
        <Card>
          <p className="py-4 text-sm text-ink-secondary">
            The latest scan recorded no page snapshots.{" "}
            <Link
              href={`/dashboard/websites/${website.id}/pages`}
              className="font-medium text-primary hover:underline"
            >
              Choose pages to monitor →
            </Link>
          </p>
        </Card>
      ) : report.issues.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <CheckCircle2 className="size-10 text-success-strong" aria-hidden />
            <p className="text-lg font-semibold text-ink">
              No SEO issues found across {report.pagesAnalyzed} monitored page
              {report.pagesAnalyzed === 1 ? "" : "s"}
            </p>
            <p className="max-w-md text-sm text-ink-secondary">
              Titles, descriptions, headings, canonicals and indexability all look good.
              Fluxen re-checks on every scan and this report updates automatically.
            </p>
          </div>
        </Card>
      ) : (
        groups.map(({ check, issues }) => (
          <Card key={check}>
            <CardHeader
              title={
                <span className="flex items-center gap-2.5">
                  {SEO_CHECK_META[check].title}
                  <SeverityChip severity={issues[0].severity} count={issues.length} />
                </span>
              }
            />
            <p className="mb-1 text-[13px] text-ink-secondary">{SEO_CHECK_META[check].why}</p>
            <ul className="divide-y divide-line">
              {issues.map((item) => (
                <IssueRow
                  key={`${check}-${item.monitoredPageId}`}
                  websiteId={website.id}
                  issue={item}
                />
              ))}
            </ul>
          </Card>
        ))
      )}

      <p className="flex items-center gap-1.5 text-[13px] text-ink-faint">
        <ExternalLink className="size-3.5" aria-hidden />
        Checks cover your monitored pages only — Fluxen reports from scan data instead of
        crawling your whole site.
      </p>
    </div>
  );
}
