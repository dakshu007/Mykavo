import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { prisma } from "@fluxen/database";
import { requireSession, getCurrentWorkspace } from "@/lib/session";
import { Card, CardHeader } from "@/components/ui/card";
import {
  ChangeCategoryChip,
  ChangeSeverityBadge,
  ChangeStatusBadge,
} from "@/components/dashboard/change-badges";

function pathOf(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname + u.search;
  } catch {
    return url;
  }
}

export default async function ChangeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  const workspace = await getCurrentWorkspace(session.user.id, session.user.name);
  const { id } = await params;

  const change = await prisma.changeEvent.findFirst({
    where: { id, website: { workspaceId: workspace.id } },
    include: {
      website: { select: { id: true, name: true, url: true } },
      monitoredPage: { select: { id: true, url: true, websiteId: true } },
      previousSnapshot: { select: { id: true, screenshotStorageKey: true } },
      currentSnapshot: { select: { id: true, screenshotStorageKey: true } },
    },
  });
  if (!change) notFound();

  const isVisual = change.category === "VISUAL";
  const hasDiff =
    change.metadata &&
    typeof change.metadata === "object" &&
    "diffStorageKey" in (change.metadata as Record<string, unknown>);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/changes"
          className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-secondary hover:text-ink"
        >
          <ArrowLeft className="size-3.5" aria-hidden /> Changes
        </Link>
        <div className="flex flex-wrap items-center gap-2.5">
          <ChangeSeverityBadge severity={change.severity} />
          <ChangeCategoryChip category={change.category} />
          <ChangeStatusBadge status={change.status} />
        </div>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink">{change.title}</h1>
        <p className="mt-1 font-mono text-[13px] text-ink-faint">
          {new URL(change.website.url).hostname}
          {pathOf(change.monitoredPage.url)} ·{" "}
          {change.detectedAt.toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" })}
        </p>
      </div>

      <Card>
        <p className="text-[15px] leading-7 text-ink">{change.description}</p>
      </Card>

      {/* Before / after values */}
      {(change.previousValue || change.currentValue) && (
        <Card>
          <CardHeader title="What changed" />
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="label-micro mb-2">Baseline</p>
              <div className="rounded-tile bg-success-soft px-4 py-3 font-mono text-[13px] break-words text-green-800">
                {change.previousValue ?? "—"}
              </div>
            </div>
            <div>
              <p className="label-micro mb-2">Current</p>
              <div className="rounded-tile bg-critical-soft px-4 py-3 font-mono text-[13px] break-words text-red-700">
                {change.currentValue ?? "—"}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Screenshots (visual changes carry a diff too) */}
      {(change.previousSnapshot?.screenshotStorageKey ||
        change.currentSnapshot?.screenshotStorageKey) && (
        <Card>
          <CardHeader title="Before and after" />
          <div className={`grid gap-4 ${hasDiff ? "lg:grid-cols-3" : "sm:grid-cols-2"}`}>
            <figure>
              <figcaption className="label-micro mb-2">Baseline</figcaption>
              {change.previousSnapshot?.screenshotStorageKey ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/api/snapshots/${change.previousSnapshot.id}/screenshot`}
                  alt="Baseline screenshot"
                  className="w-full rounded-tile border border-line object-cover object-top"
                />
              ) : (
                <NoShot />
              )}
            </figure>
            <figure>
              <figcaption className="label-micro mb-2">Current</figcaption>
              {change.currentSnapshot?.screenshotStorageKey ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/api/snapshots/${change.currentSnapshot.id}/screenshot`}
                  alt="Current screenshot"
                  className="w-full rounded-tile border border-line object-cover object-top"
                />
              ) : (
                <NoShot />
              )}
            </figure>
            {hasDiff && (
              <figure>
                <figcaption className="label-micro mb-2">Difference</figcaption>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/changes/${change.id}/diff`}
                  alt="Visual difference"
                  className="w-full rounded-tile border border-line object-cover object-top"
                />
              </figure>
            )}
          </div>
        </Card>
      )}

      {/* Technical metadata */}
      <Card>
        <CardHeader
          title="Details"
          action={
            <Link
              href={`/dashboard/websites/${change.monitoredPage.websiteId}/pages/${change.monitoredPage.id}`}
              className="inline-flex items-center gap-1.5 text-[13px] font-medium text-primary hover:underline"
            >
              View page baseline <ExternalLink className="size-3.5" aria-hidden />
            </Link>
          }
        />
        <dl className="divide-y divide-line">
          {[
            ["Change type", change.changeType],
            ["Category", change.category],
            ["Severity", change.severity],
            ["Website", change.website.name],
            ["Detected", change.detectedAt.toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" })],
          ].map(([k, v]) => (
            <div key={k} className="flex gap-4 py-2.5">
              <dt className="w-32 shrink-0 text-[13px] font-medium text-ink-secondary">{k}</dt>
              <dd className="min-w-0 break-words font-mono text-[13px] text-ink">{v}</dd>
            </div>
          ))}
        </dl>
        {isVisual && (
          <p className="mt-3 text-[13px] text-ink-faint">
            Review actions (approve, ignore, update baseline) arrive in the next release.
          </p>
        )}
      </Card>
    </div>
  );
}

function NoShot() {
  return (
    <div className="flex h-40 items-center justify-center rounded-tile border border-line bg-surface text-[13px] text-ink-faint">
      No screenshot
    </div>
  );
}
