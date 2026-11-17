"use client";

import { useState } from "react";
import { Loader2, Pause, Play, Rocket, Sparkles } from "lucide-react";
import type { AiControlsData } from "@/lib/ai/controls";

const money = (usd: number) => (usd < 1 ? `$${usd.toFixed(4)}` : `$${usd.toFixed(2)}`);

function when(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

/**
 * The AI kill switch and the two monthly spend caps, for platform admins.
 * Pausing is instant and stops only AI: monitoring keeps running.
 */
export function AiControls({ initial }: { initial: AiControlsData }) {
  const [data, setData] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/ai-pause", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ paused: !data.paused }),
      });
      const body = (await res.json()) as {
        paused?: boolean;
        updatedAt?: string | null;
        updatedBy?: string | null;
        error?: string;
      };
      if (!res.ok || typeof body.paused !== "boolean") {
        setError(body.error ?? "Could not change the switch.");
        return;
      }
      setData({ ...data, paused: body.paused, updatedAt: body.updatedAt ?? null, updatedBy: body.updatedBy ?? null });
    } catch {
      setError("Could not reach MyKavo. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-2xl border border-line bg-card p-5 sm:p-6" aria-labelledby="ai-controls-title">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-mono text-[10.5px] font-medium uppercase tracking-[0.14em] text-ink-faint">AI controls</p>
          <h2
            id="ai-controls-title"
            className="mt-1 flex items-center gap-2 text-[16px] font-semibold tracking-tight text-ink"
          >
            <Sparkles className="size-4 text-accent" aria-hidden />
            AI is
            <span
              className={
                data.paused
                  ? "rounded-full bg-critical-soft px-2 py-0.5 text-[12px] text-critical-strong"
                  : "rounded-full bg-success-soft px-2 py-0.5 text-[12px] text-success-strong"
              }
            >
              {data.paused ? "Paused" : "Running"}
            </span>
          </h2>
          <p className="mt-1.5 max-w-xl text-[13px] leading-5 text-ink-secondary">
            {data.paused
              ? "No AI calls are made. Scans, change detection and alerts keep running as normal."
              : "Pausing stops every AI call at once, in the app and the worker. Monitoring is never affected."}
            {!data.configured && " No Anthropic key is set, so AI is off either way."}
          </p>
          {data.updatedBy && (
            <p className="mt-1 text-[12px] text-ink-faint">
              Last changed by {data.updatedBy}, {when(data.updatedAt)}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => void toggle()}
          disabled={saving}
          aria-pressed={data.paused}
          className={
            data.paused
              ? "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-primary px-4 text-[13px] font-semibold text-primary-contrast hover:bg-primary-hover disabled:opacity-60"
              : "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border-[1.5px] border-ink px-4 text-[13px] font-semibold text-ink hover:bg-ink/5 disabled:opacity-60"
          }
        >
          {saving ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
          ) : data.paused ? (
            <Play className="size-3.5" aria-hidden />
          ) : (
            <Pause className="size-3.5" aria-hidden />
          )}
          {data.paused ? "Resume AI" : "Pause all AI"}
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-3 text-[13px] text-critical-strong">
          {error}
        </p>
      )}
      <RolloutControl initial={data.rollout} />
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {data.pools.map((p) => {
          const ratio = p.capUsd > 0 ? Math.min(1, p.spentUsd / p.capUsd) : p.spentUsd > 0 ? 1 : 0;
          return (
            <li key={p.id} className="rounded-xl border border-line px-4 py-3">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[13px] font-medium text-ink">{p.label}</span>
                <span className="text-[13px] font-semibold tabular-nums text-ink">
                  {money(p.spentUsd)}{" "}
                  <span className="font-normal text-ink-faint">/ {p.capUsd > 0 ? money(p.capUsd) : "$0, off"}</span>
                </span>
              </div>
              <div
                className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink/10"
                role="meter"
                aria-label={`${p.label} spend this month`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(ratio * 100)}
              >
                <div
                  className={ratio >= 1 ? "h-full bg-critical" : ratio >= 0.8 ? "h-full bg-warning" : "h-full bg-success"}
                  style={{ width: `${Math.max(ratio * 100, ratio > 0 ? 2 : 0)}%` }}
                />
              </div>
              <p className="mt-1.5 font-mono text-[10.5px] text-ink-faint">This month, cap set by {p.detail}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

const ROLLOUT_OPTIONS: { mode: AiControlsData["rollout"]["mode"]; label: string; detail: string }[] = [
  { mode: "admins", label: "Admins only", detail: "Only platform admins see AI Keywords." },
  { mode: "beta", label: "Beta list", detail: "Admins plus the verified emails below." },
  { mode: "everyone", label: "Everyone", detail: "Every customer, and the public feature page goes live." },
];

/** Who can use the AI Keyword Agent: admins, a beta list, then everyone. */
function RolloutControl({ initial }: { initial: AiControlsData["rollout"] }) {
  const [mode, setMode] = useState(initial.mode);
  const [emails, setEmails] = useState(initial.betaEmails.join("\n"));
  const [saved, setSaved] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const dirty = mode !== saved.mode || emails.trim() !== saved.betaEmails.join("\n");

  async function save() {
    if (mode === "everyone" && saved.mode !== "everyone" && !window.confirm("Open AI Keywords to every customer and publish the feature page?")) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/ai-rollout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode, betaEmails: emails.split(/[\s,]+/).filter(Boolean) }),
      });
      const body = (await res.json()) as { mode?: AiControlsData["rollout"]["mode"]; betaEmails?: string[]; error?: string };
      if (!res.ok || !body.mode || !body.betaEmails) {
        setMessage(body.error ?? "Could not save.");
        return;
      }
      setSaved({ mode: body.mode, betaEmails: body.betaEmails });
      setEmails(body.betaEmails.join("\n"));
      setMessage("Saved.");
    } catch {
      setMessage("Could not reach MyKavo. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <fieldset className="mt-4 rounded-xl border border-line px-4 py-3">
      <legend className="flex items-center gap-1.5 px-1 text-[13px] font-semibold text-ink">
        <Rocket className="size-3.5 text-accent" aria-hidden /> AI Keyword Agent rollout
      </legend>
      <div className="grid gap-2 sm:grid-cols-3">
        {ROLLOUT_OPTIONS.map((o) => (
          <label
            key={o.mode}
            className={`flex cursor-pointer gap-2 rounded-lg border p-2.5 text-[13px] ${mode === o.mode ? "border-accent bg-primary-soft/40" : "border-line"}`}
          >
            <input type="radio" name="rollout" className="mt-0.5" checked={mode === o.mode} onChange={() => setMode(o.mode)} />
            <span>
              <span className="block font-medium text-ink">{o.label}</span>
              <span className="block text-[12px] leading-4 text-ink-faint">{o.detail}</span>
            </span>
          </label>
        ))}
      </div>
      {mode === "beta" && (
        <label className="mt-3 block text-[13px] font-medium text-ink">
          Beta emails <span className="font-normal text-ink-faint">(one per line; the address must be verified)</span>
          <textarea
            className="mt-1 block min-h-[80px] w-full rounded-lg border border-line bg-card px-3 py-2 font-mono text-[12px] text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
            value={emails}
            onChange={(e) => setEmails(e.target.value)}
          />
        </label>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void save()}
          disabled={!dirty || saving}
          className="inline-flex h-8 items-center gap-1.5 rounded-full bg-primary px-3.5 text-[12.5px] font-semibold text-primary-contrast hover:bg-primary-hover disabled:opacity-50"
        >
          {saving && <Loader2 className="size-3 animate-spin" aria-hidden />} Save rollout
        </button>
        {message && <span role="status" className="text-[12px] text-ink-secondary">{message}</span>}
      </div>
    </fieldset>
  );
}
