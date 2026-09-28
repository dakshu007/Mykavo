"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  Copy,
  Eye,
  FlaskConical,
  Loader2,
  Expand,
  Maximize2,
  Minimize2,
  Minus,
  Pause,
  Play,
  Plus,
  Redo2,
  Save,
  Trash2,
  Undo2,
  Workflow,
  X,
} from "lucide-react";
import {
  FLOW_CONDITIONS,
  FLOW_LIMITS,
  FLOW_TRIGGERS,
  flowIssues,
  simulateFlow,
  type FlowCondition,
  type FlowDefinition,
  type FlowFacts,
  type FlowStatus,
  type FlowStep,
  type FlowTrigger,
} from "@mykavo/shared/flows";
import {
  createStep,
  insertStep,
  removeStep,
  replaceStep,
  targetAfter,
  type InsertTarget,
  type NewStepKind,
} from "@/lib/flows/edit";
import type { BuiltinEmailOption, FlowActivity, RunCounts, StepStats } from "@/lib/flows/server";
import { cn } from "@/lib/utils";
import { DRAG_TYPE, FlowCanvas, StepIcon, stepTitle, stepTone } from "./flow-canvas";

export interface FlowBuilderProps {
  mode: "edit" | "system";
  flowId: string;
  name: string;
  status: FlowStatus | "BUILTIN";
  trigger: FlowTrigger;
  /** Shown instead of the trigger picker on built-in flows. */
  triggerLabel?: string;
  definition: FlowDefinition;
  emails: BuiltinEmailOption[];
  stats: Record<string, StepStats>;
  runs: RunCounts | null;
  activity: FlowActivity[];
  updatedAt: string | null;
  ready: boolean;
}

type Preview = { subject: string; html: string; text: string };

const input =
  "w-full rounded-field border border-line bg-card px-3 py-2 text-[13.5px] text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none disabled:opacity-60";
const label = "mb-1 block text-[12.5px] font-medium text-ink";

const FACT_KEYS = Object.keys(FLOW_CONDITIONS) as FlowCondition[];

function ago(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 60) return `${Math.max(1, mins)}m ago`;
  const h = Math.round(mins / 60);
  return h < 48 ? `${h}h ago` : `${Math.round(h / 24)}d ago`;
}

function StatusPill({ status }: { status: FlowBuilderProps["status"] }) {
  const map = {
    ACTIVE: ["Active", "bg-success text-white"],
    PAUSED: ["Paused", "bg-warning-soft text-warning-strong"],
    DRAFT: ["Draft", "bg-white/15 text-white"],
    BUILTIN: ["Built-in", "bg-primary text-primary-contrast"],
  } as const;
  const [text, cls] = map[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold", cls)}>
      {status === "ACTIVE" && <span className="size-1.5 animate-pulse rounded-full bg-white" aria-hidden />}
      {text}
    </span>
  );
}

function ToolboxItem({
  kind,
  title,
  hint,
  tile,
  disabled,
  onAdd,
}: {
  kind: NewStepKind;
  title: string;
  hint?: string;
  tile: string;
  disabled: boolean;
  onAdd: (k: NewStepKind) => void;
}) {
  return (
    <button
      type="button"
      draggable={!disabled}
      disabled={disabled}
      onDragStart={(e) => {
        e.dataTransfer.setData(DRAG_TYPE, JSON.stringify(kind));
        e.dataTransfer.effectAllowed = "copy";
      }}
      onClick={() => onAdd(kind)}
      title={disabled ? undefined : "Click to add, or drag onto a + in the flow"}
      className="group flex w-full cursor-grab items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-surface active:cursor-grabbing disabled:cursor-default disabled:opacity-50 disabled:hover:bg-transparent"
    >
      <span className={cn("inline-flex size-7 shrink-0 items-center justify-center rounded-lg text-white shadow-sm", tile, kind.type === "decision" && "rotate-45 rounded-md")}>
        <StepIcon step={kind} className={cn("size-3.5", kind.type === "decision" && "-rotate-45")} />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[13px] font-medium text-accent group-disabled:text-ink-secondary">{title}</span>
        {hint && <span className="block truncate text-[11.5px] text-ink-faint">{hint}</span>}
      </span>
    </button>
  );
}

export function FlowBuilder(p: FlowBuilderProps) {
  const router = useRouter();
  const readOnly = p.mode === "system";
  const [name, setName] = useState(p.name);
  const [trigger, setTrigger] = useState<FlowTrigger>(p.trigger);
  const [def, setDef] = useState<FlowDefinition>(p.definition);
  const [status, setStatus] = useState(p.status);
  const [past, setPast] = useState<FlowDefinition[]>([]);
  const [future, setFuture] = useState<FlowDefinition[]>([]);
  const [dirty, setDirty] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [full, setFull] = useState(false);
  const [simulate, setSimulate] = useState(false);
  const [facts, setFacts] = useState<FlowFacts>({
    has_website: true,
    is_paid: false,
    has_android_app: false,
    has_open_changes: false,
    has_urgent_changes: false,
  });
  const [busy, setBusy] = useState<null | "save" | "status" | "delete" | "duplicate">(null);
  const [toast, setToast] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [issuesOpen, setIssuesOpen] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const viewport = useRef<HTMLDivElement | null>(null);
  const content = useRef<HTMLDivElement | null>(null);

  /** Zoom so the whole flow's width fits the canvas (never above 100%). */
  const fit = useCallback(() => {
    const v = viewport.current;
    const c = content.current?.firstElementChild as HTMLElement | null;
    if (!v || !c) return;
    const natural = c.scrollWidth;
    if (!natural) return;
    setZoom(Math.max(0.5, Math.min(1, Math.floor(((v.clientWidth - 16) / natural) * 20) / 20)));
  }, []);
  // Fit on open, and again when full screen changes the canvas size.
  useEffect(() => {
    const id = requestAnimationFrame(fit);
    return () => cancelAnimationFrame(id);
  }, [fit, full]);

  const say = useCallback((tone: "ok" | "error", text: string) => {
    setToast({ tone, text });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  }, []);

  const builtinKeys = useMemo(() => p.emails.map((e) => e.key), [p.emails]);
  const issues = useMemo(() => flowIssues(def, builtinKeys), [def, builtinKeys]);
  const issueIds = useMemo(() => new Set(issues.map((i) => i.stepId).filter((x): x is string => Boolean(x))), [issues]);
  const sim = useMemo(() => (simulate ? simulateFlow(def, facts) : null), [simulate, def, facts]);
  const path = useMemo(() => (sim ? new Set(sim.path) : null), [sim]);

  const findStep = useCallback(
    (id: string): FlowStep | null => {
      const walk = (list: FlowStep[]): FlowStep | null => {
        for (const s of list) {
          if (s.id === id) return s;
          if (s.type === "decision") {
            const f = walk(s.yes) ?? walk(s.no);
            if (f) return f;
          }
        }
        return null;
      };
      return walk(def.steps);
    },
    [def],
  );
  const selectedStep = selected && selected !== "trigger" ? findStep(selected) : null;

  const commit = useCallback(
    (next: FlowDefinition) => {
      setPast((h) => [...h.slice(-49), def]);
      setFuture([]);
      setDef(next);
      setDirty(true);
    },
    [def],
  );
  const undo = useCallback(() => {
    if (!past.length) return;
    setFuture((f) => [def, ...f]);
    setDef(past[past.length - 1]);
    setPast(past.slice(0, -1));
    setDirty(true);
  }, [def, past]);
  const redo = useCallback(() => {
    if (!future.length) return;
    setPast((h) => [...h, def]);
    setDef(future[0]);
    setFuture(future.slice(1));
    setDirty(true);
  }, [def, future]);

  const insert = useCallback(
    (target: InsertTarget, kind: NewStepKind) => {
      if (readOnly) return;
      const step = createStep(kind);
      commit(insertStep(def, target, step));
      setSelected(step.id);
    },
    [commit, def, readOnly],
  );
  const addFromToolbox = (kind: NewStepKind) => {
    const target =
      (selected && selected !== "trigger" && targetAfter(def, selected)) || { decisionId: null, branch: null, index: def.steps.length };
    insert(target, kind);
  };
  const update = (next: FlowStep) => commit(replaceStep(def, next.id, next));
  const remove = useCallback(
    (id: string) => {
      const s = findStep(id);
      if (s?.type === "decision" && (s.yes.length || s.no.length)) {
        if (!window.confirm("Delete this decision and every step in its Yes and No paths?")) return;
      }
      commit(removeStep(def, id));
      setSelected(null);
    },
    [commit, def, findStep],
  );

  const save = useCallback(async (): Promise<boolean> => {
    if (readOnly) return false;
    setBusy("save");
    try {
      const res = await fetch(`/api/admin/flows/${p.flowId}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, trigger, definition: def }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        say("error", body.error ?? "Could not save.");
        return false;
      }
      setDirty(false);
      say("ok", "Saved.");
      return true;
    } catch {
      say("error", "Network error - try again.");
      return false;
    } finally {
      setBusy(null);
    }
  }, [def, name, p.flowId, readOnly, say, trigger]);

  const setFlowStatus = async (next: "ACTIVE" | "PAUSED") => {
    if (next === "ACTIVE" && issues.length) {
      setIssuesOpen(true);
      say("error", "Fix the problems first.");
      return;
    }
    if (dirty && !(await save())) return;
    setBusy("status");
    try {
      const res = await fetch(`/api/admin/flows/${p.flowId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) say("error", body.error ?? "Could not change the status.");
      else {
        setStatus(next);
        say("ok", next === "ACTIVE" ? "Flow is on. New accounts enter it from now." : "Flow paused. Accounts in it hold their place.");
        router.refresh();
      }
    } catch {
      say("error", "Network error - try again.");
    }
    setBusy(null);
  };

  const duplicate = async () => {
    setBusy("duplicate");
    try {
      const res = await fetch("/api/admin/flows", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ from: p.flowId }),
      });
      const body = (await res.json().catch(() => ({}))) as { id?: string; error?: string };
      if (!res.ok || !body.id) say("error", body.error ?? "Could not copy.");
      else router.push(`/dashboard/automations/flows/${body.id}`);
    } catch {
      say("error", "Network error - try again.");
    }
    setBusy(null);
  };

  const deleteFlow = async () => {
    if (!window.confirm(`Delete "${name}"? Accounts in it leave it, and it cannot be undone. Emails already sent stay in the history.`)) return;
    setBusy("delete");
    try {
      const res = await fetch(`/api/admin/flows/${p.flowId}`, { method: "DELETE" });
      if (!res.ok) say("error", "Could not delete.");
      else {
        setDirty(false);
        router.push("/dashboard/automations/flows");
      }
    } catch {
      say("error", "Network error - try again.");
    }
    setBusy(null);
  };

  const openPreview = async (step: Extract<FlowStep, { type: "email" }>) => {
    setPreviewLoading(true);
    try {
      const res = await fetch("/api/admin/flows/preview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: step.email }),
      });
      const body = (await res.json()) as Preview & { error?: string };
      if (!res.ok) say("error", body.error ?? "Could not render.");
      else setPreview(body);
    } catch {
      say("error", "Network error - try again.");
    }
    setPreviewLoading(false);
  };

  // Keyboard: undo/redo, save, delete the selected step, deselect.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement | null)?.closest("input, textarea, select, [contenteditable]");
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (!readOnly && dirty) void save();
        return;
      }
      if (typing || readOnly) return;
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if ((e.key === "Delete" || e.key === "Backspace") && selected && selected !== "trigger") {
        e.preventDefault();
        remove(selected);
      } else if (e.key === "Escape") {
        if (selected) setSelected(null);
        else setFull(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dirty, readOnly, redo, remove, save, selected, undo]);

  // Unsaved changes: ask before leaving.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const triggerLabel = p.triggerLabel ?? FLOW_TRIGGERS[trigger].label;
  const triggerSub = readOnly ? "Built-in rules" : status === "ACTIVE" ? "Enrolling new accounts" : "Not enrolling yet";

  /* ---------------- inspector ---------------- */

  const stepStats = selectedStep ? p.stats[selectedStep.id] : undefined;
  const inspector = (() => {
    if (simulate && sim) {
      return (
        <div className="space-y-5">
          <div>
            <p className="text-[15px] font-semibold text-ink">Simulate an account</p>
            <p className="mt-1 text-[12.5px] text-ink-secondary">
              Pick what is true about an account and follow its path through the flow. The real engine checks these
              again at every decision, so an account can change path as it goes.
            </p>
          </div>
          <div className="space-y-2">
            {FACT_KEYS.map((k) => (
              <label key={k} className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-line px-3 py-2">
                <span className="text-[13px] text-ink">{FLOW_CONDITIONS[k].label}</span>
                <input
                  type="checkbox"
                  checked={facts[k]}
                  onChange={(e) => setFacts((f) => ({ ...f, [k]: e.target.checked }))}
                  className="size-4 accent-primary"
                />
              </label>
            ))}
          </div>
          <div>
            <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-faint">What this account gets</p>
            {def.exitOnPaid && facts.is_paid ? (
              <p className="text-[13px] text-ink-secondary">Nothing - the flow stops for accounts on a paid plan.</p>
            ) : sim.emails.length === 0 ? (
              <p className="text-[13px] text-ink-secondary">No emails on this path.</p>
            ) : (
              <ol className="relative space-y-3 border-l-2 border-line pl-4">
                {sim.emails.map((e) => {
                  const s = findStep(e.stepId);
                  return (
                    <li key={e.stepId} className="relative">
                      <span className="absolute -left-[23px] top-1 size-3 rounded-full border-2 border-card bg-success" aria-hidden />
                      <p className="text-[11.5px] font-semibold text-ink-faint">Day {e.day}</p>
                      <button className="text-left text-[13px] font-medium text-accent hover:underline" onClick={() => setSelected(e.stepId)}>
                        {s ? stepTitle(s, p.emails).title : "Email"}
                      </button>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </div>
      );
    }

    if (selectedStep) {
      const { title } = stepTitle(selectedStep, p.emails);
      const tone = stepTone(selectedStep);
      return (
        <div className="space-y-5">
          <div className="flex items-start gap-3">
            <span className={cn("inline-flex size-10 shrink-0 items-center justify-center shadow-sm", tone.tile, selectedStep.type === "decision" ? "rotate-45 rounded-lg" : "rounded-xl")}>
              <StepIcon step={selectedStep} className={cn("size-5", selectedStep.type === "decision" && "-rotate-45")} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-faint">{tone.label}</p>
              <p className="truncate text-[15px] font-semibold text-ink">{title}</p>
            </div>
            <button onClick={() => setSelected(null)} className="rounded-md p-1 text-ink-faint hover:bg-surface hover:text-ink" aria-label="Close">
              <X className="size-4" />
            </button>
          </div>

          {stepStats && (stepStats.sent + stepStats.skipped + stepStats.failed + stepStats.here > 0) && (
            <dl className="grid grid-cols-4 gap-2 rounded-xl bg-surface p-3 text-center">
              {(
                [
                  [readOnly ? "Sent 30d" : "Sent", stepStats.sent],
                  ["Skipped", stepStats.skipped],
                  ["Failed", stepStats.failed],
                  ["Here", stepStats.here],
                ] as const
              ).map(([k, v]) => (
                <div key={k}>
                  <dt className="text-[10.5px] text-ink-faint">{k}</dt>
                  <dd className="text-[15px] font-semibold tabular-nums text-ink">{v}</dd>
                </div>
              ))}
            </dl>
          )}

          {selectedStep.type === "wait" && (
            <div>
              <label className={label} htmlFor="wait-days">Wait for</label>
              <div className="flex items-center gap-2">
                <input
                  id="wait-days"
                  type="number"
                  min={1}
                  max={FLOW_LIMITS.waitDays}
                  disabled={readOnly}
                  value={selectedStep.days}
                  onChange={(e) => update({ ...selectedStep, days: Math.trunc(Number(e.target.value) || 0) })}
                  className={cn(input, "w-24")}
                />
                <span className="text-[13px] text-ink-secondary">days, then continue</span>
              </div>
            </div>
          )}

          {selectedStep.type === "decision" && (
            <div className="space-y-2">
              <label className={label} htmlFor="decision-cond">Check</label>
              <select
                id="decision-cond"
                disabled={readOnly}
                value={selectedStep.condition}
                onChange={(e) => update({ ...selectedStep, condition: e.target.value as FlowCondition })}
                className={input}
              >
                {FACT_KEYS.map((k) => (
                  <option key={k} value={k}>
                    {FLOW_CONDITIONS[k].label}
                  </option>
                ))}
              </select>
              <p className="text-[12px] text-ink-secondary">
                {FLOW_CONDITIONS[selectedStep.condition]?.question} Answered from the account&apos;s live data at the moment it
                reaches this step.
              </p>
            </div>
          )}

          {selectedStep.type === "email" && selectedStep.email.kind === "builtin" && (() => {
            const key = selectedStep.email.key;
            const meta = p.emails.find((e) => e.key === key);
            return (
              <div className="space-y-3">
                <div>
                  <label className={label} htmlFor="builtin-key">Email</label>
                  <select
                    id="builtin-key"
                    disabled={readOnly}
                    value={key}
                    onChange={(e) => update({ ...selectedStep, email: { kind: "builtin", key: e.target.value } })}
                    className={input}
                  >
                    {!meta && <option value="">Choose an email</option>}
                    {p.emails.map((e) => (
                      <option key={e.key} value={e.key}>
                        {e.name}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="text-[12px] text-ink-secondary">
                  {meta?.unsubscribable ? "Optional email with an unsubscribe link. " : "Transactional email. "}
                  Never sent twice to the same account, whichever flow sends it
                  {readOnly ? "." : " - and it sends even if its built-in version is switched off."}
                </p>
                {meta && (
                  <Link href={`/dashboard/automations/${meta.key}`} className="inline-flex text-[12.5px] font-medium text-accent hover:underline">
                    Edit its wording in Automations →
                  </Link>
                )}
              </div>
            );
          })()}

          {selectedStep.type === "email" && selectedStep.email.kind === "custom" && (() => {
            const e = selectedStep.email;
            const set = (patch: Partial<typeof e>) => update({ ...selectedStep, email: { ...e, ...patch } });
            return (
              <div className="space-y-3">
                <div>
                  <label className={label} htmlFor="c-subject">Subject</label>
                  <input id="c-subject" className={input} value={e.subject} maxLength={FLOW_LIMITS.subject} onChange={(ev) => set({ subject: ev.target.value })} placeholder="e.g. {firstName}, a quick tip for your first week" />
                </div>
                <div>
                  <label className={label} htmlFor="c-heading">Heading</label>
                  <input id="c-heading" className={input} value={e.heading} maxLength={FLOW_LIMITS.heading} onChange={(ev) => set({ heading: ev.target.value })} placeholder="Headline inside the email" />
                </div>
                <div>
                  <label className={label} htmlFor="c-body">Message</label>
                  <textarea id="c-body" rows={7} className={input} value={e.body} maxLength={FLOW_LIMITS.body} onChange={(ev) => set({ body: ev.target.value })} />
                  <p className="mt-1 text-[11.5px] text-ink-faint">Plain text. A blank line starts a paragraph. {"{firstName}"} fills in their name.</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={label} htmlFor="c-btn">Button</label>
                    <input id="c-btn" className={input} value={e.buttonLabel} maxLength={FLOW_LIMITS.buttonLabel} onChange={(ev) => set({ buttonLabel: ev.target.value })} placeholder="None" />
                  </div>
                  <div>
                    <label className={label} htmlFor="c-url">Link</label>
                    <input id="c-url" className={cn(input, "font-mono text-[12.5px]")} value={e.buttonUrl} maxLength={FLOW_LIMITS.buttonUrl} onChange={(ev) => set({ buttonUrl: ev.target.value })} placeholder="/dashboard" />
                  </div>
                </div>
                <p className="text-[12px] text-ink-secondary">Always sent with an unsubscribe link, and never to unsubscribed accounts.</p>
              </div>
            );
          })()}

          <div className="flex flex-wrap gap-2 border-t border-line pt-4">
            {selectedStep.type === "email" && (
              <button
                onClick={() => void openPreview(selectedStep)}
                disabled={previewLoading}
                className="inline-flex h-9 items-center gap-1.5 rounded-full bg-surface px-3.5 text-[12.5px] font-medium text-ink transition-colors hover:bg-line/60"
              >
                {previewLoading ? <Loader2 className="size-3.5 animate-spin" /> : <Eye className="size-3.5" />} Preview email
              </button>
            )}
            {!readOnly && (
              <button
                onClick={() => remove(selectedStep.id)}
                className="inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[12.5px] font-medium text-critical-strong transition-colors hover:bg-critical-soft"
              >
                <Trash2 className="size-3.5" /> Delete step
              </button>
            )}
          </div>
        </div>
      );
    }

    // Flow settings (nothing selected, or the Start node).
    return (
      <div className="space-y-5">
        <div>
          <p className="text-[15px] font-semibold text-ink">{readOnly ? "Built-in flow" : "Flow settings"}</p>
          <p className="mt-1 text-[12.5px] text-ink-secondary">
            {readOnly
              ? "How MyKavo's built-in emails run, drawn as a flow. Change each email's wording, timing or on/off switch in Automations, or copy this into a flow of your own."
              : "Select a step to edit it. Add steps from the toolbox, or with the + between steps."}
          </p>
        </div>
        {!readOnly && (
          <>
            <div>
              <label className={label} htmlFor="flow-trigger">Starts when</label>
              <select
                id="flow-trigger"
                value={trigger}
                onChange={(e) => {
                  setTrigger(e.target.value as FlowTrigger);
                  setDirty(true);
                }}
                className={input}
              >
                {(Object.keys(FLOW_TRIGGERS) as FlowTrigger[]).map((t) => (
                  <option key={t} value={t}>
                    {FLOW_TRIGGERS[t].label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[12px] text-ink-secondary">{FLOW_TRIGGERS[trigger].description} Older accounts are never back-filled.</p>
            </div>
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={def.exitOnPaid}
                onChange={(e) => commit({ ...def, exitOnPaid: e.target.checked })}
                className="mt-0.5 size-4 accent-primary"
              />
              <span>
                <span className="block text-[13px] font-medium text-ink">Stop when the account upgrades</span>
                <span className="block text-[12px] text-ink-secondary">Paying customers leave the flow straight away.</span>
              </span>
            </label>
          </>
        )}
        {p.runs && (
          <dl className="grid grid-cols-3 gap-2 rounded-xl bg-surface p-3 text-center">
            {(
              [
                ["In flow", p.runs.active],
                ["Finished", p.runs.completed],
                ["Stopped", p.runs.stopped],
              ] as const
            ).map(([k, v]) => (
              <div key={k}>
                <dt className="text-[10.5px] text-ink-faint">{k}</dt>
                <dd className="text-[16px] font-semibold tabular-nums text-ink">{v}</dd>
              </div>
            ))}
          </dl>
        )}
        {!readOnly && (
          <div>
            <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-faint">Recent activity</p>
            {p.activity.length === 0 ? (
              <p className="text-[12.5px] text-ink-secondary">Nothing yet. Activity appears here once the flow is on and accounts enter it.</p>
            ) : (
              <ul className="max-h-72 space-y-2 overflow-y-auto pr-1">
                {p.activity.map((a) => {
                  const s = a.stepId ? findStep(a.stepId) : null;
                  return (
                    <li key={a.id} className="text-[12px] leading-snug">
                      <span
                        className={cn(
                          "mr-1.5 inline-block rounded px-1.5 py-px text-[10.5px] font-semibold",
                          a.kind === "sent" && "bg-success-soft text-success-strong",
                          a.kind === "failed" && "bg-critical-soft text-critical-strong",
                          (a.kind === "skipped" || a.kind === "stopped") && "bg-warning-soft text-warning-strong",
                          !["sent", "failed", "skipped", "stopped"].includes(a.kind) && "bg-surface text-ink-secondary",
                        )}
                      >
                        {a.kind}
                      </span>
                      <span className="text-ink">{a.email ?? "deleted account"}</span>
                      {s && <span className="text-ink-secondary"> · {stepTitle(s, p.emails).title}</span>}
                      {a.detail && <span className="block text-ink-faint">{a.detail}</span>}
                      <span className="text-ink-faint">{ago(a.createdAt)}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
        {!readOnly && (
          <button
            onClick={() => void deleteFlow()}
            disabled={busy !== null}
            className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-medium text-critical-strong transition-colors hover:bg-critical-soft"
          >
            {busy === "delete" ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />} Delete flow
          </button>
        )}
      </div>
    );
  })();

  /* ---------------- layout ---------------- */

  const iconBtn =
    "inline-flex size-9 items-center justify-center rounded-lg text-white/80 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-35 disabled:hover:bg-transparent";

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-card bg-card shadow-card",
        full ? "fixed inset-2 z-50 sm:inset-4" : "h-[calc(100svh-9.5rem)] min-h-[620px]",
      )}
    >
      {/* Top bar */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 bg-[#0f1115] px-3 py-2.5 text-white">
        <Link
          href="/dashboard/automations/flows"
          className="inline-flex size-9 items-center justify-center rounded-lg text-white/80 hover:bg-white/10 hover:text-white"
          aria-label="Back to flows"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div className="flex items-center gap-2 border-r border-white/10 pr-3">
          <span className="inline-flex size-7 items-center justify-center rounded-lg bg-primary text-primary-contrast">
            <Workflow className="size-4" aria-hidden />
          </span>
          <span className="hidden text-[13px] font-semibold tracking-tight sm:inline">MyKavo Automation Tool</span>
        </div>
        {readOnly ? (
          <span className="text-[14px] font-semibold">{name}</span>
        ) : (
          <input
            value={name}
            maxLength={FLOW_LIMITS.name}
            onChange={(e) => {
              setName(e.target.value);
              setDirty(true);
            }}
            aria-label="Flow name"
            className="w-40 min-w-0 rounded-lg bg-transparent sm:w-56 px-2 py-1 text-[14px] font-semibold text-white outline-none ring-white/20 hover:ring-1 focus:bg-white/10 focus:ring-1"
          />
        )}
        <StatusPill status={status} />
        {dirty && <span className="text-[11.5px] text-white/60">Unsaved changes</span>}

        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          {!readOnly && (
            <>
              <button className={iconBtn} onClick={undo} disabled={!past.length} aria-label="Undo" title="Undo (Ctrl/⌘ Z)">
                <Undo2 className="size-4" />
              </button>
              <button className={iconBtn} onClick={redo} disabled={!future.length} aria-label="Redo" title="Redo (Shift Ctrl/⌘ Z)">
                <Redo2 className="size-4" />
              </button>
            </>
          )}
          <div className="relative">
            <button
              onClick={() => setIssuesOpen((v) => !v)}
              aria-expanded={issuesOpen}
              className={cn(
                "inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-[12.5px] font-medium transition-colors",
                issues.length ? "bg-critical/20 text-[#ffb4b4] hover:bg-critical/30" : "bg-success/20 text-[#9be6b4] hover:bg-success/30",
              )}
            >
              {issues.length ? <AlertCircle className="size-4" /> : <CheckCircle2 className="size-4" />}
              {issues.length ? `${issues.length} to fix` : "Ready to run"}
              <ChevronDown className="size-3.5 opacity-70" />
            </button>
            {issuesOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setIssuesOpen(false)} aria-hidden />
                <div className="absolute right-0 top-full z-40 mt-2 w-80 rounded-xl border border-line bg-card p-2 text-ink shadow-[0_18px_40px_-18px_rgba(0,0,0,0.5)]">
                  {issues.length === 0 ? (
                    <p className="flex items-center gap-2 p-2 text-[13px]">
                      <CheckCircle2 className="size-4 text-success" /> Every step is complete. This flow can run.
                    </p>
                  ) : (
                    <ul>
                      {issues.map((i, n) => (
                        <li key={n}>
                          <button
                            className="flex w-full items-start gap-2 rounded-lg p-2 text-left text-[12.5px] hover:bg-surface"
                            onClick={() => {
                              if (i.stepId) setSelected(i.stepId);
                              setIssuesOpen(false);
                            }}
                          >
                            <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-critical" />
                            {i.message}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            )}
          </div>
          <button
            onClick={() => setFull((v) => !v)}
            className={iconBtn}
            aria-pressed={full}
            aria-label={full ? "Exit full screen" : "Full screen"}
            title={full ? "Exit full screen (Esc)" : "Full screen"}
          >
            {full ? <Minimize2 className="size-4" /> : <Expand className="size-4" />}
          </button>
          <button
            onClick={() => {
              setSimulate((v) => !v);
              setSelected(null);
            }}
            aria-pressed={simulate}
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-[12.5px] font-medium transition-colors",
              simulate ? "bg-white text-[#0f1115]" : "text-white/85 hover:bg-white/10",
            )}
          >
            <FlaskConical className="size-4" /> Simulate
          </button>
          {readOnly ? (
            <button
              onClick={() => void duplicate()}
              disabled={busy !== null || !p.ready}
              title={p.ready ? undefined : "Run the automation_flow migration first"}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3.5 text-[12.5px] font-semibold text-primary-contrast transition-colors hover:bg-primary-hover disabled:opacity-50"
            >
              {busy === "duplicate" ? <Loader2 className="size-4 animate-spin" /> : <Copy className="size-4" />} Copy to a new flow
            </button>
          ) : (
            <>
              <button
                onClick={() => void save()}
                disabled={!dirty || busy !== null}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/20 px-3.5 text-[12.5px] font-medium text-white transition-colors hover:bg-white/10 disabled:opacity-40"
              >
                {busy === "save" ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save
              </button>
              {status === "ACTIVE" ? (
                <button
                  onClick={() => void setFlowStatus("PAUSED")}
                  disabled={busy !== null}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-white/10 px-3.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-white/20"
                >
                  {busy === "status" ? <Loader2 className="size-4 animate-spin" /> : <Pause className="size-4" />} Pause
                </button>
              ) : (
                <button
                  onClick={() => void setFlowStatus("ACTIVE")}
                  disabled={busy !== null}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3.5 text-[12.5px] font-semibold text-primary-contrast transition-colors hover:bg-primary-hover"
                >
                  {busy === "status" ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4 fill-current" />} Activate
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {readOnly && (
        <div className="border-b border-line bg-primary-soft px-4 py-2 text-[12.5px] text-ink">
          This is how the built-in emails behave today. It is drawn from their rules, so it cannot be edited here - copy it to
          build your own version.
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        {/* Toolbox */}
        <aside className="hidden w-60 shrink-0 flex-col border-r border-line bg-card lg:flex" aria-label="Toolbox">
          <div className="border-b border-line px-4 py-3">
            <p className="text-[14px] font-semibold text-ink">Toolbox</p>
            <p className="text-[11.5px] text-ink-faint">{readOnly ? "Copy the flow to edit it" : "Click to add, or drag onto a +"}</p>
          </div>
          <div className="flex-1 space-y-4 overflow-y-auto px-2 py-3">
            <div>
              <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-faint">Logic</p>
              <ToolboxItem kind={{ type: "wait" }} title="Wait" hint="Pause for some days" tile="bg-[#F5A524]" disabled={readOnly} onAdd={addFromToolbox} />
              <ToolboxItem kind={{ type: "decision" }} title="Decision" hint="Branch on account data" tile="bg-[#EA7A1A]" disabled={readOnly} onAdd={addFromToolbox} />
            </div>
            <div>
              <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-faint">Your emails</p>
              <ToolboxItem kind={{ type: "custom" }} title="Custom email" hint="Write your own" tile="bg-[#E5487A]" disabled={readOnly} onAdd={addFromToolbox} />
            </div>
            <div>
              <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-faint">Built-in emails ({p.emails.length})</p>
              {p.emails.map((e) => (
                <ToolboxItem
                  key={e.key}
                  kind={{ type: "builtin", key: e.key }}
                  title={e.name}
                  hint={e.group}
                  tile="bg-[#3556F4]"
                  disabled={readOnly}
                  onAdd={addFromToolbox}
                />
              ))}
            </div>
          </div>
        </aside>

        {/* Canvas */}
        <div className="relative min-w-0 flex-1">
          <div
            ref={viewport}
            className="absolute inset-0 overflow-auto bg-surface bg-[radial-gradient(circle,rgba(125,125,140,0.28)_1px,transparent_1px)] [background-size:20px_20px]"
          >
            <div ref={content} style={{ zoom }} className="min-w-full w-max">
              <FlowCanvas
                steps={def.steps}
                triggerLabel={triggerLabel}
                triggerSub={triggerSub}
                emails={p.emails}
                selected={selected}
                onSelect={setSelected}
                onInsert={insert}
                readOnly={readOnly}
                stats={p.stats}
                issueIds={issueIds}
                path={path}
              />
            </div>
          </div>
          {def.steps.length === 0 && !readOnly && (
            <div className="pointer-events-none absolute inset-x-0 top-52 flex justify-center">
              <p className="rounded-full bg-card px-4 py-2 text-[12.5px] text-ink-secondary shadow-card">
                Drag a step from the toolbox onto the <Plus className="inline size-3.5" /> - or click it
              </p>
            </div>
          )}
          <div className="absolute bottom-4 left-4 flex items-center overflow-hidden rounded-xl border border-line bg-card shadow-card">
            <button className="p-2.5 text-ink-secondary hover:bg-surface hover:text-ink" onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.1).toFixed(2)))} aria-label="Zoom out">
              <Minus className="size-4" />
            </button>
            <span className="w-12 text-center text-[12px] tabular-nums text-ink-secondary">{Math.round(zoom * 100)}%</span>
            <button className="p-2.5 text-ink-secondary hover:bg-surface hover:text-ink" onClick={() => setZoom((z) => Math.min(1.3, +(z + 0.1).toFixed(2)))} aria-label="Zoom in">
              <Plus className="size-4" />
            </button>
            <button className="border-l border-line p-2.5 text-ink-secondary hover:bg-surface hover:text-ink" onClick={fit} aria-label="Fit to screen" title="Fit to screen">
              <Maximize2 className="size-4" />
            </button>
          </div>
          {toast && (
            <div
              role={toast.tone === "error" ? "alert" : "status"}
              className={cn(
                "absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full px-4 py-2 text-[13px] font-medium shadow-card",
                toast.tone === "ok" ? "bg-ink text-ink-inverse" : "bg-critical text-white",
              )}
            >
              {toast.text}
            </div>
          )}
        </div>

        {/* Inspector */}
        <aside className="hidden w-80 shrink-0 overflow-y-auto border-l border-line bg-card p-5 md:block" aria-label="Properties">
          {inspector}
        </aside>
      </div>

      {/* Phones: the inspector as a bottom sheet while something is selected. */}
      {(selectedStep || simulate) && (
        <div className="fixed inset-x-0 bottom-0 z-40 max-h-[62svh] overflow-y-auto rounded-t-2xl border-t border-line bg-card p-5 shadow-[0_-12px_40px_-16px_rgba(0,0,0,0.4)] md:hidden">
          {inspector}
        </div>
      )}

      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setPreview(null)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Email preview"
            className="flex max-h-[90svh] w-full max-w-2xl flex-col overflow-hidden rounded-card bg-card shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-wide text-ink-faint">Subject</p>
                <p className="truncate text-[14px] font-semibold text-ink">{preview.subject}</p>
              </div>
              <button onClick={() => setPreview(null)} className="rounded-md p-1.5 text-ink-faint hover:bg-surface hover:text-ink" aria-label="Close preview">
                <X className="size-4" />
              </button>
            </div>
            {/* sandbox="" - no scripts, no same-origin, no navigation out of the frame. */}
            <iframe title="Email preview" sandbox="" srcDoc={preview.html} className="h-[70svh] w-full bg-white" />
          </div>
        </div>
      )}
    </div>
  );
}
