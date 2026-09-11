"use client";

import { useState } from "react";
import { Loader2, Swords, Minus, ArrowUp } from "lucide-react";
import { ToolError } from "@/components/tools/tool-error";
import { ToolCta } from "@/components/tools/tool-cta";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import type { CompetitorReport, ComparisonRow, Verdict } from "@/lib/tools/competitor";

/** Two URL fields rather than the shared single-URL form, styled to match it. */
function UrlField({
  id,
  label,
  placeholder,
  value,
  onChange,
}: {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex-1">
      <label
        htmlFor={id}
        className="mb-1.5 block font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6B6B60]"
      >
        {label}
      </label>
      <input
        id={id}
        type="text"
        inputMode="url"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-12 w-full rounded-xl border border-[#151515]/25 bg-white px-4 font-mono text-[14px] text-[#151515] placeholder:font-sans placeholder:text-[#151515]/35 focus:border-[#151515] focus:outline-none focus:ring-2 focus:ring-[#FFD400]"
      />
    </div>
  );
}

/** Gold marks a win, so the winning side is unmissable at a glance. */
function VerdictCell({ verdict, side }: { verdict: Verdict; side: "you" | "them" }) {
  if (verdict === "info") return null;
  if (verdict === "tie") {
    return <Minus className="size-3.5 shrink-0 text-[#6B6B60]" aria-label="Tie" />;
  }
  if (verdict !== side) return null;
  return (
    <ArrowUp
      className="size-3.5 shrink-0 rounded-full bg-[#FFD400] p-px text-[#151515]"
      aria-label="Better"
    />
  );
}

function Row({ row }: { row: ComparisonRow }) {
  return (
    <tr className="border-b border-black/10 last:border-b-0 align-top">
      <th scope="row" className="px-4 py-3 text-left font-medium text-[#151515]">
        {row.label}
        {row.note && (
          <span className="mt-1 block text-[12px] font-normal leading-5 text-[#6B6B60]">
            {row.note}
          </span>
        )}
      </th>
      <td
        className={cn(
          "px-4 py-3 text-[#151515]",
          row.verdict === "you" && "bg-[#FFF3B0]/50 font-semibold",
        )}
      >
        <span className="flex items-center gap-1.5">
          <VerdictCell verdict={row.verdict} side="you" />
          {row.you}
        </span>
      </td>
      <td
        className={cn(
          "px-4 py-3 text-[#151515]",
          row.verdict === "them" && "bg-[#FFF3B0]/50 font-semibold",
        )}
      >
        <span className="flex items-center gap-1.5">
          <VerdictCell verdict={row.verdict} side="them" />
          {row.them}
        </span>
      </td>
    </tr>
  );
}

const GROUPS = ["Search visibility", "Speed and weight", "Content", "Technology"] as const;

export function CompetitorAnalysis() {
  const [yourUrl, setYourUrl] = useState("");
  const [theirUrl, setTheirUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState<CompetitorReport | null>(null);

  async function run() {
    setLoading(true);
    setError("");
    setReport(null);
    try {
      const res = await fetch("/api/tools/competitor", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ yourUrl: yourUrl.trim(), theirUrl: theirUrl.trim() }),
      });
      const data = (await res.json()) as { report?: CompetitorReport; error?: string };
      if (!res.ok || !data.report) throw new Error(data.error ?? "Something went wrong.");
      setReport(data.report);
      track("tool_used", { tool: "competitor-analysis-tool" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  const ready = yourUrl.trim().length > 0 && theirUrl.trim().length > 0;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#151515] bg-white p-6 shadow-[6px_6px_0_#FFD400,6px_6px_0_1px_#151515]">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (ready) void run();
          }}
          className="space-y-4"
        >
          <div className="flex flex-col gap-4 sm:flex-row">
            <UrlField
              id="your-url"
              label="Your page"
              placeholder="yoursite.com/pricing"
              value={yourUrl}
              onChange={setYourUrl}
            />
            <UrlField
              id="their-url"
              label="Their page"
              placeholder="competitor.com/pricing"
              value={theirUrl}
              onChange={setTheirUrl}
            />
          </div>
          <button
            type="submit"
            disabled={loading || !ready}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border border-[#151515] bg-[#FFD400] px-6 text-sm font-semibold text-[#151515] shadow-[3px_3px_0_#151515] transition-all hover:bg-[#ffe14d] disabled:opacity-60 disabled:shadow-none sm:w-auto"
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Swords className="size-4" aria-hidden />
            )}
            Compare pages
          </button>
        </form>
      </div>

      {error && <ToolError message={error} />}

      {report && (
        <>
          <div className="rounded-2xl border border-[#151515] bg-white p-6 shadow-[5px_5px_0_#151515]">
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-[15px] font-semibold text-[#151515]">Side by side</h2>
              <p className="text-[13px] text-[#6B6B60]">
                You lead on <span className="font-semibold text-[#151515]">{report.score.you}</span>
                {" · "}they lead on{" "}
                <span className="font-semibold text-[#151515]">{report.score.them}</span>
                {" · "}
                <span className="font-semibold text-[#151515]">{report.score.tie}</span> even
              </p>
            </div>

            {/* Wide content scrolls inside its own container rather than
                pushing the page sideways on a phone. */}
            <div className="overflow-x-auto rounded-xl border border-black/10">
              <table className="w-full min-w-150 border-collapse text-left text-[14px]">
                <thead>
                  <tr className="border-b border-black/15 bg-[#F3F1E6]">
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Signal
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      <span className="block truncate">{new URL(report.you.finalUrl).hostname}</span>
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      <span className="block truncate">
                        {new URL(report.them.finalUrl).hostname}
                      </span>
                    </th>
                  </tr>
                </thead>
                {GROUPS.map((group) => {
                  const rows = report.rows.filter((r) => r.group === group);
                  if (rows.length === 0) return null;
                  return (
                    <tbody key={group}>
                      <tr>
                        <td
                          colSpan={3}
                          className="border-b border-black/10 bg-[#FBFAF3] px-4 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6B6B60]"
                        >
                          {group}
                        </td>
                      </tr>
                      {rows.map((row) => (
                        <Row key={row.label} row={row} />
                      ))}
                    </tbody>
                  );
                })}
              </table>
            </div>

            {report.theirExtraServices.length > 0 && (
              <div className="mt-5 rounded-xl border border-black/10 bg-[#F3F1E6] px-4 py-3.5">
                <p className="text-[13px] font-semibold text-[#151515]">
                  They run {report.theirExtraServices.length} service
                  {report.theirExtraServices.length === 1 ? "" : "s"} you don&apos;t
                </p>
                <p className="mt-1 text-[13px] leading-6 text-[#6B6B60]">
                  {report.theirExtraServices.join(", ")}
                </p>
              </div>
            )}

            <p className="mt-4 text-[12px] leading-5 text-[#6B6B60]">
              Both pages were read as a browser would, following redirects and obeying the same
              rules a search engine does. Response times come from a single request, so treat
              small differences as noise.
            </p>
          </div>

          <ToolCta
            heading="This is one moment in time. Watch what changes next."
            body="MyKavo can keep checking their pricing page on a schedule and email you the before-and-after the day it moves. Free plan, one site, no card."
            tool="competitor-analysis-tool"
          />
        </>
      )}
    </div>
  );
}
