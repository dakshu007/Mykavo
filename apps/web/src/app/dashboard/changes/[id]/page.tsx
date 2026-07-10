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
import { ChangeActions } from "@/components/dashboard/change-actions";
import { ScreenshotCompare } from "@/components/dashboard/screenshot-compare";
import { defaultCompareMode } from "@/lib/screenshot-compare";

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
      previousSnapshot: { select: { id: true, screenshotStorageKey: true, createdAt: true } },
      currentSnapshot: {
        select: { id: true, screenshotStorageKey: true, createdAt: true, errorCode: true },
      },
    },
  });
  if (!change) notFound();

  const canUpdateBaseline = !!change.currentSnapshot && !change.currentSnapshot.errorCode;
  const hasDiff =
    typeof change.metadata === "object" &&
    change.metadata !== null &&
    typeof (change.metadata as Record<string, unknown>).diffStorageKey === "string";

  const beforeSrc = change.previousSnapshot?.screenshotStorageKey
    ? `/api/snapshots/${change.previousSnapshot.id}/screenshot`
    : null;
  const afterSrc = change.currentSnapshot?.screenshotStorageKey
    ? `/api/snapshots/${change.currentSnapshot.id}/screenshot`
    : null;
  const diffSrc = hasDiff ? `/api/changes/${change.id}/diff` : null;
  const shotDate = (d: Date | undefined) =>
    d?.toLocaleDateString("en-US", { dateStyle: "medium" }) ?? null;

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
          {change.monitoredPage ? pathOf(change.monitoredPage.url) : " · Site-wide"} ·{" "}
          {change.detectedAt.toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" })}
        </p>
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="max-w-xl text-[15px] leading-7 text-ink">{change.description}</p>
          <ChangeActions
            changeId={change.id}
            status={change.status}
            canUpdateBaseline={canUpdateBaseline}
          />
        </div>
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
      {(beforeSrc || afterSrc) && (
        <Card>
          <CardHeader title="Before and after" />
          <ScreenshotCompare
            beforeSrc={beforeSrc}
            afterSrc={afterSrc}
            diffSrc={diffSrc}
            beforeLabel={shotDate(change.previousSnapshot?.createdAt)}
            afterLabel={shotDate(change.currentSnapshot?.createdAt)}
            initialMode={defaultCompareMode(
              { hasBefore: !!beforeSrc, hasAfter: !!afterSrc, hasDiff },
              change.category === "VISUAL",
            )}
          />
        </Card>
      )}

      {/* Technical metadata */}
      <Card>
        <CardHeader
          title="Details"
          action={
            change.monitoredPage ? (
              <Link
                href={`/dashboard/websites/${change.monitoredPage.websiteId}/pages/${change.monitoredPage.id}`}
                className="inline-flex items-center gap-1.5 text-[13px] font-medium text-primary hover:underline"
              >
                View page baseline <ExternalLink className="size-3.5" aria-hidden />
              </Link>
            ) : undefined
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
      </Card>
    </div>
  );
}
