"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Loader2 } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { AutomationsOverview, AutomationSummary } from "@/lib/automations-admin";

/**
 * Admin > Automations: every automated email, what it did lately, and an
 * on/off switch. Editing the wording happens on each email's own page.
 */

function ago(iso: string | null): string {
  if (!iso) return "never";
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 60) return `${Math.max(1, mins)} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours} h ago`;
  return `${Math.round(hours / 24)} days ago`;
}

export function Switch({
  checked,
  disabled,
  label,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50",
        checked ? "bg-primary" : "bg-line",
      )}
    >
      <span
        className={cn(
          "inline-block size-5 rounded-full bg-white transition-transform",
          checked ? "translate-x-5" : "translate-x-0.5",
        )}
      />
    </button>
  );
}

function Row({
  a,
  ready,
  busy,
  onToggle,
}: {
  a: AutomationSummary;
  ready: boolean;
  busy: boolean;
  onToggle: (next: boolean) => void;
}) {
  const on = a.settings.enabled;
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 py-4 first:pt-0 last:pb-0">
      <div className="min-w-0 flex-1 basis-64">
        <p className="flex flex-wrap items-center gap-2 text-[14px] font-medium text-ink">
          <Link href={`/dashboard/automations/${a.meta.key}`} className="hover:underline">
            {a.meta.name}
          </Link>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[11px] font-semibold",
              on ? "bg-success-soft text-success-strong" : "bg-surface text-ink-faint",
            )}
          >
            {on ? "On" : "Off"}
          </span>
          {a.customised && (
            <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-semibold text-accent">Edited</span>
          )}
          {a.meta.unsubscribable && (
            <span className="text-[11px] text-ink-faint" title="Carries an unsubscribe link">
              optional
            </span>
          )}
        </p>
        <p className="mt-0.5 text-[13px] text-ink-secondary">
          {a.sendOnDay !== null && <span className="font-medium text-ink">Day {a.sendOnDay}. </span>}
          {a.meta.trigger}
          {a.offer ? ` Code ${a.offer.code}, ${a.offer.percent}% off.` : ""}
        </p>
      </div>

      <dl className="flex shrink-0 gap-5 text-right">
        <div>
          <dt className="text-[11px] text-ink-faint">7 days</dt>
          <dd className="text-[14px] font-semibold tabular-nums text-ink">{a.stats.sent7d}</dd>
        </div>
        <div>
          <dt className="text-[11px] text-ink-faint">30 days</dt>
          <dd className="text-[14px] font-semibold tabular-nums text-ink">{a.stats.sent30d}</dd>
        </div>
        <div>
          <dt className="text-[11px] text-ink-faint">Failed</dt>
          <dd className={cn("text-[14px] font-semibold tabular-nums", a.stats.failed30d > 0 ? "text-critical-strong" : "text-ink")}>
            {a.stats.failed30d}
          </dd>
        </div>
        <div className="min-w-[72px]">
          <dt className="text-[11px] text-ink-faint">Last sent</dt>
          <dd className="text-[13px] text-ink-secondary">{ago(a.stats.lastSentAt)}</dd>
        </div>
      </dl>

      <div className="flex shrink-0 items-center gap-3">
        {busy ? (
          <Loader2 className="size-4 animate-spin text-ink-faint" aria-hidden />
        ) : (
          <Switch checked={on} disabled={!ready} label={`${a.meta.name} email`} onChange={onToggle} />
        )}
        <Link
          href={`/dashboard/automations/${a.meta.key}`}
          className="inline-flex h-8 items-center gap-1 rounded-full bg-surface px-3 text-[12.5px] font-medium text-ink-secondary transition-colors hover:text-ink"
        >
          Edit <ChevronRight className="size-3.5" aria-hidden />
        </Link>
      </div>
    </li>
  );
}

export function AutomationsList({ overview }: { overview: AutomationsOverview }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function toggle(a: AutomationSummary, enabled: boolean) {
    setBusy(a.meta.key);
    setError("");
    try {
      const res = await fetch(`/api/admin/automations/${a.meta.key}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? "Could not save that.");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error - try again.");
    } finally {
      setBusy(null);
    }
  }

  const groups = ["Onboarding", "Lifecycle series"] as const;
  return (
    <div className="space-y-6">
      {error && (
        <p className="text-sm text-critical-strong" role="alert">
          {error}
        </p>
      )}
      {groups.map((g) => (
        <Card key={g}>
          <CardHeader title={g} />
          <p className="-mt-2 mb-4 text-[13px] text-ink-secondary">
            {g === "Onboarding"
              ? "Transactional: sent once each, no unsubscribe link, and only to workspaces with email switched on."
              : "Optional: each carries an unsubscribe link, stops for paying and unsubscribed accounts, and never sends two within a day."}
          </p>
          <ul className="divide-y divide-line">
            {overview.automations
              .filter((a) => a.meta.group === g)
              .map((a) => (
                <Row
                  key={a.meta.key}
                  a={a}
                  ready={overview.ready}
                  busy={busy === a.meta.key}
                  onToggle={(next) => void toggle(a, next)}
                />
              ))}
          </ul>
        </Card>
      ))}
    </div>
  );
}
