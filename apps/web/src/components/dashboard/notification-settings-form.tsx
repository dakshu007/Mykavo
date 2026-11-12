"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import type { EmailSettings } from "@/lib/notification-settings";
import { cn } from "@/lib/utils";

/**
 * The three thresholds carry the same colour language as change severity
 * elsewhere in the dashboard - amber for medium, orange for high, red for
 * critical - so the choice reads as "how loud do you want this" at a glance
 * rather than three identical grey tiles. Colour is never the only signal:
 * each tile keeps its label, its hint, and a selected ring.
 */
const SEVERITIES = [
  {
    value: "MEDIUM",
    label: "Medium and above",
    hint: "More alerts",
    dot: "bg-warning",
    idle: "border-warning/35 bg-warning-soft/40",
    active: "border-warning-strong bg-warning-soft ring-1 ring-warning-strong",
  },
  {
    value: "HIGH",
    label: "High and above",
    hint: "Recommended",
    dot: "bg-orange",
    idle: "border-orange/35 bg-orange-soft/40",
    active: "border-orange-strong bg-orange-soft ring-1 ring-orange-strong",
  },
  {
    value: "CRITICAL",
    label: "Critical only",
    hint: "Fewest alerts",
    dot: "bg-critical",
    idle: "border-critical/35 bg-critical-soft/40",
    active: "border-critical-strong bg-critical-soft ring-1 ring-critical-strong",
  },
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

  const count = recipients
    .split(/[,\n]/)
    .map((x) => x.trim())
    .filter(Boolean).length;

  return (
    <form onSubmit={save} className="space-y-6">
      <div className="flex items-center justify-between gap-4 rounded-xl border border-line bg-surface/60 px-4 py-3.5">
        <span id="email-alerts-label" className="min-w-0">
          <span className="block text-sm font-medium text-ink">{enabled ? "Email alerts are on" : "Email alerts are off"}</span>
          <span className="block text-[13px] text-ink-secondary">
            {enabled
              ? "A grouped summary email when a scan finds important changes."
              : "Off. MyKavo keeps monitoring and recording changes, it just will not email you about them."}
          </span>
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-labelledby="email-alerts-label"
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
      </div>

      <div>
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <label htmlFor="recipients" className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-faint">
            Recipients
          </label>
          <span className="font-mono text-[11px] text-ink-faint">{count} / 10</span>
        </div>
        <textarea
          id="recipients"
          rows={2}
          value={recipients}
          onChange={(e) => setRecipients(e.target.value)}
          placeholder="you@agency.com, teammate@agency.com"
          className="w-full rounded-field border border-line bg-card px-4 py-3 text-[15px] text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none"
        />
        <p className="mt-1.5 text-[13px] text-ink-faint">Separate addresses with commas. Up to 10 recipients.</p>
      </div>

      <fieldset>
        <legend className="mb-2 font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-faint">Alert me about</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {SEVERITIES.map((s) => {
            const on = minSeverity === s.value;
            return (
              <button
                key={s.value}
                type="button"
                onClick={() => setMinSeverity(s.value)}
                aria-pressed={on}
                className={cn(
                  "relative rounded-tile border px-4 py-3 text-left transition-all",
                  on ? s.active : cn(s.idle, "hover:brightness-95"),
                )}
              >
                <span className="flex items-center gap-2">
                  <span className={cn("size-2 shrink-0 rounded-full", s.dot)} aria-hidden />
                  <span className="text-sm font-medium text-ink">{s.label}</span>
                </span>
                <span className="mt-0.5 block text-[13px] text-ink-secondary">{s.hint}</span>
                {on && (
                  <Check className="absolute right-3 top-3 size-4 text-ink" aria-hidden />
                )}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div>
        <p className="mb-2 font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-faint">Also send</p>
        <div className="divide-y divide-line overflow-hidden rounded-xl border border-line">
          <label className="flex cursor-pointer items-start gap-3 px-4 py-3.5 transition-colors hover:bg-ink/[0.02]">
            <input
              type="checkbox"
              checked={failureAlerts}
              onChange={(e) => setFailureAlerts(e.target.checked)}
              className="mt-0.5 size-4 accent-primary"
            />
            <span>
              <span className="block text-sm font-medium text-ink">Scan failures</span>
              <span className="block text-[13px] text-ink-secondary">
                When a site is down or MyKavo cannot reach it.
              </span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 px-4 py-3.5 transition-colors hover:bg-ink/[0.02]">
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
        </div>
      </div>

      {error && (
        <p className="text-sm text-critical-strong" role="alert">
          {error}
        </p>
      )}

      <div className="-mx-5 -mb-5 flex flex-wrap items-center justify-between gap-3 border-t border-line bg-surface/50 px-5 py-4 sm:-mx-6 sm:px-6">
        <p className="text-[13px] text-ink-secondary">Saved settings apply to the next alert.</p>
        <button
          type="submit"
          disabled={status === "saving"}
          className="inline-flex h-10 items-center gap-2 rounded-full bg-primary px-6 text-sm font-medium text-primary-contrast transition-colors hover:bg-primary-hover disabled:opacity-60"
        >
          {status === "saving" && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {status === "saved" && <Check className="size-4" aria-hidden />}
          {status === "saved" ? "Saved" : "Save preferences"}
        </button>
      </div>
    </form>
  );
}
