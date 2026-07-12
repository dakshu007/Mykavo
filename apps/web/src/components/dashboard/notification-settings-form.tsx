"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import type { EmailSettings } from "@/lib/notification-settings";
import { cn } from "@/lib/utils";

const SEVERITIES = [
  { value: "MEDIUM", label: "Medium and above", hint: "More alerts" },
  { value: "HIGH", label: "High and above", hint: "Recommended" },
  { value: "CRITICAL", label: "Critical only", hint: "Fewest alerts" },
] as const;

export function NotificationSettingsForm({ initial }: { initial: EmailSettings }) {
  const router = useRouter();
  const [recipients, setRecipients] = useState(initial.recipients.join(", "));
  const [minSeverity, setMinSeverity] = useState<EmailSettings["minSeverity"]>(initial.minSeverity);
  const [failureAlerts, setFailureAlerts] = useState(initial.failureAlerts);
  const [weeklyReports, setWeeklyReports] = useState(initial.weeklyReports);
  const [enabled, setEnabled] = useState(initial.enabled);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState("");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (status === "saving") return;
    setStatus("saving");
    setError("");
    const list = recipients
      .split(/[,\n]/)
      .map((s) => s.trim())
      .filter(Boolean);
    try {
      const res = await fetch("/api/notifications/settings", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ recipients: list, minSeverity, failureAlerts, weeklyReports, enabled }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not save settings.");
      setStatus("saved");
      router.refresh();
      setTimeout(() => setStatus("idle"), 2000);
    } catch (err) {
      setStatus("idle");
      setError(err instanceof Error ? err.message : "Could not save settings.");
    }
  }

  return (
    <form onSubmit={save} className="space-y-6">
      <label className="flex items-center justify-between gap-4">
        <span>
          <span className="block text-sm font-medium text-ink">Email alerts</span>
          <span className="block text-[13px] text-ink-secondary">
            Send a grouped summary email when important changes are detected.
          </span>
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={() => setEnabled((v) => !v)}
          className={cn(
            "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
            enabled ? "bg-primary" : "bg-line",
          )}
        >
          <span
            className={cn(
              "inline-block size-5 rounded-full bg-white transition-transform",
              enabled ? "translate-x-5" : "translate-x-0.5",
            )}
          />
        </button>
      </label>

      <div>
        <label htmlFor="recipients" className="mb-1.5 block text-sm font-medium text-ink">
          Recipient emails
        </label>
        <textarea
          id="recipients"
          rows={2}
          value={recipients}
          onChange={(e) => setRecipients(e.target.value)}
          placeholder="you@agency.com, teammate@agency.com"
          className="w-full rounded-field border border-line bg-card px-4 py-3 text-[15px] text-ink placeholder:text-ink-faint focus:border-primary focus:outline-none"
        />
        <p className="mt-1.5 text-[13px] text-ink-faint">Comma-separated. Up to 10 recipients.</p>
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-ink">Alert me about</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {SEVERITIES.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => setMinSeverity(s.value)}
              className={cn(
                "rounded-tile border px-4 py-3 text-left transition-colors",
                minSeverity === s.value
                  ? "border-primary bg-primary-soft"
                  : "border-line bg-card hover:border-ink-faint",
              )}
            >
              <span className="block text-sm font-medium text-ink">{s.label}</span>
              <span className="block text-[13px] text-ink-faint">{s.hint}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <label className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={failureAlerts}
          onChange={(e) => setFailureAlerts(e.target.checked)}
          className="size-4 accent-primary"
        />
        <span className="text-sm text-ink">
          Also alert me when a scan fails (site down or unreachable)
        </span>
      </label>

      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={weeklyReports}
          onChange={(e) => setWeeklyReports(e.target.checked)}
          className="mt-0.5 size-4 accent-primary"
        />
        <span>
          <span className="block text-sm font-medium text-ink">Weekly report</span>
          <span className="block text-[13px] text-ink-secondary">
            A client-ready summary of every website, each Monday.
          </span>
        </span>
      </label>

      {error && (
        <p className="text-sm text-critical-strong" role="alert">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={status === "saving"}
          className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-6 text-sm font-medium text-primary-contrast transition-colors hover:bg-primary-hover disabled:opacity-60"
        >
          {status === "saving" && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {status === "saved" && <Check className="size-4" aria-hidden />}
          {status === "saved" ? "Saved" : "Save preferences"}
        </button>
      </div>
    </form>
  );
}
