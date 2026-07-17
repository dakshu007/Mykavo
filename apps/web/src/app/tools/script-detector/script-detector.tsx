"use client";

import { useState } from "react";
import { Braces, Info } from "lucide-react";
import { ToolUrlForm } from "@/components/tools/url-form";
import { ToolError } from "@/components/tools/tool-error";
import { ToolCta } from "@/components/tools/tool-cta";
import { track } from "@/lib/analytics";
import type { ScriptDetectionReport } from "@/lib/tools/snapshot";

export function ScriptDetector() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState<ScriptDetectionReport | null>(null);

  async function run(url: string) {
    setLoading(true);
    setError("");
    setReport(null);
    try {
      const res = await fetch("/api/tools/detect-scripts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = (await res.json()) as { report?: ScriptDetectionReport; error?: string };
      if (!res.ok || !data.report) throw new Error(data.error ?? "Something went wrong.");
      setReport(data.report);
      track("tool_used", { tool: "script-detector" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  const services = report
    ? [...new Set(report.scripts.map((s) => s.service).filter((s): s is string => s !== null))]
    : [];
  const thirdPartyCount = report?.scripts.filter((s) => s.isThirdParty).length ?? 0;

  return (
    <div className="space-y-6">
      <ToolUrlForm
        id="script-url"
        buttonLabel="Detect scripts"
        buttonIcon={<Braces className="size-4" aria-hidden />}
        loading={loading}
        onSubmit={(url) => void run(url)}
      />

      {error && <ToolError message={error} />}

      {report && (
        <>
          <div className="rounded-2xl border border-[#151515] bg-white p-6 shadow-[5px_5px_0_#151515]">
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-[15px] font-semibold text-[#151515]">
                {report.scripts.length} external script
                {report.scripts.length === 1 ? "" : "s"} found
              </h2>
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#6B6B60]">
                {thirdPartyCount} third-party
              </p>
            </div>
            <p className="mb-4 truncate font-mono text-xs text-[#6B6B60]">{report.finalUrl}</p>

            {services.length > 0 && (
              <div className="mb-5 flex flex-wrap gap-2">
                {services.map((service) => (
                  <span
                    key={service}
                    className="inline-flex items-center rounded-full bg-[#151515] px-3 py-1 text-xs font-semibold text-[#FFD400]"
                  >
                    {service}
                  </span>
                ))}
              </div>
            )}

            {report.scripts.length === 0 ? (
              <p className="text-sm text-[#6B6B60]">
                No external script files found in the page&apos;s HTML.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-130 table-fixed border-collapse text-left">
                  <thead>
                    <tr>
                      <th className="w-1/2 pb-2 pr-4 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6B6B60]">
                        Script URL
                      </th>
                      <th className="pb-2 pr-4 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6B6B60]">
                        Domain
                      </th>
                      <th className="w-36 pb-2 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6B6B60]">
                        Service
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.scripts.map((s) => (
                      <tr key={s.src} className="border-t border-black/10">
                        <td className="max-w-0 py-3 pr-4">
                          <p className="truncate font-mono text-[13px] text-[#151515]" title={s.src}>
                            {s.src}
                          </p>
                        </td>
                        <td className="max-w-0 py-3 pr-4">
                          <p className="truncate font-mono text-[13px] text-[#6B6B60]">
                            {s.domain}
                          </p>
                          {s.isThirdParty && (
                            <p className="mt-1">
                              <span className="inline-flex items-center rounded-full bg-[#fdf3e0] px-2 py-0.5 text-[11px] font-medium text-[#92600a]">
                                Third-party
                              </span>
                            </p>
                          )}
                        </td>
                        <td className="py-3 text-[13px] font-medium text-[#151515]">
                          {s.service ?? "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-black/10 bg-[#F3F1E6] px-4 py-3">
              <Info className="mt-0.5 size-4 shrink-0 text-[#6B6B60]" aria-hidden />
              <p className="text-[13px] leading-6 text-[#3d3d38]">
                Static HTML analysis - only scripts present in the delivered HTML are listed.
                Scripts injected at runtime (e.g. tags fired through Google Tag Manager) are not
                detected by this free tool.
              </p>
            </div>
          </div>

          <ToolCta
            heading="Get alerted when important scripts are added or removed."
            body="MyKavo tracks the scripts on every monitored page across scheduled scans - a vanished analytics tag, a missing payment script, or an unknown third-party addition triggers an email alert."
            tool="script-detector"
          />
        </>
      )}
    </div>
  );
}
