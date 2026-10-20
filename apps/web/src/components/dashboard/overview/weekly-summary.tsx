"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";

interface Summary {
  headline: string;
  summary: string;
  highlights: { text: string; tone: "good" | "warn" | "bad" }[];
  status: "healthy" | "watch" | "action_needed";
}

export interface InitialSummary {
  websiteId: string;
  summary: Summary;
  createdAt: string;
}

const STATUS: Record<Summary["status"], { label: string; className: string }> = {
  healthy: { label: "Healthy", className: "bg-success-soft text-success-strong" },
  watch: { label: "Worth a look", className: "bg-warning-soft text-warning-strong" },
  action_needed: { label: "Needs action", className: "bg-critical-soft text-critical-strong" },
};

const TONE_DOT: Record<Summary["highlights"][number]["tone"], string> = {
  good: "bg-success",
  warn: "bg-warning",
  bad: "bg-critical",
};

type State =
  | { kind: "loading" }
  | { kind: "ready"; summary: Summary; createdAt: string }
  | { kind: "error"; message: string; retry: boolean };

/**
 * "Your site this week": an AI-written note on one website's last 7 days.
 * It is stored per finished scan, so switching websites or coming back only
 * writes a new one when a scan has finished since.
 */
export function WeeklySummaryCard({
  websites,
  defaultWebsiteId,
  initial,
}: {
  websites: { id: string; name: string }[];
  defaultWebsiteId: string;
  initial: InitialSummary | null;
}) {
  const [websiteId, setWebsiteId] = useState(defaultWebsiteId);
  // Summaries already read this visit, so switching back costs nothing.
  const [cache] = useState(
    () =>
      new Map<string, State>(
        initial
          ? [[initial.websiteId, { kind: "ready", summary: initial.summary, createdAt: initial.createdAt }]]
          : [],
      ),
  );
  const [state, setState] = useState<State>(() => cache.get(defaultWebsiteId) ?? { kind: "loading" });
  // A slow answer for a website no longer picked must not replace the one shown.
  const selected = useRef(defaultWebsiteId);

  const load = useCallback(async (id: string) => {
    const cached = cache.get(id);
    if (cached && cached.kind === "ready") {
      setState(cached);
      return;
    }
    setState({ kind: "loading" });
    try {
      const res = await fetch(`/api/websites/${id}/weekly-summary`, { method: "POST" });
      const data = (await res.json()) as { summary?: Summary; createdAt?: string; error?: string; code?: string };
      const next: State =
        res.ok && data.summary && data.createdAt
          ? { kind: "ready", summary: data.summary, createdAt: data.createdAt }
          : {
              kind: "error",
              message: data.error ?? "Could not write this week's summary.",
              retry: data.code !== "budget_exhausted",
            };
      if (next.kind === "ready") {
        cache.set(id, next);
        track("ai_weekly_summary_shown", { websiteId: id });
      }
      if (selected.current === id) setState(next);
    } catch {
      if (selected.current === id) setState({ kind: "error", message: "Could not reach MyKavo. Try again in a moment.", retry: true });
    }
  }, [cache]);

  useEffect(() => {
    if (cache.get(websiteId)?.kind === "ready") return;
    const timer = window.setTimeout(() => void load(websiteId), 0);
    return () => window.clearTimeout(timer);
  }, [websiteId, load, cache]);

  function choose(id: string) {
    selected.current = id;
    setWebsiteId(id);
    setState(cache.get(id) ?? { kind: "loading" });
  }

  return (
    <section aria-labelledby="weekly-summary-heading" className="rounded-card bg-card p-5 shadow-card sm:p-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 id="weekly-summary-heading" className="flex items-center gap-2 text-[15px] font-semibold text-ink">
          <span
            aria-hidden
            className="inline-flex size-7 items-center justify-center rounded-lg bg-primary-soft text-accent"
          >
            <Sparkles className="size-4" />
          </span>
          Your site this week
        </h2>
        <div className="flex items-center gap-2">
          {state.kind === "ready" && (
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-[12px] font-semibold",
                STATUS[state.summary.status].className,
              )}
            >
              {STATUS[state.summary.status].label}
            </span>
          )}
          {websites.length > 1 && (
            <label className="flex items-center">
              <span className="sr-only">Website</span>
              <select
                value={websiteId}
                onChange={(e) => choose(e.target.value)}
                className="h-8 max-w-[12rem] truncate rounded-lg border border-line bg-card px-2 text-[13px] text-ink"
              >
                {websites.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      </div>

      {state.kind === "loading" && (
        <p className="flex items-center gap-2 text-sm text-ink-secondary" role="status">
          <Loader2 className="size-4 animate-spin" aria-hidden /> Reading the last 7 days…
        </p>
      )}

      {state.kind === "error" && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-ink-secondary" role="alert">
            {state.message}
          </p>
          {state.retry && (
            <button
              type="button"
              onClick={() => void load(websiteId)}
              className="inline-flex h-8 items-center rounded-full border border-line px-3 text-[13px] font-medium text-ink hover:bg-primary-soft"
            >
              Try again
            </button>
          )}
        </div>
      )}

      {state.kind === "ready" && (
        <div className="space-y-3">
          <p className="text-[15px] font-semibold leading-6 text-ink">{state.summary.headline}</p>
          <p className="max-w-3xl text-sm leading-6 text-ink">{state.summary.summary}</p>
          {state.summary.highlights.length > 0 && (
            <ul className="space-y-1.5">
              {state.summary.highlights.map((h, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm leading-6 text-ink">
                  <span aria-hidden className={cn("mt-2 inline-block size-2 shrink-0 rounded-full", TONE_DOT[h.tone])} />
                  {h.text}
                </li>
              ))}
            </ul>
          )}
          <p className="text-[12px] text-ink-faint">
            Written by AI from your last 7 days of scans, changes and uptime. Updated{" "}
            {new Date(state.createdAt).toLocaleDateString("en-US", { dateStyle: "medium" })}.
          </p>
        </div>
      )}
    </section>
  );
}
