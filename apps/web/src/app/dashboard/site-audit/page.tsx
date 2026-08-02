import type { Metadata } from "next";
import Link from "next/link";
import { SearchCheck } from "lucide-react";
import { prisma } from "@mykavo/database";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/dashboard/empty-state";
import { formatLimit } from "@/config/plans";
import { getWorkspacePlan } from "@/lib/limits";
import { requireSession, getCurrentWorkspace } from "@/lib/session";
import { AutoRefresh } from "@/app/dashboard/scans/[id]/auto-refresh";
import { RunAuditButton } from "./run-audit-button";
import { healthTone, isAuditRunning } from "./report-ui";

export const metadata: Metadata = { title: "Site Audit - MyKavo" };

/**
 * Site Audit home: every website with its latest audit - health score,
 * issue counts, crawl size - and a run button. The agency answer to
 * "which client site needs technical SEO work this week?"
 */
export default async function SiteAuditPage() {
  const session = await requireSession();
  const workspace = await getCurrentWorkspace(session.user.id, session.user.name);
  const plan = await getWorkspacePlan(workspace.id);

  const websites = await prisma.website.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      url: true,
      siteAudits: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  if (websites.length === 0) {
    return (
      <EmptyState
        icon={SearchCheck}
        title="No websites yet"
        description="Add a website first - then run a technical SEO audit against it: crawlability, titles, links, security, and 70+ more checks."
      />
    );
  }

  const anyRunning = websites.some((w) => w.siteAudits[0] && isAuditRunning(w.siteAudits[0]));

  return (
    <div className="space-y-6">
      {/* router.refresh polling - NEVER meta refresh: Chrome fires a scheduled
          meta refresh even after client-side navigation, yanking the user
          back to this page from anywhere in the dashboard. */}
      {anyRunning && <AutoRefresh intervalMs={6000} />}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Site Audit</h1>
          <p className="mt-1 text-sm text-ink-secondary">
            Technical SEO crawl - up to {formatLimit(plan.limits.siteAuditPages)} pages per
            audit on your {plan.name} plan, {plan.limits.siteAuditsPerDay}/day.
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {websites.map((website) => {
          const audit = website.siteAudits[0];
          const running = audit && isAuditRunning(audit);
          const timedOut =
            audit && !running && ["QUEUED", "RUNNING"].includes(audit.status);
          const hostname = (() => {
            try {
              return new URL(website.url).hostname;
            } catch {
              return website.url;
            }
          })();
          return (
            <Card key={website.id}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-semibold text-ink">{website.name}</p>
                  <p className="truncate font-mono text-xs text-ink-faint">{hostname}</p>
                </div>
                {audit?.status === "COMPLETED" && audit.healthScore !== null ? (
                  <p className={`text-3xl font-semibold tabular-nums tracking-tight ${healthTone(audit.healthScore)}`}>
                    {audit.healthScore}
                    <span className="ml-0.5 text-sm font-normal text-ink-faint">%</span>
                  </p>
                ) : null}
              </div>

              {audit ? (
                running ? (
                  <p className="mt-4 inline-flex items-center gap-2 text-sm text-ink-secondary">
                    <span aria-hidden className="size-2 animate-pulse rounded-full bg-primary" />
                    Audit in progress - crawling up to {formatLimit(plan.limits.siteAuditPages)} pages…
                  </p>
                ) : audit.status === "FAILED" || timedOut ? (
                  <p className="mt-4 text-sm text-critical-strong">
                    {timedOut
                      ? "Last audit timed out - run it again."
                      : `Last audit failed${audit.errorMessage ? `: ${audit.errorMessage}` : "."}`}
                  </p>
                ) : (
                  <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[13px]">
                    <span className="font-medium text-critical-strong">{audit.errorCount} errors</span>
                    <span className="font-medium text-warning-strong">{audit.warningCount} warnings</span>
                    <span className="text-ink-secondary">{audit.noticeCount} notices</span>
                    <span className="text-ink-faint">
                      {audit.pagesCrawled} pages ·{" "}
                      {audit.completedAt?.toLocaleDateString("en-US", { dateStyle: "medium" })}
                    </span>
                  </div>
                )
              ) : (
                <p className="mt-4 text-sm text-ink-secondary">
                  Never audited - run the first crawl to get a health score.
                </p>
              )}

              <div className="mt-5 flex items-center justify-between gap-3 border-t border-line pt-4">
                {audit && audit.status === "COMPLETED" ? (
                  <Link
                    href={`/dashboard/site-audit/${audit.id}`}
                    className="text-[13px] font-medium text-primary hover:underline"
                  >
                    View full report →
                  </Link>
                ) : (
                  <span />
                )}
                {!running && <RunAuditButton websiteId={website.id} small={Boolean(audit)} />}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
