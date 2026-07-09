"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Gauge, Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AuditView {
  id: string;
  status: "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED";
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
  if (score >= 90) return "bg-success-soft text-green-700";
  if (score >= 50) return "bg-warning-soft text-amber-700";
  return "bg-red-50 text-red-700";
}

function fmtMs(v: number | null): string {
  if (v === null) return "—";
  return v >= 1000 ? `${(v / 1000).toFixed(1)} s` : `${Math.round(v)} ms`;
}

function fmtCls(v: number | null): string {
  return v === null ? "—" : v.toFixed(3);
}

function isPending(status: AuditView["status"]): boolean {
  return status === "QUEUED" || status === "RUNNING";
}

const POLL_INTERVAL_MS = 3000;
/** A pending audit polled longer than this is treated as dead (worker crashed). */
const STALE_AFTER_MS = 5 * 60 * 1000;

export function PerformanceAuditPanel({
  websiteId,
  initialAudits,
}: {
  websiteId: string;
  initialAudits: AuditView[];
}) {
  const [audits, setAudits] = useState<AuditView[]>(initialAudits);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);
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
    if (starting || pending) return;
    setStarting(true);
    setError("");
    try {
      const res = await fetch(`/api/websites/${websiteId}/audit`, { method: "POST" });
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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight text-ink">
            <Gauge className="size-4.5 text-ink-secondary" aria-hidden /> Performance
          </h2>
          <p className="mt-0.5 text-[13px] text-ink-secondary">
            On-demand Lighthouse audit — scores and Core Web Vitals for the homepage.
          </p>
        </div>
        <button
          type="button"
          onClick={runAudit}
          disabled={starting || pending}
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-ink px-4 text-[13px] font-medium text-white transition-colors hover:bg-black disabled:opacity-60"
        >
          {starting || pending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <RefreshCw className="size-4" aria-hidden />
          )}
          {pending ? "Running…" : shown ? "Re-run audit" : "Run audit"}
        </button>
      </div>

      {error && (
        <p className="mt-3 text-[13px] text-red-700" role="alert">
          {error}
        </p>
      )}

      {pending && (
        <p className="mt-4 text-[13px] text-ink-secondary">
          Auditing {latest?.status === "RUNNING" ? "in progress" : "queued"} — this usually takes
          20–40 seconds.
        </p>
      )}

      {latest?.status === "FAILED" && !pending && (
        <p className="mt-4 text-[13px] text-amber-700">
          The last audit failed{latest.errorCode ? ` (${latest.errorCode})` : ""}. Try again.
        </p>
      )}

      {stalePending && (
        <p className="mt-4 text-[13px] text-amber-700">
          The last audit didn&apos;t finish. Run it again.
        </p>
      )}

      {shown ? (
        <>
          <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
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
