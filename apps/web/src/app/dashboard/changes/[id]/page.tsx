import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { prisma } from "@mykavo/database";
import { requireSession, getCurrentMembership } from "@/lib/session";
import { Card, CardHeader } from "@/components/ui/card";
import {
  ChangeCategoryChip,
  ChangeSeverityBadge,
  ChangeStatusBadge,
} from "@/components/dashboard/change-badges";
import { ChangeActions } from "@/components/dashboard/change-actions";
import {
  ChangeNoteForm,
  ChangeNoteDeleteButton,
} from "@/components/dashboard/change-notes";
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

interface BrokenLinkRow {
  url: string;
  /** Terminal HTTP status; 0 means unreachable. */
  status: number;
  /** Monitored pages linking to this URL. */
  pages: number;
}

/** Defensive parse of metadata.brokenLinks written by the comparison worker. */
function parseBrokenLinks(metadata: unknown): BrokenLinkRow[] {
  if (typeof metadata !== "object" || metadata === null) return [];
  const list = (metadata as { brokenLinks?: unknown }).brokenLinks;
  if (!Array.isArray(list)) return [];
  return list.filter(
    (entry): entry is BrokenLinkRow =>
      typeof entry === "object" &&
      entry !== null &&
      typeof (entry as BrokenLinkRow).url === "string" &&
      typeof (entry as BrokenLinkRow).status === "number" &&
      typeof (entry as BrokenLinkRow).pages === "number",
  );
}

/** Compact "2h ago"-style date for the notes thread. */
function relativeDate(d: Date): string {
  const mins = Math.floor((Date.now() - d.getTime()) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString("en-US", { dateStyle: "medium" });
}

export default async function ChangeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  const { workspace, role } = await getCurrentMembership(session.user.id, session.user.name);
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
      notes: {
        include: { author: { select: { id: true, name: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!change) notFound();

  // Notes are mutations - viewers read the thread but cannot write to it.
  const canWriteNotes = role === "OWNER" || role === "ADMIN" || role === "MEMBER";
  const canModerateNotes = role === "OWNER" || role === "ADMIN";

  const canUpdateBaseline = !!change.currentSnapshot && !change.currentSnapshot.errorCode;
  const brokenLinks = parseBrokenLinks(change.metadata);
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

      {/* Notes thread */}
      <Card>
        <CardHeader title="Notes" />
        {change.notes.length === 0 ? (
          <p className="text-sm text-ink-secondary">
            No notes yet.
            {canWriteNotes ? " Leave context for your team - root cause, next steps, who's on it." : ""}
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {change.notes.map((note) => (
              <li key={note.id} className="flex gap-3 py-3.5 first:pt-0">
                <span
                  aria-hidden
                  className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[13px] font-semibold text-primary"
                >
                  {note.author.name.trim().charAt(0).toUpperCase() || "?"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px]">
                    <span className="font-medium text-ink">{note.author.name}</span>{" "}
                    <span className="text-ink-faint">· {relativeDate(note.createdAt)}</span>
                  </p>
                  <p className="mt-1 text-sm leading-6 whitespace-pre-wrap break-words text-ink">
                    {note.body}
                  </p>
                </div>
                {(note.author.id === session.user.id || canModerateNotes) && (
                  <ChangeNoteDeleteButton changeId={change.id} noteId={note.id} />
                )}
              </li>
            ))}
          </ul>
        )}
        {canWriteNotes && <ChangeNoteForm changeId={change.id} />}
      </Card>

      {/* Before / after values */}
      {(change.previousValue || change.currentValue) && (
        <Card>
          <CardHeader title="What changed" />
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="label-micro mb-2">Baseline</p>
              <div className="rounded-tile bg-success-soft px-4 py-3 font-mono text-[13px] break-words text-success-strong">
                {change.previousValue ?? "-"}
              </div>
            </div>
            <div>
              <p className="label-micro mb-2">Current</p>
              <div className="rounded-tile bg-critical-soft px-4 py-3 font-mono text-[13px] break-words text-critical-strong">
                {change.currentValue ?? "-"}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Broken internal links (site-wide LINKS events carry the full list) */}
      {brokenLinks.length > 0 && (
        <Card>
          <CardHeader title={`Broken links (${brokenLinks.length})`} />
          <ul className="divide-y divide-line">
            {brokenLinks.map((link) => (
              <li
                key={link.url}
                className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 py-2.5 first:pt-0 last:pb-0"
              >
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-w-0 max-w-full truncate font-mono text-[13px] font-medium text-ink hover:text-primary"
                >
                  {pathOf(link.url)}
                </a>
                <span className="rounded-full bg-critical-soft px-2.5 py-0.5 text-[12px] font-semibold text-critical-strong">
                  {link.status === 0 ? "Unreachable" : `HTTP ${link.status}`}
                </span>
                <span className="text-[13px] text-ink-secondary">
                  linked from {link.pages} page{link.pages === 1 ? "" : "s"}
                </span>
              </li>
            ))}
          </ul>
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
