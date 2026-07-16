"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Loader2 } from "lucide-react";

/**
 * Public status badge settings. Enabling mints an opaque token server-side
 * (the badge URL never contains the website id); disabling keeps the token so
 * re-enabling restores the same embed URL.
 */

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable (e.g. insecure context) - nothing to surface.
    }
  }

  return (
    <button
      onClick={copy}
      aria-label={`Copy ${label}`}
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
  );
}

function Snippet({ title, code }: { title: string; code: string }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <p className="label-micro">{title}</p>
        <CopyButton value={code} label={`${title} snippet`} />
      </div>
      <pre className="overflow-x-auto rounded-field border border-line bg-surface px-4 py-3 font-mono text-xs text-ink">
        {code}
      </pre>
    </div>
  );
}

export function StatusBadgeSettings({
  websiteId,
  siteUrl,
  badgeUrl,
  enabled,
}: {
  websiteId: string;
  siteUrl: string;
  /** Full public badge image URL, null until a token has been minted. */
  badgeUrl: string | null;
  enabled: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function toggle() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/websites/${websiteId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ badgeEnabled: !enabled }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      setError("Could not update the status badge. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const htmlSnippet = badgeUrl
    ? `<a href="${siteUrl}"><img src="${badgeUrl}" alt="Uptime status" /></a>`
    : null;
  const markdownSnippet = badgeUrl
    ? `[![Uptime status](${badgeUrl})](${siteUrl})`
    : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-secondary">
          Embed a live uptime badge in your README or site footer. The badge URL
          uses an anonymous token - it never reveals your site name or dashboard.
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
          {enabled ? "Disable badge" : "Enable badge"}
        </button>
      </div>

      {enabled && badgeUrl && htmlSnippet && markdownSnippet && (
        <div className="space-y-4">
          <div>
            <p className="label-micro mb-1.5">Preview</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={badgeUrl} alt="Uptime status badge preview" height={20} />
          </div>
          <Snippet title="HTML" code={htmlSnippet} />
          <Snippet title="Markdown" code={markdownSnippet} />
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
