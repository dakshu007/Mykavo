"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, Gauge, Info } from "lucide-react";
import { ToolUrlForm } from "@/components/tools/url-form";
import { ToolError } from "@/components/tools/tool-error";
import { ToolCta } from "@/components/tools/tool-cta";
import { track } from "@/lib/analytics";
import { MAX_RESOURCES_MEASURED, formatBytes, type PageSizeReport, type ResourceType } from "@/lib/tools/page-size";

const label = "font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6B6B60]";
const th = "pb-2 pr-4 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6B6B60]";

const TYPE_LABEL: Record<ResourceType, string> = {
  script: "Scripts",
  stylesheet: "Stylesheets",
  image: "Images",
  font: "Fonts (preloaded)",
  iframe: "Iframes",
};

export function PageSizeChecker() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState<PageSizeReport | null>(null);

  async function run(url: string) {
    setLoading(true);
    setError("");
    setReport(null);
    try {
      const res = await fetch("/api/tools/page-size", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = (await res.json()) as { report?: PageSizeReport; error?: string };
      if (!res.ok || !data.report) throw new Error(data.error ?? "Something went wrong.");
      setReport(data.report);
      track("tool_used", { tool: "page-size-checker" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <ToolUrlForm
        id="page-size-url"
        buttonLabel="Measure page"
        buttonIcon={<Gauge className="size-4" aria-hidden />}
        loading={loading}
        onSubmit={(url) => void run(url)}
      />
      {loading && (
        <p className="text-center text-[13px] text-[#6B6B60]" role="status">
          Downloading the page and the files it references. This can take up to 20 seconds.
        </p>
      )}

      {error && <ToolError message={error} />}

      {report && (
        <>
          <div className="rounded-2xl border border-[#151515] bg-white p-6 shadow-[5px_5px_0_#151515]">
            <h2 className="text-[16px] font-semibold text-[#151515]">Page weight and requests</h2>
            <p className="mt-1 truncate font-mono text-xs text-[#6B6B60]" title={report.finalUrl}>
              {report.finalUrl}
            </p>

            <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
              <Stat name="Measured weight" value={formatBytes(report.knownBytes)} sub={report.unknown > 0 ? `${report.unknown} file${report.unknown === 1 ? "" : "s"} not measured` : "Uncompressed"} />
              <Stat name="HTML document" value={formatBytes(report.html.bytes)} sub={report.html.transferBytes !== null ? `${formatBytes(report.html.transferBytes)} sent (${report.html.encoding})` : "Uncompressed size"} />
              <Stat name="Requests in HTML" value={String(report.requests)} sub="Including the page itself" />
              <Stat name="Third-party" value={String(report.thirdPartyRequests)} sub={`${report.firstPartyRequests} first-party`} />
            </dl>

            <ul className="mt-6 space-y-2.5 border-t border-black/10 pt-5">
              {report.guidance.map((g) => (
                <li key={g.id} className="flex items-start gap-2.5">
                  {g.ok ? (
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#14632f]" aria-hidden />
                  ) : (
                    <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[#92600a]" aria-hidden />
                  )}
                  <p className="text-[13.5px] leading-6 text-[#3d3d38]">
                    <span className="font-semibold text-[#151515]">{g.label}.</span> {g.detail}
                  </p>
                </li>
              ))}
            </ul>

            {report.byType.length > 0 && (
              <div className="mt-6 overflow-x-auto border-t border-black/10 pt-5">
                <table className="w-full min-w-120 border-collapse text-left text-[13.5px]">
                  <caption className={`${label} mb-3 text-left`}>By type</caption>
                  <thead>
                    <tr>
                      <th className={th}>Type</th>
                      <th className={`${th} text-right`}>Files</th>
                      <th className={`${th} text-right`}>Third-party</th>
                      <th className={`${th} pr-0 text-right`}>Measured size</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.byType.map((t) => (
                      <tr key={t.type} className="border-t border-black/10">
                        <td className="py-2.5 pr-4 text-[#151515]">{TYPE_LABEL[t.type]}</td>
                        <td className="py-2.5 pr-4 text-right font-mono">{t.count}</td>
                        <td className="py-2.5 pr-4 text-right font-mono">{t.thirdParty}</td>
                        <td className="py-2.5 text-right font-mono">
                          {formatBytes(t.knownBytes)}
                          {t.unknown > 0 && <span className="text-[#6B6B60]"> + {t.unknown} unknown</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {report.heaviest.length > 0 && (
              <div className="mt-6 border-t border-black/10 pt-5">
                <h3 className={label}>Heaviest files</h3>
                <ol className="mt-3 space-y-2">
                  {report.heaviest.map((r) => (
                    <li key={r.url} className="flex items-baseline gap-3 text-[13px]">
                      <span className="w-20 shrink-0 text-right font-mono font-semibold text-[#151515]">
                        {formatBytes(r.bytes ?? 0)}
                      </span>
                      <span className="w-20 shrink-0 text-[12px] text-[#6B6B60]">{r.type}</span>
                      <span className="min-w-0 truncate font-mono text-[#3d3d38]" title={r.url}>
                        {r.url}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {report.resources.some((r) => r.bytes === null) && (
              <details className="mt-6 border-t border-black/10 pt-5">
                <summary className="cursor-pointer text-[13.5px] font-semibold text-[#151515] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD400]">
                  Files without a measured size ({report.unknown})
                </summary>
                <ul className="mt-3 space-y-1.5">
                  {report.resources
                    .filter((r) => r.bytes === null)
                    .map((r) => (
                      <li key={r.url} className="flex items-baseline gap-3 text-[13px]">
                        <span className="w-44 shrink-0 text-[12px] text-[#6B6B60]">{r.note}</span>
                        <span className="min-w-0 truncate font-mono text-[#3d3d38]" title={r.url}>
                          {r.url}
                        </span>
                      </li>
                    ))}
                </ul>
              </details>
            )}

            <div className="mt-6 flex items-start gap-2.5 rounded-xl border border-black/10 bg-[#F3F1E6] px-4 py-3">
              <Info className="mt-0.5 size-4 shrink-0 text-[#6B6B60]" aria-hidden />
              <p className="text-[13px] leading-6 text-[#3d3d38]">
                This reads the HTML, not a real browser. It counts files the HTML references directly; fonts and images
                loaded from CSS, and anything scripts load later, aren&apos;t included, so a browser usually makes more
                requests. Sizes are uncompressed; scripts and stylesheets are usually smaller on the wire.
                {report.capped && ` The free check downloads the first ${MAX_RESOURCES_MEASURED} files; the rest are counted but not measured.`}
              </p>
            </div>
          </div>

          <ToolCta
            heading="Catch the release that makes a page heavier."
            body="MyKavo loads each monitored page in a real browser every scan, records its page weight and request count, and flags a weight increase over 20% (high severity over 50%) or a request count increase over 25% against your approved baseline."
            tool="page-size-checker"
          />
        </>
      )}
    </div>
  );
}

function Stat({ name, value, sub }: { name: string; value: string; sub: string }) {
  return (
    <div>
      <dt className={label}>{name}</dt>
      <dd className="mt-1 text-[20px] font-semibold text-[#151515]">{value}</dd>
      <dd className="text-[12px] text-[#6B6B60]">{sub}</dd>
    </div>
  );
}
