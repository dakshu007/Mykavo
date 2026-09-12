import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, ExternalLink } from "lucide-react";
import { prisma } from "@mykavo/database";
import { AUDIT_CHECKS, type AuditCategory, type AuditIssueGroup } from "@mykavo/seo-audit";
import { Card } from "@/components/ui/card";
import { requireSession, getCurrentWorkspace } from "@/lib/session";
import { AutoRefresh } from "@/app/dashboard/scans/[id]/auto-refresh";
import { RunAuditButton } from "../run-audit-button";
import { FixTip } from "../fix-tip";
import { HealthGauge, SEVERITY_CHIP, healthTone, isAuditRunning } from "../report-ui";

export const metadata: Metadata = { title: "Audit report - MyKavo" };

type Params = { params: Promise<{ id: string }> };

/** Compact display for a "found on" source: path only, sitemap called out. */
function pagePathLabel(source: string): string {
  try {
    const url = new URL(source);
    if (/sitemap.*\.xml$/i.test(url.pathname)) return "the sitemap";
    return url.pathname + url.search || "/";
  } catch {
    return source;
  }
}

/**
 * The audit report: health gauge + issue browser. Issues are grouped by
 * category, ordered worst-first, each row carrying a severity chip, the
 * affected-URL count, a "how to fix" tooltip, and an expandable URL list.
 */
export default async function SiteAuditReportPage({ params }: Params) {
  const session = await requireSession();
  const workspace = await getCurrentWorkspace(session.user.id, session.user.name);
  const { id } = await params;

  const audit = await prisma.siteAudit.findFirst({
    where: { id, website: { workspaceId: workspace.id } },
    include: { website: { select: { id: true, name: true, url: true } } },
  });
  if (!audit) notFound();

  const running = isAuditRunning(audit);
  const timedOut = !running && ["QUEUED", "RUNNING"].includes(audit.status);
  const issues = (Array.isArray(audit.issues) ? audit.issues : []) as unknown as AuditIssueGroup[];

  // Group by category, keeping the stored worst-first ordering inside each.
  const byCategory = new Map<AuditCategory, AuditIssueGroup[]>();
  for (const group of issues) {
    const def = AUDIT_CHECKS[group.checkId];
    if (!def) continue;
    byCategory.set(def.category, [...(byCategory.get(def.category) ?? []), group]);
  }
  const categories = [...byCategory.entries()].sort(
    (a, b) =>
      b[1].reduce((s, g) => s + g.count, 0) - a[1].reduce((s, g) => s + g.count, 0),
  );

  const hostname = (() => {
    try {
      return new URL(audit.website.url).hostname;
    } catch {
      return audit.website.url;
    }
  })();

  return (
    <div className="space-y-6">
      {/* router.refresh polling - never meta refresh (Chrome fires scheduled
          refreshes even after client-side navigation away from this page). */}
      {running && <AutoRefresh intervalMs={6000} />}
      <div>
        <Link
          href="/dashboard/site-audit"
          className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-secondary hover:text-ink"
        >
          <ArrowLeft className="size-3.5" aria-hidden /> Site Audit
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-ink">
              {audit.website.name}
            </h1>
            <a
              href={audit.website.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-0.5 inline-flex items-center gap-1.5 font-mono text-[13px] text-ink-secondary hover:text-accent"
            >
              {hostname}
              <ExternalLink className="size-3" aria-hidden />
            </a>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-[13px] text-ink-faint">
              {audit.completedAt
                ? `Audited ${audit.completedAt.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}`
                : "Audit in progress…"}
            </p>
            {audit.status === "COMPLETED" && issues.length > 0 && (
              <a
                href={`/api/site-audits/${audit.id}/export`}
                download
                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line bg-card px-4 text-[13px] font-medium text-ink-secondary transition-colors hover:text-ink"
              >
                <Download className="size-3.5" aria-hidden />
                Export CSV
              </a>
            )}
            {!running && <RunAuditButton websiteId={audit.website.id} small />}
          </div>
        </div>
      </div>

      {running ? (
        <Card>
          <p className="inline-flex items-center gap-2 py-2 text-sm text-ink-secondary">
            <span aria-hidden className="size-2 animate-pulse rounded-full bg-primary" />
            Crawling and checking pages - this page refreshes automatically.
          </p>
        </Card>
      ) : audit.status === "FAILED" || timedOut ? (
        <Card>
          <p className="py-2 text-sm text-critical-strong">
            {timedOut
              ? "The audit timed out before finishing. Try running it again."
              : `The audit failed${audit.errorMessage ? `: ${audit.errorMessage}` : "."} Try running it again.`}
          </p>
        </Card>
      ) : (
        <>
          {/* Headline band: gauge + stats */}
          <div className="grid gap-4 lg:grid-cols-[auto_1fr]">
            <Card className="flex flex-col items-center justify-center px-10">
              <p className="label-micro mb-2">Health score</p>
              <HealthGauge score={audit.healthScore ?? 0} />
              <p className={`mt-1 text-[13px] font-medium ${healthTone(audit.healthScore ?? 0)}`}>
                {(audit.healthScore ?? 0) >= 90
                  ? "Excellent"
                  : (audit.healthScore ?? 0) >= 70
                    ? "Needs work"
                    : "Poor"}
              </p>
              <p className="mt-2 max-w-52 text-center text-[11.5px] leading-4 text-ink-faint">
                Share of crawled URLs with no error-level issues
              </p>
            </Card>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { label: "Pages crawled", value: audit.pagesCrawled, sub: `${audit.urlsDiscovered} URLs discovered` },
                { label: "Errors", value: audit.errorCount, tone: "text-critical-strong", sub: `${audit.pagesWithErrors} pages affected` },
                { label: "Warnings", value: audit.warningCount, tone: "text-warning-strong" },
                { label: "Notices", value: audit.noticeCount },
              ].map((stat) => (
                <Card key={stat.label}>
                  <p className="label-micro mb-2">{stat.label}</p>
                  <p className={`text-4xl font-semibold tabular-nums tracking-tight ${stat.tone ?? "text-ink"}`}>
                    {stat.value.toLocaleString("en-US")}
                  </p>
                  {stat.sub && <p className="mt-1.5 text-[12px] text-ink-faint">{stat.sub}</p>}
                </Card>
              ))}
            </div>
          </div>
          {audit.stoppedReason === "blocked" && (
            <p className="rounded-tile bg-warning-soft px-4 py-3 text-[12.5px] leading-5 text-warning-strong">
              Many requests were rejected (403/429) - this site&apos;s bot protection
              throttled the crawler, so error counts below may reflect the firewall
              rather than the site. Allowlist the &quot;MyKavoAudit&quot; user-agent or audit
              a staging URL for full coverage.
            </p>
          )}
          {audit.stoppedReason === "page-limit" && (
            <p className="text-[12.5px] text-ink-faint">
              Crawl stopped at your plan&apos;s page limit - more URLs exist.{" "}
              <Link href="/dashboard/billing" className="font-medium text-accent hover:underline">
                Upgrade for 1,500-page crawls
              </Link>
              .
            </p>
          )}

          {/* Issue browser */}
          {issues.length === 0 ? (
            <Card>
              <p className="py-2 text-sm text-ink-secondary">
                No issues detected - this site passes every check MyKavo runs. 🎉
              </p>
            </Card>
          ) : (
            categories.map(([category, groups]) => (
              <Card key={category}>
                <div className="mb-1 flex items-baseline justify-between gap-3">
                  <h2 className="text-[15px] font-semibold text-ink">{category}</h2>
                  <p className="text-[12px] text-ink-faint">
                    {groups.reduce((s, g) => s + g.count, 0).toLocaleString("en-US")} issues
                  </p>
                </div>
                <ul className="divide-y divide-line">
                  {groups.map((group) => {
                    const def = AUDIT_CHECKS[group.checkId];
                    const chip = SEVERITY_CHIP[def.severity];
                    return (
                      <li key={group.checkId} className="py-3">
                        <div className="flex items-center gap-3">
                          <span className={`inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${chip.className}`}>
                            {chip.label}
                          </span>
                          <Link
                            href={`/dashboard/site-audit/${audit.id}/issue/${group.checkId}`}
                            className="group/issue min-w-0 flex-1 truncate text-sm font-medium text-ink hover:text-accent"
                          >
                            {def.title}
                            <span className="ml-1.5 hidden text-[12px] font-normal text-accent group-hover/issue:inline">
                              view all →
                            </span>
                          </Link>
                          <Link
                            href={`/dashboard/site-audit/${audit.id}/issue/${group.checkId}`}
                            className="shrink-0 text-sm font-semibold tabular-nums text-ink hover:text-accent"
                          >
                            {group.count.toLocaleString("en-US")}
                          </Link>
                          <FixTip title={def.title} explain={def.explain} fix={def.fix} />
                        </div>
                        {group.urls.length > 0 && (
                          <details className="group mt-1.5 pl-1">
                            <summary className="cursor-pointer list-none text-[12px] font-medium text-ink-faint transition-colors hover:text-ink">
                              <span className="group-open:hidden">
                                Show affected URLs ({Math.min(group.urls.length, group.count)})
                              </span>
                              <span className="hidden group-open:inline">Hide URLs</span>
                            </summary>
                            <ul className="mt-2 max-h-72 space-y-1.5 overflow-y-auto rounded-tile bg-surface px-3 py-2.5">
                              {group.urls.map((entry: { url: string; detail?: string; foundOn?: string[] }) => (
                                <li key={entry.url + (entry.detail ?? "")} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                                  <a
                                    href={entry.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="min-w-0 break-all font-mono text-[12px] text-ink-secondary hover:text-accent"
                                  >
                                    {entry.url}
                                  </a>
                                  {entry.detail && (
                                    <span className="font-mono text-[11px] text-ink-faint">{entry.detail}</span>
                                  )}
                                  {entry.foundOn && entry.foundOn.length > 0 && (
                                    <span className="flex basis-full flex-wrap items-baseline gap-x-2 pl-3">
                                      <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-faint">
                                        found on
                                      </span>
                                      {entry.foundOn.map((source) => (
                                        <a
                                          key={source}
                                          href={source}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="break-all font-mono text-[11px] text-ink-secondary underline decoration-line underline-offset-2 hover:text-accent"
                                        >
                                          {pagePathLabel(source)}
                                        </a>
                                      ))}
                                    </span>
                                  )}
                                </li>
                              ))}
                              {group.count > group.urls.length && (
                                <li className="pt-1 text-[11px] text-ink-faint">
                                  …and {group.count - group.urls.length} more
                                </li>
                              )}
                            </ul>
                          </details>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </Card>
            ))
          )}
        </>
      )}
    </div>
  );
}
