"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, Globe2, Info, Minus, XCircle } from "lucide-react";
import { ToolUrlForm } from "@/components/tools/url-form";
import { ToolError } from "@/components/tools/tool-error";
import { ToolCta } from "@/components/tools/tool-cta";
import { track } from "@/lib/analytics";
import type { AlternateCheck, HreflangReport } from "@/lib/tools/hreflang";

const label = "font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6B6B60]";

function Yes() {
  return <CheckCircle2 className="size-4 text-[#14632f]" aria-label="Yes" />;
}
function No() {
  return <XCircle className="size-4 text-[#9b1c1c]" aria-label="No" />;
}
function Unknown() {
  return <Minus className="size-4 text-[#6B6B60]" aria-label="Not checked" />;
}

function statusCell(a: AlternateCheck) {
  if (a.self) return <span className="text-[#6B6B60]">this page</span>;
  if (a.error) return <span className="text-[#9b1c1c]">{a.error}</span>;
  if (!a.fetched) return <span className="text-[#6B6B60]">not checked</span>;
  const ok = a.status !== null && a.status >= 200 && a.status < 300;
  return (
    <span className={ok ? "text-[#14632f]" : "font-semibold text-[#9b1c1c]"}>
      {a.status}
      {a.redirected && <span className="ml-1 text-[#92600a]">(redirected)</span>}
    </span>
  );
}

export function HreflangChecker() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState<HreflangReport | null>(null);

  async function run(url: string) {
    setLoading(true);
    setError("");
    setReport(null);
    try {
      const res = await fetch("/api/tools/hreflang", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = (await res.json()) as { report?: HreflangReport; error?: string };
      if (!res.ok || !data.report) throw new Error(data.error ?? "Something went wrong.");
      setReport(data.report);
      track("tool_used", { tool: "hreflang-checker" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  const count = report?.alternates.length ?? 0;
  const clean = report !== null && count > 0 && report.issues.length === 0;

  return (
    <div className="space-y-6">
      <ToolUrlForm
        id="hreflang-url"
        buttonLabel="Check hreflang"
        buttonIcon={<Globe2 className="size-4" aria-hidden />}
        loading={loading}
        onSubmit={(url) => void run(url)}
      />

      {error && <ToolError message={error} />}

      {report && (
        <>
          <div className="rounded-2xl border border-[#151515] bg-white p-6 shadow-[5px_5px_0_#151515]">
            {count === 0 ? (
              <div className="flex items-start gap-3 rounded-xl border border-black/10 bg-[#F3F1E6] px-4 py-3.5">
                <Info className="mt-0.5 size-5 shrink-0 text-[#6B6B60]" aria-hidden />
                <div>
                  <h2 className="text-[16px] font-semibold text-[#151515]">No hreflang found</h2>
                  <p className="mt-0.5 text-[13.5px] leading-6 text-[#3d3d38]">
                    This page has no hreflang link tags or Link header entries. That&apos;s normal for a single-language
                    site. If you declare hreflang in your XML sitemap instead, this tool doesn&apos;t read it.
                  </p>
                </div>
              </div>
            ) : (
              <div
                className={`flex items-start gap-3 rounded-xl border px-4 py-3.5 ${
                  clean ? "border-[#14632f]/20 bg-[#e7f6ec] text-[#14632f]" : "border-[#9b1c1c]/20 bg-[#fdecec] text-[#9b1c1c]"
                }`}
              >
                {clean ? <CheckCircle2 className="mt-0.5 size-5 shrink-0" aria-hidden /> : <XCircle className="mt-0.5 size-5 shrink-0" aria-hidden />}
                <div>
                  <h2 className="text-[16px] font-semibold">
                    {clean ? "Hreflang looks correct" : `${report.issues.length} problem${report.issues.length === 1 ? "" : "s"} found`}
                  </h2>
                  <p className="mt-0.5 text-[13.5px] leading-6">
                    {count} hreflang entr{count === 1 ? "y" : "ies"} on this page.
                  </p>
                </div>
              </div>
            )}
            <p className="mt-3 truncate font-mono text-xs text-[#6B6B60]" title={report.finalUrl}>
              {report.finalUrl}
            </p>

            {report.issues.length > 0 && (
              <ul className="mt-4 space-y-2">
                {report.issues.map((i) => (
                  <li key={i} className="flex gap-2 break-words text-[14px] leading-6 text-[#151515]">
                    <XCircle className="mt-1 size-4 shrink-0 text-[#9b1c1c]" aria-hidden />
                    <span className="min-w-0">{i}</span>
                  </li>
                ))}
              </ul>
            )}

            {count > 0 && (
              <div className="mt-6 overflow-x-auto border-t border-black/10 pt-5">
                <table className="w-full min-w-150 border-collapse text-left">
                  <thead>
                    <tr>
                      <th className={`${label} pb-2 pr-3`}>Code</th>
                      <th className={`${label} pb-2 pr-3`}>URL</th>
                      <th className={`${label} pb-2 pr-3`}>Status</th>
                      <th className={`${label} pb-2 pr-3`}>Links back</th>
                      <th className={`${label} pb-2`}>Indexable</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.alternates.map((a, i) => (
                      <tr key={`${a.hreflang}-${i}`} className="border-t border-black/10 align-top">
                        <td className="py-2.5 pr-3">
                          <p className={`font-mono text-[13px] ${a.code.valid ? "text-[#151515]" : "font-semibold text-[#9b1c1c]"}`}>{a.hreflang}</p>
                          <p className="text-[11.5px] text-[#6B6B60]">{a.code.valid ? a.code.label : "invalid code"}</p>
                        </td>
                        <td className="max-w-0 py-2.5 pr-3">
                          <p className="truncate font-mono text-[12.5px] text-[#151515]" title={a.href}>{a.href}</p>
                        </td>
                        <td className="py-2.5 pr-3 text-[13px]">{statusCell(a)}</td>
                        <td className="py-2.5 pr-3">{a.returnLink === null ? <Unknown /> : a.returnLink ? <Yes /> : <No />}</td>
                        <td className="py-2.5">
                          {a.noindex === null ? <Unknown /> : a.noindex || a.canonicalElsewhere ? <No /> : <Yes />}
                          {a.canonicalElsewhere && <p className="text-[11.5px] text-[#9b1c1c]">canonical elsewhere</p>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {(report.notes.length > 0 || report.unfetchedCount > 0) && (
              <div className="mt-5 space-y-2">
                {report.unfetchedCount > 0 && (
                  <Note>
                    The first 15 alternates were opened and checked; {report.unfetchedCount} more were validated but not
                    opened.
                  </Note>
                )}
                {report.notes.map((n) => (
                  <Note key={n}>{n}</Note>
                ))}
              </div>
            )}
          </div>

          <ToolCta
            heading="Catch hreflang and SEO tag mistakes across the whole site."
            body="MyKavo's Site Audit, included on the free plan for up to 150 pages per crawl, flags invalid hreflang codes and missing self-references, and monitoring alerts you when key SEO tags change."
            tool="hreflang-checker"
          />
        </>
      )}
    </div>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-[#92600a]/20 bg-[#fdf3e0] px-4 py-3">
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[#92600a]" aria-hidden />
      <p className="text-[13px] leading-6 text-[#3d3d38]">{children}</p>
    </div>
  );
}
