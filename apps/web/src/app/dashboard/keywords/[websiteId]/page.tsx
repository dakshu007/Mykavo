import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, Lock, Search, Target } from "lucide-react";
import { isGscReauthMessage, type StrikingOpportunity } from "@mykavo/shared";
import { Card, CardHeader } from "@/components/ui/card";
import { requireSession, getCurrentWorkspace } from "@/lib/session";
import { canUseKeywordAgent, loadStrikingReport } from "@/lib/keywords/striking";

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

function ActionChip({ action }: { action: StrikingOpportunity["action"] }) {
  return action === "improve_page" ? (
    <span className="rounded-full bg-success-soft px-2 py-0.5 text-[11px] font-semibold text-success-strong">Improve page</span>
  ) : (
    <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-semibold text-accent">Supporting post</span>
  );
}

function TopCard({ opp, rank }: { opp: StrikingOpportunity; rank: number }) {
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
    </li>
  );
}

/** Striking distance keywords for one website. Admins only while built. */
export default async function KeywordReportPage({ params }: Params) {
  const session = await requireSession();
  if (!canUseKeywordAgent(session.user)) notFound();
  const workspace = await getCurrentWorkspace(session.user.id, session.user.name);
  const { websiteId } = await params;
  const report = await loadStrikingReport(workspace.id, websiteId);
  if (!report) notFound();

  const { website, connection, opportunities, hiddenCount } = report;
  const connected = Boolean(connection?.property);
  const needsReconnect = connected && isGscReauthMessage(connection?.lastError ?? null);
  const top = opportunities.slice(0, 3);
  const rest = opportunities.slice(3);

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <Link href="/dashboard/keywords" className="inline-flex items-center gap-1 text-[13px] text-ink-secondary hover:text-ink">
          <ArrowLeft className="size-3.5" aria-hidden /> AI Keywords
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink">What to write next for {website.name}</h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-ink-secondary">
          Searches where you already rank just off the top of Google, positions 8 to 20. A focused improvement here is
          the fastest way to win more clicks.
        </p>
      </div>

      {!connected ? (
        <Card>
          <CardHeader icon={Search} title="Connect Google Search Console" />
          <p className="max-w-2xl text-sm leading-6 text-ink-secondary">
            Striking distance keywords come from your real Search Console data: the searches you appear for, your
            position and impressions. Connect it once and opportunities appear after the first sync.
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
            Google ended this connection, so the data below may be out of date. Reconnecting takes one click and keeps
            your chosen property.
          </p>
          <a
            href={`/api/gsc/connect?website=${website.id}`}
            className="mt-4 inline-flex h-9 items-center rounded-full bg-primary px-4 text-[13px] font-semibold text-primary-contrast hover:bg-primary-hover"
          >
            Reconnect
          </a>
        </Card>
      ) : null}

      {connected && !report.hasData && !needsReconnect && (
        <Card>
          <CardHeader icon={Target} title="Your first keyword report is on its way" />
          <p className="max-w-2xl text-sm leading-6 text-ink-secondary">
            Search Console syncs every morning. Once the next sync finishes, your striking distance keywords appear
            here. To get them sooner, press Sync on the{" "}
            <Link href={`/dashboard/search-console/${website.id}`} className="text-accent hover:underline">
              Search Console page
            </Link>
            .
          </p>
        </Card>
      )}

      {report.hasData && opportunities.length === 0 && (
        <Card>
          <CardHeader icon={Target} title="No striking distance keywords right now" />
          <p className="max-w-2xl text-sm leading-6 text-ink-secondary">
            None of your searches sit at positions 8 to 20 with enough impressions in the last 28 days. That usually
            means a small or new site. Deep analysis, which finds keyword ideas without Search Console data, is coming
            next.
          </p>
        </Card>
      )}

      {top.length > 0 && (
        <section aria-labelledby="write-next">
          <h2 id="write-next" className="text-[16px] font-semibold tracking-tight text-ink">
            Write these next
          </h2>
          <ol className="mt-3 grid gap-4 lg:grid-cols-3">
            {top.map((opp, i) => (
              <TopCard key={opp.query} opp={opp} rank={i + 1} />
            ))}
          </ol>
        </section>
      )}

      {rest.length > 0 && (
        <section aria-labelledby="all-opps">
          <h2 id="all-opps" className="text-[16px] font-semibold tracking-tight text-ink">
            All opportunities
          </h2>
          <div className="mt-3 overflow-x-auto rounded-2xl border border-line bg-card">
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
                {rest.map((opp) => (
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
        </section>
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
          ). *Upside is an estimate: the extra clicks a month if the page reached position 4, using typical click-through
          rates. It is not a promise.
        </p>
      )}
    </div>
  );
}
