import Link from "next/link";
import { Bot } from "lucide-react";
import { compareVersions, type AiCrawlerPurpose } from "@mykavo/shared";
import { CardHeader } from "@/components/ui/card";
import type { AiCrawlerPanelData } from "@/lib/ai-crawler-visits";

/**
 * Which AI systems read this website, from the WordPress plugin's counts.
 *
 * Answers a question website owners increasingly ask - "does ChatGPT even
 * read my site?" - with real visits rather than guesses, and points at the
 * pages AI crawlers get errors on, which AI cannot quote.
 */

/** First plugin version that counts AI crawler visits. */
export const AI_VISITS_PLUGIN_VERSION = "1.1.0";

const PURPOSE: Record<AiCrawlerPurpose, string> = {
  search: "AI search answers",
  user: "A person asked about a page",
  training: "Training data",
};

const nf = new Intl.NumberFormat("en-US");

function dayLabel(day: string): string {
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  if (day === today) return "Today";
  if (day === yesterday) return "Yesterday";
  return new Date(`${day}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

function Tile({ label, value, hint, tone }: { label: string; value: string; hint: string; tone?: "bad" }) {
  return (
    <div className="rounded-tile bg-surface px-4 py-3">
      <p className="text-[12px] font-medium text-ink-secondary">{label}</p>
      <p className={`mt-0.5 text-[22px] font-semibold tracking-tight ${tone === "bad" ? "text-critical-strong" : "text-ink"}`}>
        {value}
      </p>
      <p className="text-[11px] text-ink-faint">{hint}</p>
    </div>
  );
}

export function AiCrawlerVisitsPanel({ data }: { data: AiCrawlerPanelData }) {
  const { summary, wordpress } = data;
  const header = (
    <CardHeader
      icon={Bot}
      title="AI crawler visits"
      action={<span className="text-[12px] text-ink-faint">Last {summary.days} days</span>}
    />
  );

  if (summary.total === 0) {
    const outdated =
      wordpress && (!wordpress.pluginVersion || compareVersions(wordpress.pluginVersion, AI_VISITS_PLUGIN_VERSION) < 0);
    return (
      <>
        {header}
        <p className="text-sm text-ink-secondary">
          {!wordpress ? (
            <>
              See which AI systems - ChatGPT, Claude, Perplexity and more - read this site and which pages they read.
              Install the{" "}
              <Link href="/dashboard/wordpress" className="font-medium text-accent hover:underline">
                MyKavo WordPress plugin
              </Link>{" "}
              to start counting.
            </>
          ) : outdated ? (
            <>
              Update the MyKavo WordPress plugin to {AI_VISITS_PLUGIN_VERSION} or later to start counting which AI
              crawlers read this site. Plugins → Updates in WordPress.
            </>
          ) : (
            <>
              Counting has started. The plugin sends its totals once a day, so the first numbers appear within 24
              hours. ChatGPT, Claude and Perplexity usually visit within a few days - if none ever do, check that
              robots.txt does not block them.
            </>
          )}
        </p>
      </>
    );
  }

  const max = Math.max(1, ...summary.daily.map((d) => d.hits));
  return (
    <>
      {header}
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Tile label="Visits" value={nf.format(summary.total)} hint="From AI crawlers" />
        <Tile label="For AI answers" value={nf.format(summary.answerHits)} hint="Search and on-request reads" />
        <Tile label="Crawlers" value={String(summary.crawlers.length)} hint="Different AI systems" />
        <Tile
          label="Errors served"
          value={nf.format(summary.errors)}
          hint="Visits that got a 4xx or 5xx"
          tone={summary.errors > 0 ? "bad" : undefined}
        />
      </div>

      <div
        className="mt-4 flex h-20 items-end gap-[3px]"
        role="img"
        aria-label={`${nf.format(summary.total)} AI crawler visits over the last ${summary.days} days`}
      >
        {summary.daily.map((d) => (
          <span
            key={d.day}
            title={`${dayLabel(d.day)}: ${nf.format(d.hits)}`}
            className={`min-w-[3px] flex-1 rounded-t-[3px] ${d.hits ? "bg-ink" : "bg-line"}`}
            style={{ height: d.hits ? `${Math.max(5, Math.round((d.hits / max) * 100))}%` : "3px" }}
          />
        ))}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div className="min-w-0">
          <h4 className="mb-2 text-[13px] font-semibold text-ink">Who reads this site</h4>
          <ul className="divide-y divide-line">
            {summary.crawlers.map((c) => (
              <li key={c.agent} className="flex items-center gap-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">
                    {c.owner} <code className="ml-1 font-mono text-[11px] text-ink-faint">{c.agent}</code>
                  </p>
                  <p className="text-[12px] text-ink-secondary">
                    {PURPOSE[c.purpose]} · last seen {dayLabel(c.lastSeen).toLowerCase()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold tabular-nums text-ink">{nf.format(c.hits)}</p>
                  {c.errors > 0 && (
                    <p className="text-[11px] font-medium tabular-nums text-critical-strong">{nf.format(c.errors)} errors</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="min-w-0">
          <h4 className="mb-2 text-[13px] font-semibold text-ink">Pages AI reads most</h4>
          {summary.pages.length === 0 ? (
            <p className="text-sm text-ink-secondary">No page detail yet.</p>
          ) : (
            <ul className="divide-y divide-line">
              {summary.pages.map((p) => (
                <li key={p.path} className="flex items-center gap-3 py-2">
                  <code className="min-w-0 flex-1 truncate font-mono text-[12px] text-ink" title={p.path}>
                    {p.path}
                  </code>
                  {p.errors > 0 && (
                    <span className="rounded-full bg-critical-soft px-2 py-0.5 text-[11px] font-medium text-critical-strong">
                      {nf.format(p.errors)} errors
                    </span>
                  )}
                  <span className="w-12 text-right text-sm font-semibold tabular-nums text-ink">{nf.format(p.hits)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <p className="mt-4 text-[12px] text-ink-faint">
        Counted by the MyKavo WordPress plugin, by the name each crawler sends - no visitor data. Pages served from a
        page cache or CDN may not be counted, so real numbers can be higher. Updated daily.{" "}
        <Link href="/dashboard/site-audit" className="text-accent hover:underline">
          Check AI search readiness in Site Audit
        </Link>
      </p>
    </>
  );
}
