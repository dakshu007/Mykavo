"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, Info, ListTree } from "lucide-react";
import { ToolUrlForm } from "@/components/tools/url-form";
import { ToolError } from "@/components/tools/tool-error";
import { ToolCta } from "@/components/tools/tool-cta";
import { track } from "@/lib/analytics";
import type { HeadingLevel, HeadingsReport, TitleH1Relation } from "@/lib/tools/headings";

const label = "font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6B6B60]";
const LEVELS: HeadingLevel[] = [1, 2, 3, 4, 5, 6];

const TITLE_VS_H1: Record<TitleH1Relation, string> = {
  identical: "The title and the H1 match. That is fine: many sites do it on purpose.",
  different: "The title and the H1 differ. That is common and fine; the title is written for search results, the H1 for people already on the page.",
  "no-title": "The page has an H1 but no <title> tag. Every page should have a title.",
  "no-h1": "The page has a title but no H1 heading.",
  neither: "The page has neither a <title> tag nor an H1 heading.",
};

export function HeadingChecker() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState<HeadingsReport | null>(null);

  async function run(url: string) {
    setLoading(true);
    setError("");
    setReport(null);
    try {
      const res = await fetch("/api/tools/headings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = (await res.json()) as { report?: HeadingsReport; error?: string };
      if (!res.ok || !data.report) throw new Error(data.error ?? "Something went wrong.");
      setReport(data.report);
      track("tool_used", { tool: "heading-structure-checker" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  const ok = report !== null && report.issues.every((i) => i.severity === "info");

  return (
    <div className="space-y-6">
      <ToolUrlForm
        id="headings-url"
        buttonLabel="Check headings"
        buttonIcon={<ListTree className="size-4" aria-hidden />}
        loading={loading}
        onSubmit={(url) => void run(url)}
      />

      {error && <ToolError message={error} />}

      {report && (
        <>
          <div className="rounded-2xl border border-[#151515] bg-white p-6 shadow-[5px_5px_0_#151515]">
            <div
              className={`flex items-start gap-3 rounded-xl border px-4 py-3.5 ${
                ok ? "border-[#14632f]/20 bg-[#e7f6ec] text-[#14632f]" : "border-[#92600a]/20 bg-[#fdf3e0] text-[#92600a]"
              }`}
            >
              {ok ? <CheckCircle2 className="mt-0.5 size-5 shrink-0" aria-hidden /> : <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden />}
              <div>
                <h2 className="text-[16px] font-semibold">
                  {report.total === 0
                    ? "No headings found"
                    : `${report.total} heading${report.total === 1 ? "" : "s"} found`}
                </h2>
                <p className="mt-0.5 text-[13.5px] leading-6">
                  {ok ? "The heading structure has no problems worth fixing." : "Some things in the heading structure are worth a look."}
                </p>
              </div>
            </div>
            <p className="mt-3 truncate font-mono text-xs text-[#6B6B60]" title={report.finalUrl}>
              {report.finalUrl}
              {report.httpStatus !== 200 && <span className="ml-2 text-[#9b1c1c]">HTTP {report.httpStatus}</span>}
            </p>

            <ul className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-6" aria-label="Headings per level">
              {LEVELS.map((l) => (
                <li key={l} className="rounded-xl border border-black/10 bg-[#FBFAF3] px-3 py-2.5 text-center">
                  <span className="block font-mono text-[11px] font-semibold text-[#6B6B60]">H{l}</span>
                  <span className="block text-xl font-semibold tabular-nums text-[#151515]">{report.counts[l]}</span>
                </li>
              ))}
            </ul>

            {report.issues.length > 0 && (
              <div className="mt-5 space-y-2.5">
                {report.issues.map((i) => (
                  <Note key={i.id} warn={i.severity === "warn"}>
                    {i.message}
                  </Note>
                ))}
              </div>
            )}

            <dl className="mt-6 grid gap-x-6 gap-y-4 border-t border-black/10 pt-5 sm:grid-cols-2">
              <div>
                <dt className={label}>Title tag</dt>
                <dd className="mt-1 break-words text-[14px] text-[#151515]">
                  {report.title ?? <span className="text-[#6B6B60]">Missing</span>}
                </dd>
              </div>
              <div>
                <dt className={label}>First H1</dt>
                <dd className="mt-1 break-words text-[14px] text-[#151515]">
                  {report.firstH1 ?? <span className="text-[#6B6B60]">Missing</span>}
                </dd>
              </div>
            </dl>
            <p className="mt-3 text-[13px] leading-6 text-[#3d3d38]">{TITLE_VS_H1[report.titleVsH1]}</p>

            {report.headings.length > 0 && (
              <div className="mt-6 border-t border-black/10 pt-5">
                <h3 className={label}>Outline in page order</h3>
                <ol className="mt-3 max-h-[560px] space-y-1 overflow-auto pr-1">
                  {report.headings.map((h) => {
                    const flagged = h.empty || h.skippedFrom !== null || h.tooLong;
                    return (
                      <li
                        key={h.index}
                        className="flex items-baseline gap-2 border-l border-black/10 py-1 pl-2"
                        style={{ marginLeft: `${(h.level - 1) * 18}px` }}
                      >
                        <span
                          className={`shrink-0 rounded px-1.5 py-0.5 font-mono text-[11px] font-semibold ${
                            h.level === 1 ? "bg-[#FFD400] text-[#151515]" : "bg-[#F3F1E6] text-[#151515]"
                          }`}
                        >
                          H{h.level}
                        </span>
                        <span className="min-w-0 break-words text-[14px] leading-6 text-[#151515]">
                          {h.empty ? (
                            <span className="italic text-[#9b1c1c]">(empty heading)</span>
                          ) : (
                            <>
                              {h.text}
                              {h.fromAlt && <span className="ml-1.5 text-[12px] text-[#6B6B60]">(image alt text)</span>}
                            </>
                          )}
                          {flagged && (
                            <span className="ml-2 inline-flex flex-wrap gap-1 align-middle">
                              {h.skippedFrom !== null && <Flag>skipped from H{h.skippedFrom}</Flag>}
                              {h.tooLong && <Flag>{h.length} characters</Flag>}
                            </span>
                          )}
                        </span>
                      </li>
                    );
                  })}
                </ol>
                {report.truncated && (
                  <p className="mt-3 text-[12.5px] text-[#6B6B60]">
                    Showing the first {report.headings.length} of {report.total} headings. Counts above include all of them.
                  </p>
                )}
              </div>
            )}
          </div>

          <ToolCta
            heading="Find out when an H1 disappears, not weeks later."
            body="MyKavo compares the H1 on every monitored page each scan. A removed H1 is a high-severity alert and a changed one is flagged for review, while edits to other headings show up as text changes."
            tool="heading-structure-checker"
          />
        </>
      )}
    </div>
  );
}

function Flag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded border border-[#92600a]/25 bg-[#fdf3e0] px-1.5 py-px font-mono text-[10.5px] text-[#92600a]">
      {children}
    </span>
  );
}

function Note({ children, warn = false }: { children: React.ReactNode; warn?: boolean }) {
  const Icon = warn ? AlertTriangle : Info;
  return (
    <div className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 ${warn ? "border-[#92600a]/20 bg-[#fdf3e0]" : "border-black/10 bg-[#F3F1E6]"}`}>
      <Icon className={`mt-0.5 size-4 shrink-0 ${warn ? "text-[#92600a]" : "text-[#6B6B60]"}`} aria-hidden />
      <p className="text-[13px] leading-6 text-[#3d3d38]">{children}</p>
    </div>
  );
}
