"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, ExternalLink, Loader2, RefreshCw } from "lucide-react";

/**
 * White-label client report controls. The report has its OWN opaque token
 * (never the website id, never the status page token): enabling mints it,
 * disabling keeps it so re-enabling restores the same URL, and regenerating
 * rotates it - every previously shared link stops working immediately.
 */

export function ClientReportSettings({
  websiteId,
  reportUrl,
  enabled,
  brandingConfigured,
  isPro,
}: {
  websiteId: string;
  /** Full public report URL, null until a token has been minted. */
  reportUrl: string | null;
  enabled: boolean;
  brandingConfigured: boolean;
  isPro: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<"toggle" | "rotate" | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  async function patch(body: Record<string, boolean>, action: "toggle" | "rotate") {
    setBusy(action);
    setError("");
    try {
      const res = await fetch(`/api/websites/${websiteId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      setError("Could not update the client report. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  async function copy() {
    if (!reportUrl) return;
    try {
      await navigator.clipboard.writeText(reportUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable (e.g. insecure context) - nothing to surface.
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-secondary">
          Share a live monitoring report with your client - uptime, changes
          caught, SSL, and performance for the last 30 days, ready to save as
          a PDF.
        </p>
        <button
          onClick={() => patch({ reportEnabled: !enabled }, "toggle")}
          disabled={busy !== null}
          className={
            enabled
              ? "inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line bg-card px-4 py-2 text-[13px] font-medium text-ink-secondary transition-colors hover:text-ink disabled:opacity-60"
              : "inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-[13px] font-medium text-primary-contrast transition-colors hover:bg-primary-hover disabled:opacity-60"
          }
        >
          {busy === "toggle" && <Loader2 className="size-3.5 animate-spin" aria-hidden />}
          {enabled ? "Disable client report" : "Enable client report"}
        </button>
      </div>

      {enabled && reportUrl && (
        <div>
          <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
            <p className="label-micro">Share URL</p>
            <div className="flex items-center gap-2">
              <button
                onClick={copy}
                aria-label="Copy report URL"
                className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-line px-3 text-[12px] font-medium text-ink-secondary transition-colors hover:text-ink"
              >
                {copied ? (
                  <>
                    <Check className="size-3.5 text-success-strong" aria-hidden /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="size-3.5" aria-hidden /> Copy
                  </>
                )}
              </button>
              <a
                href={reportUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-line px-3 text-[12px] font-medium text-ink-secondary transition-colors hover:text-ink"
              >
                <ExternalLink className="size-3.5" aria-hidden /> Open
              </a>
              <button
                onClick={() => patch({ regenerateReportToken: true }, "rotate")}
                disabled={busy !== null}
                aria-label="Regenerate report URL"
                title="Mints a new URL - the old link stops working"
                className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-line px-3 text-[12px] font-medium text-ink-secondary transition-colors hover:text-ink disabled:opacity-60"
              >
                {busy === "rotate" ? (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                ) : (
                  <RefreshCw className="size-3.5" aria-hidden />
                )}
                Regenerate
              </button>
            </div>
          </div>
          <pre className="overflow-x-auto rounded-field border border-line bg-surface px-4 py-3 font-mono text-xs text-ink">
            {reportUrl}
          </pre>
          <p className="mt-2 text-[12px] text-ink-faint">
            {isPro
              ? brandingConfigured
                ? "Reports carry your agency branding - update it in Settings."
                : "Add your agency name, logo, and color in Settings to white-label this report."
              : "Free reports include MyKavo branding. Upgrade to Pro to white-label them with your agency's name, logo, and color."}
          </p>
        </div>
      )}

      {error && (
        <p className="text-sm text-critical-strong" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
