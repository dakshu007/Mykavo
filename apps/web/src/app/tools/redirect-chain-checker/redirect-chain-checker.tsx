"use client";

import { useState } from "react";
import { CornerDownRight, Route, TriangleAlert } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ToolUrlForm } from "@/components/tools/url-form";
import { ToolError } from "@/components/tools/tool-error";
import { ToolCta } from "@/components/tools/tool-cta";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import type { RedirectChainResult } from "@/lib/tools/redirect-chain";
import { redirectTypeLabel, statusLabel, type StatusTone } from "@/lib/tools/status-labels";

const TONE_CLASS: Record<StatusTone, string> = {
  success: "bg-success-soft text-success-strong",
  redirect: "bg-warning-soft text-warning-strong",
  clientError: "bg-critical-soft text-critical-strong",
  serverError: "bg-critical-soft text-critical-strong",
  info: "bg-info-soft text-info",
};

function StatusBadge({ status }: { status: number }) {
  const { text, tone } = statusLabel(status);
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-2.5 py-1 font-mono text-xs font-semibold",
        TONE_CLASS[tone],
      )}
    >
      {text}
    </span>
  );
}

function WarningBanner({ tone, children }: { tone: "warn" | "error"; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-tile px-4 py-3",
        tone === "error" ? "bg-critical-soft" : "bg-warning-soft",
      )}
      role="alert"
    >
      <TriangleAlert
        className={cn("mt-0.5 size-4 shrink-0", tone === "error" ? "text-critical" : "text-warning")}
        aria-hidden
      />
      <p className={cn("text-[13px] leading-6", tone === "error" ? "text-critical-strong" : "text-warning-strong")}>
        {children}
      </p>
    </div>
  );
}

export function RedirectChainChecker() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [chain, setChain] = useState<RedirectChainResult | null>(null);

  async function run(url: string) {
    setLoading(true);
    setError("");
    setChain(null);
    try {
      const res = await fetch("/api/tools/redirect-chain", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = (await res.json()) as { chain?: RedirectChainResult; error?: string };
      if (!res.ok || !data.chain) throw new Error(data.error ?? "Something went wrong.");
      setChain(data.chain);
      track("tool_used", { tool: "redirect-chain-checker" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <ToolUrlForm
        id="redirect-url"
        buttonLabel="Trace redirects"
        buttonIcon={<Route className="size-4" aria-hidden />}
        loading={loading}
        onSubmit={(url) => void run(url)}
      />

      {error && <ToolError message={error} />}

      {chain && (
        <>
          <Card>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-[15px] font-semibold text-ink">
                {chain.redirectCount === 0
                  ? "No redirects"
                  : `${chain.redirectCount} redirect${chain.redirectCount === 1 ? "" : "s"}`}
              </h2>
              <p className="text-[13px] text-ink-secondary">
                {chain.totalTimeMs} ms total
              </p>
            </div>

            <div className="space-y-3">
              {chain.loopDetected && (
                <WarningBanner tone="error">
                  Redirect loop detected — the chain routes back to{" "}
                  <span className="break-all font-mono text-xs">{chain.loopUrl}</span>. Browsers
                  will show an error instead of the page.
                </WarningBanner>
              )}
              {chain.exceededMaxHops && (
                <WarningBanner tone="error">
                  More than 10 redirects — we stopped following. Browsers give up on chains
                  this long too.
                </WarningBanner>
              )}
              {!chain.loopDetected && !chain.exceededMaxHops && chain.redirectCount > 2 && (
                <WarningBanner tone="warn">
                  {chain.redirectCount} hops is more than the recommended maximum of 2. Each hop
                  adds latency and dilutes SEO signals — point the first URL directly at the
                  final destination.
                </WarningBanner>
              )}
            </div>

            <ol className="mt-4 space-y-0">
              {chain.steps.map((step, i) => (
                <li key={`${step.url}-${i}`}>
                  {i > 0 && (
                    <div className="flex items-center gap-2 py-1 pl-1 text-ink-faint">
                      <CornerDownRight className="size-4" aria-hidden />
                      <span className="text-[11px] font-medium uppercase tracking-wide">
                        {redirectTypeLabel(chain.steps[i - 1].status)}
                      </span>
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-3 rounded-tile bg-surface px-4 py-3">
                    <span className="text-xs font-semibold text-ink-faint">{i + 1}</span>
                    <span className="min-w-0 flex-1 break-all font-mono text-[13px] text-ink">
                      {step.url}
                    </span>
                    <StatusBadge status={step.status} />
                  </div>
                </li>
              ))}
            </ol>

            {chain.completed && chain.finalStatus !== null && (
              <p className="mt-4 text-[13px] text-ink-secondary">
                Final destination responded with{" "}
                <span className="font-mono font-semibold text-ink">{chain.finalStatus}</span>
                {chain.redirectCount > 0 && (
                  <>
                    {" "}
                    after {chain.redirectCount} hop{chain.redirectCount === 1 ? "" : "s"}
                  </>
                )}
                .
              </p>
            )}
          </Card>

          <ToolCta
            heading="Get alerted when redirects unexpectedly change."
            body="MyKavo monitors the redirect behavior of every page you care about — new redirects, changed destinations, and broken chains trigger an email before your visitors notice."
            tool="redirect-chain-checker"
          />
        </>
      )}
    </div>
  );
}
