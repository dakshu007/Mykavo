"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, Lock, XCircle } from "lucide-react";
import { ToolUrlForm } from "@/components/tools/url-form";
import { ToolError } from "@/components/tools/tool-error";
import { ToolCta } from "@/components/tools/tool-cta";
import { track } from "@/lib/analytics";
import type { SslReport } from "@/lib/tools/ssl-certificate";

const label = "font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6B6B60]";

const STATUS = {
  ok: { tone: "border-[#14632f]/20 bg-[#e7f6ec] text-[#14632f]", icon: CheckCircle2 },
  warning: { tone: "border-[#92600a]/20 bg-[#fdf3e0] text-[#92600a]", icon: AlertTriangle },
  critical: { tone: "border-[#9b1c1c]/20 bg-[#fdecec] text-[#9b1c1c]", icon: XCircle },
  expired: { tone: "border-[#9b1c1c]/20 bg-[#fdecec] text-[#9b1c1c]", icon: XCircle },
} as const;

const dateFmt = new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });

export function SslChecker() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState<SslReport | null>(null);

  async function run(url: string) {
    setLoading(true);
    setError("");
    setReport(null);
    try {
      const res = await fetch("/api/tools/ssl-certificate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = (await res.json()) as { report?: SslReport; error?: string };
      if (!res.ok || !data.report) throw new Error(data.error ?? "Something went wrong.");
      setReport(data.report);
      track("tool_used", { tool: "ssl-certificate-checker" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  const c = report?.certificate;
  const s = c ? STATUS[c.status] : null;
  const headline = !c
    ? ""
    : c.status === "expired"
      ? `Expired ${Math.abs(c.daysLeft)} day${Math.abs(c.daysLeft) === 1 ? "" : "s"} ago`
      : `Expires in ${c.daysLeft} day${c.daysLeft === 1 ? "" : "s"}`;

  return (
    <div className="space-y-6">
      <ToolUrlForm
        id="ssl-url"
        label="Domain"
        placeholder="example.com"
        buttonLabel="Check certificate"
        buttonIcon={<Lock className="size-4" aria-hidden />}
        loading={loading}
        onSubmit={(url) => void run(url)}
      />

      {error && <ToolError message={error} />}

      {report && c && s && (
        <>
          <div className="rounded-2xl border border-[#151515] bg-white p-6 shadow-[5px_5px_0_#151515]">
            <div className={`flex items-start gap-3 rounded-xl border px-4 py-3.5 ${s.tone}`}>
              <s.icon className="mt-0.5 size-5 shrink-0" aria-hidden />
              <div>
                <h2 className="text-[16px] font-semibold">{headline}</h2>
                <p className="mt-0.5 text-[13.5px] leading-6">
                  Valid until {dateFmt.format(new Date(c.validTo))} (UTC) for {report.hostname}
                </p>
              </div>
            </div>

            {(!report.trusted || !c.coversHostname) && (
              <div className="mt-3 space-y-2">
                {report.trustErrorText && (
                  <Problem>{report.trustErrorText}</Problem>
                )}
                {!c.coversHostname && report.trustError !== "ERR_TLS_CERT_ALTNAME_INVALID" && (
                  <Problem>The certificate doesn&apos;t list {report.hostname}, so browsers will show a warning on it.</Problem>
                )}
              </div>
            )}

            <dl className="mt-6 grid gap-x-6 gap-y-4 border-t border-black/10 pt-5 sm:grid-cols-2">
              <Item term="Trusted by browsers">{report.trusted ? "Yes, the chain verifies" : "No"}</Item>
              <Item term="Issued by">{c.issuer ?? "Unknown"}</Item>
              <Item term="Valid from">{dateFmt.format(new Date(c.validFrom))}</Item>
              <Item term="Certificate lifetime">{c.lifetimeDays} days</Item>
              <Item term="Protocol">{report.protocol ?? "Unknown"}</Item>
              <Item term="Server IP">{report.ip}</Item>
              <div className="sm:col-span-2">
                <dt className={label}>Covers ({c.names.length || 1})</dt>
                <dd className="mt-2 flex flex-wrap gap-1.5">
                  {(c.names.length ? c.names : [c.subject ?? report.hostname]).map((n) => (
                    <span key={n} className="rounded bg-[#F3F1E6] px-1.5 py-0.5 font-mono text-[12px] text-[#151515]">{n}</span>
                  ))}
                </dd>
              </div>
              {report.chain.length > 0 && (
                <div className="sm:col-span-2">
                  <dt className={label}>Chain</dt>
                  <dd className="mt-1 text-[13.5px] text-[#151515]">{[c.subject ?? report.hostname, ...report.chain].join("  →  ")}</dd>
                </div>
              )}
            </dl>
          </div>

          <ToolCta
            heading="Never find out from a browser warning."
            body="MyKavo checks the certificate of every website you monitor, on every plan including Free, and alerts you by email or Slack when it's within 14 days of expiring."
            tool="ssl-certificate-checker"
          />
        </>
      )}
    </div>
  );
}

function Item({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className={label}>{term}</dt>
      <dd className="mt-1 text-[14px] text-[#151515]">{children}</dd>
    </div>
  );
}

function Problem({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-[#9b1c1c]/20 bg-[#fdecec] px-4 py-3">
      <XCircle className="mt-0.5 size-4 shrink-0 text-[#9b1c1c]" aria-hidden />
      <p className="text-[13px] leading-6 text-[#3d3d38]">{children}</p>
    </div>
  );
}
