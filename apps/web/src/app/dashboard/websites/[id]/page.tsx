import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { prisma } from "@fluxen/database";
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
import { WebsiteActions } from "./website-actions";

export default async function WebsiteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  const workspace = await getCurrentWorkspace(session.user.id, session.user.name);
  const { id } = await params;

  const website = await prisma.website.findFirst({
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
      performanceAudits: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });
  if (!website) notFound();

  const auditViews: AuditView[] = website.performanceAudits.map((a) => ({
    id: a.id,
    status: a.status,
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

  const openChanges = await prisma.changeEvent.findMany({
    where: { websiteId: website.id, status: { in: ["NEW", "REVIEWED"] } },
    select: { severity: true },
  });

  const hostname = new URL(website.url).hostname;
  const hasFinishedScan = website.scans.some(
    (s) => s.status === "COMPLETED" || s.status === "PARTIAL",
  );
  const pagesWithBaseline = website.monitoredPages.filter(
    (p) => p.baselines.length > 0,
  ).length;

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

      {/* Lighthouse performance audit (on-demand) */}
      <Card>
        <PerformanceAuditPanel websiteId={website.id} initialAudits={auditViews} />
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
