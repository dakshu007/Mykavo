"use client";

import { useCallback, useState } from "react";
import { CheckCircle2, OctagonAlert, RefreshCw, TriangleAlert } from "lucide-react";
import { usageLevel, usageLabel, type UsageLevel } from "@/config/quotas";
import { formatValue, formatPercent, meterWidth } from "@/lib/usage/format";
import type { UsageReport, UsageMeter, UsageStat } from "@/lib/usage/collect";
import { FlapNumber } from "@/components/dashboard/overview/summary-row";
import { cn } from "@/lib/utils";

/**
 * The "All Usage" board.
 *
 * Read top to bottom it answers three questions in order: is anything about
 * to run out (the sentence), how much headroom is there overall (the readout
 * strip), and where exactly (one card per kind of service, each quota a
 * compact row with its meter).
 *
 * Form choice: a **meter** per quota, not a chart. Each figure is one ratio
 * against one limit, and the question is "is this about to run out?" - a bar
 * against a track answers that in one glance.
 *
 * Severity is carried by THREE channels, never colour alone: the fill colour,
 * an icon, and a word ("Getting full"). The track is the soft step of the same
 * status ramp, so the state reads across the whole bar.
 *
 * Fetched client-side on Refresh only: the server renders the first report,
 * so the page arrives with real numbers instead of a spinner.
 */

/**
 * Fill colours, chosen by measurement rather than by taste.
 *
 * WCAG 1.4.11 needs 3:1 between the fill and its track, or the bar reads as
 * empty; the base status colours fail this in light mode. success-strong, a
 * meter-specific amber and critical-strong pass in both themes, and
 * theme-contrast.test.ts asserts every fill/track pairing.
 */
const LEVEL_STYLES: Record<UsageLevel, { fill: string; track: string; text: string; chip: string; Icon: typeof CheckCircle2 }> = {
  ok: {
    fill: "bg-success-strong",
    track: "bg-success-soft",
    text: "text-success-strong",
    chip: "bg-success-soft text-success-strong",
    Icon: CheckCircle2,
  },
  warning: {
    fill: "bg-meter-warning",
    track: "bg-warning-soft",
    text: "text-warning-strong",
    chip: "bg-warning-soft text-warning-strong",
    Icon: TriangleAlert,
  },
  critical: {
    fill: "bg-critical-strong",
    track: "bg-critical-soft",
    text: "text-critical-strong",
    chip: "bg-critical-soft text-critical-strong",
    Icon: OctagonAlert,
  },
};

const LEVEL_RANK: Record<UsageLevel, number> = { ok: 0, warning: 1, critical: 2 };

/** The kinds of service the page is organised by, matched on metric id. */
const GROUPS = [
  { key: "ai", eyebrow: "AI", title: "AI explanations", match: (id: string) => id.startsWith("ai-") },
  { key: "database", eyebrow: "Database", title: "Postgres", match: (id: string) => id.startsWith("db-") || id.startsWith("table-") },
  { key: "email", eyebrow: "Email", title: "Account and alert email", match: (id: string) => id.startsWith("email-") },
  {
    key: "storage",
    eyebrow: "Storage and hosting",
    title: "Screenshots and bandwidth",
    match: (id: string) => id.startsWith("r2-") || id.startsWith("netlify-") || id.startsWith("screenshot-"),
  },
] as const;

function readable(m: UsageMeter): boolean {
  return Number.isFinite(m.used);
}

function ratioOf(m: UsageMeter): number {
  return m.limit > 0 ? m.used / m.limit : 0;
}

function levelOf(m: UsageMeter): UsageLevel {
  return usageLevel(ratioOf(m));
}

function Micro({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("font-mono text-[10.5px] font-medium uppercase tracking-[0.14em] text-ink-faint", className)}>
      {children}
    </p>
  );
}

/**
 * A row with no number, and why.
 *
 * Deliberately renders NO track: an empty grey bar read as a meter at 0%,
 * "nothing used", which is the opposite of "we could not find out".
 */
function MissingRow({ meter }: { meter: UsageMeter }) {
  const unconfigured = meter.state === "unconfigured";
  return (
    <li className="py-3.5">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <div className="min-w-0">
          <p className="text-[14px] font-medium text-ink">{meter.label}</p>
          <p className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-faint">{meter.provider}</p>
        </div>
        <span className="rounded-full border border-dashed border-ink/25 px-2.5 py-0.5 text-[11.5px] font-medium text-ink-secondary">
          {unconfigured ? "Not configured" : "Could not read"}
        </span>
      </div>
      <p className="mt-1.5 text-[12px] leading-5 text-ink-secondary">{meter.detail}</p>
    </li>
  );
}

function MeterRow({ meter }: { meter: UsageMeter }) {
  if (!readable(meter)) return <MissingRow meter={meter} />;

  const ratio = ratioOf(meter);
  const level = usageLevel(ratio);
  const { fill, track, chip, Icon } = LEVEL_STYLES[level];
  const partial = meter.state === "partial";
  const used = formatValue(meter.used, meter.unit);
  const limit = Number.isFinite(meter.limit) ? formatValue(meter.limit, meter.unit) : "no cap";

  return (
    <li className="py-3.5">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <div className="min-w-0">
          <p className="text-[14px] font-medium text-ink">{meter.label}</p>
          <p className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-faint">{meter.provider}</p>
        </div>
        <div className="flex items-center gap-2.5">
          {/* tabular-nums: these sit in a column and must align vertically. */}
          <span className="text-[14px] text-ink-secondary">
            <span className="font-semibold text-ink tabular-nums">
              {partial ? "≥" : ""}
              {used}
            </span>
            <span className="text-ink-faint"> / {limit}</span>
          </span>
          <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11.5px] font-semibold", chip)}>
            <Icon className="size-3.5 shrink-0" aria-hidden />
            <span className="tabular-nums">{formatPercent(ratio)}</span>
            <span className="sr-only">{usageLabel(level)}</span>
          </span>
        </div>
      </div>

      <div
        className={cn("mt-2.5 h-2 overflow-hidden rounded-full", track)}
        role="meter"
        aria-valuenow={Math.round(ratio * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${meter.label}: ${formatPercent(ratio)} of ${limit} used, ${usageLabel(level)}`}
      >
        <div
          className={cn("h-full rounded-full transition-[width] duration-500", fill)}
          style={{ width: `${meterWidth(ratio)}%` }}
        />
      </div>

      <p className="mt-1.5 text-[12px] leading-5 text-ink-secondary">
        <span className={cn("font-medium", LEVEL_STYLES[level].text)}>{usageLabel(level)}.</span>{" "}
        {partial && <strong className="font-semibold text-orange-strong">Partial, so this is a floor. </strong>}
        {meter.detail}
      </p>
    </li>
  );
}

/** Uncapped figures that belong to a group: small label / value pairs. */
function StatGrid({ stats }: { stats: UsageStat[] }) {
  if (stats.length === 0) return null;
  return (
    <dl className="mt-1 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line [&>*:last-child:nth-child(odd)]:col-span-2">
      {stats.map((s) => (
        <div key={s.id} className="bg-card px-3.5 py-2.5" title={s.detail || undefined}>
          <dt className="text-[11.5px] leading-4 text-ink-secondary">{s.label}</dt>
          <dd className="mt-0.5 text-[14px] font-semibold text-ink tabular-nums">
            {s.value === null ? "-" : formatValue(s.value, s.unit)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Group status chip: the worst reading in the card, or that some are unread. */
function GroupChip({ meters }: { meters: UsageMeter[] }) {
  const read = meters.filter(readable);
  if (read.length === 0) {
    return (
      <span className="rounded-full border border-dashed border-ink/25 px-2.5 py-0.5 text-[11.5px] font-medium text-ink-secondary">
        No reading
      </span>
    );
  }
  const worst = read.map(levelOf).reduce((a, b) => (LEVEL_RANK[b] > LEVEL_RANK[a] ? b : a), "ok" as UsageLevel);
  const { chip, Icon } = LEVEL_STYLES[worst];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold", chip)}>
      <Icon className="size-3.5" aria-hidden />
      {usageLabel(worst)}
    </span>
  );
}

function GroupCard({
  eyebrow,
  title,
  meters,
  stats,
  tables,
}: {
  eyebrow: string;
  title: string;
  meters: UsageMeter[];
  stats: UsageStat[];
  tables?: UsageStat[];
}) {
  return (
    <section className="flex flex-col rounded-2xl border border-line bg-card p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Micro>{eyebrow}</Micro>
          <h2 className="mt-1 text-[16px] font-semibold tracking-tight text-ink">{title}</h2>
        </div>
        {meters.length > 0 && <GroupChip meters={meters} />}
      </div>
      {meters.length > 0 && (
        <ul className="mt-2 divide-y divide-line">
          {meters.map((m) => (
            <MeterRow key={m.id} meter={m} />
          ))}
        </ul>
      )}
      {stats.length > 0 && (
        <div className="mt-auto pt-3">
          <Micro className="mb-2">Also measured</Micro>
          <StatGrid stats={stats} />
        </div>
      )}
      {tables && tables.length > 0 && (
        <details className="group mt-3">
          <summary className="cursor-pointer list-none font-mono text-[10.5px] font-medium uppercase tracking-[0.14em] text-ink-faint hover:text-ink [&::-webkit-details-marker]:hidden">
            <span className="inline-block transition-transform group-open:rotate-90">›</span> Largest tables ({tables.length})
          </summary>
          <ul className="mt-2 divide-y divide-line rounded-xl border border-line px-3.5">
            {tables.map((t) => (
              <li key={t.id} className="flex items-baseline justify-between gap-3 py-2 text-[13px]">
                <span className="truncate font-mono text-[12px] text-ink-secondary">{t.label.replace(/^Table:\s*/, "")}</span>
                <span className="font-semibold text-ink tabular-nums">
                  {t.value === null ? "-" : formatValue(t.value, t.unit)}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

function Headline({ meters }: { meters: UsageMeter[] }) {
  const read = meters.filter(readable);
  const attention = read.filter((m) => levelOf(m) !== "ok").sort((a, b) => ratioOf(b) - ratioOf(a));
  const unread = meters.length - read.length;
  const top = [...read].sort((a, b) => ratioOf(b) - ratioOf(a))[0];

  return (
    <div>
      <h1 className="max-w-3xl pb-1 text-[30px] font-semibold leading-[1.12] tracking-[-0.025em] text-ink sm:text-[38px]">
        {read.length === 0 ? (
          <>No quota could be read right now.</>
        ) : attention.length === 0 ? (
          <>
            {read.length === 1 ? "The one readable quota is" : `All ${read.length} readable quotas are`}{" "}
            <span className="mk-highlight">healthy</span>.
          </>
        ) : (
          <>
            <span className="mk-highlight">
              {attention.length} of {read.length} quotas
            </span>{" "}
            {attention.length === 1 ? "needs" : "need"} attention.
          </>
        )}
      </h1>
      <p className="mt-2 max-w-2xl text-[15px] leading-6 text-ink-secondary">
        {attention.length > 0
          ? `${attention.map((m) => `${m.label} (${formatPercent(ratioOf(m))})`).join(", ")}. `
          : top
            ? `Closest to its limit: ${top.label} at ${formatPercent(ratioOf(top))}. `
            : ""}
        {unread > 0 && `${unread} ${unread === 1 ? "service has" : "services have"} no reading (not configured or could not be reached).`}
      </p>
    </div>
  );
}

function Readouts({ meters, report }: { meters: UsageMeter[]; report: UsageReport }) {
  const read = meters.filter(readable);
  const attention = read.filter((m) => levelOf(m) !== "ok").length;
  const top = [...read].sort((a, b) => ratioOf(b) - ratioOf(a))[0];
  const scans = report.stats.find((s) => s.id === "scans-24h");

  const tiles = [
    { label: "Quotas read", value: read.length, note: `of ${meters.length} tracked`, warn: false },
    { label: "Need attention", value: attention, note: attention > 0 ? "70% or more used" : "None at 70% or more", warn: attention > 0 },
    {
      label: "Highest use, %",
      value: top ? Math.min(100, Math.round(ratioOf(top) * 100)) : 0,
      note: top ? top.label : "Nothing readable",
      warn: false,
    },
    {
      label: "Scans, last 24h",
      value: scans?.value ?? 0,
      note: scans?.value === null || !scans ? "Not measured" : "What every figure follows",
      warn: false,
    },
  ];

  return (
    <section aria-labelledby="usage-readouts">
      <h2 id="usage-readouts" className="sr-only">
        Summary
      </h2>
      <dl className="grid grid-cols-2 overflow-hidden rounded-2xl border-[1.5px] border-ink bg-card shadow-[5px_5px_0_var(--color-primary)] lg:grid-cols-4">
        {tiles.map((t, i) => (
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
            <dd
              className={cn(
                "-mt-1 truncate text-xs",
                t.warn ? "font-medium text-critical-strong" : "text-ink-secondary",
              )}
            >
              {t.note}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function UsageMeters({ initial }: { initial: UsageReport }) {
  const [report, setReport] = useState<UsageReport>(initial);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  /**
   * Re-measure on demand. No mount effect: the server renders the first
   * report, so this runs only from the Refresh button.
   */
  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/usage", { cache: "no-store" });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? `Request failed (${res.status})`);
      }
      setReport((await res.json()) as UsageReport);
    } catch (err) {
      // The previous report stays on screen: stale numbers with a visible
      // error beat an empty page.
      setError(err instanceof Error ? err.message : "Could not re-measure.");
    } finally {
      setLoading(false);
    }
  }, []);

  const meters = report.meters;
  const stats = [...report.stats].sort((a, b) => a.order - b.order);
  const groupOf = (id: string) => GROUPS.find((g) => g.match(id))?.key;
  const volume = stats.filter((s) => !groupOf(s.id));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <Headline meters={meters} />
        <div className="flex flex-col items-end gap-1.5">
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={loading}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line px-4 text-[13px] font-medium text-ink-secondary transition-colors hover:border-ink hover:text-ink disabled:opacity-60"
          >
            <RefreshCw className={cn("size-3.5", loading && "animate-spin")} aria-hidden />
            {loading ? "Measuring" : "Refresh"}
          </button>
          <p className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-faint">
            Measured{" "}
            <time dateTime={report.generatedAt}>
              {new Date(report.generatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </time>
          </p>
          {error && (
            <p className="max-w-xs text-right text-[12px] text-critical-strong" role="status">
              {error}
            </p>
          )}
        </div>
      </div>

      <Readouts meters={meters} report={report} />

      <div className="grid gap-4 lg:grid-cols-2">
        {GROUPS.map((g) => {
          const gm = meters.filter((m) => g.match(m.id));
          const gs = stats.filter((s) => g.match(s.id));
          if (gm.length === 0 && gs.length === 0) return null;
          // Readable rows first: a card whose top row is an error reads as
          // broken even when the rest is fine.
          const ordered = [...gm].sort((a, b) => Number(!readable(a)) - Number(!readable(b)));
          return (
            <GroupCard
              key={g.key}
              eyebrow={g.eyebrow}
              title={g.title}
              meters={ordered}
              stats={gs.filter((s) => !s.id.startsWith("table-"))}
              tables={g.key === "database" ? gs.filter((s) => s.id.startsWith("table-")) : undefined}
            />
          );
        })}
      </div>

      {volume.length > 0 && (
        <section className="rounded-2xl border border-line bg-card p-5 sm:p-6">
          <Micro>Volume</Micro>
          <h2 className="mt-1 text-[16px] font-semibold tracking-tight text-ink">What the quotas are made of</h2>
          <p className="mt-1 text-[13px] text-ink-secondary">
            No caps on these. Growth shows up here first, before it reaches a meter.
          </p>
          <dl className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-3 lg:grid-cols-6">
            {volume.map((s) => (
              <div key={s.id} className="bg-card px-4 py-3">
                <dt className="text-[11.5px] leading-4 text-ink-secondary">{s.label}</dt>
                <dd className="mt-1 text-[20px] font-semibold tracking-tight text-ink tabular-nums">
                  {s.value === null ? "-" : formatValue(s.value, s.unit)}
                </dd>
                {s.detail && <dd className="mt-0.5 text-[11px] leading-4 text-ink-faint">{s.detail}</dd>}
              </div>
            ))}
          </dl>
        </section>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {report.uncapped.length > 0 && (
          <section className="rounded-2xl border border-line bg-card p-5 sm:p-6">
            <Micro>No limit to watch</Micro>
            <ul className="mt-2 divide-y divide-line">
              {report.uncapped.map((item) => (
                <li key={item.label} className="py-2.5">
                  <p className="text-[13.5px] font-medium text-ink">{item.label}</p>
                  <p className="text-[12px] leading-5 text-ink-secondary">{item.detail}</p>
                </li>
              ))}
            </ul>
          </section>
        )}
        <section className="rounded-2xl border border-line bg-surface/60 p-5 sm:p-6">
          <Micro>About these numbers</Micro>
          <p className="mt-2 text-[12.5px] leading-5 text-ink-secondary">
            Caps live in <code className="text-ink">apps/web/src/config/quotas.ts</code> and can be overridden by
            environment variable. Check them against each provider&apos;s own dashboard: an out-of-date cap
            makes a meter read low. Figures marked partial are a floor, not a total.
          </p>
          {report.problems.length > 0 && (
            <ul className="mt-3 space-y-1">
              {report.problems.map((p) => (
                <li key={p} className="flex gap-1.5 text-[12.5px] leading-5 text-critical-strong">
                  <OctagonAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                  {p}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
