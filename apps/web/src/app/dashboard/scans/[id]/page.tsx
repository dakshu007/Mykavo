import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { prisma } from "@fluxen/database";
import { requireSession, getCurrentWorkspace } from "@/lib/session";
import { Card, CardHeader } from "@/components/ui/card";
import { ScanStatusBadge } from "@/components/dashboard/scan-status";
import { AutoRefresh } from "./auto-refresh";

export default async function ScanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  const workspace = await getCurrentWorkspace(session.user.id, session.user.name);
  const { id } = await params;

  const scan = await prisma.scan.findFirst({
    where: { id, website: { workspaceId: workspace.id } },
    include: {
      website: { select: { id: true, name: true, url: true } },
      snapshots: {
        include: {
          monitoredPage: { select: { url: true } },
          _count: { select: { links: true, scripts: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!scan) notFound();

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
                      <p className="mt-1 text-[13px] text-red-700">
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
                  {!failed && (
                    <span className="shrink-0 rounded-full bg-success-soft px-2.5 py-1 text-[11px] font-semibold text-green-700">
                      Captured
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
