import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, Building2, ChevronRight, FileText, Lock, Sparkles, Target, Wand2 } from "lucide-react";
import { isGscReauthMessage, type StrikingOpportunity } from "@mykavo/shared";
import { DeepPanel, SetupPanel, WriteButton } from "@/components/keywords/agent-panels";
import { Chip, Micro, Popularity, Section, TileStrip, type Tile } from "@/components/keywords/layout";
import { requireSession, getCurrentWorkspace } from "@/lib/session";
import { loadStrikingReport } from "@/lib/keywords/striking";
import { canUseKeywordAgent } from "@/lib/keywords/access";
import { loadAgentPage, type OpportunityView, type UpgradeOffer } from "@/lib/keywords/agent-data";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "AI Keywords - MyKavo", robots: { index: false } };

type Params = { params: Promise<{ websiteId: string }> };

const number = new Intl.NumberFormat("en-US");

function pathOf(page: string): string {
  try {
    const url = new URL(page);
    return url.pathname + url.search || "/";
  } catch {
    return page;
  }
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function competitionTone(c: string): "green" | "warning" | "neutral" {
  return c === "low" ? "green" : c === "high" ? "warning" : "neutral";
}

const shortDate = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

const linkButton =
  "inline-flex h-9 items-center rounded-full bg-primary px-4 text-[13px] font-semibold text-primary-contrast hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";

interface WriteProps {
  websiteId: string;
  writing: Record<string, string>;
  postsLeft: number | null;
  canWrite: boolean;
  upgrade: UpgradeOffer | null;
}

/** One of the top three: the big "write these next" card. */
function TopPick({ opp, w }: { opp: OpportunityView; w: WriteProps }) {
  return (
    <li
      className={cn(
        "flex flex-col rounded-2xl border bg-card p-5",
        opp.rank === 1 ? "border-[1.5px] border-ink shadow-[4px_4px_0_var(--color-primary)]" : "border-line",
      )}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Micro className="mr-1">#{opp.rank}</Micro>
        <Chip>{opp.intent}</Chip>
        <Chip tone={competitionTone(opp.competition)}>{opp.competition} competition*</Chip>
      </div>
      <h3 className="mt-3 text-[17px] font-semibold leading-snug tracking-tight text-ink">{opp.keyword}</h3>
      <p className="mt-1 text-[13px] italic leading-5 text-ink-secondary">&ldquo;{opp.suggestedTitle}&rdquo;</p>
      <p className="mt-3 flex-1 text-[13px] leading-5 text-ink-secondary">{opp.reason}</p>
      <div className="mt-4 flex items-center justify-between gap-2 border-t border-line pt-3 text-[12px] text-ink-faint">
        <span className="flex items-center gap-2">
          Popularity* <Popularity value={opp.popularity} />
        </span>
        {opp.position !== null && <span className="font-medium text-ink">You rank #{Math.round(opp.position)}</span>}
      </div>
      {w.canWrite && (
        <div className="mt-4">
          <WriteButton websiteId={w.websiteId} keyword={opp.keyword} runningJobId={w.writing[opp.keyword]} postsLeft={w.postsLeft} upgrade={w.upgrade} />
        </div>
      )}
    </li>
  );
}

/** Every other opportunity: one tidy row. */
function KeywordRow({ opp, w }: { opp: OpportunityView; w: WriteProps }) {
  return (
    <li className="grid gap-x-5 gap-y-2 px-5 py-3.5 sm:px-6 md:grid-cols-[2.25rem_minmax(0,1fr)_auto_auto] md:items-center">
      <span className="font-mono text-[11px] text-ink-faint">#{opp.rank}</span>
      <div className="min-w-0">
        <p className="text-[14px] font-medium text-ink">{opp.keyword}</p>
        <p className="truncate text-[12.5px] text-ink-secondary" title={opp.reason}>
          {opp.suggestedTitle}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 md:justify-end">
        <Chip>{opp.intent}</Chip>
        <Chip tone={competitionTone(opp.competition)}>{opp.competition}*</Chip>
        <span className="ml-1">
          <Popularity value={opp.popularity} />
        </span>
        {opp.position !== null && <span className="ml-1 text-[12px] text-ink-secondary">#{Math.round(opp.position)}</span>}
      </div>
      <div className="md:justify-self-end">
        {w.canWrite && (
          <WriteButton
            websiteId={w.websiteId}
            keyword={opp.keyword}
            runningJobId={w.writing[opp.keyword]}
            postsLeft={w.postsLeft} upgrade={w.upgrade}
            size="compact"
          />
        )}
      </div>
    </li>
  );
}

function StrikingRow({ opp, w }: { opp: StrikingOpportunity; w: WriteProps }) {
  return (
    <tr className="align-middle">
      <th scope="row" className="max-w-[260px] px-5 py-3 text-left font-medium text-ink sm:pl-6">
        <span className="line-clamp-2">{opp.query}</span>
        <a
          href={opp.page}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-0.5 inline-flex max-w-full items-center gap-1 truncate font-mono text-[11.5px] font-normal text-accent hover:underline"
        >
          <span className="truncate">{pathOf(opp.page)}</span>
          <ArrowUpRight className="size-3 shrink-0" aria-hidden />
          <span className="sr-only">(opens in a new tab)</span>
        </a>
      </th>
      <td className="px-4 py-3 text-right tabular-nums text-ink">{opp.position}</td>
      <td className="px-4 py-3 text-right tabular-nums text-ink">{number.format(opp.impressions)}</td>
      <td className="px-4 py-3 text-right tabular-nums text-ink-secondary">{(opp.ctr * 100).toFixed(1)}%</td>
      <td className="px-4 py-3 text-right tabular-nums font-medium text-ink">
        {opp.estimatedExtraClicks > 0 ? `+${number.format(opp.estimatedExtraClicks)}` : "-"}
      </td>
      <td className="px-5 py-3 sm:pr-6">
        {opp.action === "improve_page" ? (
          <span className="inline-flex flex-col items-start gap-0.5">
            <Chip tone="green">Improve this page</Chip>
          </span>
        ) : w.canWrite ? (
          <WriteButton
            websiteId={w.websiteId}
            keyword={opp.query}
            runningJobId={w.writing[opp.query]}
            postsLeft={w.postsLeft} upgrade={w.upgrade}
            size="compact"
          />
        ) : (
          <Chip tone="accent">Supporting post</Chip>
        )}
      </td>
    </tr>
  );
}

function LockedRow({ count, noun }: { count: number; noun: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-surface/60 px-5 py-3.5 sm:px-6">
      <p className="flex items-center gap-2 text-[13px] text-ink">
        <Lock className="size-4 text-ink-faint" aria-hidden />
        {count} more {count === 1 ? noun : `${noun}s`} on paid plans.
      </p>
      <Link href="/dashboard/billing?from=keywords" className={linkButton}>
        See plans
      </Link>
    </div>
  );
}

/** A used-up allowance, said once at the top, with the plan that gives more. */
function UpgradeBar({
  upgrade,
  postsOut,
  reportsOut,
  refillsOn,
}: {
  upgrade: UpgradeOffer;
  postsOut: boolean;
  reportsOut: boolean;
  refillsOn: string;
}) {
  const used = postsOut && reportsOut ? "blog posts and keyword reports" : postsOut ? "blog posts" : "keyword reports";
  return (
    <div
      role="status"
      className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-2xl border-[1.5px] border-ink bg-primary-soft px-5 py-4 shadow-[4px_4px_0_var(--color-ink)]"
    >
      <Sparkles className="size-5 shrink-0 text-accent" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-semibold text-ink">You&apos;ve used this month&apos;s {used}.</p>
        <p className="mt-0.5 text-[13px] leading-5 text-ink-secondary">
          Upgrade to {upgrade.plan} to write <strong className="font-semibold text-ink">{upgrade.posts} blog posts</strong> and run{" "}
          <strong className="font-semibold text-ink">{upgrade.reports} keyword reports</strong> a month. Yours refill on {refillsOn}.
        </p>
      </div>
      <Link
        href="/dashboard/billing?from=keywords:bar"
        className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full border-[1.5px] border-ink bg-primary px-5 text-[13.5px] font-semibold text-[#16181d] shadow-[3px_3px_0_var(--color-ink)] transition-transform hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        Upgrade to {upgrade.plan}
        <ArrowUpRight className="size-4" aria-hidden />
      </Link>
    </div>
  );
}

/** AI Keywords for one website: business, keyword report, already ranking, posts. */
export default async function KeywordReportPage({ params }: Params) {
  const session = await requireSession();
  if (!(await canUseKeywordAgent(session.user))) notFound();
  const workspace = await getCurrentWorkspace(session.user.id, session.user.name);
  const { websiteId } = await params;
  const striking = await loadStrikingReport(workspace.id, websiteId);
  if (!striking) notFound();
  const agent = await loadAgentPage(workspace.id, websiteId);

  const { website, connection, opportunities: strikingOpps, hiddenCount: strikingHidden } = striking;
  const connected = Boolean(connection?.property);
  const needsReconnect = connected && isGscReauthMessage(connection?.lastError ?? null);
  const confirmed = agent.profile?.confirmed === true;
  const { allowance, report, posts } = agent;
  const canWrite = confirmed && !allowance.blocked;
  const w: WriteProps = {
    websiteId: website.id,
    writing: agent.writing,
    postsLeft: allowance.postsLeft,
    canWrite,
    upgrade: allowance.upgrade,
  };

  const reportTotal = report ? report.opportunities.length + report.hiddenCount : 0;
  const strikingTotal = strikingOpps.length + strikingHidden;
  const drafts = posts.filter((p) => p.status === "draft").length;

  const tiles: Tile[] = [
    {
      label: "Keywords found",
      value: reportTotal,
      note: report ? `Report from ${shortDate(report.createdAt)}` : confirmed ? "Run your first report" : "Set up your business first",
    },
    {
      label: "Ranking 8 to 20",
      value: strikingTotal,
      note: !connected ? "Connect Search Console" : needsReconnect ? "Search Console needs a reconnect" : "From your Search Console",
      warn: needsReconnect,
    },
    {
      label: "Posts written",
      value: posts.length,
      note: posts.length === 0 ? "None yet" : drafts > 0 ? `${drafts} still ${drafts === 1 ? "a draft" : "drafts"}` : "All exported or published",
    },
    {
      label: "Posts left",
      value: allowance.postsLeft ?? "Unlimited",
      note: `${allowance.reportsLeft ?? "Unlimited"} ${allowance.reportsLeft === 1 ? "report" : "reports"} left · refills ${allowance.refillsOn}`,
      warn: allowance.postsLeft === 0,
    },
  ];

  const top = report?.opportunities.slice(0, 3) ?? [];
  const rest = report?.opportunities.slice(3) ?? [];
  const clusters = new Map<string, OpportunityView[]>();
  for (const o of rest) clusters.set(o.cluster, [...(clusters.get(o.cluster) ?? []), o]);

  const index = [
    { id: "business", label: "Your business", icon: Building2 },
    { id: "report", label: "Keyword report", icon: Wand2 },
    { id: "ranking", label: "Already ranking", icon: Target },
    { id: "posts", label: "Your posts", icon: FileText },
  ];

  return (
    <div className="max-w-6xl space-y-6">
      <div className="min-w-0">
        <Micro className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Link href="/dashboard/keywords" className="inline-flex items-center gap-1 text-accent hover:underline">
            <ArrowLeft className="size-3" aria-hidden /> AI Keywords
          </Link>
          <span aria-hidden>/</span>
          <span>{website.name}</span>
          <span aria-hidden>/</span>
          <span>{hostOf(website.url)}</span>
        </Micro>
        <h1 className="mt-2 text-[30px] font-semibold leading-tight tracking-[-0.02em] text-ink">
          {reportTotal > 0 ? (
            <>
              <span className="mk-highlight">
                {reportTotal} {reportTotal === 1 ? "keyword" : "keywords"}
              </span>{" "}
              worth writing for {website.name}.{" "}
              <span className="text-ink-secondary">
                {posts.length} {posts.length === 1 ? "post" : "posts"} drafted.
              </span>
            </>
          ) : (
            <>
              Find what <span className="mk-highlight">{website.name}</span> should write next.
            </>
          )}
        </h1>
        <p className="mt-1.5 max-w-2xl text-[14px] text-ink-secondary">
          MyKavo finds the searches worth winning, then writes the post. Monitoring keeps protecting the traffic you
          have; this helps you win more.
        </p>
        {allowance.blocked && (
          <p role="alert" className="mt-3 rounded-xl bg-critical-soft px-3 py-2 text-[13px] text-critical-strong">
            {allowance.blocked}{" "}
            <Link href="/dashboard/billing" className="font-semibold underline">
              Update billing
            </Link>
          </p>
        )}
      </div>

      <TileStrip tiles={tiles} />

      {allowance.upgrade && !allowance.blocked && (allowance.postsLeft === 0 || allowance.reportsLeft === 0) && (
        <UpgradeBar
          upgrade={allowance.upgrade}
          postsOut={allowance.postsLeft === 0}
          reportsOut={allowance.reportsLeft === 0}
          refillsOn={allowance.refillsOn}
        />
      )}

      {/* minmax(0,1fr) on phones too: an auto column would grow to the chip row's full width. */}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[180px_minmax(0,1fr)] lg:gap-8">
        <nav aria-label="AI Keywords sections" className="min-w-0 lg:sticky lg:top-24 lg:self-start">
          <ul className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 lg:mx-0 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:px-0 lg:pb-0">
            {index.map((item, i) => {
              const Icon = item.icon;
              return (
                <li key={item.id} className="shrink-0">
                  <a
                    href={`#${item.id}`}
                    className="flex items-center gap-2.5 whitespace-nowrap rounded-full border border-line px-3 py-1.5 text-[13px] text-ink-secondary transition-colors hover:bg-ink/[0.04] hover:text-ink lg:rounded-lg lg:border-transparent lg:px-2.5"
                  >
                    <span className="font-mono text-[10px] text-ink-faint">{String(i + 1).padStart(2, "0")}</span>
                    <Icon className="size-4 shrink-0 text-ink-faint" aria-hidden />
                    {item.label}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="min-w-0 space-y-5">
          <Section
            id="business"
            number={1}
            kind="Setup"
            title="Your business"
            description="What the agent knows about you. Every keyword and post is written for this."
            meta={confirmed ? <span className="text-success-strong">Confirmed</span> : <span>Not confirmed yet</span>}
          >
            <SetupPanel websiteId={website.id} profile={agent.profile} job={agent.jobs.setup ?? null} />
          </Section>

          <Section
            id="report"
            number={2}
            kind="Research"
            title="Keyword report"
            description="New keywords from your site, Google's suggestions and today's results, ranked by what to write first."
            meta={
              report ? (
                <span>
                  Updated <strong className="font-semibold text-ink">{shortDate(report.createdAt)}</strong>
                </span>
              ) : undefined
            }
            flush
          >
            <div className="px-5 py-5 sm:px-6">
              {confirmed ? (
                <DeepPanel
                  websiteId={website.id}
                  job={agent.jobs.deep ?? null}
                  canRun={!allowance.blocked}
                  hasReport={report !== null}
                  reportsLeft={allowance.reportsLeft}
                  reportsLimit={allowance.reportsLimit}
                  refillsOn={allowance.refillsOn}
                  upgrade={allowance.upgrade}
                />
              ) : (
                <p className="text-[13px] text-ink-secondary">
                  Confirm your business details in step 01 first, so the report fits what you actually sell.
                </p>
              )}
            </div>

            {report && report.opportunities.length > 0 && (
              <>
                <div className="border-t border-line px-5 py-5 sm:px-6">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="text-[14px] font-semibold text-ink">Write these next</h3>
                    {report.summary && <p className="max-w-2xl text-[12.5px] text-ink-secondary">{report.summary}</p>}
                  </div>
                  <ol className="mt-4 grid gap-4 lg:grid-cols-3">
                    {top.map((o) => (
                      <TopPick key={o.keyword} opp={o} w={w} />
                    ))}
                  </ol>
                </div>
                {[...clusters.entries()].map(([cluster, items]) => (
                  <div key={cluster} className="border-t border-line">
                    <div className="flex items-baseline justify-between gap-3 bg-surface/60 px-5 py-2.5 sm:px-6">
                      <Micro className="text-ink-secondary">{cluster}</Micro>
                      <Micro>{items.length}</Micro>
                    </div>
                    <ol className="divide-y divide-line">
                      {items.map((o) => (
                        <KeywordRow key={o.keyword} opp={o} w={w} />
                      ))}
                    </ol>
                  </div>
                ))}
                {report.hiddenCount > 0 && <LockedRow count={report.hiddenCount} noun="keyword" />}
                <p className="border-t border-line px-5 py-3 text-[11.5px] leading-5 text-ink-faint sm:px-6">
                  *Competition and popularity are estimates from Google&apos;s suggestions and today&apos;s results, not
                  search volumes. &ldquo;#&rdquo; is your real Search Console position where you already rank.
                </p>
              </>
            )}
          </Section>

          <Section
            id="ranking"
            number={3}
            kind="Search Console"
            title="Already ranking: positions 8 to 20"
            description="Searches you already appear for, just off the top of Google. The quickest wins."
            meta={
              connection?.lastSyncAt ? (
                <span>
                  Synced <strong className="font-semibold text-ink">{shortDate(connection.lastSyncAt.toISOString())}</strong>
                </span>
              ) : undefined
            }
            flush
          >
            {!connected ? (
              <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-6">
                <p className="max-w-xl text-[13px] leading-6 text-ink-secondary">
                  Connect Google Search Console to see the searches you already rank for, with your real positions and
                  impressions.
                </p>
                <Link href="/dashboard/search-console" className={linkButton}>
                  Connect Search Console
                </Link>
              </div>
            ) : needsReconnect ? (
              <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-6">
                <p className="max-w-xl text-[13px] leading-6 text-ink-secondary">
                  Google ended this connection, so these figures may be out of date. Reconnecting keeps your chosen
                  property.
                </p>
                <a href={`/api/gsc/connect?website=${website.id}`} className={linkButton}>
                  Reconnect
                </a>
              </div>
            ) : !striking.hasData ? (
              <p className="px-5 py-5 text-[13px] leading-6 text-ink-secondary sm:px-6">
                These appear after the next morning sync. For sooner, press Sync on the{" "}
                <Link href={`/dashboard/search-console/${website.id}`} className="text-accent hover:underline">
                  Search Console page
                </Link>
                .
              </p>
            ) : strikingOpps.length === 0 ? (
              <p className="px-5 py-5 text-[13px] leading-6 text-ink-secondary sm:px-6">
                None of your searches sit at positions 8 to 20 with enough impressions in the last 28 days. The keyword
                report above finds new ideas instead.
              </p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-[13px]">
                    <thead>
                      <tr className="border-b border-line font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">
                        <th scope="col" className="px-5 py-2.5 text-left font-medium sm:pl-6">Search · your page</th>
                        <th scope="col" className="px-4 py-2.5 text-right font-medium">Position</th>
                        <th scope="col" className="px-4 py-2.5 text-right font-medium">Impressions</th>
                        <th scope="col" className="px-4 py-2.5 text-right font-medium">CTR</th>
                        <th scope="col" className="px-4 py-2.5 text-right font-medium">Upside*</th>
                        <th scope="col" className="px-5 py-2.5 text-left font-medium sm:pr-6">Next step</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {strikingOpps.map((opp) => (
                        <StrikingRow key={opp.query} opp={opp} w={w} />
                      ))}
                    </tbody>
                  </table>
                </div>
                {strikingHidden > 0 && <LockedRow count={strikingHidden} noun="search" />}
                <p className="border-t border-line px-5 py-3 text-[11.5px] leading-5 text-ink-faint sm:px-6">
                  Real Search Console figures for the last 28 days (Google runs about 2 days behind). *Upside is an
                  estimate of extra clicks a month at position 4, using typical click-through rates. Not a promise.
                </p>
              </>
            )}
          </Section>

          <Section
            id="posts"
            number={4}
            kind="Drafts"
            title="Your posts"
            description="Drafts the agent wrote. Open one to edit it, then copy it into your site."
            meta={
              posts.length > 0 ? (
                <span>
                  <strong className="font-semibold text-ink">{drafts}</strong> draft{drafts === 1 ? "" : "s"} /{" "}
                  <strong className="font-semibold text-ink">{posts.length}</strong> total
                </span>
              ) : undefined
            }
            flush
          >
            {posts.length === 0 ? (
              <p className="px-5 py-5 text-[13px] leading-6 text-ink-secondary sm:px-6">
                {confirmed
                  ? "No posts yet. Press Write this post on any keyword above and your draft opens here."
                  : "Confirm your business details, then any keyword becomes a ready-to-edit post in one click."}
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {posts.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/dashboard/keywords/${website.id}/posts/${p.id}`}
                      className="group grid items-center gap-x-4 gap-y-1 px-5 py-3.5 transition-colors hover:bg-ink/[0.03] focus-visible:bg-ink/[0.04] focus-visible:outline-none sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:px-6"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-[14px] font-medium text-ink">{p.title}</span>
                        <span className="block truncate text-[12px] text-ink-faint">For &ldquo;{p.keyword}&rdquo;</span>
                      </span>
                      <span className="flex items-center gap-2 text-[12px] text-ink-faint">
                        <Chip tone={p.status === "draft" ? "neutral" : "green"}>
                          {p.status === "draft" ? "Draft" : p.status === "exported" ? "Exported" : "Published"}
                        </Chip>
                        {shortDate(p.updatedAt)}
                      </span>
                      <ChevronRight className="hidden size-4 text-ink-faint transition-transform group-hover:translate-x-0.5 sm:block" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}
