"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, CornerDownRight, HelpCircle, Link2Off, ScanSearch } from "lucide-react";
import { ToolUrlForm } from "@/components/tools/url-form";
import { ToolError } from "@/components/tools/tool-error";
import { ToolCta } from "@/components/tools/tool-cta";
import { track } from "@/lib/analytics";
import type { BrokenLinkReport, LinkCheckResult, LinkOutcome } from "@/lib/tools/broken-links";

const label = "font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6B6B60]";

const OUTCOME: Record<LinkOutcome, { title: string; icon: typeof CheckCircle2; badge: string }> = {
  broken: { title: "Broken", icon: Link2Off, badge: "bg-[#fdecec] text-[#9b1c1c] border-[#9b1c1c]/20" },
  unverified: { title: "Couldn't verify", icon: HelpCircle, badge: "bg-[#fdf3e0] text-[#92600a] border-[#92600a]/20" },
  redirect: { title: "Redirect", icon: CornerDownRight, badge: "bg-[#F3F1E6] text-[#3d3d38] border-black/10" },
  ok: { title: "OK", icon: CheckCircle2, badge: "bg-[#e7f6ec] text-[#14632f] border-[#14632f]/20" },
};

type Filter = "all" | LinkOutcome;

export function BrokenLinkChecker() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState<BrokenLinkReport | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  async function run(url: string) {
    setLoading(true);
    setError("");
    setReport(null);
    setFilter("all");
    try {
      const res = await fetch("/api/tools/broken-links", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = (await res.json()) as { report?: BrokenLinkReport; error?: string };
      if (!res.ok || !data.report) throw new Error(data.error ?? "Something went wrong.");
      setReport(data.report);
      track("tool_used", { tool: "broken-link-checker" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  const shown = report ? report.results.filter((r) => filter === "all" || r.outcome === filter) : [];

  return (
    <div className="space-y-6">
      <ToolUrlForm
        id="broken-links-url"
        buttonLabel="Check links"
        buttonIcon={<ScanSearch className="size-4" aria-hidden />}
        loading={loading}
        onSubmit={(url) => void run(url)}
      />
      {loading && (
        <p className="text-center text-[13px] text-[#6B6B60]" role="status">
          Checking every link on the page. This can take up to 20 seconds.
        </p>
      )}

      {error && <ToolError message={error} />}

      {report && (
        <>
          <div className="rounded-2xl border border-[#151515] bg-white p-6 shadow-[5px_5px_0_#151515]">
            <Summary report={report} />

            {report.capped && (
              <p className="mt-4 flex items-start gap-2 rounded-xl border border-black/10 bg-[#F3F1E6] px-4 py-3 text-[13px] leading-6 text-[#3d3d38]">
                <AlertTriangle className="mt-1 size-4 shrink-0 text-[#6B6B60]" aria-hidden />
                This page has {report.totalLinks} unique links. The free checker tests the first {report.checkedLinks} in
                page order.
              </p>
            )}

            {report.checkedLinks === 0 ? (
              <p className="mt-6 text-[14px] text-[#6B6B60]">
                We didn&apos;t find any http or https links in the page&apos;s HTML. If the links are added by JavaScript after
                the page loads, this checker can&apos;t see them.
              </p>
            ) : (
              <>
                <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label="Filter links">
                  {(["all", "broken", "unverified", "redirect", "ok"] as const).map((f) => {
                    const count = f === "all" ? report.checkedLinks : report.counts[f];
                    const active = filter === f;
                    return (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setFilter(f)}
                        aria-pressed={active}
                        disabled={count === 0 && f !== "all"}
                        className={`rounded-full border px-3 py-1.5 text-[12.5px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD400] disabled:opacity-40 ${
                          active ? "border-[#151515] bg-[#151515] text-white" : "border-black/15 bg-white text-[#151515] hover:border-[#151515]"
                        }`}
                      >
                        {f === "all" ? "All" : OUTCOME[f].title} ({count})
                      </button>
                    );
                  })}
                </div>

                <ul className="mt-4 divide-y divide-black/10 border-t border-black/10">
                  {shown.map((r) => (
                    <LinkRow key={r.url} result={r} />
                  ))}
                </ul>
              </>
            )}
          </div>

          <ToolCta
            heading="Find out when an internal link breaks, not months later."
            body="MyKavo checks the internal links on every page you monitor after each scan and raises one grouped change when links start returning 404, 410, a server error or stop resolving. Five or more at once is high severity and emailed by default."
            tool="broken-link-checker"
          />
        </>
      )}
    </div>
  );
}

function Summary({ report }: { report: BrokenLinkReport }) {
  const { broken, unverified } = report.counts;
  const tone =
    broken > 0
      ? "bg-[#fdecec] text-[#9b1c1c] border-[#9b1c1c]/20"
      : "bg-[#e7f6ec] text-[#14632f] border-[#14632f]/20";
  const Icon = broken > 0 ? Link2Off : CheckCircle2;
  return (
    <>
      <div className={`flex items-start gap-3 rounded-xl border px-4 py-3.5 ${tone}`}>
        <Icon className="mt-0.5 size-5 shrink-0" aria-hidden />
        <div>
          <h2 className="text-[16px] font-semibold">
            {broken > 0 ? `${broken} broken link${broken === 1 ? "" : "s"} found` : "No broken links found"}
          </h2>
          <p className="mt-0.5 text-[13.5px] leading-6">
            {report.checkedLinks} link{report.checkedLinks === 1 ? "" : "s"} checked
            {unverified > 0 ? `, ${unverified} we couldn't verify` : ""}.
          </p>
        </div>
      </div>
      <p className="mt-3 truncate font-mono text-xs text-[#6B6B60]" title={report.finalUrl}>
        {report.finalUrl}
      </p>
      <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-black/10 pt-5 sm:grid-cols-4">
        <Stat name="Broken" value={broken} />
        <Stat name="Couldn't verify" value={unverified} />
        <Stat name="Internal" value={report.internalCount} />
        <Stat name="External" value={report.externalCount} />
      </dl>
    </>
  );
}

function Stat({ name, value }: { name: string; value: number }) {
  return (
    <div>
      <dt className={label}>{name}</dt>
      <dd className="mt-1 text-[20px] font-semibold text-[#151515]">{value}</dd>
    </div>
  );
}

function LinkRow({ result }: { result: LinkCheckResult }) {
  const o = OUTCOME[result.outcome];
  return (
    <li className="flex flex-col gap-2 py-3.5 sm:flex-row sm:items-start sm:gap-4">
      <span
        className={`inline-flex w-fit shrink-0 items-center gap-1.5 rounded-md border px-2 py-1 text-[12px] font-semibold sm:w-36 ${o.badge}`}
      >
        <o.icon className="size-3.5" aria-hidden />
        {o.title}
        {result.status !== null && result.outcome !== "ok" && result.outcome !== "redirect" && (
          <span className="font-mono font-normal">{result.status}</span>
        )}
      </span>
      <div className="min-w-0 flex-1">
        <a
          href={result.url}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="block truncate font-mono text-[13px] text-[#151515] underline decoration-black/20 underline-offset-2 hover:decoration-[#151515]"
          title={result.url}
        >
          {result.url}
        </a>
        <p className="mt-0.5 text-[12.5px] leading-5 text-[#6B6B60]">
          {result.text ? <>&ldquo;{result.text}&rdquo;</> : <span className="italic">No anchor text</span>}
          {" · "}
          {result.internal ? "Internal" : "External"}
          {result.occurrences > 1 ? ` · linked ${result.occurrences} times` : ""}
        </p>
        {result.outcome !== "ok" && (
          <p className="mt-1 break-all text-[13px] leading-5 text-[#3d3d38]">{result.reason}</p>
        )}
      </div>
    </li>
  );
}
