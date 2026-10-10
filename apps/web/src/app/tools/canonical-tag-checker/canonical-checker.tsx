"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, Info, Link2, XCircle } from "lucide-react";
import { ToolUrlForm } from "@/components/tools/url-form";
import { ToolError } from "@/components/tools/tool-error";
import { ToolCta } from "@/components/tools/tool-cta";
import { track } from "@/lib/analytics";
import type { CanonicalIssue, CanonicalReport, CanonicalTargetReport } from "@/lib/tools/canonical";

const GOOD = "bg-[#e7f6ec] text-[#14632f] border-[#14632f]/20";
const WARN = "bg-[#fdf3e0] text-[#92600a] border-[#92600a]/20";
const BAD = "bg-[#fdecec] text-[#9b1c1c] border-[#9b1c1c]/20";

const VERDICT = {
  self: {
    title: "Self-referencing canonical",
    body: "This page names itself as the canonical URL, which is what most pages should do.",
    icon: CheckCircle2,
    tone: GOOD,
  },
  other: {
    title: "Canonical points to a different URL",
    body: "This page asks Google to index another URL instead of this one. That is right for duplicates, and a problem if this page should rank.",
    icon: AlertTriangle,
    tone: WARN,
  },
  missing: {
    title: "No canonical found",
    body: "Neither the HTML nor the HTTP headers declare a usable canonical, so Google picks one itself.",
    icon: AlertTriangle,
    tone: WARN,
  },
  conflicting: {
    title: "Conflicting canonicals",
    body: "The page declares more than one canonical URL. When the signals disagree, Google may ignore all of them.",
    icon: XCircle,
    tone: BAD,
  },
} as const;

const ISSUE = {
  error: { icon: XCircle, color: "text-[#9b1c1c]" },
  warning: { icon: AlertTriangle, color: "text-[#92600a]" },
  info: { icon: Info, color: "text-[#6B6B60]" },
} as const;

const label = "font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6B6B60]";
const chip = "rounded bg-[#F3F1E6] px-1.5 py-0.5 font-mono text-[11.5px] text-[#151515]";

export function CanonicalChecker() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState<CanonicalReport | null>(null);

  async function run(url: string) {
    setLoading(true);
    setError("");
    setReport(null);
    try {
      const res = await fetch("/api/tools/canonical", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = (await res.json()) as { report?: CanonicalReport; error?: string };
      if (!res.ok || !data.report) throw new Error(data.error ?? "Something went wrong.");
      setReport(data.report);
      track("tool_used", { tool: "canonical-tag-checker" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  const v = report ? VERDICT[report.verdict] : null;
  const problems = report ? report.issues.filter((i) => i.level !== "info").length : 0;

  return (
    <div className="space-y-6">
      <ToolUrlForm
        id="canonical-url"
        buttonLabel="Check canonical"
        buttonIcon={<Link2 className="size-4" aria-hidden />}
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
                {problems > 0 && (
                  <p className="mt-1 text-[13px] font-semibold">
                    {problems} {problems === 1 ? "thing needs" : "things need"} a look below.
                  </p>
                )}
              </div>
            </div>
            <p className="mt-3 truncate font-mono text-xs text-[#6B6B60]" title={report.finalUrl}>
              {report.finalUrl}
            </p>

            {report.issues.length > 0 && <IssueList issues={report.issues} />}

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
                <dt className={label}>This page noindex</dt>
                <dd className="mt-1 text-[14px]">
                  {report.pageNoindex ? (
                    <span className="font-semibold text-[#9b1c1c]">Yes</span>
                  ) : (
                    <span className="text-[#14632f]">No</span>
                  )}
                </dd>
              </div>
              {report.canonical && (
                <div className="sm:col-span-2">
                  <dt className={label}>Canonical Google is most likely to use</dt>
                  <dd className="mt-1 break-all font-mono text-[13px] text-[#151515]">{report.canonical}</dd>
                </div>
              )}
              <div className="sm:col-span-2">
                <dt className={label}>Every canonical found</dt>
                <dd className="mt-2">
                  {report.declared.length === 0 ? (
                    <p className="text-[14px] text-[#6B6B60]">
                      None in the HTML &lt;head&gt; or the HTTP Link header.
                    </p>
                  ) : (
                    <ul className="space-y-2.5">
                      {report.declared.map((d, i) => (
                        <li key={i} className="text-[13.5px]">
                          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                            <span className={chip}>{d.source === "html" ? "HTML <link>" : "HTTP Link header"}</span>
                            <span className="break-all font-mono text-[#151515]">
                              {d.resolved ?? (d.href.trim() ? d.href : "(empty href)")}
                            </span>
                            {d.inBody && (
                              <span className="text-[12px] font-semibold text-[#9b1c1c]">in &lt;body&gt;, ignored</span>
                            )}
                            {!d.resolved && d.href.trim() !== "" && (
                              <span className="text-[12px] font-semibold text-[#9b1c1c]">not a valid URL</span>
                            )}
                          </div>
                          {d.relative && d.resolved && (
                            <p className="mt-0.5 break-all text-[12px] text-[#6B6B60]">
                              Written as <span className="font-mono">{d.href}</span>
                            </p>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </dd>
              </div>
            </dl>

            {report.target && <TargetDetails target={report.target} />}
          </div>

          <ToolCta
            heading="Get alerted when a canonical changes or disappears."
            body="A theme update or SEO plugin setting can rewrite canonicals across a whole site without anything looking different. MyKavo records the canonical on every monitored page each scan and raises a high-severity alert when it changes or is removed."
            tool="canonical-tag-checker"
          />
        </>
      )}
    </div>
  );
}

function IssueList({ issues }: { issues: CanonicalIssue[] }) {
  return (
    <ul className="mt-4 space-y-2">
      {issues.map((issue, i) => {
        const s = ISSUE[issue.level];
        return (
          <li key={i} className="flex gap-2 text-[14px] leading-6 text-[#151515]">
            <s.icon className={`mt-1 size-4 shrink-0 ${s.color}`} aria-hidden />
            <span>{issue.message}</span>
          </li>
        );
      })}
    </ul>
  );
}

function TargetDetails({ target }: { target: CanonicalTargetReport }) {
  const statusOk = target.status !== null && target.status >= 200 && target.status < 300;
  return (
    <div className="mt-6 border-t border-black/10 pt-5">
      <h3 className="text-[15px] font-semibold text-[#151515]">The canonical URL itself</h3>
      <p className="mt-1 break-all font-mono text-[12.5px] text-[#6B6B60]">{target.url}</p>
      {target.error ? (
        <p className="mt-3 text-[14px] text-[#6B6B60]">We couldn&apos;t check it: {target.error}</p>
      ) : (
        <dl className="mt-4 grid gap-x-6 gap-y-4 sm:grid-cols-2">
          <div>
            <dt className={label}>HTTP status</dt>
            <dd className={`mt-1 text-[14px] ${statusOk ? "text-[#14632f]" : "font-semibold text-[#9b1c1c]"}`}>
              {target.status}
            </dd>
          </div>
          <div>
            <dt className={label}>Redirects</dt>
            <dd className="mt-1 text-[14px]">
              {target.redirectCount === 0 ? (
                <span className="text-[#14632f]">None</span>
              ) : (
                <span className="font-semibold text-[#9b1c1c]">
                  {target.redirectCount} redirect{target.redirectCount === 1 ? "" : "s"}
                </span>
              )}
            </dd>
          </div>
          {target.redirectCount > 0 && target.finalUrl && (
            <div className="sm:col-span-2">
              <dt className={label}>Ends up at</dt>
              <dd className="mt-1 break-all font-mono text-[13px] text-[#151515]">{target.finalUrl}</dd>
            </div>
          )}
          <div>
            <dt className={label}>Noindex</dt>
            <dd className="mt-1 text-[14px]">
              {target.noindex ? (
                <span className="font-semibold text-[#9b1c1c]">Yes</span>
              ) : (
                <span className="text-[#14632f]">No</span>
              )}
            </dd>
          </div>
          <div>
            <dt className={label}>Its own canonical</dt>
            <dd className="mt-1 text-[14px]">
              {target.canonicalState === "self" ? (
                <span className="text-[#14632f]">Names itself</span>
              ) : target.canonicalState === "missing" ? (
                <span className="text-[#6B6B60]">None declared</span>
              ) : target.canonicalState === "elsewhere" ? (
                <span className="font-semibold text-[#9b1c1c]">Points somewhere else</span>
              ) : (
                <span className="text-[#6B6B60]">Unknown</span>
              )}
            </dd>
          </div>
          {target.canonicalState === "elsewhere" && target.canonical && (
            <div className="sm:col-span-2">
              <dt className={label}>Which is</dt>
              <dd className="mt-1 break-all font-mono text-[13px] text-[#151515]">{target.canonical}</dd>
            </div>
          )}
        </dl>
      )}
    </div>
  );
}
