"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, Copy, Loader2, RefreshCw } from "lucide-react";

/**
 * Post-deploy check controls (Pro). The secret hook URL is the credential:
 * enabling mints it, disabling keeps it (stable pipelines), regenerating
 * rotates it and revokes every pipeline configured with the old URL.
 */

export function DeployHookSettings({
  websiteId,
  hookUrl,
  enabled,
  isPro,
}: {
  websiteId: string;
  /** Full hook URL, null until a token has been minted. */
  hookUrl: string | null;
  enabled: boolean;
  isPro: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<"toggle" | "rotate" | null>(null);
  const [copied, setCopied] = useState<"url" | "curl" | null>(null);
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
      setError("Could not update deploy checks. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  async function copy(value: string, which: "url" | "curl") {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(which);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // Clipboard unavailable (e.g. insecure context) - nothing to surface.
    }
  }

  if (!isPro) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-ink-secondary">
          Ping a secret URL from CI or after WordPress updates - MyKavo scans
          immediately, compares against your approved baseline, and replies
          &quot;Deploy verified&quot; or lists exactly what changed.
        </p>
        <Link
          href="/dashboard/billing"
          className="inline-flex items-center rounded-full bg-primary px-4 py-2 text-[13px] font-medium text-primary-contrast transition-colors hover:bg-primary-hover"
        >
          Upgrade to Pro for deploy checks
        </Link>
      </div>
    );
  }

  const curlSnippet = hookUrl
    ? `curl -X POST ${hookUrl} -H 'content-type: application/json' -d '{"note":"v1.2.3"}'`
    : "";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-secondary">
          After every deploy or plugin update, hit this URL - MyKavo scans
          immediately, compares against the approved baseline, and sends a
          verdict to your alert channels. Clean deploys get a &quot;Deploy
          verified&quot; too.
        </p>
        <button
          onClick={() => patch({ deployHookEnabled: !enabled }, "toggle")}
          disabled={busy !== null}
          className={
            enabled
              ? "inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line bg-card px-4 py-2 text-[13px] font-medium text-ink-secondary transition-colors hover:text-ink disabled:opacity-60"
              : "inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-[13px] font-medium text-primary-contrast transition-colors hover:bg-primary-hover disabled:opacity-60"
          }
        >
          {busy === "toggle" && <Loader2 className="size-3.5 animate-spin" aria-hidden />}
          {enabled ? "Disable deploy checks" : "Enable deploy checks"}
        </button>
      </div>

      {enabled && hookUrl && (
        <>
          <div>
            <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
              <p className="label-micro">Deploy hook URL (secret)</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => copy(hookUrl, "url")}
                  aria-label="Copy deploy hook URL"
                  className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-line px-3 text-[12px] font-medium text-ink-secondary transition-colors hover:text-ink"
                >
                  {copied === "url" ? (
                    <>
                      <Check className="size-3.5 text-success-strong" aria-hidden /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="size-3.5" aria-hidden /> Copy
                    </>
                  )}
                </button>
                <button
                  onClick={() => patch({ regenerateDeployToken: true }, "rotate")}
                  disabled={busy !== null}
                  aria-label="Regenerate deploy hook URL"
                  title="Mints a new URL - pipelines using the old one stop working"
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
              {hookUrl}
            </pre>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <p className="label-micro">Example - CI step, deploy hook, or terminal</p>
              <button
                onClick={() => copy(curlSnippet, "curl")}
                aria-label="Copy curl example"
                className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-line px-3 text-[12px] font-medium text-ink-secondary transition-colors hover:text-ink"
              >
                {copied === "curl" ? (
                  <>
                    <Check className="size-3.5 text-success-strong" aria-hidden /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="size-3.5" aria-hidden /> Copy
                  </>
                )}
              </button>
            </div>
            <pre className="overflow-x-auto rounded-field border border-line bg-surface px-4 py-3 font-mono text-xs leading-5 text-ink">
              {curlSnippet}
            </pre>
            <p className="mt-2 text-[12px] text-ink-faint">
              Works anywhere that can send an HTTP request: a GitHub Actions
              step after deploy, a Netlify or Vercel deploy notification, or a
              WordPress webhook after plugin updates. The note is optional and
              appears in scan history and the verdict.
            </p>
          </div>
        </>
      )}

      {error && (
        <p className="text-sm text-critical-strong" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
