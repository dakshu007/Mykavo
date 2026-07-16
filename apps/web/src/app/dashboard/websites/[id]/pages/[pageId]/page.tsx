import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Sparkles } from "lucide-react";
import { prisma } from "@mykavo/database";
import { requireSession, getCurrentWorkspace } from "@/lib/session";
import { getWorkspacePlan } from "@/lib/limits";
import { Card, CardHeader } from "@/components/ui/card";
import { SetBaselineButton } from "@/components/dashboard/set-baseline-button";
import { MonitoredElementsManager } from "@/components/dashboard/monitored-elements-manager";

function pathOf(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname + u.search;
  } catch {
    return url;
  }
}

export default async function MonitoredPageDetail({
  params,
}: {
  params: Promise<{ id: string; pageId: string }>;
}) {
  const session = await requireSession();
  const workspace = await getCurrentWorkspace(session.user.id, session.user.name);
  const { id, pageId } = await params;

  const page = await prisma.monitoredPage.findFirst({
    where: { id: pageId, websiteId: id, website: { workspaceId: workspace.id } },
    include: {
      website: { select: { id: true, name: true } },
      baselines: {
        orderBy: { version: "desc" },
        include: {
          pageSnapshot: {
            select: {
              id: true,
              title: true,
              httpStatus: true,
              canonicalUrl: true,
              robotsMeta: true,
              screenshotStorageKey: true,
              createdAt: true,
            },
          },
          approvedByUser: { select: { name: true } },
        },
      },
      snapshots: {
        where: { errorCode: null },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          title: true,
          httpStatus: true,
          screenshotStorageKey: true,
          createdAt: true,
          scan: { select: { id: true, triggerType: true } },
        },
      },
      // Conversion elements + their latest observed state (Phase 9).
      monitoredElements: {
        orderBy: { createdAt: "asc" },
        include: {
          results: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { exists: true, visible: true },
          },
        },
      },
    },
  });
  if (!page) notFound();

  const plan = await getWorkspacePlan(workspace.id);
  const path = pathOf(page.url);
  const active = page.baselines.find((b) => b.status === "ACTIVE");
  const activeSnapshotId = active?.pageSnapshot.id;

  const elementViews = page.monitoredElements.map((el) => ({
    id: el.id,
    name: el.name,
    selector: el.selector,
    importance: el.importance,
    expectedExistence: el.expectedExistence,
    expectedVisibility: el.expectedVisibility,
    expectedText: el.expectedText,
    expectedHref: el.expectedHref,
    enabled: el.enabled,
    latest: el.results[0]
      ? { exists: el.results[0].exists, visible: el.results[0].visible }
      : null,
  }));

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/dashboard/websites/${page.website.id}`}
          className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-secondary hover:text-ink"
        >
          <ArrowLeft className="size-3.5" aria-hidden /> {page.website.name}
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-mono text-xl font-semibold tracking-tight text-ink">
            {path === "/" ? "/ (homepage)" : path}
          </h1>
          <a
            href={page.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-secondary hover:text-primary"
          >
            Open page <ExternalLink className="size-3.5" aria-hidden />
          </a>
        </div>
      </div>

      {/* Current baseline */}
      {active ? (
        <Card>
          <CardHeader
            title={
              <span className="flex items-center gap-2.5">
                Current baseline
                <span className="rounded-full bg-success-soft px-2.5 py-1 text-xs font-semibold text-success-strong">
                  Version {active.version}
                </span>
              </span>
            }
          />
          <div className="grid gap-6 sm:grid-cols-[220px_1fr]">
            {active.pageSnapshot.screenshotStorageKey ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/api/snapshots/${active.pageSnapshot.id}/screenshot`}
                alt={`Baseline screenshot of ${path}`}
                className="w-full rounded-tile border border-line object-cover object-top"
              />
            ) : (
              <div className="flex h-40 items-center justify-center rounded-tile border border-line bg-surface text-[13px] text-ink-faint">
                No screenshot
              </div>
            )}
            <dl className="divide-y divide-line self-start">
              {[
                ["Title", active.pageSnapshot.title ?? "—"],
                ["HTTP status", String(active.pageSnapshot.httpStatus ?? "—")],
                ["Canonical", active.pageSnapshot.canonicalUrl ?? "—"],
                ["Robots", active.pageSnapshot.robotsMeta ?? "—"],
                [
                  "Approved",
                  `${active.approvedAt?.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }) ?? "—"}${
                    active.approvedByUser ? ` by ${active.approvedByUser.name}` : " (initial baseline)"
                  }`,
                ],
              ].map(([k, v]) => (
                <div key={k} className="flex gap-4 py-2.5">
                  <dt className="w-28 shrink-0 text-[13px] font-medium text-ink-secondary">{k}</dt>
                  <dd className="min-w-0 break-words font-mono text-[13px] text-ink">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </Card>
      ) : (
        <Card>
          <p className="py-2 text-sm text-ink-secondary">
            No baseline yet. Run a baseline scan for this website, or approve one of the
            snapshots below.
          </p>
        </Card>
      )}

      {/* Baseline history */}
      {page.baselines.length > 0 && (
        <Card>
          <CardHeader title="Baseline history" />
          <ul className="divide-y divide-line">
            {page.baselines.map((b) => (
              <li key={b.id} className="flex items-center gap-4 py-3">
                <span className="w-20 shrink-0 text-sm font-medium text-ink">v{b.version}</span>
                <span
                  className={
                    b.status === "ACTIVE"
                      ? "rounded-full bg-success-soft px-2.5 py-0.5 text-[11px] font-semibold text-success-strong"
                      : "rounded-full bg-info-soft px-2.5 py-0.5 text-[11px] font-semibold text-info"
                  }
                >
                  {b.status === "ACTIVE" ? "Active" : "Superseded"}
                </span>
                <span className="flex-1 text-[13px] text-ink-secondary">
                  {b.approvedAt?.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
                  {b.approvedByUser ? ` · ${b.approvedByUser.name}` : " · initial"}
                </span>
                {b.status !== "ACTIVE" && (
                  <SetBaselineButton snapshotId={b.pageSnapshot.id} label="Restore" size="sm" />
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Conversion elements (Phase 9) */}
      <Card>
        {plan.limits.conversionElementMonitoring ? (
          <MonitoredElementsManager
            websiteId={page.website.id}
            pageId={page.id}
            elements={elementViews}
          />
        ) : (
          <div>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold tracking-tight text-ink">
                  Conversion elements
                </h2>
                <p className="mt-0.5 text-[13px] text-ink-secondary">
                  Monitor critical buttons, forms, and CTAs — get alerted the moment one goes
                  missing, hidden, or changes.
                </p>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-[11px] font-semibold text-primary">
                <Sparkles className="size-3.5" aria-hidden /> Pro
              </span>
            </div>
            {elementViews.length > 0 && (
              <p className="mt-3 text-[13px] text-warning-strong">
                {elementViews.length} configured element{elementViews.length === 1 ? "" : "s"}{" "}
                {elementViews.length === 1 ? "is" : "are"} paused on your current plan.
              </p>
            )}
            <Link
              href="/dashboard/billing"
              className="mt-4 inline-flex h-10 items-center gap-2 rounded-full bg-primary px-5 text-[13px] font-medium text-primary-contrast transition-colors hover:bg-primary-hover"
            >
              Upgrade to Pro
            </Link>
          </div>
        )}
      </Card>

      {/* Recent snapshots */}
      {page.snapshots.length > 0 && (
        <Card>
          <CardHeader title="Recent snapshots" />
          <ul className="divide-y divide-line">
            {page.snapshots.map((snap) => {
              const isBaseline = snap.id === activeSnapshotId;
              return (
                <li key={snap.id} className="flex items-center gap-4 py-3">
                  {snap.screenshotStorageKey ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`/api/snapshots/${snap.id}/screenshot`}
                      alt=""
                      className="h-14 w-20 shrink-0 rounded-lg border border-line object-cover object-top"
                    />
                  ) : (
                    <span className="h-14 w-20 shrink-0 rounded-lg border border-line bg-surface" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-ink">
                      {snap.title ?? "No title"}
                    </p>
                    <p className="font-mono text-xs text-ink-faint">
                      HTTP {snap.httpStatus} ·{" "}
                      {snap.createdAt.toLocaleString("en-US", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}{" "}
                      · {snap.scan.triggerType.toLowerCase()}
                    </p>
                  </div>
                  {isBaseline ? (
                    <span className="shrink-0 rounded-full bg-success-soft px-2.5 py-1 text-[11px] font-semibold text-success-strong">
                      Current baseline
                    </span>
                  ) : (
                    <SetBaselineButton snapshotId={snap.id} size="sm" />
                  )}
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
