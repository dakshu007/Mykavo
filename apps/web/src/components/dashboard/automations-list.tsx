"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Loader2 } from "lucide-react";
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

const GROUPS = ["Onboarding", "Lifecycle series", "Plan & monitoring", "Product updates"] as const;
type Group = (typeof GROUPS)[number];

const GROUP_INFO: Record<Group, { kind: string; blurb: string }> = {
  Onboarding: {
    kind: "Transactional",
    blurb: "Sent once each, no unsubscribe link, and only to workspaces with email switched on.",
  },
  "Lifecycle series": {
    kind: "Optional",
    blurb: "Each carries an unsubscribe link, stops for paying and unsubscribed accounts, and never sends two within a day.",
  },
  "Plan & monitoring": {
    kind: "Transactional",
    blurb:
      "The Pro trial reminder and end, and the notice when MyKavo pauses an inactive Free workspace. Once each, no unsubscribe link.",
  },
  "Product updates": {
    kind: "Optional",
    blurb: "Once per person per version, never two within 72 hours, with an unsubscribe link. Send them from Update emails below.",
  },
};

function Stat({ label, value, tone }: { label: string; value: React.ReactNode; tone?: "bad" | "muted" }) {
  return (
    <div className="min-w-0">
      <dt className="whitespace-nowrap font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-ink-faint">{label}</dt>
      <dd
        className={cn(
          "mt-0.5 whitespace-nowrap text-[14px] font-semibold tabular-nums",
          tone === "bad" ? "text-critical-strong" : tone === "muted" ? "text-[13px] font-medium text-ink-secondary" : "text-ink",
        )}
      >
        {value}
      </dd>
    </div>
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
    <li
      className={cn(
        "grid gap-x-6 gap-y-3 px-5 py-4 sm:px-6 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-center",
        !on && "bg-surface/60",
      )}
    >
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-2 text-[14.5px] font-medium text-ink">
          <span
            className={cn("size-2 shrink-0 rounded-full", on ? "bg-success" : "bg-ink-faint")}
            aria-hidden
          />
          <Link href={`/dashboard/automations/${a.meta.key}`} className="hover:underline">
            {a.meta.name}
          </Link>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[11px] font-semibold",
              on ? "bg-success-soft text-success-strong" : "bg-line text-ink-secondary",
            )}
          >
            {on ? "On" : "Off"}
          </span>
          {a.customised && (
            <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-semibold text-accent">Edited</span>
          )}
          {a.meta.unsubscribable && (
            <span
              className="rounded-full border border-line px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-faint"
              title="Carries an unsubscribe link"
            >
              Optional
            </span>
          )}
        </p>
        <p className="mt-1 pl-4 text-[13px] leading-5 text-ink-secondary">
          {a.sendOnDay !== null && (
            <span className="mr-1.5 rounded bg-ink px-1.5 py-px font-mono text-[10.5px] font-semibold text-ink-inverse">
              Day {a.sendOnDay}
            </span>
          )}
          {a.meta.trigger}
          {a.offer ? ` Code ${a.offer.code}, ${a.offer.percent}% off.` : ""}
        </p>
      </div>

      <dl className="grid grid-cols-[repeat(3,minmax(2.75rem,auto))_6rem] gap-4 pl-4 md:pl-0 md:text-right">
        <Stat label="7d" value={a.stats.sent7d} />
        <Stat label="30d" value={a.stats.sent30d} />
        <Stat label="Failed" value={a.stats.failed30d} tone={a.stats.failed30d > 0 ? "bad" : undefined} />
        <Stat label="Last sent" value={ago(a.stats.lastSentAt)} tone="muted" />
      </dl>

      <div className="flex items-center gap-3 pl-4 md:pl-0">
        <span className="flex size-11 items-center justify-center">
          {busy ? (
            <Loader2 className="size-4 animate-spin text-ink-faint" aria-hidden />
          ) : (
            <Switch checked={on} disabled={!ready} label={`${a.meta.name} email`} onChange={onToggle} />
          )}
        </span>
        <Link
          href={`/dashboard/automations/${a.meta.key}`}
          className="inline-flex h-8 items-center gap-1 rounded-full border border-line px-3 text-[12.5px] font-medium text-ink-secondary transition-colors hover:border-ink/30 hover:text-ink"
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
      setError("Network error, try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <p className="rounded-xl bg-critical-soft px-4 py-3 text-sm text-critical-strong" role="alert">
          {error}
        </p>
      )}
      {GROUPS.map((g, gi) => {
        const items = overview.automations.filter((a) => a.meta.group === g);
        if (items.length === 0) return null;
        const on = items.filter((a) => a.settings.enabled).length;
        const sent30 = items.reduce((n, a) => n + a.stats.sent30d, 0);
        const info = GROUP_INFO[g];
        return (
          <section key={g} aria-labelledby={`auto-group-${gi}`} className="overflow-hidden rounded-2xl border border-line bg-card">
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line px-5 pb-4 pt-5 sm:px-6">
              <div className="min-w-0">
                <p className="font-mono text-[10.5px] font-medium uppercase tracking-[0.14em] text-ink-faint">
                  {String(gi + 1).padStart(2, "0")} / {info.kind}
                </p>
                <h2 id={`auto-group-${gi}`} className="mt-1 text-[16px] font-semibold tracking-tight text-ink">
                  {g}
                </h2>
                <p className="mt-1 max-w-2xl text-[13px] text-ink-secondary">{info.blurb}</p>
              </div>
              <p className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-faint">
                <strong className="font-semibold text-ink">
                  {on}/{items.length}
                </strong>{" "}
                on <span aria-hidden>/</span> <strong className="font-semibold text-ink">{sent30}</strong> sent in 30d
              </p>
            </div>
            <ul className="divide-y divide-line">
              {items.map((a) => (
                <Row
                  key={a.meta.key}
                  a={a}
                  ready={overview.ready}
                  busy={busy === a.meta.key}
                  onToggle={(next) => void toggle(a, next)}
                />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
