"use client";

import { useState } from "react";
import { ListChecks, Loader2 } from "lucide-react";
import { ToolError } from "@/components/tools/tool-error";
import { ToolCta } from "@/components/tools/tool-cta";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import type { UrlStatusResult } from "@/lib/tools/status-check";
import { statusLabel, type StatusTone } from "@/lib/tools/status-labels";

const MAX_URLS = 20;

/** v4 fixed-palette status chip tones (always paired with a text label). */
const TONE_CLASS: Record<StatusTone, string> = {
  success: "bg-[#e6f4ea] text-[#1a7f37]",
  redirect: "bg-[#fdf3e0] text-[#92600a]",
  clientError: "bg-[#fdeaeb] text-[#b91c1c]",
  serverError: "bg-[#fdeaeb] text-[#b91c1c]",
  info: "border border-black/15 bg-white text-[#151515]",
};

function parseUrls(raw: string): string[] {
  const seen = new Set<string>();
  const urls: string[] = [];
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    urls.push(trimmed);
  }
  return urls;
}

function ResultRow({ result }: { result: UrlStatusResult }) {
  return (
    <tr className="border-t border-black/10">
      <td className="max-w-0 py-3 pr-4">
        <p className="truncate font-mono text-[13px] text-[#151515]" title={result.url}>
          {result.url}
        </p>
        {result.redirectCount > 0 && result.finalUrl && (
          <p className="mt-0.5 truncate text-xs text-[#6B6B60]" title={result.finalUrl}>
            → {result.finalUrl} ({result.redirectCount} redirect
            {result.redirectCount === 1 ? "" : "s"})
          </p>
        )}
      </td>
      <td className="py-3 pr-4">
        {result.status !== null ? (
          <span
            className={cn(
              "inline-flex whitespace-nowrap rounded-full px-2.5 py-1 font-mono text-xs font-semibold",
              TONE_CLASS[statusLabel(result.status).tone],
            )}
          >
            {statusLabel(result.status).text}
          </span>
        ) : (
          <span className="text-[13px] font-medium text-[#b91c1c]">{result.error}</span>
        )}
      </td>
      <td className="whitespace-nowrap py-3 text-right font-mono text-[13px] text-[#6B6B60]">
        {result.responseTimeMs !== null ? `${result.responseTimeMs} ms` : "-"}
      </td>
    </tr>
  );
}

export function BulkStatusChecker() {
  const [raw, setRaw] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<UrlStatusResult[] | null>(null);

  const urlCount = parseUrls(raw).length;

  async function run(e: React.FormEvent) {
    e.preventDefault();
    const urls = parseUrls(raw);
    if (urls.length === 0) {
      setError("Please enter at least one URL.");
      return;
    }
    if (urls.length > MAX_URLS) {
      setError(`Please enter at most ${MAX_URLS} URLs - you have ${urls.length}.`);
      return;
    }
    setLoading(true);
    setError("");
    setResults(null);
    try {
      const res = await fetch("/api/tools/bulk-status", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ urls }),
      });
      const data = (await res.json()) as { results?: UrlStatusResult[]; error?: string };
      if (!res.ok || !data.results) throw new Error(data.error ?? "Something went wrong.");
      setResults(data.results);
      track("tool_used", { tool: "bulk-url-status-checker", urls: urls.length });
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  const broken = results?.filter((r) => r.error !== null || (r.status ?? 0) >= 400).length ?? 0;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#151515] bg-white p-6 shadow-[6px_6px_0_#FFD400,6px_6px_0_1px_#151515]">
        <form onSubmit={run} className="space-y-3">
          <div>
            <label
              htmlFor="bulk-urls"
              className="mb-1.5 block font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6B6B60]"
            >
              URLs - one per line, up to {MAX_URLS}
            </label>
            <textarea
              id="bulk-urls"
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              rows={7}
              placeholder={"example.com\nexample.com/pricing\nexample.com/blog"}
              className="w-full rounded-xl border border-[#151515]/25 bg-white px-4 py-3 font-mono text-[14px] leading-6 text-[#151515] placeholder:font-sans placeholder:text-[#151515]/35 focus:border-[#151515] focus:outline-none focus:ring-2 focus:ring-[#FFD400]"
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p
              className={cn(
                "text-[13px]",
                urlCount > MAX_URLS ? "font-medium text-[#b91c1c]" : "text-[#6B6B60]",
              )}
            >
              {urlCount} / {MAX_URLS} URLs
            </p>
            <button
              type="submit"
              disabled={loading || urlCount === 0}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-[#151515] bg-[#FFD400] px-6 text-sm font-semibold text-[#151515] shadow-[3px_3px_0_#151515] transition-all hover:bg-[#ffe14d] disabled:opacity-60 disabled:shadow-none"
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <ListChecks className="size-4" aria-hidden />
              )}
              Check status codes
            </button>
          </div>
        </form>
      </div>

      {error && <ToolError message={error} />}

      {results && (
        <>
          <div className="rounded-2xl border border-[#151515] bg-white p-6 shadow-[5px_5px_0_#151515]">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-[15px] font-semibold text-[#151515]">
                {results.length} URL{results.length === 1 ? "" : "s"} checked
              </h2>
              <p className="text-[13px] text-[#6B6B60]">
                {broken === 0 ? (
                  <span className="font-semibold text-[#1a7f37]">All reachable</span>
                ) : (
                  <span className="font-semibold text-[#b91c1c]">
                    {broken} problem{broken === 1 ? "" : "s"} found
                  </span>
                )}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-130 table-fixed border-collapse text-left">
                <thead>
                  <tr>
                    <th className="w-1/2 pb-2 pr-4 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6B6B60]">
                      URL
                    </th>
                    <th className="pb-2 pr-4 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6B6B60]">
                      Status
                    </th>
                    <th className="w-24 pb-2 text-right font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6B6B60]">
                      Time
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => (
                    <ResultRow key={`${r.url}-${i}`} result={r} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <ToolCta
            heading="Automatically monitor these pages with MyKavo."
            body="MyKavo checks your important pages on a schedule - status codes, SEO tags, screenshots, links, and scripts - and emails you when a page that worked yesterday breaks today."
            tool="bulk-url-status-checker"
          />
        </>
      )}
    </div>
  );
}
