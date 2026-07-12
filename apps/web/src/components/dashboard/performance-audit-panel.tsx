"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink, Gauge, Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  auditTrendSummary,
  buildAuditTrend,
  formatSignedDelta,
  formatTrendDate,
  type AuditTrend,
  type TrendScoreKey,
} from "@/lib/audit-trend";

export interface AuditView {
  id: string;
  status: "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED";
  url: string;
  performanceScore: number | null;
  accessibilityScore: number | null;
  bestPracticesScore: number | null;
  seoScore: number | null;
  lcpMs: number | null;
  fcpMs: number | null;
  tbtMs: number | null;
  ttiMs: number | null;
  speedIndexMs: number | null;
  cls: number | null;
  errorCode: string | null;
  createdAt: string;
}

const CATEGORIES: { key: keyof AuditView; label: string }[] = [
  { key: "performanceScore", label: "Performance" },
  { key: "accessibilityScore", label: "Accessibility" },
  { key: "bestPracticesScore", label: "Best Practices" },
  { key: "seoScore", label: "SEO" },
];

/** Lighthouse colour bands: ≥90 good, 50–89 needs work, <50 poor. */
function scoreClasses(score: number | null): string {
  if (score === null) return "bg-surface text-ink-faint";
  if (score >= 90) return "bg-success-soft text-success-strong";
  if (score >= 50) return "bg-warning-soft text-warning-strong";
  return "bg-critical-soft text-critical-strong";
}

function fmtMs(v: number | null): string {
  if (v === null) return "—";
  return v >= 1000 ? `${(v / 1000).toFixed(1)} s` : `${Math.round(v)} ms`;
}

function fmtCls(v: number | null): string {
  return v === null ? "—" : v.toFixed(3);
}

/** Path + query of an audited URL, for compact display. */
function pathOf(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname + u.search;
  } catch {
    return url;
  }
}

function isPending(status: AuditView["status"]): boolean {
  return status === "QUEUED" || status === "RUNNING";
}

/** Line + legend-dot colour per score — theme vars (globals.css --fx-*) so the
 * chart follows light/dark; always paired with a text label. */
const TREND_COLORS: Record<TrendScoreKey, string> = {
  performanceScore: "var(--fx-primary)",
  accessibilityScore: "var(--fx-success)",
  bestPracticesScore: "var(--fx-chart-amber)",
  seoScore: "var(--fx-chart-violet)",
};

// Sparkline geometry — viewBox units; the SVG scales to the card width.
const CHART_W = 640;
const CHART_H = 120;
const CHART_TOP = 8;
const CHART_BOTTOM = CHART_H - 8;
const CHART_LEFT = 30;
const CHART_RIGHT = CHART_W - 8;
/** Gridline scores: 0/50/100 plus 90 — Lighthouse's "good" threshold. */
const GRID_SCORES = [100, 90, 50, 0];

function chartY(score: number): number {
  return CHART_TOP + ((100 - score) / 100) * (CHART_BOTTOM - CHART_TOP);
}

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function deltaClasses(delta: number | null): string {
  if (delta === null || delta === 0) return "text-ink-secondary";
  return delta > 0 ? "text-success-strong" : "text-critical-strong";
}

/** Multi-line score sparkline + legend + latest-vs-previous delta line. */
function TrendSection({ trend }: { trend: AuditTrend }) {
  const n = trend.points.length;
  const chartX = (i: number) =>
    CHART_LEFT + (i / (n - 1)) * (CHART_RIGHT - CHART_LEFT);

  return (
    <div className="mt-5 border-t border-line pt-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <h3 className="text-[13px] font-semibold text-ink">Trend</h3>
        <span className="max-w-full truncate font-mono text-[12px] text-ink-faint">
          {pathOf(trend.url)} · {n} audits
        </span>
      </div>

      <svg
        viewBox={`0 0 ${CHART_W} ${CHART_H}`}
        className="mt-2 block w-full"
        role="img"
        aria-label={auditTrendSummary(trend)}
      >
        {GRID_SCORES.map((score) => (
          <g key={score} className="text-line">
            <line
              x1={CHART_LEFT}
              x2={CHART_RIGHT}
              y1={chartY(score)}
              y2={chartY(score)}
              stroke="currentColor"
              strokeWidth={1}
              strokeDasharray={score === 90 ? "3 3" : undefined}
            />
            <text
              x={CHART_LEFT - 6}
              y={chartY(score) + 3}
              textAnchor="end"
              fontSize={9}
              className="text-ink-faint"
              fill="currentColor"
            >
              {score}
            </text>
          </g>
        ))}

        {trend.categories.map((category) => {
          const color = TREND_COLORS[category.key];
          const dots = trend.points
            .map((point, i) => ({ point, i, score: point.scores[category.key] }))
            .filter((d): d is typeof d & { score: number } => d.score !== null);
          if (dots.length === 0) return null;
          return (
            <g key={category.key}>
              {dots.length >= 2 && (
                <polyline
                  points={dots
                    .map((d) => `${chartX(d.i).toFixed(1)},${chartY(d.score).toFixed(1)}`)
                    .join(" ")}
                  fill="none"
                  style={{ stroke: color }}
                  strokeWidth={1.5}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              )}
              {dots.map((d) => (
                <circle
                  key={d.point.createdAt + String(d.i)}
                  cx={chartX(d.i).toFixed(1)}
                  cy={chartY(d.score).toFixed(1)}
                  r={3}
                  style={{ fill: color }}
                >
                  <title>{`${category.label} ${d.score} — ${fmtDateTime(d.point.createdAt)}`}</title>
                </circle>
              ))}
            </g>
          );
        })}
      </svg>

      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {trend.categories.map((category) => (
          <li
            key={category.key}
            className="flex items-center gap-1.5 text-[12px] text-ink-secondary"
          >
            <span
              aria-hidden
              className="inline-block size-2 rounded-full"
              style={{ backgroundColor: TREND_COLORS[category.key] }}
            />
            {category.label}{" "}
            <span className="font-medium text-ink tabular-nums">
              {category.latest ?? "—"}
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-2 text-[12px] text-ink-secondary">
        {trend.categories.map((category, i) => (
          <span key={category.key}>
            {i > 0 && <span className="text-ink-faint"> · </span>}
            {category.label}{" "}
            <span className={cn("font-medium tabular-nums", deltaClasses(category.delta))}>
              {category.delta === null ? "—" : formatSignedDelta(category.delta)}
            </span>
          </span>
        ))}{" "}
        since {formatTrendDate(trend.previousAt)}
      </p>
    </div>
  );
}

const POLL_INTERVAL_MS = 3000;
/** A pending audit polled longer than this is treated as dead (worker crashed). */
const STALE_AFTER_MS = 5 * 60 * 1000;

/** Select value meaning "audit the homepage" — no path is sent to the API. */
const HOMEPAGE = "";
/** Select value that reveals the custom-path input. */
const CUSTOM = "__custom__";

export function PerformanceAuditPanel({
  websiteId,
  hostname,
  homepagePath,
  pagePaths,
  initialAudits,
}: {
  websiteId: string;
  hostname: string;
  homepagePath: string;
  /** Monitored page paths (path + query), homepage excluded, deduplicated. */
  pagePaths: string[];
  initialAudits: AuditView[];
}) {
  const [audits, setAudits] = useState<AuditView[]>(initialAudits);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);
  const [selected, setSelected] = useState<string>(HOMEPAGE);
  const [customPath, setCustomPath] = useState("");
  // The audit id we've given up polling — keyed so a new audit re-enables
  // automatically, with no reset effect. Render stays pure (no Date.now()).
  const [gaveUpFor, setGaveUpFor] = useState<string | null>(null);
  const pollWindow = useRef<{ id: string; start: number } | null>(null);

  const latest = audits[0] ?? null;
  const latestId = latest?.id ?? null;
  const pendingStatus = !!latest && isPending(latest.status);
  const pending = pendingStatus && gaveUpFor !== latestId;
  const stalePending = pendingStatus && gaveUpFor === latestId;
  const shown = audits.find((a) => a.status === "COMPLETED") ?? null;
  const busy = starting || pending;

  // Score trend for the page selected in the picker (falling back to the url
  // of the most recent audit). Recomputed when polling delivers new audits.
  const trend = useMemo(() => {
    const selectedPath =
      selected === CUSTOM ? null : selected === HOMEPAGE ? homepagePath : selected;
    const preferredUrl =
      selectedPath === null
        ? null
        : (audits.find(
            (a) => a.status === "COMPLETED" && pathOf(a.url) === selectedPath,
          )?.url ?? null);
    return buildAuditTrend(audits, preferredUrl);
  }, [audits, selected, homepagePath]);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/websites/${websiteId}/audit`, {
        headers: { accept: "application/json" },
      });
      if (!res.ok) return;
      const data = (await res.json()) as { audits: AuditView[] };
      setAudits(data.audits);
    } catch {
      /* transient — next poll retries */
    }
  }, [websiteId]);

  // Poll while pending; give up after STALE_AFTER_MS (dead worker) so the button
  // re-enables instead of spinning forever. Time + setState live in the timeout
  // callback (an event), never synchronously in the effect body or in render.
  useEffect(() => {
    if (!pending || latestId === null) return;
    if (!pollWindow.current || pollWindow.current.id !== latestId) {
      pollWindow.current = { id: latestId, start: Date.now() };
    }
    const timer = setTimeout(() => {
      const w = pollWindow.current;
      if (w && Date.now() - w.start >= STALE_AFTER_MS) setGaveUpFor(latestId);
      else void refresh();
    }, POLL_INTERVAL_MS);
    return () => clearTimeout(timer);
  }, [pending, audits, refresh, latestId]);

  async function runAudit() {
    if (busy) return;

    // Which page? Homepage sends no path; the server enforces same-origin.
    let path: string | undefined;
    if (selected === CUSTOM) {
      const trimmed = customPath.trim();
      if (!trimmed.startsWith("/")) {
        setError('Enter a path starting with "/" — for example /pricing.');
        return;
      }
      path = trimmed;
    } else if (selected !== HOMEPAGE) {
      path = selected;
    }

    setStarting(true);
    setError("");
    try {
      const res = await fetch(`/api/websites/${websiteId}/audit`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(path === undefined ? {} : { path }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not start the audit.");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start the audit.");
    } finally {
      setStarting(false);
    }
  }

  return (
    <div>
      <div>
        <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight text-ink">
          <Gauge className="size-4.5 text-ink-secondary" aria-hidden /> Performance
        </h2>
        <p className="mt-0.5 text-[13px] text-ink-secondary">
          On-demand Lighthouse audit — scores and Core Web Vitals for any page of this site.
        </p>
      </div>

      {/* Page picker + run button */}
      <div className="mt-4 flex flex-wrap items-center gap-2.5">
        <label htmlFor={`audit-page-${websiteId}`} className="sr-only">
          Page to audit
        </label>
        <select
          id={`audit-page-${websiteId}`}
          value={selected}
          onChange={(e) => {
            setSelected(e.target.value);
            setError("");
          }}
          disabled={busy}
          className="h-9 max-w-full rounded-field border border-line bg-card px-3 font-mono text-[13px] text-ink focus:border-primary focus:outline-none disabled:opacity-60"
        >
          <option value={HOMEPAGE}>{homepagePath} (homepage)</option>
          {pagePaths.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
          <option value={CUSTOM}>Custom path…</option>
        </select>

        {selected === CUSTOM && (
          <div className="flex h-9 items-stretch overflow-hidden rounded-field border border-line bg-card focus-within:border-primary">
            <span className="flex select-none items-center border-r border-line bg-surface px-2.5 font-mono text-[13px] text-ink-faint">
              {hostname}
            </span>
            <input
              value={customPath}
              onChange={(e) => {
                setCustomPath(e.target.value);
                setError("");
              }}
              placeholder="/pricing"
              disabled={busy}
              aria-label="Custom path"
              className="w-36 bg-transparent px-2.5 font-mono text-[13px] text-ink placeholder:text-ink-faint focus:outline-none disabled:opacity-60 sm:w-44"
            />
          </div>
        )}

        <button
          type="button"
          onClick={runAudit}
          disabled={busy}
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-ink px-4 text-[13px] font-medium text-ink-inverse transition-colors hover:bg-ink-hover disabled:opacity-60"
        >
          {busy ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <RefreshCw className="size-4" aria-hidden />
          )}
          {pending ? "Running…" : shown ? "Re-run audit" : "Run audit"}
        </button>
      </div>

      {selected === CUSTOM && (
        <p className="mt-1.5 text-[12px] text-ink-faint">
          Only pages on {hostname} can be audited.
        </p>
      )}

      {error && (
        <p className="mt-3 text-[13px] text-critical-strong" role="alert">
          {error}
        </p>
      )}

      {pending && latest && (
        <p className="mt-4 text-[13px] text-ink-secondary">
          Auditing <span className="font-mono text-ink">{pathOf(latest.url)}</span> —{" "}
          {latest.status === "RUNNING" ? "in progress" : "queued"}, this usually takes 20–40
          seconds.
        </p>
      )}

      {latest?.status === "FAILED" && !pending && (
        <p className="mt-4 text-[13px] text-warning-strong">
          The last audit of <span className="font-mono">{pathOf(latest.url)}</span> failed
          {latest.errorCode ? ` (${latest.errorCode})` : ""}. Try again.
        </p>
      )}

      {stalePending && (
        <p className="mt-4 text-[13px] text-warning-strong">
          The last audit didn&apos;t finish. Run it again.
        </p>
      )}

      {shown ? (
        <>
          <a
            href={shown.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex max-w-full items-center gap-1.5 font-mono text-[13px] font-medium text-ink hover:text-primary"
          >
            <span className="truncate">{pathOf(shown.url)}</span>
            <ExternalLink className="size-3 shrink-0" aria-hidden />
          </a>

          <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {CATEGORIES.map((c) => {
              const score = shown[c.key] as number | null;
              return (
                <div
                  key={c.key}
                  className={cn(
                    "rounded-tile px-3 py-3 text-center",
                    scoreClasses(score),
                  )}
                >
                  <p className="text-2xl font-semibold tabular-nums">{score ?? "—"}</p>
                  <p className="text-[11px] font-medium">{c.label}</p>
                </div>
              );
            })}
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
            {[
              ["LCP", fmtMs(shown.lcpMs)],
              ["Total Blocking", fmtMs(shown.tbtMs)],
              ["CLS", fmtCls(shown.cls)],
              ["First Contentful", fmtMs(shown.fcpMs)],
              ["Speed Index", fmtMs(shown.speedIndexMs)],
              ["Time to Interactive", fmtMs(shown.ttiMs)],
            ].map(([label, value]) => (
              <div key={label} className="flex items-baseline justify-between gap-3 border-b border-line py-1.5">
                <dt className="text-[13px] text-ink-secondary">{label}</dt>
                <dd className="font-mono text-[13px] font-medium text-ink tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>

          {trend && <TrendSection trend={trend} />}

          <p className="mt-3 text-[12px] text-ink-faint">
            Audited {new Date(shown.createdAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
            {audits.filter((a) => a.status === "COMPLETED").length > 1 &&
              ` · ${audits.filter((a) => a.status === "COMPLETED").length} audits on record`}
          </p>
        </>
      ) : (
        !pending && (
          <p className="mt-4 rounded-tile border border-dashed border-line px-4 py-6 text-center text-[13px] text-ink-secondary">
            No performance audit yet. Run one to see Lighthouse scores and Core Web Vitals.
          </p>
        )
      )}
    </div>
  );
}
