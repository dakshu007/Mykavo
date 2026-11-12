import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PenLine, Plus, UserRound } from "lucide-react";
import { prisma } from "@mykavo/database";
import { requireSession } from "@/lib/session";
import { isBlogAdmin } from "@/lib/blog-admin";
import { EmptyState } from "@/components/dashboard/empty-state";
import { ButtonLink } from "@/components/ui/button";
import { FlapNumber } from "@/components/dashboard/overview/summary-row";
import { buildCalendar, publishingStreak, summarize, withDisplay } from "@/components/dashboard/blog/blog-board";
import { PublishingStrip } from "@/components/dashboard/blog/publishing-strip";
import { PostList } from "@/components/dashboard/blog/post-list";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Blog" };

/** One clock read per request (module-level fn keeps the compiler happy). */
function requestNow(): number {
  return Date.now();
}

function agoText(at: number, now: number): string {
  const mins = Math.max(0, Math.round((now - at) / 60_000));
  if (mins < 60) return `${mins}m ago`;
  const h = Math.round(mins / 60);
  return h < 48 ? `${h}h ago` : `${Math.round(h / 24)}d ago`;
}

function untilText(at: number, now: number): string {
  const mins = Math.max(0, Math.round((at - now) / 60_000));
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  return h < 48 ? `${h}h ${String(mins % 60).padStart(2, "0")}m` : `${Math.round(h / 24)}d`;
}

/**
 * The blog, as an editorial desk: a sentence that says what is live and
 * what goes up next, four readouts, the publishing calendar (morning and
 * evening slots for the last four weeks and the week ahead), then every
 * post, searchable and grouped by what needs doing.
 */
export default async function DashboardBlogPage() {
  const now = requestNow();
  const session = await requireSession();
  if (!isBlogAdmin(session.user)) notFound();

  const posts = await prisma.blogPost.findMany({
    orderBy: { updatedAt: "desc" },
    select: { id: true, slug: true, title: true, status: true, publishedAt: true, updatedAt: true },
  });

  if (posts.length === 0) {
    return (
      <EmptyState
        icon={PenLine}
        title="No posts yet"
        description="Write your first post in Markdown and publish it straight to /blog - no redeploy needed. Drafts stay private until you publish."
        action={<ButtonLink href="/dashboard/blog/new">Write your first post</ButtonLink>}
      />
    );
  }

  const rows = withDisplay(
    posts.map((p) => ({
      ...p,
      publishedAt: p.publishedAt ? p.publishedAt.toISOString() : null,
      updatedAt: p.updatedAt.toISOString(),
    })),
    now,
  );
  const summary = summarize(rows, now);
  const streak = publishingStreak(rows, now);
  const calendar = buildCalendar(rows, now);

  const readouts = [
    { label: "Live posts", value: summary.live, note: summary.lastPublished ? `Last one ${agoText(summary.lastPublished, now)}` : "None yet" },
    { label: "Last 30 days", value: summary.last30, note: `${(summary.last30 / 30).toFixed(1)} a day on average` },
    {
      label: "Scheduled",
      value: summary.scheduled,
      note: summary.nextScheduled ? `Next in ${untilText(summary.nextScheduled.at, now)}` : "Queue is empty",
      warn: summary.scheduled === 0,
    },
    { label: "Drafts", value: summary.drafts, note: summary.drafts ? "Waiting for a final pass" : "Nothing in progress" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-faint">
            <span className="inline-flex items-center gap-1.5 text-success-strong">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60 motion-reduce:hidden" />
                <span className="relative inline-flex size-2 rounded-full bg-success" />
              </span>
              Admin / Blog
            </span>
            {summary.lastPublished && (
              <>
                <span aria-hidden>/</span>
                <span>Last post {agoText(summary.lastPublished, now)}</span>
              </>
            )}
            {streak > 1 && (
              <>
                <span aria-hidden>/</span>
                <span>{streak}-day streak</span>
              </>
            )}
          </p>
          <h1 className="mt-3 max-w-3xl pb-2 text-[30px] font-semibold leading-[1.12] tracking-[-0.025em] text-ink sm:text-[38px]">
            <span className="mk-highlight">
              {summary.live} {summary.live === 1 ? "post" : "posts"}
            </span>{" "}
            live.{" "}
            {summary.nextScheduled ? (
              <>
                Next one in <span className="whitespace-nowrap">{untilText(summary.nextScheduled.at, now)}</span>.
              </>
            ) : (
              <>Nothing queued yet.</>
            )}
          </h1>
          {summary.nextScheduled && (
            <p className="mt-1 max-w-2xl truncate text-[14.5px] text-ink-secondary">
              Up next: <span className="font-medium text-ink">{summary.nextScheduled.title}</span>
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <ButtonLink href="/dashboard/blog/authors" size="sm" variant="secondary">
            <UserRound className="size-4" aria-hidden /> Authors
          </ButtonLink>
          <ButtonLink href="/dashboard/blog/new" size="sm">
            <Plus className="size-4" aria-hidden /> New post
          </ButtonLink>
        </div>
      </div>

      <dl className="grid grid-cols-2 overflow-hidden rounded-2xl border-[1.5px] border-ink bg-card shadow-[5px_5px_0_var(--color-primary)] lg:grid-cols-4">
        {readouts.map((t, i) => (
          <div
            key={t.label}
            className={cn(
              "flex flex-col gap-3 p-4 sm:p-5",
              i % 2 === 1 && "border-l border-line",
              i >= 2 && "border-t border-line lg:border-t-0",
              i === 2 && "lg:border-l",
            )}
          >
            <dt className="font-mono text-[10.5px] font-medium uppercase tracking-[0.14em] text-ink-faint">{t.label}</dt>
            <dd className="order-first">
              <FlapNumber value={t.value} index={i} />
            </dd>
            <dd className={cn("-mt-1 text-xs", t.warn ? "font-medium text-warning-strong" : "text-ink-secondary")}>{t.note}</dd>
          </div>
        ))}
      </dl>

      <PublishingStrip days={calendar} streak={streak} />

      <PostList rows={rows} now={now} />
    </div>
  );
}
