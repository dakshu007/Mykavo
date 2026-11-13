import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, Building2, FileText, Lock, Search, Target, Wand2 } from "lucide-react";
import { isGscReauthMessage, type StrikingOpportunity } from "@mykavo/shared";
import { Card, CardHeader } from "@/components/ui/card";
import { DeepPanel, SetupPanel, WriteButton } from "@/components/keywords/agent-panels";
import { requireSession, getCurrentWorkspace } from "@/lib/session";
import { loadStrikingReport } from "@/lib/keywords/striking";
import { canUseKeywordAgent } from "@/lib/keywords/access";
import { loadAgentPage, type OpportunityView } from "@/lib/keywords/agent-data";

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

function percent(ctr: number): string {
  return `${(ctr * 100).toFixed(ctr < 0.1 ? 1 : 0)}%`;
}

function Chip({ tone, children }: { tone: "green" | "accent" | "neutral" | "warning"; children: React.ReactNode }) {
  const cls = {
    green: "bg-success-soft text-success-strong",
    accent: "bg-primary-soft text-accent",
    neutral: "bg-ink/5 text-ink-secondary",
    warning: "bg-warning-soft text-warning-strong",
  }[tone];
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${cls}`}>{children}</span>;
}

function ActionChip({ action }: { action: StrikingOpportunity["action"] }) {
  return action === "improve_page" ? <Chip tone="green">Improve page</Chip> : <Chip tone="accent">Supporting post</Chip>;
}

function Popularity({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`Popularity estimate ${value} of 5`} title="Estimate from Google's suggestions, not a search volume">
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={`size-1.5 rounded-full ${i <= value ? "bg-accent" : "bg-ink/15"}`} />
      ))}
    </span>
  );
}

function competitionTone(c: string): "green" | "warning" | "neutral" {
  return c === "low" ? "green" : c === "high" ? "warning" : "neutral";
}

function OpportunityCard({
  opp,
  websiteId,
  writing,
  postsLeft,
  canWrite,
}: {
  opp: OpportunityView;
  websiteId: string;
  writing?: string;
  postsLeft: number | null;
  canWrite: boolean;
}) {
  return (
    <li className="flex flex-col rounded-2xl border border-line bg-card p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">#{opp.rank}</span>
        <Chip tone="neutral">{opp.intent}</Chip>
        <Chip tone={competitionTone(opp.competition)}>{opp.competition} competition*</Chip>
      </div>
      <h3 className="mt-2 text-[17px] font-semibold leading-snug tracking-tight text-ink">{opp.keyword}</h3>
      <p className="mt-1 text-[13px] italic text-ink-secondary">&ldquo;{opp.suggestedTitle}&rdquo;</p>
      <p className="mt-2 flex-1 text-[13px] leading-5 text-ink-secondary">{opp.reason}</p>
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-3 text-[12px] text-ink-faint">
        <span className="flex items-center gap-2">
          Popularity* <Popularity value={opp.popularity} />
        </span>
        {opp.position !== null && <span>You rank #{Math.round(opp.position)}</span>}
      </div>
      {canWrite && (
        <div className="mt-3">
          <WriteButton websiteId={websiteId} keyword={opp.keyword} runningJobId={writing} postsLeft={postsLeft} />
        </div>
      )}
    </li>
  );
}

function StrikingCard({
  opp,
  rank,
  websiteId,
  writing,
  postsLeft,
  canWrite,
}: {
  opp: StrikingOpportunity;
  rank: number;
  websiteId: string;
  writing?: string;
  postsLeft: number | null;
  canWrite: boolean;
}) {
  return (
    <li className="flex flex-col rounded-2xl border border-line bg-card p-5">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">#{rank}</span>
        <ActionChip action={opp.action} />
      </div>
      <h3 className="mt-2 text-[17px] font-semibold leading-snug tracking-tight text-ink">{opp.query}</h3>
      <p className="mt-2 flex-1 text-[13px] leading-5 text-ink-secondary">{opp.reason}</p>
      <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-3 text-center">
        <div>
          <dt className="text-[11px] text-ink-faint">Position</dt>
          <dd className="text-[15px] font-semibold tabular-nums text-ink">{opp.position}</dd>
        </div>
        <div>
          <dt className="text-[11px] text-ink-faint">Impressions</dt>
          <dd className="text-[15px] font-semibold tabular-nums text-ink">{number.format(opp.impressions)}</dd>
        </div>
        <div>
          <dt className="text-[11px] text-ink-faint">Upside*</dt>
          <dd className="text-[15px] font-semibold tabular-nums text-ink">
            {opp.estimatedExtraClicks > 0 ? `+${number.format(opp.estimatedExtraClicks)}` : "-"}
          </dd>
        </div>
      </dl>
      <a
        href={opp.page}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-flex min-w-0 items-center gap-1 truncate font-mono text-[12px] text-accent hover:underline"
      >
        <span className="truncate">{pathOf(opp.page)}</span>
        <ArrowUpRight className="size-3 shrink-0" aria-hidden />
        <span className="sr-only">(opens in a new tab)</span>
      </a>
      {canWrite && opp.action === "supporting_post" && (
        <div className="mt-3">
          <WriteButton websiteId={websiteId} keyword={opp.query} runningJobId={writing} postsLeft={postsLeft} />
        </div>
      )}
    </li>
  );
}

/** AI Keywords for one website: setup, keyword report, striking distance, posts. */
export default async function KeywordReportPage({ params }: Params) {
  const session = await requireSession();
  if (!(await canUseKeywordAgent(session.user))) notFound();
  const workspace = await getCurrentWorkspace(session.user.id, session.user.name);
  const { websiteId } = await params;
  const striking = await loadStrikingReport(workspace.id, websiteId);
  if (!striking) notFound();
  const agent = await loadAgentPage(workspace.id, websiteId);

  const { website, connection, opportunities, hiddenCount } = striking;
  const connected = Boolean(connection?.property);
  const needsReconnect = connected && isGscReauthMessage(connection?.lastError ?? null);
  const confirmed = agent.profile?.confirmed === true;
  const canWrite = confirmed && !agent.allowance.blocked;
  const strikingTop = opportunities.slice(0, 3);
  const strikingRest = opportunities.slice(3);
  const report = agent.report;
  const { allowance } = agent;

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <Link href="/dashboard/keywords" className="inline-flex items-center gap-1 text-[13px] text-ink-secondary hover:text-ink">
          <ArrowLeft className="size-3.5" aria-hidden /> AI Keywords
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink">What to write next for {website.name}</h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-ink-secondary">
          MyKavo finds the searches worth winning, then writes the post. Monitoring keeps protecting the traffic you
          have; this helps you win more.
        </p>
        <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-ink-faint">
          <span>
            Keyword reports:{" "}
            <b className="text-ink">{allowance.reportsLeft === null ? "unlimited" : `${allowance.reportsLeft} of ${allowance.reportsLimit} left`}</b>
          </span>
          <span>
            AI posts: <b className="text-ink">{allowance.postsLeft === null ? "unlimited" : `${allowance.postsLeft} of ${allowance.postsLimit} left`}</b>
          </span>
          <span>Refills on {allowance.refillsOn}</span>
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

      <Card>
        <CardHeader icon={Building2} title="Your business" />
        <SetupPanel websiteId={website.id} profile={agent.profile} job={agent.jobs.setup ?? null} />
      </Card>

      {confirmed && (
        <Card>
          <CardHeader icon={Wand2} title="Keyword report" />
          <DeepPanel
            websiteId={website.id}
            job={agent.jobs.deep ?? null}
            canRun={!allowance.blocked}
            hasReport={report !== null}
            reportsLeft={allowance.reportsLeft}
            refillsOn={allowance.refillsOn}
          />
        </Card>
      )}

      {report && report.opportunities.length > 0 && (
        <section aria-labelledby="report-heading" className="space-y-3">
          <div>
            <h2 id="report-heading" className="text-[16px] font-semibold tracking-tight text-ink">
              Write these next
            </h2>
            {report.summary && <p className="mt-1 max-w-3xl text-sm leading-6 text-ink-secondary">{report.summary}</p>}
          </div>
          <ol className="grid gap-4 lg:grid-cols-3">
            {report.opportunities.slice(0, 3).map((o) => (
              <OpportunityCard
                key={o.keyword}
                opp={o}
                websiteId={website.id}
                writing={agent.writing[o.keyword]}
                postsLeft={allowance.postsLeft}
                canWrite={canWrite}
              />
            ))}
          </ol>
          {report.opportunities.length > 3 && (
            <ol className="grid gap-3 md:grid-cols-2">
              {report.opportunities.slice(3).map((o) => (
                <OpportunityCard
                  key={o.keyword}
                  opp={o}
                  websiteId={website.id}
                  writing={agent.writing[o.keyword]}
                  postsLeft={allowance.postsLeft}
                  canWrite={canWrite}
                />
              ))}
            </ol>
          )}
          {report.hiddenCount > 0 && (
            <Card className="flex flex-wrap items-center justify-between gap-4">
              <p className="flex items-center gap-2 text-sm text-ink">
                <Lock className="size-4 text-ink-faint" aria-hidden />
                {report.hiddenCount} more {report.hiddenCount === 1 ? "keyword" : "keywords"} in this report on paid plans.
              </p>
              <Link
                href="/dashboard/billing?from=keywords"
                className="inline-flex h-9 items-center rounded-full bg-primary px-4 text-[13px] font-semibold text-primary-contrast hover:bg-primary-hover"
              >
                See plans
              </Link>
            </Card>
          )}
          <p className="max-w-3xl text-[12px] leading-5 text-ink-faint">
            *Competition and popularity are estimates from Google&apos;s suggestions and the current results, not search
            volumes. Connect Search Console to see your real positions and impressions.
          </p>
        </section>
      )}

      <section aria-labelledby="striking-heading" className="space-y-3">
        <h2 id="striking-heading" className="flex items-center gap-2 text-[16px] font-semibold tracking-tight text-ink">
          <Target className="size-4 text-accent" aria-hidden /> Already ranking: positions 8 to 20
        </h2>

        {!connected ? (
          <Card>
            <CardHeader icon={Search} title="Connect Google Search Console" />
            <p className="max-w-2xl text-sm leading-6 text-ink-secondary">
              Your real Search Console data shows the searches you already appear for, just off page one. Connect it once
              and these appear after the first sync.
            </p>
            <Link
              href="/dashboard/search-console"
              className="mt-4 inline-flex h-9 items-center rounded-full bg-primary px-4 text-[13px] font-semibold text-primary-contrast hover:bg-primary-hover"
            >
              Connect Search Console
            </Link>
          </Card>
        ) : needsReconnect ? (
          <Card>
            <CardHeader icon={Search} title="Reconnect Google Search Console" />
            <p className="max-w-2xl text-sm leading-6 text-ink-secondary">
              Google ended this connection, so the figures below may be out of date. Reconnecting takes one click and
              keeps your chosen property.
            </p>
            <a
              href={`/api/gsc/connect?website=${website.id}`}
              className="mt-4 inline-flex h-9 items-center rounded-full bg-primary px-4 text-[13px] font-semibold text-primary-contrast hover:bg-primary-hover"
            >
              Reconnect
            </a>
          </Card>
        ) : !striking.hasData ? (
          <Card>
            <p className="max-w-2xl text-sm leading-6 text-ink-secondary">
              Search Console syncs every morning; these appear after the next sync. To get them sooner, press Sync on the{" "}
              <Link href={`/dashboard/search-console/${website.id}`} className="text-accent hover:underline">
                Search Console page
              </Link>
              .
            </p>
          </Card>
        ) : opportunities.length === 0 ? (
          <Card>
            <p className="max-w-2xl text-sm leading-6 text-ink-secondary">
              None of your searches sit at positions 8 to 20 with enough impressions in the last 28 days. The keyword
              report above finds ideas without Search Console data.
            </p>
          </Card>
        ) : null}

        {strikingTop.length > 0 && (
          <ol className="grid gap-4 lg:grid-cols-3">
            {strikingTop.map((opp, i) => (
              <StrikingCard
                key={opp.query}
                opp={opp}
                rank={i + 1}
                websiteId={website.id}
                writing={agent.writing[opp.query]}
                postsLeft={allowance.postsLeft}
                canWrite={canWrite}
              />
            ))}
          </ol>
        )}

        {strikingRest.length > 0 && (
          <div className="overflow-x-auto rounded-2xl border border-line bg-card">
            <table className="w-full min-w-[720px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-line font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-faint">
                  <th scope="col" className="px-4 py-2.5 font-medium">Keyword</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">Page</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-medium">Position</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-medium">Impressions</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-medium">CTR</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-medium">Upside*</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">Do this</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {strikingRest.map((opp) => (
                  <tr key={opp.query}>
                    <th scope="row" className="max-w-[240px] px-4 py-2.5 font-medium text-ink">
                      <span className="line-clamp-2">{opp.query}</span>
                    </th>
                    <td className="max-w-[220px] px-4 py-2.5">
                      <a href={opp.page} target="_blank" rel="noopener noreferrer" className="block truncate font-mono text-[12px] text-accent hover:underline">
                        {pathOf(opp.page)}
                      </a>
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-ink">{opp.position}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-ink">{number.format(opp.impressions)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-ink-secondary">{percent(opp.ctr)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-ink">
                      {opp.estimatedExtraClicks > 0 ? `+${number.format(opp.estimatedExtraClicks)}` : "-"}
                    </td>
                    <td className="px-4 py-2.5">
                      <ActionChip action={opp.action} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {hiddenCount > 0 && (
          <Card className="flex flex-wrap items-center justify-between gap-4">
            <p className="flex items-center gap-2 text-sm text-ink">
              <Lock className="size-4 text-ink-faint" aria-hidden />
              {hiddenCount} more {hiddenCount === 1 ? "opportunity" : "opportunities"} on paid plans.
            </p>
            <Link
              href="/dashboard/billing?from=keywords"
              className="inline-flex h-9 items-center rounded-full bg-primary px-4 text-[13px] font-semibold text-primary-contrast hover:bg-primary-hover"
            >
              See plans
            </Link>
          </Card>
        )}

        {opportunities.length > 0 && (
          <p className="max-w-3xl text-[12px] leading-5 text-ink-faint">
            Position, impressions and CTR are your real Google Search Console figures for the last 28 days (Google&apos;s
            data runs about 2 days behind
            {connection?.lastSyncAt
              ? `; last synced ${connection.lastSyncAt.toLocaleDateString("en-US", { dateStyle: "medium" })}`
              : ""}
            ). *Upside is an estimate: the extra clicks a month if the page reached position 4, using typical
            click-through rates. It is not a promise.
          </p>
        )}
      </section>

      <section aria-labelledby="posts-heading" className="space-y-3">
        <h2 id="posts-heading" className="flex items-center gap-2 text-[16px] font-semibold tracking-tight text-ink">
          <FileText className="size-4 text-accent" aria-hidden /> Your posts
        </h2>
        {agent.posts.length === 0 ? (
          <Card>
            <p className="text-sm leading-6 text-ink-secondary">
              {confirmed
                ? "No posts yet. Press Write this post on any keyword above and your draft opens here, ready to edit and copy into your site."
                : "Confirm your business details above, then any keyword becomes a ready-to-edit post in one click."}
            </p>
          </Card>
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-card">
            {agent.posts.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/dashboard/keywords/${website.id}/posts/${p.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 hover:bg-ink/5 focus-visible:bg-ink/5 focus-visible:outline-none"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[14px] font-medium text-ink">{p.title}</span>
                    <span className="block truncate text-[12px] text-ink-faint">For &ldquo;{p.keyword}&rdquo;</span>
                  </span>
                  <span className="flex items-center gap-3 text-[12px] text-ink-faint">
                    <Chip tone={p.status === "draft" ? "neutral" : "green"}>{p.status === "draft" ? "Draft" : p.status === "exported" ? "Exported" : "Published"}</Chip>
                    {new Date(p.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
