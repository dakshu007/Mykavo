"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, X } from "lucide-react";
import { FLOW_TRIGGERS, type FlowTrigger } from "@mykavo/shared/flows";
import { cn } from "@/lib/utils";

/** "New flow": name it, pick what starts it, start blank or from the built-in journey. */
export function NewFlowButton({ disabled, variant = "primary" }: { disabled?: boolean; variant?: "primary" | "light" }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [trigger, setTrigger] = useState<FlowTrigger>("signup");
  const [from, setFrom] = useState<"blank" | "system-journey">("blank");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/flows", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, trigger, from }),
      });
      const body = (await res.json().catch(() => ({}))) as { id?: string; error?: string };
      if (!res.ok || !body.id) {
        setError(body.error ?? "Could not create the flow.");
        setBusy(false);
        return;
      }
      router.push(`/dashboard/automations/flows/${body.id}`);
    } catch {
      setError("Network error - try again.");
      setBusy(false);
    }
  }

  const field = "w-full rounded-field border border-line bg-card px-3.5 py-2.5 text-[14px] text-ink focus:border-accent focus:outline-none";
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        disabled={disabled}
        title={disabled ? "Run the automation_flow migration first" : undefined}
        className={cn(
          "inline-flex h-10 items-center gap-2 rounded-full px-5 text-[13.5px] font-semibold transition-colors disabled:opacity-50",
          variant === "primary" ? "bg-primary text-primary-contrast hover:bg-primary-hover" : "bg-white text-[#0f1115] hover:bg-white/90",
        )}
      >
        <Plus className="size-4" aria-hidden /> New flow
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => !busy && setOpen(false)}>
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-flow-title"
            onSubmit={create}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md space-y-4 rounded-card bg-card p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h2 id="new-flow-title" className="text-[17px] font-semibold text-ink">New flow</h2>
              <button type="button" onClick={() => setOpen(false)} className="rounded-md p-1 text-ink-faint hover:bg-surface hover:text-ink" aria-label="Close">
                <X className="size-4" />
              </button>
            </div>
            <div>
              <label htmlFor="nf-name" className="mb-1.5 block text-sm font-medium text-ink">Name</label>
              <input id="nf-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="e.g. Agency onboarding" className={field} />
            </div>
            <div>
              <label htmlFor="nf-trigger" className="mb-1.5 block text-sm font-medium text-ink">Starts when</label>
              <select id="nf-trigger" value={trigger} onChange={(e) => setTrigger(e.target.value as FlowTrigger)} className={field} disabled={from !== "blank"}>
                {(Object.keys(FLOW_TRIGGERS) as FlowTrigger[]).map((t) => (
                  <option key={t} value={t}>{FLOW_TRIGGERS[t].label}</option>
                ))}
              </select>
            </div>
            <fieldset>
              <legend className="mb-1.5 text-sm font-medium text-ink">Start from</legend>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    ["blank", "Blank canvas", "Build it step by step"],
                    ["system-journey", "Built-in journey", "Welcome + Day 3 / 6 / 10"],
                  ] as const
                ).map(([v, t, h]) => (
                  <button
                    key={v}
                    type="button"
                    aria-pressed={from === v}
                    onClick={() => setFrom(v)}
                    className={cn(
                      "rounded-tile border p-3 text-left transition-colors",
                      from === v ? "border-accent bg-primary-soft" : "border-line hover:bg-surface",
                    )}
                  >
                    <span className="block text-[13.5px] font-medium text-ink">{t}</span>
                    <span className="block text-[12px] text-ink-secondary">{h}</span>
                  </button>
                ))}
              </div>
            </fieldset>
            <p className="text-[12px] text-ink-secondary">New flows start as drafts. Nothing is sent until you activate it.</p>
            {error && <p className="text-sm text-critical-strong" role="alert">{error}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="h-10 rounded-full px-4 text-sm font-medium text-ink-secondary hover:text-ink">
                Cancel
              </button>
              <button type="submit" disabled={busy} className="inline-flex h-10 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-contrast hover:bg-primary-hover disabled:opacity-60">
                {busy && <Loader2 className="size-4 animate-spin" />} Create and open
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
