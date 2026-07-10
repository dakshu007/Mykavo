"use client";

import { useState } from "react";
import { CircleAlert, CircleCheck, CircleX, SearchCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ToolUrlForm } from "@/components/tools/url-form";
import { ToolError } from "@/components/tools/tool-error";
import { ToolCta } from "@/components/tools/tool-cta";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import {
  buildMetaChecklist,
  type CheckStatus,
  type MetaCheck,
  type MetaTagReport,
} from "@/lib/tools/meta-tags";

const STATUS_STYLE: Record<
  CheckStatus,
  { icon: typeof CircleCheck; className: string; label: string }
> = {
  pass: { icon: CircleCheck, className: "text-success", label: "Pass" },
  warn: { icon: CircleAlert, className: "text-warning", label: "Warning" },
  fail: { icon: CircleX, className: "text-critical", label: "Problem" },
};

function CheckRow({ check }: { check: MetaCheck }) {
  const style = STATUS_STYLE[check.status];
  const Icon = style.icon;
  return (
    <li className="flex gap-3 py-3.5">
      <Icon className={cn("mt-0.5 size-5 shrink-0", style.className)} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ink">
          {check.label}
          <span
            className={cn(
              "ml-2 text-xs font-medium",
              check.status === "pass"
                ? "text-green-700"
                : check.status === "warn"
                  ? "text-amber-700"
                  : "text-red-700",
            )}
          >
            {style.label}
          </span>
        </p>
        <p className="mt-0.5 text-[13px] leading-6 text-ink-secondary">{check.detail}</p>
        {check.value && (
          <p className="mt-1.5 break-words rounded-md bg-surface px-3 py-2 font-mono text-[13px] text-ink">
            {check.value}
          </p>
        )}
      </div>
    </li>
  );
}

export function MetaTagChecker() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState<MetaTagReport | null>(null);

  async function run(url: string) {
    setLoading(true);
    setError("");
    setReport(null);
    try {
      const res = await fetch("/api/tools/meta-tags", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = (await res.json()) as { report?: MetaTagReport; error?: string };
      if (!res.ok || !data.report) throw new Error(data.error ?? "Something went wrong.");
      setReport(data.report);
      track("tool_used", { tool: "meta-tag-checker" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  const checks = report ? buildMetaChecklist(report.tags) : null;
  const summary = checks
    ? {
        pass: checks.filter((c) => c.status === "pass").length,
        warn: checks.filter((c) => c.status === "warn").length,
        fail: checks.filter((c) => c.status === "fail").length,
      }
    : null;

  return (
    <div className="space-y-6">
      <ToolUrlForm
        id="meta-url"
        buttonLabel="Check meta tags"
        buttonIcon={<SearchCheck className="size-4" aria-hidden />}
        loading={loading}
        onSubmit={(url) => void run(url)}
      />

      {error && <ToolError message={error} />}

      {report && checks && summary && (
        <>
          <Card>
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-[15px] font-semibold text-ink">Meta tag checklist</h2>
              <p className="text-[13px] text-ink-secondary">
                <span className="font-semibold text-green-700">{summary.pass} passed</span>
                {" · "}
                <span className="font-semibold text-amber-700">{summary.warn} warnings</span>
                {" · "}
                <span className="font-semibold text-red-700">{summary.fail} problems</span>
              </p>
            </div>
            <p className="mb-4 truncate font-mono text-xs text-ink-faint">
              {report.finalUrl} — HTTP {report.httpStatus}
            </p>
            <ul className="divide-y divide-line">
              {checks.map((check) => (
                <CheckRow key={check.id} check={check} />
              ))}
            </ul>
          </Card>

          <ToolCta
            heading="Monitor these tags automatically — get alerted when they change."
            body="Fluxen re-checks titles, descriptions, canonicals, and robots meta on every page you monitor, on a schedule — and emails you when something important changes or disappears."
            tool="meta-tag-checker"
          />
        </>
      )}
    </div>
  );
}
