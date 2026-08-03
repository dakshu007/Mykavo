"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, ShieldCheck } from "lucide-react";
import type { EeatReport, EeatPillar } from "@/lib/tools/eeat";

/** Client half of the free E-E-A-T analyzer: URL form + scored report. */

const PILLAR_LABELS: Record<EeatPillar, string> = {
  EXPERIENCE: "Experience",
  EXPERTISE: "Expertise",
  AUTHORITATIVENESS: "Authoritativeness",
  TRUST: "Trust",
};

const STATUS_STYLE: Record<string, { dot: string; label: string }> = {
  pass: { dot: "#1f9d55", label: "Pass" },
  warn: { dot: "#f59e0b", label: "Improve" },
  fail: { dot: "#e5484d", label: "Missing" },
};

function scoreColor(score: number): string {
  return score >= 90 ? "#1f9d55" : score >= 70 ? "#f59e0b" : "#e5484d";
}

export function EeatAnalyzer() {
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
    <div>
      <form onSubmit={analyze} className="mx-auto flex max-w-xl gap-2.5">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://yourdomain.com/article"
          aria-label="Page URL to analyze"
          className="h-13 min-w-0 flex-1 rounded-full border-2 border-[#151515] bg-white px-5 font-mono text-[14px] text-[#151515] placeholder:text-[#9C9E93] focus:outline-none"
        />
        <button
          type="submit"
          disabled={busy}
          className="inline-flex h-13 shrink-0 items-center gap-2 rounded-full border border-black/25 bg-[#FFD400] px-6 text-[15px] font-bold text-[#151515] transition-colors hover:bg-[#ffe14d] disabled:opacity-60"
        >
          {busy ? <Loader2 className="size-4.5 animate-spin" aria-hidden /> : <ShieldCheck className="size-4.5" aria-hidden />}
          Analyze
        </button>
      </form>
      {busy && (
        <p className="mt-4 text-center text-[13px] text-[#6B6B60]">
          Fetching the page and checking about/contact/privacy pages - a few seconds…
        </p>
      )}
      {error && (
        <p className="mx-auto mt-4 max-w-xl rounded-xl bg-[#FDE5E5] px-4 py-3 text-center text-[13.5px] text-[#b42318]" role="alert">
          {error}
        </p>
      )}

      {report && (
        <div className="mt-10">
          {/* Score band */}
          <div className="overflow-hidden rounded-2xl border-2 border-[#151515] bg-white shadow-[8px_8px_0_#FFD400,8px_8px_0_1px_#151515]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/10 bg-[#F3F1E6] px-5 py-3">
              <span className="break-all font-mono text-[12px] text-[#6B6B60]">{report.url}</span>
              <span
                className="rounded-full border border-black/20 px-3 py-1 text-[12px] font-bold text-white"
                style={{ backgroundColor: scoreColor(report.overall) }}
              >
                {report.rating}
              </span>
            </div>
            <div className="grid gap-6 p-6 sm:grid-cols-[auto_1fr] sm:items-center">
              <div className="text-center">
                <p
                  className="text-6xl font-extrabold tabular-nums tracking-tight"
                  style={{ color: scoreColor(report.overall) }}
                >
                  {report.overall}
                </p>
                <p className="mt-1 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#6B6B60]">
                  E-E-A-T signal score
                </p>
              </div>
              <div className="space-y-3">
                {(Object.keys(PILLAR_LABELS) as EeatPillar[]).map((pillar) => (
                  <div key={pillar} className="flex items-center gap-3">
                    <span className="w-36 shrink-0 text-[13px] font-semibold text-[#151515]">
                      {PILLAR_LABELS[pillar]}
                      {pillar === "TRUST" && <span className="ml-1 font-mono text-[9px] text-[#6B6B60]">×2</span>}
                    </span>
                    <span className="h-3 flex-1 overflow-hidden rounded-full bg-[#F3F1E6]">
                      <span
                        className="block h-full rounded-full transition-all"
                        style={{ width: `${report.pillars[pillar]}%`, backgroundColor: scoreColor(report.pillars[pillar]) }}
                      />
                    </span>
                    <span className="w-9 shrink-0 text-right text-[13px] font-bold tabular-nums text-[#151515]">
                      {report.pillars[pillar]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Checks */}
          <div className="mt-6 overflow-hidden rounded-2xl border-2 border-[#151515] bg-white shadow-[5px_5px_0_#151515]">
            {report.checks.map((check) => (
              <div key={check.id} className="flex gap-3 border-b border-black/[0.06] px-5 py-3.5 last:border-b-0">
                <span
                  className="mt-1.5 size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: STATUS_STYLE[check.status].dot }}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-semibold text-[#151515]">
                    {check.title}
                    <span className="ml-2 font-mono text-[10px] font-bold uppercase tracking-wide text-[#6B6B60]">
                      {PILLAR_LABELS[check.pillar]} · {STATUS_STYLE[check.status].label}
                    </span>
                  </p>
                  <p className="mt-0.5 text-[13px] leading-5 text-[#6B6B60]">{check.detail}</p>
                  {check.status !== "pass" && (
                    <p className="mt-1 text-[13px] leading-5 text-[#151515]/85">→ {check.fix}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Product CTA */}
          <div className="mt-8 rounded-2xl border-2 border-[#151515] bg-[#FFF7CC] p-6 text-center">
            <p className="text-[15px] font-semibold text-[#151515]">
              E-E-A-T signals drift: bylines vanish in redesigns, policies get unlinked, schema breaks.
            </p>
            <p className="mt-1 text-[13.5px] text-[#6B6B60]">
              MyKavo monitors your pages, audits your whole site, and alerts you when trust signals change.
            </p>
            <Link
              href="/signup"
              className="mt-4 inline-flex items-center rounded-full border border-black/25 bg-[#FFD400] px-7 py-3 text-[14px] font-bold text-[#151515] transition-colors hover:bg-[#ffe14d]"
            >
              Monitor E-E-A-T signals free
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
