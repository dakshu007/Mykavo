import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { prisma } from "@fluxen/database";
import { requireSession, getCurrentWorkspace } from "@/lib/session";
import { Card, CardHeader } from "@/components/ui/card";
import { ScanStatusBadge } from "@/components/dashboard/scan-status";
import { SetBaselineButton } from "@/components/dashboard/set-baseline-button";
import { ChangeSeverityBadge, ChangeCategoryChip } from "@/components/dashboard/change-badges";
import { ApproveScanButton } from "@/components/dashboard/approve-scan-button";
import { AutoRefresh } from "./auto-refresh";

export default async function ScanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  const workspace = await getCurrentWorkspace(session.user.id, session.user.name);
  const { id } = await params;

  // Both queries scope to the workspace, so they can run in parallel.
  const [scan, changes] = await Promise.all([
    prisma.scan.findFirst({
      where: { id, website: { workspaceId: workspace.id } },
      include: {
        website: { select: { id: true, name: true, url: true } },
        snapshots: {
          include: {
            monitoredPage: {
              select: {
                id: true,
                url: true,
                baselines: {
                  where: { status: "ACTIVE" },
                  select: { pageSnapshotId: true, version: true },
                },
              },
            },
            _count: { select: { links: true, scripts: true } },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    }),
    prisma.changeEvent.findMany({
      where: { scanId: id, website: { workspaceId: workspace.id } },
      include: { monitoredPage: { select: { url: true } } },
      orderBy: [{ detectedAt: "desc" }],
    }),
  ]);
  if (!scan) notFound();
  const severityRank = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1, INFO: 0 } as const;
  const sortedChanges = [...changes].sort(
    (a, b) => severityRank[b.severity] - severityRank[a.severity],
  );
  const openChangeCount = changes.filter(
    (c) => c.status === "NEW" || c.status === "REVIEWED",
  ).length;

  const inFlight = scan.status === "QUEUED" || scan.status === "RUNNING";

  const summary = [
    { label: "Pages requested", value: scan.pagesRequested },
    { label: "Pages scanned", value: scan.pagesScanned },
    { label: "Pages failed", value: scan.pagesFailed },
    {
      label: "Duration",
      value:
        scan.startedAt && scan.completedAt
          ? `${Math.round((scan.completedAt.getTime() - scan.startedAt.getTime()) / 1000)}s`
          : "—",
    },
  ];

  return (
    <div className="space-y-6">
      {inFlight && <AutoRefresh />}

      <div>
        <Link
          href={`/dashboard/websites/${scan.website.id}`}
          className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-secondary hover:text-ink"
        >
          <ArrowLeft className="size-3.5" aria-hidden /> {scan.website.name}
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            {scan.triggerType === "BASELINE" ? "Baseline scan" : "Scan"}
          </h1>
          <ScanStatusBadge status={scan.status} />
          {inFlight && (
            <span className="inline-flex items-center gap-1.5 text-[13px] text-ink-secondary">
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
              updating automatically
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-ink-secondary">
          {scan.createdAt.toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" })}
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {summary.map((s) => (
          <Card key={s.label}>
            <p className="label-micro mb-2">{s.label}</p>
            <p className="text-4xl font-semibold tracking-tight text-ink">{s.value}</p>
          </Card>
        ))}
      </div>

      {changes.length > 0 && (
        <Card>
          <CardHeader
            title={`Changes detected (${changes.length})`}
            action={
              openChangeCount > 0 ? (
                <ApproveScanButton scanId={scan.id} openChangeCount={openChangeCount} />
              ) : (
                <span className="rounded-full bg-success-soft px-3.5 py-1.5 text-[13px] font-medium text-success-strong">
                  All reviewed
                </span>
              )
            }
          />
          <ul className="divide-y divide-line">
            {sortedChanges.map((c) => {
              const path = (() => {
                if (!c.monitoredPage) return "Site-wide";
                try {
                  const u = new URL(c.monitoredPage.url);
                  return u.pathname + u.search;
                } catch {
                  return c.monitoredPage.url;
                }
              })();
              return (
                <li key={c.id}>
                  <Link href={`/dashboard/changes/${c.id}`} className="flex items-center gap-4 py-3">
                    <ChangeSeverityBadge severity={c.severity} className="w-24 shrink-0 justify-center" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">{c.title}</p>
                      <p className="truncate font-mono text-xs text-ink-faint">
                        {path === "/" ? "/ (homepage)" : path}
                      </p>
                    </div>
                    <ChangeCategoryChip category={c.category} />
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <Card>
        <CardHeader title="Page results" />
        {scan.snapshots.length === 0 ? (
          <p className="py-4 text-sm text-ink-secondary">
            {inFlight ? "Waiting for the first page result…" : "No page results."}
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {scan.snapshots.map((snap) => {
              const path = (() => {
                try {
                  const u = new URL(snap.url);
                  return u.pathname + u.search;
                } catch {
                  return snap.url;
                }
              })();
              const failed = snap.errorCode !== null;
              const activeBaseline = snap.monitoredPage.baselines[0];
              const isBaseline = activeBaseline?.pageSnapshotId === snap.id;
              return (
                <li key={snap.id} className="flex items-start gap-4 py-4">
                  {snap.screenshotStorageKey ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`/api/snapshots/${snap.id}/screenshot`}
                      alt={`Screenshot of ${path}`}
                      className="h-20 w-32 shrink-0 rounded-lg border border-line object-cover object-top"
                    />
                  ) : (
                    <span className="flex h-20 w-32 shrink-0 items-center justify-center rounded-lg border border-line bg-surface text-[11px] text-ink-faint">
                      No screenshot
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-[13px] font-medium text-ink">
                      {path === "/" ? "/ (homepage)" : path}
                    </p>
                    {failed ? (
                      <p className="mt-1 text-[13px] text-critical-strong">
                        {snap.errorCode}: {snap.errorMessage}
                      </p>
                    ) : (
                      <>
                        <p className="mt-1 truncate text-[13px] text-ink-secondary">
                          {snap.title ?? "No title"}
                        </p>
                        <p className="mt-1 font-mono text-xs text-ink-faint">
                          HTTP {snap.httpStatus} · {snap.responseTimeMs}ms ·{" "}
                          {Math.round((snap.pageWeightBytes ?? 0) / 1024)} KB ·{" "}
                          {snap.requestCount} requests · {snap._count.links} links ·{" "}
                          {snap._count.scripts} scripts
                        </p>
                      </>
                    )}
                  </div>
                  {!failed &&
                    (isBaseline ? (
                      <span className="shrink-0 rounded-full bg-success-soft px-2.5 py-1 text-[11px] font-semibold text-success-strong">
                        Baseline v{activeBaseline?.version}
                      </span>
                    ) : (
                      <SetBaselineButton snapshotId={snap.id} size="sm" />
                    ))}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
