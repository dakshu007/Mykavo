"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, Info, ScanSearch, XCircle } from "lucide-react";
import { ToolUrlForm } from "@/components/tools/url-form";
import { ToolError } from "@/components/tools/tool-error";
import { ToolCta } from "@/components/tools/tool-cta";
import { track } from "@/lib/analytics";
import type { NoindexReport } from "@/lib/tools/noindex";

const VERDICT = {
  indexable: { title: "Indexable", body: "Nothing on this page tells Google to keep it out of search.", icon: CheckCircle2, tone: "bg-[#e7f6ec] text-[#14632f] border-[#14632f]/20" },
  noindex: { title: "Not indexable: noindex", body: "Google is told not to show this page in search results.", icon: XCircle, tone: "bg-[#fdecec] text-[#9b1c1c] border-[#9b1c1c]/20" },
  "not-200": { title: "Not indexable: error status", body: "Only pages that load successfully (200) are indexed.", icon: XCircle, tone: "bg-[#fdecec] text-[#9b1c1c] border-[#9b1c1c]/20" },
} as const;

const label = "font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6B6B60]";

export function NoindexChecker() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState<NoindexReport | null>(null);

  async function run(url: string) {
    setLoading(true);
    setError("");
    setReport(null);
    try {
      const res = await fetch("/api/tools/noindex", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = (await res.json()) as { report?: NoindexReport; error?: string };
      if (!res.ok || !data.report) throw new Error(data.error ?? "Something went wrong.");
      setReport(data.report);
      track("tool_used", { tool: "noindex-checker" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  const v = report ? VERDICT[report.verdict] : null;

  return (
    <div className="space-y-6">
      <ToolUrlForm
        id="noindex-url"
        buttonLabel="Check page"
        buttonIcon={<ScanSearch className="size-4" aria-hidden />}
        loading={loading}
        onSubmit={(url) => void run(url)}
      />

      {error && <ToolError message={error} />}

      {report && v && (
        <>
          <div className="rounded-2xl border border-[#151515] bg-white p-6 shadow-[5px_5px_0_#151515]">
            <div className={`flex items-start gap-3 rounded-xl border px-4 py-3.5 ${v.tone}`}>
              <v.icon className="mt-0.5 size-5 shrink-0" aria-hidden />
              <div>
                <h2 className="text-[16px] font-semibold">{v.title}</h2>
                <p className="mt-0.5 text-[13.5px] leading-6">{v.body}</p>
              </div>
            </div>
            <p className="mt-3 truncate font-mono text-xs text-[#6B6B60]" title={report.finalUrl}>
              {report.finalUrl}
            </p>

            {report.reasons.length > 0 && (
              <ul className="mt-4 space-y-2">
                {report.reasons.map((r) => (
                  <li key={r} className="flex gap-2 text-[14px] leading-6 text-[#151515]">
                    <XCircle className="mt-1 size-4 shrink-0 text-[#9b1c1c]" aria-hidden />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            )}

            <dl className="mt-6 grid gap-x-6 gap-y-4 border-t border-black/10 pt-5 sm:grid-cols-2">
              <div>
                <dt className={label}>HTTP status</dt>
                <dd className="mt-1 text-[14px] text-[#151515]">
                  {report.httpStatus}
                  {report.redirectCount > 0 && (
                    <span className="text-[#6B6B60]">
                      {" "}after {report.redirectCount} redirect{report.redirectCount === 1 ? "" : "s"}
                    </span>
                  )}
                </dd>
              </div>
              <div>
                <dt className={label}>robots.txt (Googlebot)</dt>
                <dd className="mt-1 text-[14px] text-[#151515]">
                  {!report.robotsTxt.checked ? (
                    <span className="text-[#6B6B60]">Couldn&apos;t check</span>
                  ) : report.robotsTxt.blocked ? (
                    <span className="font-semibold text-[#9b1c1c]">Blocked</span>
                  ) : (
                    <span className="text-[#14632f]">Allowed</span>
                  )}
                  {report.robotsTxt.rule && (
                    <span className="ml-2 font-mono text-[12px] text-[#6B6B60]">{report.robotsTxt.rule}</span>
                  )}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className={label}>Robots meta tags and X-Robots-Tag headers</dt>
                <dd className="mt-2">
                  {report.sources.length === 0 ? (
                    <p className="text-[14px] text-[#6B6B60]">None found. Search engines default to index, follow.</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {report.sources.map((s, i) => (
                        <li key={i} className="flex flex-wrap items-baseline gap-x-2 text-[13.5px]">
                          <span className="rounded bg-[#F3F1E6] px-1.5 py-0.5 font-mono text-[11.5px] text-[#151515]">
                            {s.source === "meta" ? `meta ${s.agent}` : `X-Robots-Tag${s.agent === "*" ? "" : ` ${s.agent}`}`}
                          </span>
                          <span className={`font-mono ${s.blocksIndexing && s.appliesToGoogle ? "font-semibold text-[#9b1c1c]" : "text-[#151515]"}`}>
                            {s.value}
                          </span>
                          {!s.appliesToGoogle && <span className="text-[12px] text-[#6B6B60]">(not for Google)</span>}
                        </li>
                      ))}
                    </ul>
                  )}
                </dd>
              </div>
              {report.canonicalUrl && (
                <div className="sm:col-span-2">
                  <dt className={label}>Canonical</dt>
                  <dd className="mt-1 break-all font-mono text-[13px] text-[#151515]">{report.canonicalUrl}</dd>
                </div>
              )}
            </dl>

            {(report.robotsTxt.blocked || report.robotsTxt.note || report.canonicalPointsElsewhere) && (
              <div className="mt-5 space-y-2.5">
                {report.robotsTxt.blocked && (
                  <Note warn>
                    robots.txt stops Googlebot crawling this URL, so Google can&apos;t see any noindex on it - and may
                    still list the URL from links. To remove a page from Google, allow crawling and use noindex.
                  </Note>
                )}
                {report.robotsTxt.note && <Note>{report.robotsTxt.note}</Note>}
                {report.canonicalPointsElsewhere && (
                  <Note warn>
                    The canonical points to a different URL, so Google will usually index that one instead of this page.
                  </Note>
                )}
              </div>
            )}
          </div>

          <ToolCta
            heading="Get alerted the moment a page turns noindex."
            body="A stray noindex looks like nothing on the page and costs you all its search traffic. MyKavo checks robots meta on every monitored page each scan and treats index to noindex as a critical alert."
            tool="noindex-checker"
          />
        </>
      )}
    </div>
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
