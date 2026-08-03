"use client";

import { useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import type { EeatReport, EeatPillar } from "@/lib/tools/eeat";

/** Dashboard edition of the analyzer: URL in, scored E-E-A-T report out. */

const PILLAR_LABELS: Record<EeatPillar, string> = {
  EXPERIENCE: "Experience",
  EXPERTISE: "Expertise",
  AUTHORITATIVENESS: "Authoritativeness",
  TRUST: "Trust",
};

const STATUS_CHIP: Record<string, { label: string; className: string }> = {
  pass: { label: "Pass", className: "bg-success-soft text-success-strong" },
  warn: { label: "Improve", className: "bg-warning-soft text-warning-strong" },
  fail: { label: "Missing", className: "bg-critical-soft text-critical-strong" },
};

function tone(score: number): string {
  return score >= 90 ? "text-success-strong" : score >= 70 ? "text-warning-strong" : "text-critical-strong";
}

function barTone(score: number): string {
  return score >= 90 ? "bg-success" : score >= 70 ? "bg-warning" : "bg-critical";
}

export function AnalyserClient() {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState<EeatReport | null>(null);

  async function analyze(event: React.FormEvent) {
    event.preventDefault();
    if (busy || !url.trim()) return;
    setBusy(true);
    setError("");
    setReport(null);
    try {
      const res = await fetch("/api/tools/eeat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = (await res.json()) as { report?: EeatReport; error?: string };
      if (!res.ok || !data.report) throw new Error(data.error ?? "Analysis failed.");
      setReport(data.report);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={analyze} className="flex flex-wrap gap-2.5">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://any-page.com/article - yours, a client's, a competitor's"
          aria-label="Page URL to analyze"
          className="h-11 min-w-0 flex-1 rounded-field border border-line bg-card px-4 font-mono text-[13.5px] text-ink placeholder:text-ink-faint focus:border-primary focus:outline-none"
        />
        <button
          type="submit"
          disabled={busy}
          className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-primary px-6 text-[13.5px] font-medium text-primary-contrast transition-colors hover:bg-primary-hover disabled:opacity-60"
        >
          {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <ShieldCheck className="size-4" aria-hidden />}
          Analyse
        </button>
      </form>
      {busy && (
        <p className="text-[13px] text-ink-faint">
          Fetching the page and checking about/contact/privacy pages - a few seconds…
        </p>
      )}
      {error && (
        <p className="rounded-tile bg-critical-soft px-4 py-3 text-sm text-critical-strong" role="alert">
          {error}
        </p>
      )}

      {report && (
        <>
          <div className="grid gap-4 lg:grid-cols-[auto_1fr]">
            <div className="flex flex-col items-center justify-center rounded-card bg-card px-12 py-6 shadow-card">
              <p className="label-micro mb-2">Analyser score</p>
              <p className={`text-6xl font-semibold tabular-nums tracking-tight ${tone(report.overall)}`}>
                {report.overall}
              </p>
              <p className={`mt-1 text-[13px] font-medium ${tone(report.overall)}`}>{report.rating}</p>
              <p className="mt-2 max-w-44 break-all text-center font-mono text-[10.5px] text-ink-faint">
                {report.url}
              </p>
            </div>
            <div className="rounded-card bg-card p-6 shadow-card">
              <p className="mb-4 text-[15px] font-semibold text-ink">Pillars</p>
              <div className="space-y-3.5">
                {(Object.keys(PILLAR_LABELS) as EeatPillar[]).map((pillar) => (
                  <div key={pillar} className="flex items-center gap-3">
                    <span className="w-40 shrink-0 text-sm font-medium text-ink">
                      {PILLAR_LABELS[pillar]}
                      {pillar === "TRUST" && <span className="ml-1.5 font-mono text-[10px] text-ink-faint">×2</span>}
                    </span>
                    <span className="h-3 flex-1 overflow-hidden rounded-full bg-surface">
                      <span
                        className={`block h-full rounded-full ${barTone(report.pillars[pillar])}`}
                        style={{ width: `${report.pillars[pillar]}%` }}
                      />
                    </span>
                    <span className={`w-9 shrink-0 text-right text-sm font-semibold tabular-nums ${tone(report.pillars[pillar])}`}>
                      {report.pillars[pillar]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-card bg-card p-6 shadow-card">
            <p className="mb-1 text-[15px] font-semibold text-ink">Signals</p>
            <ul className="divide-y divide-line">
              {report.checks.map((check) => (
                <li key={check.id} className="py-3">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_CHIP[check.status].className}`}>
                      {STATUS_CHIP[check.status].label}
                    </span>
                    <span className="text-sm font-medium text-ink">{check.title}</span>
                    <span className="text-[11px] uppercase tracking-wide text-ink-faint">
                      {PILLAR_LABELS[check.pillar]}
                    </span>
                  </div>
                  <p className="mt-1 text-[13px] text-ink-secondary">{check.detail}</p>
                  {check.status !== "pass" && (
                    <p className="mt-0.5 text-[13px] text-ink">→ {check.fix}</p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
