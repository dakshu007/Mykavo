"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, BarChart3, Info } from "lucide-react";
import { ToolUrlForm } from "@/components/tools/url-form";
import { ToolError } from "@/components/tools/tool-error";
import { ToolCta } from "@/components/tools/tool-cta";
import { track } from "@/lib/analytics";
import type { AnalyticsReport } from "@/lib/tools/analytics-tags";

const label = "font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6B6B60]";

export function AnalyticsChecker() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState<AnalyticsReport | null>(null);

  async function run(url: string) {
    setLoading(true);
    setError("");
    setReport(null);
    try {
      const res = await fetch("/api/tools/analytics-tags", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = (await res.json()) as { report?: AnalyticsReport; error?: string };
      if (!res.ok || !data.report) throw new Error(data.error ?? "Something went wrong.");
      setReport(data.report);
      track("tool_used", { tool: "analytics-tag-checker" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  const hasGa4 = report?.tags.some((t) => t.key === "ga4") ?? false;
  const hasGtm = report?.tags.some((t) => t.key === "gtm") ?? false;

  return (
    <div className="space-y-6">
      <ToolUrlForm
        id="analytics-url"
        buttonLabel="Check analytics tags"
        buttonIcon={<BarChart3 className="size-4" aria-hidden />}
        loading={loading}
        onSubmit={(url) => void run(url)}
      />

      {error && <ToolError message={error} />}

      {report && (
        <>
          <div className="rounded-2xl border border-[#151515] bg-white p-6 shadow-[5px_5px_0_#151515]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-[16px] font-semibold text-[#151515]">
                {report.tags.length === 0
                  ? "No analytics tags found in the HTML"
                  : `${report.tags.length} tag${report.tags.length === 1 ? "" : "s"} found`}
              </h2>
              <div className="flex flex-wrap gap-1.5">
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${hasGa4 ? "bg-[#151515] text-[#FFD400]" : "bg-[#F3F1E6] text-[#6B6B60]"}`}>
                  GA4 {hasGa4 ? "found" : "not in HTML"}
                </span>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${hasGtm ? "bg-[#151515] text-[#FFD400]" : "bg-[#F3F1E6] text-[#6B6B60]"}`}>
                  GTM {hasGtm ? "found" : "not in HTML"}
                </span>
              </div>
            </div>
            <p className="mt-1 truncate font-mono text-xs text-[#6B6B60]" title={report.finalUrl}>
              {report.finalUrl} · HTTP {report.httpStatus}
            </p>

            {report.tags.length > 0 && (
              <section className="mt-6 border-t border-black/10 pt-5">
                <p className={label}>Tags on this page</p>
                <ul className="mt-3 space-y-2.5">
                  {report.tags.map((t) => (
                    <li key={t.key} className="rounded-xl border border-black/10 bg-[#FBFAF3] px-4 py-3">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="text-[15px] font-semibold text-[#151515]">{t.name}</p>
                        <span className="font-mono text-[11px] uppercase tracking-wider text-[#6B6B60]">{t.category}</span>
                      </div>
                      {t.ids.length > 0 ? (
                        <ul className="mt-2 space-y-1">
                          {t.ids.map((id) => (
                            <li key={id.id} className="flex flex-wrap items-baseline gap-x-2 text-[13px]">
                              <span className="break-all font-mono font-semibold text-[#151515]">{id.id}</span>
                              <span className="text-[#6B6B60]">in {id.locations.join(", ")}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-1.5 text-[13px] text-[#6B6B60]">
                          Loaded via {t.locations.join(", ")}; no ID visible in the HTML.
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {report.warnings.length > 0 && (
              <section className="mt-6 border-t border-black/10 pt-5">
                <p className={label}>What to check</p>
                <ul className="mt-3 space-y-2">
                  {report.warnings.map((w) => (
                    <li
                      key={w.text}
                      className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 ${w.level === "warning" ? "border-[#b45309]/35 bg-[#FFF7E6]" : "border-black/10 bg-[#FBFAF3]"}`}
                    >
                      {w.level === "warning" ? (
                        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[#b45309]" aria-label="Warning" />
                      ) : (
                        <Info className="mt-0.5 size-4 shrink-0 text-[#6B6B60]" aria-label="Note" />
                      )}
                      <p className="text-[13.5px] leading-6 text-[#3d3d38]">{w.text}</p>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <div className="mt-6 flex items-start gap-2.5 rounded-xl border border-black/10 bg-[#F3F1E6] px-4 py-3">
              <Info className="mt-0.5 size-4 shrink-0 text-[#6B6B60]" aria-hidden />
              <p className="text-[13px] leading-6 text-[#3d3d38]">
                This reads the HTML the server delivers. Tags added at runtime, by GTM or a consent banner, won&apos;t
                show here. Data still not arriving in GA4? See{" "}
                <Link href="/blog/google-analytics-not-tracking" className="font-semibold text-[#151515] underline decoration-[#FFD400] decoration-2 underline-offset-4">
                  why Google Analytics stops tracking
                </Link>
                .
              </p>
            </div>
          </div>

          <ToolCta
            heading="Know the day your analytics tag disappears."
            body="MyKavo re-scans your key pages on a schedule and sends a high-severity alert when a known analytics or tag manager script stops loading."
            tool="analytics-tag-checker"
          />
        </>
      )}
    </div>
  );
}
