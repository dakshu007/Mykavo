"use client";

import { Loader2 } from "lucide-react";

/** Button and field styles shared with AI Keywords (components/keywords/agent-panels.tsx). */
export const primary =
  "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-primary px-4 text-[13px] font-semibold text-primary-contrast transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-60";
export const hero =
  "inline-flex h-10 shrink-0 items-center gap-2 rounded-full border-[1.5px] border-ink bg-primary px-5 text-[13.5px] font-semibold text-[#16181d] shadow-[3px_3px_0_var(--color-ink)] transition-transform hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60";
export const secondary =
  "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-line px-4 text-[13px] font-semibold text-ink transition-colors hover:bg-ink/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-60";
export const ghost =
  "inline-flex h-8 shrink-0 items-center gap-1 rounded-full px-2.5 text-[12.5px] font-medium text-ink-secondary transition-colors hover:bg-ink/5 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-50";
export const field =
  "mt-1 block w-full rounded-xl border border-line bg-card px-3 py-2 text-[14px] text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30";
export const label = "block text-[12.5px] font-medium text-ink-secondary";

export function BusyButton({
  busy,
  busyLabel,
  icon,
  className,
  disabled,
  onClick,
  type = "button",
  children,
}: {
  busy: boolean;
  busyLabel: string;
  icon?: React.ReactNode;
  className: string;
  disabled?: boolean;
  onClick?: () => void;
  type?: "button" | "submit";
  children: React.ReactNode;
}) {
  return (
    <button type={type} className={className} disabled={busy || disabled} aria-busy={busy} onClick={onClick}>
      {busy ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : icon}
      {busy ? busyLabel : children}
    </button>
  );
}

export function Alert({ children, tone = "error" }: { children: React.ReactNode; tone?: "error" | "info" }) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={
        tone === "error"
          ? "rounded-xl bg-critical-soft px-3 py-2 text-[13px] text-critical-strong"
          : "rounded-xl bg-primary-soft px-3 py-2 text-[13px] text-ink"
      }
    >
      {children}
    </p>
  );
}

export function ProgressBar({ value, label }: { value: number; label: string }) {
  return (
    <div className="space-y-1.5" role="status" aria-live="polite">
      <div className="flex items-center justify-between text-[12.5px]">
        <span className="flex items-center gap-1.5 font-medium text-ink">
          <Loader2 className="size-3.5 animate-spin text-accent" aria-hidden />
          {label}
        </span>
        <span className="font-mono tabular-nums text-ink-faint">{Math.round(value)}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-ink/10">
        <div className="h-full rounded-full bg-accent transition-[width] duration-700" style={{ width: `${Math.max(4, Math.min(100, value))}%` }} />
      </div>
    </div>
  );
}

export async function postJson(url: string, body: unknown, method = "POST"): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  try {
    const res = await fetch(url, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    return { ok: res.ok, data };
  } catch {
    return { ok: false, data: { error: "Could not reach MyKavo. Check your connection and try again." } };
  }
}

export function errorOf(data: Record<string, unknown>, fallback = "Something went wrong. Please try again."): string {
  return typeof data.error === "string" ? data.error : fallback;
}
