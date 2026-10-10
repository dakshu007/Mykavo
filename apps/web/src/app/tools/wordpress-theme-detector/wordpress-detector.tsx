"use client";

import { useState } from "react";
import { ExternalLink, Info, Palette, Plug } from "lucide-react";
import { ToolUrlForm } from "@/components/tools/url-form";
import { ToolError } from "@/components/tools/tool-error";
import { ToolCta } from "@/components/tools/tool-cta";
import { track } from "@/lib/analytics";
import { safeHttpUrl, type WordPressReport } from "@/lib/tools/wordpress-detect";
import { EXTERNAL_LINK_REL } from "@/lib/outbound-links";

const label = "font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6B6B60]";

export function WordPressDetector() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState<WordPressReport | null>(null);

  async function run(url: string) {
    setLoading(true);
    setError("");
    setReport(null);
    try {
      const res = await fetch("/api/tools/wordpress-detect", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = (await res.json()) as { report?: WordPressReport; error?: string };
      if (!res.ok || !data.report) throw new Error(data.error ?? "Something went wrong.");
      setReport(data.report);
      track("tool_used", { tool: "wordpress-theme-detector" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  const main = report?.themes[0] ?? null;

  return (
    <div className="space-y-6">
      <ToolUrlForm
        id="wp-url"
        buttonLabel="Detect theme & plugins"
        buttonIcon={<Palette className="size-4" aria-hidden />}
        loading={loading}
        onSubmit={(url) => void run(url)}
      />

      {error && <ToolError message={error} />}

      {report && (
        <>
          <div className="rounded-2xl border border-[#151515] bg-white p-6 shadow-[5px_5px_0_#151515]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-[16px] font-semibold text-[#151515]">
                {report.isWordPress ? "This site runs WordPress" : "No WordPress detected"}
              </h2>
              {report.wordpressVersion && (
                <span className="rounded-full bg-[#151515] px-3 py-1 text-xs font-semibold text-[#FFD400]">
                  WordPress {report.wordpressVersion}
                </span>
              )}
            </div>
            <p className="mt-1 truncate font-mono text-xs text-[#6B6B60]" title={report.finalUrl}>{report.finalUrl}</p>
            {report.isWordPress ? (
              <p className="mt-2 text-[13px] text-[#6B6B60]">Found: {report.signals.join(", ")}.</p>
            ) : (
              <p className="mt-3 text-[14px] leading-6 text-[#3d3d38]">
                None of the usual WordPress signals (wp-content assets, wp-includes scripts, the generator tag or the
                REST API link) are in this page&apos;s HTML. The site may use another platform, or hide WordPress.
              </p>
            )}

            {report.isWordPress && (
              <>
                <section className="mt-6 border-t border-black/10 pt-5">
                  <p className={label}>Theme</p>
                  {!main ? (
                    <p className="mt-2 text-[14px] text-[#6B6B60]">No theme files are loaded on this page.</p>
                  ) : (
                    <div className="mt-3 space-y-3">
                      {report.themes.map((t, i) => {
                        const link = safeHttpUrl(t.header?.themeUri ?? null);
                        return (
                          <div key={t.slug} className={`rounded-xl border p-4 ${i === 0 ? "border-[#151515] bg-[#FFFBE0]" : "border-black/10 bg-[#FBFAF3]"}`}>
                            <div className="flex flex-wrap items-baseline justify-between gap-2">
                              <p className="text-[17px] font-semibold text-[#151515]">{t.header?.name ?? t.slug}</p>
                              {t.header?.version && <span className="font-mono text-[12px] text-[#6B6B60]">v{t.header.version}</span>}
                            </div>
                            <p className="mt-0.5 font-mono text-[12px] text-[#6B6B60]">folder: {t.slug}</p>
                            {t.header?.template && (
                              <p className="mt-2 text-[13px] text-[#3d3d38]">
                                Child theme of <span className="font-semibold">{t.header.template}</span>
                              </p>
                            )}
                            {t.header?.author && <p className="mt-1 text-[13px] text-[#3d3d38]">By {t.header.author}</p>}
                            {link && (
                              <a href={link} target="_blank" rel={EXTERNAL_LINK_REL} className="mt-2 inline-flex items-center gap-1 text-[13px] font-semibold text-[#151515] underline decoration-[#FFD400] decoration-2 underline-offset-4">
                                Theme website <ExternalLink className="size-3.5" aria-hidden />
                              </a>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>

                <section className="mt-6 border-t border-black/10 pt-5">
                  <p className={label}>
                    Plugins detected ({report.plugins.length})
                  </p>
                  {report.plugins.length === 0 ? (
                    <p className="mt-2 text-[14px] text-[#6B6B60]">No plugins load files on this page.</p>
                  ) : (
                    <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                      {report.plugins.map((p) => (
                        <li key={p.slug} className="flex items-start gap-2.5 rounded-xl border border-black/10 bg-[#FBFAF3] px-3.5 py-2.5">
                          <Plug className="mt-0.5 size-4 shrink-0 text-[#151515]" aria-hidden />
                          <div className="min-w-0">
                            <p className="text-[14px] font-semibold text-[#151515]">{p.name}</p>
                            <p className="truncate font-mono text-[11.5px] text-[#6B6B60]">{p.slug}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </>
            )}

            <div className="mt-6 flex items-start gap-2.5 rounded-xl border border-black/10 bg-[#F3F1E6] px-4 py-3">
              <Info className="mt-0.5 size-4 shrink-0 text-[#6B6B60]" aria-hidden />
              <p className="text-[13px] leading-6 text-[#3d3d38]">
                Only plugins that load files on this page, or announce themselves in it, can be seen from outside.
                Admin-only plugins (security, backups, most admin tools) never appear to any detector.
              </p>
            </div>
          </div>

          <ToolCta
            heading="Know which update broke your WordPress site."
            body="MyKavo's free WordPress plugin checks your key pages after every plugin, theme and core update, and names the update behind any change it finds."
            tool="wordpress-theme-detector"
          />
        </>
      )}
    </div>
  );
}
