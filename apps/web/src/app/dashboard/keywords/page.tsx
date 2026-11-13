import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Sparkles } from "lucide-react";
import { prisma } from "@mykavo/database";
import { isGscReauthMessage } from "@mykavo/shared";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Chip, Micro, Section, TileStrip, type Tile } from "@/components/keywords/layout";
import { requireSession, getCurrentWorkspace } from "@/lib/session";
import { canUseKeywordAgent } from "@/lib/keywords/access";
import { loadAllowance, remaining } from "@/lib/keywords/jobs";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "AI Keywords - MyKavo", robots: { index: false } };

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** AI Keywords home: every website, where it stands, and what to do next. */
export default async function KeywordsPage() {
  const session = await requireSession();
  if (!(await canUseKeywordAgent(session.user))) notFound();
  const workspace = await getCurrentWorkspace(session.user.id, session.user.name);

  const [websites, allowance] = await Promise.all([
    prisma.website.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        url: true,
        gscConnection: { select: { property: true, lastError: true } },
        contentProfile: { select: { confirmed: true } },
        _count: { select: { gscQueryPages: true, keywordReports: true, contentPosts: true } },
      },
    }),
    loadAllowance(workspace.id),
  ]);

  if (websites.length === 0) {
    return (
      <EmptyState
        icon={Sparkles}
        title="Add a website first"
        description="AI Keywords works from the websites you monitor. Add one, and MyKavo finds what it should write next."
      />
    );
  }

  const ready = websites.filter((w) => w.contentProfile?.confirmed).length;
  const connected = websites.filter((w) => w.gscConnection?.property && !isGscReauthMessage(w.gscConnection.lastError)).length;
  const posts = websites.reduce((n, w) => n + w._count.contentPosts, 0);
  const postsLeft = remaining(allowance, "post");
  const reportsLeft = remaining(allowance, "report");
  const refills = allowance.period.end.toLocaleDateString("en-US", { month: "long", day: "numeric" });

  const tiles: Tile[] = [
    { label: "Websites set up", value: ready, note: ready === websites.length ? "All set up" : `${websites.length - ready} still to set up` },
    {
      label: "Search Console",
      value: connected,
      note: connected === websites.length ? "Every site connected" : `${websites.length - connected} not connected`,
    },
    { label: "Posts written", value: posts, note: "Across all websites" },
    {
      label: "Posts left",
      value: Number.isFinite(postsLeft) ? postsLeft : "Unlimited",
      note: `${Number.isFinite(reportsLeft) ? reportsLeft : "Unlimited"} reports left · refills ${refills}`,
      warn: postsLeft === 0,
    },
  ];

  return (
    <div className="max-w-6xl space-y-6">
      <div className="min-w-0">
        <Micro className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="flex items-center gap-1.5 text-accent">
            <span className="size-1.5 rounded-full bg-success" aria-hidden />
            AI Keywords
          </span>
          <span aria-hidden>/</span>
          <span>
            {websites.length} {websites.length === 1 ? "website" : "websites"}
          </span>
        </Micro>
        <h1 className="mt-2 text-[30px] font-semibold leading-tight tracking-[-0.02em] text-ink">
          Know what to write next.{" "}
          <span className="text-ink-secondary">
            <span className="mk-highlight text-ink">{posts}</span> {posts === 1 ? "post" : "posts"} written so far.
          </span>
        </h1>
        <p className="mt-1.5 max-w-2xl text-[14px] text-ink-secondary">
          Pick a website. MyKavo finds the searches it can win, from your own Search Console data and today&apos;s
          results, then writes the post in one click.
        </p>
      </div>

      <TileStrip tiles={tiles} />

      <Section
        id="websites"
        number={1}
        kind="Websites"
        title="Your websites"
        description="Open one to set it up, run a keyword report or write posts."
        meta={
          <span>
            <strong className="font-semibold text-ink">{ready}</strong>/{websites.length} set up
          </span>
        }
        flush
      >
        <ul className="divide-y divide-line">
          {websites.map((w) => {
            const gsc = w.gscConnection?.property
              ? isGscReauthMessage(w.gscConnection.lastError)
                ? { tone: "warning" as const, label: "Reconnect Search Console" }
                : { tone: "green" as const, label: "Search Console" }
              : { tone: "neutral" as const, label: "No Search Console" };
            const next = !w.contentProfile?.confirmed
              ? "Set up your business"
              : w._count.keywordReports === 0
                ? "Run your first keyword report"
                : w._count.contentPosts === 0
                  ? "Write your first post"
                  : "See what to write next";
            return (
              <li key={w.id}>
                <Link
                  href={`/dashboard/keywords/${w.id}`}
                  className="group grid items-center gap-x-5 gap-y-2 px-5 py-4 transition-colors hover:bg-ink/[0.03] focus-visible:bg-ink/[0.04] focus-visible:outline-none sm:px-6 md:grid-cols-[minmax(0,1fr)_auto_auto_auto]"
                >
                  <span className="min-w-0">
                    <span className="flex items-center gap-2 text-[14.5px] font-medium text-ink">
                      <span
                        className={cn("size-2 shrink-0 rounded-full", w.contentProfile?.confirmed ? "bg-success" : "bg-ink-faint")}
                        aria-hidden
                      />
                      <span className="truncate">{w.name}</span>
                    </span>
                    <span className="ml-4 block truncate font-mono text-[11.5px] text-ink-faint">{hostOf(w.url)}</span>
                  </span>
                  <span className="flex flex-wrap gap-1.5">
                    <Chip tone={gsc.tone}>{gsc.label}</Chip>
                  </span>
                  <dl className="flex gap-5 text-[12px]">
                    <div>
                      <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">Reports</dt>
                      <dd className="font-semibold tabular-nums text-ink">{w._count.keywordReports}</dd>
                    </div>
                    <div>
                      <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">Posts</dt>
                      <dd className="font-semibold tabular-nums text-ink">{w._count.contentPosts}</dd>
                    </div>
                  </dl>
                  <span className="flex items-center gap-1 text-[13px] font-medium text-accent">
                    {next}
                    <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </Section>
    </div>
  );
}
