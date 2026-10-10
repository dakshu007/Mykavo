"use client";

import { useState } from "react";
import { AlertTriangle, Bot, CheckCircle2, XCircle } from "lucide-react";
import { ToolUrlForm } from "@/components/tools/url-form";
import { ToolError } from "@/components/tools/tool-error";
import { ToolCta } from "@/components/tools/tool-cta";
import { track } from "@/lib/analytics";
import type { RobotsTxtReport } from "@/lib/tools/robots-txt";

const label = "font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6B6B60]";

export function RobotsTxtTester() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState<RobotsTxtReport | null>(null);

  async function run(url: string) {
    setLoading(true);
    setError("");
    setReport(null);
    try {
      const res = await fetch("/api/tools/robots-txt", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = (await res.json()) as { report?: RobotsTxtReport; error?: string };
      if (!res.ok || !data.report) throw new Error(data.error ?? "Something went wrong.");
      setReport(data.report);
      track("tool_used", { tool: "robots-txt-tester" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  const decidingLines = new Set(report?.results.map((r) => r.line).filter((l): l is number => l !== null));

  return (
    <div className="space-y-6">
      <ToolUrlForm
        id="robots-url"
        placeholder="https://example.com/page-to-test"
        buttonLabel="Test URL"
        buttonIcon={<Bot className="size-4" aria-hidden />}
        loading={loading}
        onSubmit={(url) => void run(url)}
      />

      {error && <ToolError message={error} />}

      {report && (
        <>
          <div className="rounded-2xl border border-[#151515] bg-white p-6 shadow-[5px_5px_0_#151515]">
            <h2 className="text-[16px] font-semibold text-[#151515]">Can crawlers fetch this URL?</h2>
            <p className="mt-1 truncate font-mono text-xs text-[#6B6B60]" title={report.testedUrl}>{report.testedUrl}</p>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-120 border-collapse text-left">
                <thead>
                  <tr>
                    <th className={`${label} pb-2 pr-4`}>Crawler</th>
                    <th className={`${label} pb-2 pr-4`}>Result</th>
                    <th className={`${label} pb-2`}>Deciding rule</th>
                  </tr>
                </thead>
                <tbody>
                  {report.results.map((r) => (
                    <tr key={r.agent} className="border-t border-black/10">
                      <td className="py-3 pr-4">
                        <p className="text-[14px] font-semibold text-[#151515]">{r.agent}</p>
                        <p className="text-[12px] text-[#6B6B60]">{r.owner}</p>
                      </td>
                      <td className="py-3 pr-4">
                        {r.allowed ? (
                          <span className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-[#14632f]">
                            <CheckCircle2 className="size-4" aria-hidden /> Allowed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-[#9b1c1c]">
                            <XCircle className="size-4" aria-hidden /> Blocked
                          </span>
                        )}
                      </td>
                      <td className="py-3 font-mono text-[12.5px] text-[#151515]">
                        {r.rule ?? <span className="text-[#6B6B60]">no matching rule</span>}
                        {r.line !== null && <span className="ml-2 text-[#6B6B60]">line {r.line}</span>}
                        {r.group && r.rule && <p className="text-[11.5px] text-[#6B6B60]">group: {r.group}</p>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {report.warnings.length > 0 && (
              <div className="mt-5 space-y-2">
                {report.warnings.map((w) => (
                  <div key={w} className="flex items-start gap-2.5 rounded-xl border border-[#92600a]/20 bg-[#fdf3e0] px-4 py-3">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[#92600a]" aria-hidden />
                    <p className="text-[13px] leading-6 text-[#3d3d38]">{w}</p>
                  </div>
                ))}
              </div>
            )}

            {report.sitemaps.length > 0 && (
              <div className="mt-5">
                <p className={label}>Sitemaps declared</p>
                <ul className="mt-2 space-y-1">
                  {report.sitemaps.map((s) => (
                    <li key={s} className="break-all font-mono text-[12.5px] text-[#151515]">{s}</li>
                  ))}
                </ul>
              </div>
            )}

            {report.effect === "parse" && (
              <div className="mt-6">
                <p className={label}>
                  robots.txt <span className="normal-case tracking-normal">({report.robotsUrl})</span>
                </p>
                <pre className="mt-2 max-h-80 overflow-auto rounded-xl border border-black/10 bg-[#151515] p-4 font-mono text-[12px] leading-5 text-[#F5F5F0]">
                  {report.lines.map((line, i) => (
                    <div key={i} className={decidingLines.has(i + 1) ? "-mx-4 bg-[#FFD400]/25 px-4" : undefined}>
                      <span className="mr-3 inline-block w-7 select-none text-right text-[#F5F5F0]/40">{i + 1}</span>
                      {line || " "}
                    </div>
                  ))}
                  {report.truncated && <div className="text-[#F5F5F0]/50">...</div>}
                </pre>
              </div>
            )}
          </div>

          <ToolCta
            heading="Get alerted when robots.txt changes."
            body="One wrong line in robots.txt can hide a whole site from Google. MyKavo watches the pages you care about and alerts you, with before-and-after evidence, when indexing signals change."
            tool="robots-txt-tester"
          />
        </>
      )}
    </div>
  );
}
