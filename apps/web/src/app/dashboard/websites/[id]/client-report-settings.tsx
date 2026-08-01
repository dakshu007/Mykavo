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
  initialRecipients,
  initialCadence,
  lastSentLabel,
}: {
  websiteId: string;
  /** Full public report URL, null until a token has been minted. */
  reportUrl: string | null;
  enabled: boolean;
  brandingConfigured: boolean;
  isPro: boolean;
  /** Configured client emails for scheduled delivery. */
  initialRecipients: string[];
  initialCadence: "OFF" | "WEEKLY" | "MONTHLY";
  /** Human "Jul 26, 2026" label of the last automatic send, null if never. */
  lastSentLabel: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<"toggle" | "rotate" | "delivery" | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [recipientsText, setRecipientsText] = useState(initialRecipients.join(", "));
  const [cadence, setCadence] = useState<"OFF" | "WEEKLY" | "MONTHLY">(initialCadence);
  const [deliverySaved, setDeliverySaved] = useState(false);

  async function saveDelivery() {
    const recipients = recipientsText
      .split(/[,\n;]+/)
      .map((r) => r.trim().toLowerCase())
      .filter(Boolean);
    if (recipients.length > 5) {
      setError("Up to 5 client emails per website.");
      return;
    }
    if (recipients.some((r) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r))) {
      setError("One of the emails doesn't look valid.");
      return;
    }
    if (cadence !== "OFF" && recipients.length === 0) {
      setError("Add at least one client email, or set delivery to Off.");
      return;
    }
    setBusy("delivery");
    setError("");
    setDeliverySaved(false);
    try {
      const res = await fetch(`/api/websites/${websiteId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reportRecipients: recipients, reportCadence: cadence }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not save delivery settings.");
      setDeliverySaved(true);
      router.refresh();
      setTimeout(() => setDeliverySaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save delivery settings.");
    } finally {
      setBusy(null);
    }
  }

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

          {isPro ? (
            <div className="mt-5 border-t border-line pt-4">
              <p className="text-sm font-medium text-ink">Email it to your client automatically</p>
              <p className="mt-1 text-[12px] text-ink-faint">
                MyKavo sends this report to your client on schedule - branded as
                your agency, with the live report link.
                {lastSentLabel && ` Last sent ${lastSentLabel}.`}
              </p>
              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start">
                <div className="min-w-0 flex-1">
                  <label htmlFor={`report-recipients-${websiteId}`} className="label-micro mb-1.5 block">
                    Client emails (up to 5, comma-separated)
                  </label>
                  <input
                    id={`report-recipients-${websiteId}`}
                    type="text"
                    value={recipientsText}
                    onChange={(e) => setRecipientsText(e.target.value)}
                    placeholder="client@company.com"
                    className="h-10 w-full rounded-field border border-line bg-card px-3.5 text-[14px] text-ink placeholder:text-ink-faint focus:border-primary focus:outline-none"
                  />
                </div>
                <div className="shrink-0">
                  <label htmlFor={`report-cadence-${websiteId}`} className="label-micro mb-1.5 block">
                    Frequency
                  </label>
                  <select
                    id={`report-cadence-${websiteId}`}
                    value={cadence}
                    onChange={(e) => setCadence(e.target.value as "OFF" | "WEEKLY" | "MONTHLY")}
                    className="h-10 rounded-field border border-line bg-card px-3 text-[14px] text-ink focus:border-primary focus:outline-none"
                  >
                    <option value="OFF">Off</option>
                    <option value="WEEKLY">Weekly</option>
                    <option value="MONTHLY">Monthly</option>
                  </select>
                </div>
                <button
                  onClick={saveDelivery}
                  disabled={busy !== null}
                  className="inline-flex h-10 shrink-0 items-center gap-1.5 self-end rounded-full bg-primary px-5 text-[13px] font-medium text-primary-contrast transition-colors hover:bg-primary-hover disabled:opacity-60"
                >
                  {busy === "delivery" && <Loader2 className="size-3.5 animate-spin" aria-hidden />}
                  {deliverySaved && <Check className="size-3.5" aria-hidden />}
                  {deliverySaved ? "Saved" : "Save delivery"}
                </button>
              </div>
            </div>
          ) : (
            <p className="mt-3 border-t border-line pt-3 text-[12px] text-ink-faint">
              Pro also emails this report to your clients automatically, weekly
              or monthly.
            </p>
          )}
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
