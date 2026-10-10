"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, ExternalLink, Info, Braces, XCircle } from "lucide-react";
import { ToolUrlForm } from "@/components/tools/url-form";
import { ToolError } from "@/components/tools/tool-error";
import { ToolCta } from "@/components/tools/tool-cta";
import { track } from "@/lib/analytics";
import { richResultsTestUrl, type EntityStatus, type SchemaEntity, type StructuredDataReport } from "@/lib/tools/structured-data";

const label = "font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6B6B60]";

const STATUS: Record<EntityStatus, { text: string; tone: string; icon: typeof CheckCircle2 }> = {
  ok: { text: "Looks complete", tone: "border-[#14632f]/20 bg-[#e7f6ec] text-[#14632f]", icon: CheckCircle2 },
  warning: { text: "Missing recommended", tone: "border-[#92600a]/20 bg-[#fdf3e0] text-[#92600a]", icon: AlertTriangle },
  error: { text: "Missing required", tone: "border-[#9b1c1c]/20 bg-[#fdecec] text-[#9b1c1c]", icon: XCircle },
};

export function StructuredDataChecker() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState<StructuredDataReport | null>(null);

  async function run(url: string) {
    setLoading(true);
    setError("");
    setReport(null);
    try {
      const res = await fetch("/api/tools/structured-data", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = (await res.json()) as { report?: StructuredDataReport; error?: string };
      if (!res.ok || !data.report) throw new Error(data.error ?? "Something went wrong.");
      setReport(data.report);
      track("tool_used", { tool: "structured-data-checker" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  const nothing =
    report !== null && report.jsonLd.totalBlocks === 0 && report.microdata.count === 0 && report.rdfa.count === 0;

  return (
    <div className="space-y-6">
      <ToolUrlForm
        id="structured-data-url"
        buttonLabel="Check schema"
        buttonIcon={<Braces className="size-4" aria-hidden />}
        loading={loading}
        onSubmit={(url) => void run(url)}
      />

      {error && <ToolError message={error} />}

      {report && (
        <>
          <div className="rounded-2xl border border-[#151515] bg-white p-6 shadow-[5px_5px_0_#151515]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-[16px] font-semibold text-[#151515]">
                  {nothing ? "No structured data found" : "Structured data on this page"}
                </h2>
                <p className="mt-1 truncate font-mono text-xs text-[#6B6B60]" title={report.finalUrl}>
                  {report.finalUrl}
                  {report.httpStatus !== 200 && <span className="ml-2 text-[#9b1c1c]">HTTP {report.httpStatus}</span>}
                </p>
              </div>
              <a
                href={richResultsTestUrl(report.finalUrl)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#151515] px-3.5 py-1.5 text-[13px] font-semibold text-[#151515] hover:bg-[#FFF3B0]"
              >
                Google Rich Results Test
                <ExternalLink className="size-3.5" aria-hidden />
              </a>
            </div>

            <ul className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Stat name="JSON-LD blocks" value={report.jsonLd.totalBlocks} />
              <Stat name="JSON-LD entities" value={report.jsonLd.totalEntities} />
              <Stat name="Microdata items" value={report.microdata.count} />
              <Stat name="RDFa items" value={report.rdfa.count} />
            </ul>

            <div className="mt-5">
              <Note>
                Checks cover the common required and recommended properties for popular types. This is not Google&apos;s full
                validator, which also checks values, nesting and eligibility. Use the Rich Results Test link above for that.
              </Note>
            </div>

            {nothing && (
              <p className="mt-5 text-[14px] leading-6 text-[#3d3d38]">
                We found no JSON-LD, microdata or RDFa in the HTML this page returns. If your site adds schema with
                JavaScript after the page loads, this check won&apos;t see it; the Rich Results Test renders JavaScript and will.
              </p>
            )}

            {report.jsonLd.blocks.some((b) => !b.valid) && (
              <div className="mt-6 space-y-3 border-t border-black/10 pt-5">
                <h3 className={label}>Invalid JSON-LD blocks</h3>
                {report.jsonLd.blocks
                  .filter((b) => !b.valid)
                  .map((b) => (
                    <div key={b.index} className="rounded-xl border border-[#9b1c1c]/20 bg-[#fdecec] p-4">
                      <p className="flex items-start gap-2 text-[13.5px] leading-6 text-[#9b1c1c]">
                        <XCircle className="mt-1 size-4 shrink-0" aria-hidden />
                        <span>
                          Block {b.index + 1} is not valid JSON, so search engines ignore all of it: {b.error}
                        </span>
                      </p>
                      {b.preview && (
                        <pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-white p-3 font-mono text-[11.5px] leading-5 text-[#151515]">
                          {b.preview}
                          {b.truncated && "\n..."}
                        </pre>
                      )}
                    </div>
                  ))}
              </div>
            )}

            {report.jsonLd.entities.length > 0 && (
              <div className="mt-6 space-y-4 border-t border-black/10 pt-5">
                <h3 className={label}>JSON-LD entities</h3>
                {report.jsonLd.entities.map((e, i) => (
                  <EntityCard key={i} entity={e} />
                ))}
                {report.jsonLd.totalEntities > report.jsonLd.entities.length && (
                  <p className="text-[12.5px] text-[#6B6B60]">
                    Showing the first {report.jsonLd.entities.length} of {report.jsonLd.totalEntities} entities.
                  </p>
                )}
              </div>
            )}

            {(report.microdata.count > 0 || report.rdfa.count > 0) && (
              <dl className="mt-6 grid gap-x-6 gap-y-4 border-t border-black/10 pt-5 sm:grid-cols-2">
                <div>
                  <dt className={label}>Microdata (itemscope)</dt>
                  <dd className="mt-2">
                    <TypeList types={report.microdata.types} count={report.microdata.count} />
                  </dd>
                </div>
                <div>
                  <dt className={label}>RDFa (typeof)</dt>
                  <dd className="mt-2">
                    <TypeList types={report.rdfa.types} count={report.rdfa.count} />
                    {report.rdfa.vocabs.length > 0 && (
                      <p className="mt-1.5 break-all font-mono text-[11.5px] text-[#6B6B60]">vocab: {report.rdfa.vocabs.join(", ")}</p>
                    )}
                  </dd>
                </div>
              </dl>
            )}
            {(report.microdata.count > 0 || report.rdfa.count > 0) && (
              <p className="mt-3 text-[12.5px] leading-5 text-[#6B6B60]">
                Microdata and RDFa are detected and counted only; their properties are not checked here.
              </p>
            )}
          </div>

          <ToolCta
            heading="Schema breaks quietly. Keep an eye on the pages that matter."
            body="MyKavo scans your important pages on a schedule, records a fingerprint of their structured data with every scan, and alerts you when titles, canonicals, robots tags or H1s change."
            tool="structured-data-checker"
          />
        </>
      )}
    </div>
  );
}

function EntityCard({ entity: e }: { entity: SchemaEntity }) {
  const checked = e.checkedAs.length > 0 || e.issues.some((i) => i.level !== "info");
  const s = checked
    ? STATUS[e.status]
    : { text: "No checks for this type", tone: "border-black/10 bg-white text-[#6B6B60]", icon: Info };
  return (
    <div className="rounded-xl border border-black/10 bg-[#FBFAF3] p-4">
      <div className="flex flex-wrap items-center gap-2">
        {e.types.length > 0 ? (
          e.types.map((t) => (
            <span key={t} className="rounded bg-[#151515] px-2 py-0.5 font-mono text-[12px] font-semibold text-[#F5F5F0]">
              {t}
            </span>
          ))
        ) : (
          <span className="rounded bg-[#fdecec] px-2 py-0.5 font-mono text-[12px] font-semibold text-[#9b1c1c]">no @type</span>
        )}
        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11.5px] font-semibold ${s.tone}`}>
          <s.icon className="size-3.5" aria-hidden />
          {s.text}
        </span>
        {e.fromGraph && <span className="text-[11.5px] text-[#6B6B60]">in @graph</span>}
      </div>
      {e.id && <p className="mt-1.5 break-all font-mono text-[11.5px] text-[#6B6B60]">@id {e.id}</p>}

      {e.issues.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {e.issues.map((i) => (
            <li key={i.message} className="flex gap-2 text-[13px] leading-5 text-[#3d3d38]">
              {i.level === "error" ? (
                <XCircle className="mt-0.5 size-4 shrink-0 text-[#9b1c1c]" aria-hidden />
              ) : i.level === "warning" ? (
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[#92600a]" aria-hidden />
              ) : (
                <Info className="mt-0.5 size-4 shrink-0 text-[#6B6B60]" aria-hidden />
              )}
              <span>{i.message}</span>
            </li>
          ))}
        </ul>
      )}

      {e.checks.length > 0 && (
        <ul className="mt-3 space-y-1" aria-label={`Property checks for ${e.checkedAs.join(", ")}`}>
          {e.checks.map((c) => (
            <li key={c.property} className="flex flex-wrap items-baseline gap-x-2 text-[13px]">
              {c.ok ? (
                <CheckCircle2 className="size-3.5 shrink-0 translate-y-0.5 text-[#14632f]" aria-label="present" />
              ) : c.level === "required" ? (
                <XCircle className="size-3.5 shrink-0 translate-y-0.5 text-[#9b1c1c]" aria-label="missing" />
              ) : (
                <AlertTriangle className="size-3.5 shrink-0 translate-y-0.5 text-[#92600a]" aria-label="missing" />
              )}
              <span className="font-mono text-[12.5px] text-[#151515]">{c.property}</span>
              <span className="text-[11.5px] text-[#6B6B60]">{c.level}</span>
              {c.detail && <span className="basis-full pl-5.5 text-[12.5px] text-[#3d3d38]">{c.detail}</span>}
            </li>
          ))}
        </ul>
      )}

      {e.properties.length > 0 && (
        <dl className="mt-3 grid gap-x-4 gap-y-1 border-t border-black/10 pt-3 text-[12.5px] sm:grid-cols-[minmax(0,10rem)_minmax(0,1fr)]">
          {e.properties.map((p) => (
            <div key={p.key} className="contents">
              <dt className="truncate font-mono text-[#6B6B60]">{p.key}</dt>
              <dd className="mb-1 break-words text-[#151515] sm:mb-0">{p.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {e.propertyCount > e.properties.length && (
        <p className="mt-1 text-[12.5px] text-[#6B6B60]">and {e.propertyCount - e.properties.length} more properties</p>
      )}
    </div>
  );
}

function TypeList({ types, count }: { types: StructuredDataReport["microdata"]["types"]; count: number }) {
  if (count === 0) return <p className="text-[14px] text-[#6B6B60]">None found.</p>;
  if (types.length === 0) return <p className="text-[14px] text-[#151515]">{count} item(s) with no declared type.</p>;
  return (
    <ul className="flex flex-wrap gap-1.5">
      {types.map((t) => (
        <li key={t.type} className="rounded bg-[#F3F1E6] px-1.5 py-0.5 font-mono text-[12px] text-[#151515]">
          {t.type}
          {t.count > 1 && <span className="text-[#6B6B60]"> x{t.count}</span>}
        </li>
      ))}
    </ul>
  );
}

function Stat({ name, value }: { name: string; value: number }) {
  return (
    <li className="rounded-xl border border-black/10 bg-[#FBFAF3] px-3 py-2.5">
      <span className="block text-[11.5px] text-[#6B6B60]">{name}</span>
      <span className="block text-xl font-semibold tabular-nums text-[#151515]">{value}</span>
    </li>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-black/10 bg-[#F3F1E6] px-4 py-3">
      <Info className="mt-0.5 size-4 shrink-0 text-[#6B6B60]" aria-hidden />
      <p className="text-[13px] leading-6 text-[#3d3d38]">{children}</p>
    </div>
  );
}
