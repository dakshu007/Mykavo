"use client";

import { useState } from "react";
import { AlertCircle, Clock, GitBranch, Mail, PenLine, Play, Plus, Users } from "lucide-react";
import { FLOW_CONDITIONS, type FlowStep } from "@mykavo/shared/flows";
import type { InsertTarget, NewStepKind } from "@/lib/flows/edit";
import type { BuiltinEmailOption, StepStats } from "@/lib/flows/server";
import { cn } from "@/lib/utils";

/**
 * The Automation Tool canvas: the flow drawn top to bottom, Salesforce-style
 * auto layout. Decisions split into Yes / No columns that rejoin below, so
 * the picture is always tidy and always matches how the engine walks it.
 * Every connector is a place to add a step: click its "+" or drop a toolbox
 * item on it.
 */

export const DRAG_TYPE = "application/x-mykavo-step";

export interface CanvasProps {
  steps: FlowStep[];
  triggerLabel: string;
  triggerSub: string;
  emails: BuiltinEmailOption[];
  selected: string | null;
  onSelect: (id: string | null) => void;
  onInsert: (target: InsertTarget, kind: NewStepKind) => void;
  readOnly: boolean;
  stats: Record<string, StepStats>;
  issueIds: Set<string>;
  /** When simulating: the steps the simulated account passes through. */
  path: Set<string> | null;
}

type Tone = { tile: string; label: string };
const TONES: Record<"wait" | "decision" | "builtin" | "custom", Tone> = {
  wait: { tile: "bg-[#F5A524] text-white", label: "Wait" },
  decision: { tile: "bg-[#EA7A1A] text-white", label: "Decision" },
  builtin: { tile: "bg-[#3556F4] text-white", label: "Send email" },
  custom: { tile: "bg-[#E5487A] text-white", label: "Custom email" },
};

export function stepTone(step: FlowStep): Tone {
  if (step.type === "wait") return TONES.wait;
  if (step.type === "decision") return TONES.decision;
  return step.email.kind === "builtin" ? TONES.builtin : TONES.custom;
}

export function StepIcon({ step, className }: { step: FlowStep | NewStepKind; className?: string }) {
  const type = step.type;
  if (type === "wait") return <Clock className={className} aria-hidden />;
  if (type === "decision") return <GitBranch className={className} aria-hidden />;
  if (type === "custom" || (type === "email" && "email" in step && step.email.kind === "custom")) {
    return <PenLine className={className} aria-hidden />;
  }
  return <Mail className={className} aria-hidden />;
}

export function stepTitle(step: FlowStep, emails: BuiltinEmailOption[]): { title: string; sub: string } {
  if (step.type === "wait") return { title: `Wait ${step.days} day${step.days === 1 ? "" : "s"}`, sub: "Then continue" };
  if (step.type === "decision") {
    const c = FLOW_CONDITIONS[step.condition];
    return { title: c ? `${c.label}?` : "Choose a condition", sub: "Yes / No" };
  }
  if (step.email.kind === "builtin") {
    const key = step.email.key;
    const e = emails.find((x) => x.key === key);
    return { title: e?.name ?? "Choose an email", sub: "Built-in email" };
  }
  return { title: step.email.subject.trim() || "Untitled email", sub: "Your own email" };
}

/* ------------------------------------------------------------------ */

function NodeCard({
  step,
  props,
}: {
  step: FlowStep;
  props: CanvasProps;
}) {
  const tone = stepTone(step);
  const { title, sub } = stepTitle(step, props.emails);
  const st = props.stats[step.id];
  const selected = props.selected === step.id;
  const dim = props.path !== null && !props.path.has(step.id);
  const onPath = props.path !== null && props.path.has(step.id);
  const bad = props.issueIds.has(step.id);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        props.onSelect(step.id);
      }}
      aria-pressed={selected}
      className={cn(
        "group relative z-10 flex w-[248px] items-center gap-3 rounded-2xl border bg-card p-3 text-left shadow-card transition-all duration-150",
        "hover:-translate-y-px hover:shadow-[0_8px_24px_-12px_rgba(0,0,0,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        selected ? "border-accent ring-2 ring-accent/40" : "border-line",
        onPath && !selected && "border-success ring-2 ring-success/30",
        dim && "opacity-35",
      )}
    >
      <span
        className={cn(
          "inline-flex size-11 shrink-0 items-center justify-center shadow-sm",
          tone.tile,
          step.type === "decision" ? "rotate-45 rounded-lg" : "rounded-xl",
        )}
      >
        <StepIcon step={step} className={cn("size-5", step.type === "decision" && "-rotate-45")} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-faint">{tone.label}</span>
        <span className="block truncate text-[13.5px] font-semibold text-ink">{title}</span>
        <span className="block truncate text-[12px] text-ink-secondary">{sub}</span>
      </span>
      {st && (st.sent > 0 || st.here > 0) && (
        <span className="absolute -right-2 -top-2 flex gap-1">
          {st.here > 0 && (
            <span
              className="inline-flex items-center gap-0.5 rounded-full bg-ink px-1.5 py-0.5 text-[10.5px] font-semibold text-ink-inverse"
              title={`${st.here} account${st.here === 1 ? "" : "s"} waiting here`}
            >
              <Users className="size-3" aria-hidden />
              {st.here}
            </span>
          )}
          {st.sent > 0 && (
            <span
              className="rounded-full bg-success px-1.5 py-0.5 text-[10.5px] font-semibold text-white"
              title={`${st.sent} sent`}
            >
              {st.sent} sent
            </span>
          )}
        </span>
      )}
      {bad && (
        <span className="absolute -left-2 -top-2 rounded-full bg-card text-critical" title="Needs attention">
          <AlertCircle className="size-5" aria-hidden />
        </span>
      )}
    </button>
  );
}

function Tile({ className, children }: { className: string; children: React.ReactNode }) {
  return <span className={cn("inline-flex size-6 items-center justify-center rounded-md text-white", className)}>{children}</span>;
}

function AddMenu({
  emails,
  onPick,
  onClose,
}: {
  emails: BuiltinEmailOption[];
  onPick: (kind: NewStepKind) => void;
  onClose: () => void;
}) {
  const [emailsOpen, setEmailsOpen] = useState(false);
  const item =
    "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] text-ink transition-colors hover:bg-surface focus-visible:bg-surface focus-visible:outline-none";
  return (
    <>
      <div className="fixed inset-0 z-30" onClick={onClose} aria-hidden />
      <div
        role="menu"
        className="absolute left-1/2 top-full z-40 mt-1 w-64 -translate-x-1/2 rounded-xl border border-line bg-card p-1.5 shadow-[0_18px_40px_-18px_rgba(0,0,0,0.45)]"
        onKeyDown={(e) => e.key === "Escape" && onClose()}
      >
        {!emailsOpen ? (
          <>
            <p className="px-2.5 pb-1 pt-1.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-faint">Add a step</p>
            <button role="menuitem" className={item} onClick={() => onPick({ type: "wait" })}>
              <Tile className="bg-[#F5A524]"><Clock className="size-3.5" /></Tile> Wait
            </button>
            <button role="menuitem" className={item} onClick={() => onPick({ type: "decision" })}>
              <Tile className="bg-[#EA7A1A]"><GitBranch className="size-3.5" /></Tile> Decision
            </button>
            <button role="menuitem" className={item} onClick={() => onPick({ type: "custom" })}>
              <Tile className="bg-[#E5487A]"><PenLine className="size-3.5" /></Tile> Custom email
            </button>
            <button role="menuitem" className={item} onClick={() => setEmailsOpen(true)}>
              <Tile className="bg-[#3556F4]"><Mail className="size-3.5" /></Tile> Built-in email
              <span className="ml-auto text-ink-faint">›</span>
            </button>
          </>
        ) : (
          <>
            <button className={cn(item, "text-ink-secondary")} onClick={() => setEmailsOpen(false)}>
              ‹ Back
            </button>
            {emails.map((e) => (
              <button key={e.key} role="menuitem" className={item} onClick={() => onPick({ type: "builtin", key: e.key })}>
                <Tile className="bg-[#3556F4]"><Mail className="size-3.5" /></Tile>
                <span className="truncate">{e.name}</span>
              </button>
            ))}
          </>
        )}
      </div>
    </>
  );
}

function Connector({
  target,
  props,
  short,
}: {
  target: InsertTarget;
  props: CanvasProps;
  short?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [over, setOver] = useState(false);
  const h = short ? "h-8" : "h-12";
  if (props.readOnly) return <div className={cn("w-0.5 bg-line", h)} aria-hidden />;
  return (
    <div
      className={cn("relative flex w-24 flex-col items-center", h)}
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes(DRAG_TYPE)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        setOver(false);
        const raw = e.dataTransfer.getData(DRAG_TYPE);
        if (!raw) return;
        e.preventDefault();
        try {
          props.onInsert(target, JSON.parse(raw) as NewStepKind);
        } catch {
          // Not ours.
        }
      }}
    >
      <div className={cn("w-0.5 flex-1 transition-colors", over ? "bg-accent" : "bg-line")} aria-hidden />
      <button
        type="button"
        aria-label="Add a step here"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className={cn(
          "absolute top-1/2 inline-flex -translate-y-1/2 items-center justify-center rounded-full border bg-card text-ink-secondary shadow-sm transition-all",
          "hover:scale-110 hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
          over ? "h-7 w-20 border-dashed border-accent text-[11px] font-medium text-accent" : "size-6 border-line",
        )}
      >
        {over ? "Drop here" : <Plus className="size-3.5" aria-hidden />}
      </button>
      {open && (
        <AddMenu
          emails={props.emails}
          onClose={() => setOpen(false)}
          onPick={(kind) => {
            setOpen(false);
            props.onInsert(target, kind);
          }}
        />
      )}
    </div>
  );
}

function StepList({
  steps,
  decisionId,
  branch,
  props,
}: {
  steps: FlowStep[];
  decisionId: string | null;
  branch: "yes" | "no" | null;
  props: CanvasProps;
}) {
  return (
    <>
      <Connector target={{ decisionId, branch, index: 0 }} props={props} short={branch !== null} />
      {steps.map((s, i) => (
        <div key={s.id} className="flex flex-col items-center">
          {s.type === "decision" ? <DecisionBlock step={s} props={props} /> : <NodeCard step={s} props={props} />}
          <Connector target={{ decisionId, branch, index: i + 1 }} props={props} />
        </div>
      ))}
    </>
  );
}

function DecisionBlock({ step, props }: { step: Extract<FlowStep, { type: "decision" }>; props: CanvasProps }) {
  const branches: ("yes" | "no")[] = ["yes", "no"];
  return (
    <div className="flex flex-col items-center">
      <NodeCard step={step} props={props} />
      <div className="h-5 w-0.5 bg-line" aria-hidden />
      <div className="flex items-stretch">
        {branches.map((b) => (
          <div key={b} className="relative flex flex-col items-center px-6">
            <div className={cn("absolute top-0 h-0.5 bg-line", b === "yes" ? "left-1/2 right-0" : "left-0 right-1/2")} aria-hidden />
            <div className="h-4 w-0.5 bg-line" aria-hidden />
            <span
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
                b === "yes"
                  ? "border-success/40 bg-success-soft text-success-strong"
                  : "border-line bg-surface text-ink-secondary",
              )}
            >
              {b === "yes" ? "Yes" : "No"}
            </span>
            <StepList steps={step[b]} decisionId={step.id} branch={b} props={props} />
            <div className="w-0.5 flex-1 bg-line" aria-hidden />
            <div className={cn("absolute bottom-0 h-0.5 bg-line", b === "yes" ? "left-1/2 right-0" : "left-0 right-1/2")} aria-hidden />
          </div>
        ))}
      </div>
    </div>
  );
}

export function FlowCanvas(props: CanvasProps) {
  const startSelected = props.selected === "trigger";
  return (
    <div className="flex w-max min-w-full flex-col items-center px-16 pb-24 pt-10" onClick={() => props.onSelect(null)}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          props.onSelect("trigger");
        }}
        aria-pressed={startSelected}
        className={cn(
          "relative z-10 flex w-[280px] flex-col items-center rounded-2xl border bg-card px-5 pb-4 pt-9 text-center shadow-card transition-all hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
          startSelected ? "border-accent ring-2 ring-accent/40" : "border-line",
        )}
      >
        <span className="absolute -top-6 inline-flex size-12 items-center justify-center rounded-full border-4 border-card bg-primary text-primary-contrast shadow-card">
          <Play className="ml-0.5 size-5 fill-current" aria-hidden />
        </span>
        <span className="text-[15px] font-semibold text-ink">Start</span>
        <span className="text-[12.5px] text-ink-secondary">{props.triggerLabel}</span>
        <span className="mt-1 text-[11.5px] text-ink-faint">{props.triggerSub}</span>
      </button>
      <StepList steps={props.steps} decisionId={null} branch={null} props={props} />
      <span className="rounded-full border border-line bg-card px-4 py-1.5 text-[12px] font-semibold text-ink-secondary shadow-card">
        End
      </span>
    </div>
  );
}
