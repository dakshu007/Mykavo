"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, ExternalLink, Loader2 } from "lucide-react";

/**
 * Public status page settings. Shares the badge's opaque publicToken —
 * enabling mints it server-side if absent (the URL never contains the
 * website id); disabling keeps the token so re-enabling restores the same
 * public URL.
 */

export function StatusPageSettings({
  websiteId,
  statusPageUrl,
  enabled,
}: {
  websiteId: string;
  /** Full public status page URL, null until a token has been minted. */
  statusPageUrl: string | null;
  enabled: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  async function toggle() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/websites/${websiteId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ statusPageEnabled: !enabled }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      setError("Could not update the status page. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!statusPageUrl) return;
    try {
      await navigator.clipboard.writeText(statusPageUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable (e.g. insecure context) — nothing to surface.
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-secondary">
          Share a live status page with your clients — current status, 90-day
          uptime history, and incidents at an anonymous public URL.
        </p>
        <button
          onClick={toggle}
          disabled={busy}
          className={
            enabled
              ? "inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line bg-card px-4 py-2 text-[13px] font-medium text-ink-secondary transition-colors hover:text-ink disabled:opacity-60"
              : "inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-[13px] font-medium text-primary-contrast transition-colors hover:bg-primary-hover disabled:opacity-60"
          }
        >
          {busy && <Loader2 className="size-3.5 animate-spin" aria-hidden />}
          {enabled ? "Disable status page" : "Enable status page"}
        </button>
      </div>

      {enabled && statusPageUrl && (
        <div>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <p className="label-micro">Public URL</p>
            <div className="flex items-center gap-2">
              <button
                onClick={copy}
                aria-label="Copy status page URL"
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
                href={statusPageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-line px-3 text-[12px] font-medium text-ink-secondary transition-colors hover:text-ink"
              >
                <ExternalLink className="size-3.5" aria-hidden /> Open
              </a>
            </div>
          </div>
          <pre className="overflow-x-auto rounded-field border border-line bg-surface px-4 py-3 font-mono text-xs text-ink">
            {statusPageUrl}
          </pre>
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
