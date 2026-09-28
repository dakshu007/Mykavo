/**
 * MyKavo Automation Tool: custom email flows built in Admin > Automations.
 *
 * A flow is a trigger and a tree of steps - wait, decision, send email.
 * Decisions branch into Yes / No step lists that rejoin the main path when
 * they end, which is what lets the builder lay a flow out automatically
 * (no free-floating arrows to tangle) and what makes "where does this
 * account go next" a pure function.
 *
 * Everything here is pure: the builder, the simulator and the worker's
 * engine all walk a flow with the same code, so what the simulator shows is
 * what the worker does.
 */

export type FlowTrigger = "signup" | "first_website";
export type FlowCondition = "has_website" | "is_paid" | "has_android_app" | "has_open_changes" | "has_urgent_changes";
export type FlowStatus = "DRAFT" | "ACTIVE" | "PAUSED";

export interface CustomFlowEmail {
  kind: "custom";
  subject: string;
  heading: string;
  body: string;
  buttonLabel: string;
  /** A path on the app ("/dashboard/billing") or an https:// address. */
  buttonUrl: string;
}
export type FlowEmail = { kind: "builtin"; key: string } | CustomFlowEmail;

export type FlowStep =
  | { id: string; type: "wait"; days: number }
  | { id: string; type: "email"; email: FlowEmail }
  | { id: string; type: "decision"; condition: FlowCondition; yes: FlowStep[]; no: FlowStep[] };

export interface FlowDefinition {
  version: 1;
  /** Stop an account's run as soon as it is on a paid plan. */
  exitOnPaid: boolean;
  steps: FlowStep[];
}

export const FLOW_TRIGGERS: Record<FlowTrigger, { label: string; description: string }> = {
  signup: { label: "Account created", description: "Starts for every account created while the flow is active." },
  first_website: {
    label: "First website added",
    description: "Starts when an account adds its first website while the flow is active.",
  },
};

export const FLOW_CONDITIONS: Record<FlowCondition, { label: string; question: string }> = {
  has_website: { label: "Has a website", question: "Has the account added a website?" },
  is_paid: { label: "On a paid plan", question: "Is the account on a paid plan?" },
  has_android_app: { label: "Has the Android app", question: "Has the account requested or installed the app?" },
  has_open_changes: { label: "Has open changes", question: "Are changes waiting for review?" },
  has_urgent_changes: { label: "Has High or Critical changes", question: "Is a High or Critical change open?" },
};

export type FlowFacts = Record<FlowCondition, boolean>;

export const FLOW_LIMITS = {
  steps: 40,
  depth: 5,
  waitDays: 60,
  subject: 150,
  heading: 120,
  body: 2000,
  buttonLabel: 40,
  buttonUrl: 500,
  name: 80,
} as const;

export function isFlowTrigger(v: unknown): v is FlowTrigger {
  return typeof v === "string" && v in FLOW_TRIGGERS;
}
export function isFlowCondition(v: unknown): v is FlowCondition {
  return typeof v === "string" && v in FLOW_CONDITIONS;
}

export function emptyFlow(): FlowDefinition {
  return { version: 1, exitOnPaid: true, steps: [] };
}

/* ------------------------------------------------------------------ */
/* Parsing and validation                                             */
/* ------------------------------------------------------------------ */

export interface FlowIssue {
  /** The step the problem is on, when it is about one step. */
  stepId: string | null;
  message: string;
}

const ID_RE = /^[a-zA-Z0-9_-]{1,40}$/;

function str(v: unknown): string {
  return typeof v === "string" ? v.replace(/\r\n/g, "\n") : "";
}

/**
 * Turn untrusted JSON (a request body, a stored row) into a definition, or
 * say why it cannot be one. Structural only: an incomplete but well-formed
 * flow parses, and `flowIssues` then lists what stops it from running.
 */
export function parseFlowDefinition(raw: unknown): { ok: true; flow: FlowDefinition } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object") return { ok: false, error: "Not a flow." };
  const r = raw as Record<string, unknown>;
  const seen = new Set<string>();
  let count = 0;

  const steps = (list: unknown, depth: number): FlowStep[] | string => {
    if (!Array.isArray(list)) return "Steps must be a list.";
    if (depth > FLOW_LIMITS.depth) return `Decisions can be nested ${FLOW_LIMITS.depth} deep at most.`;
    const out: FlowStep[] = [];
    for (const item of list) {
      if (++count > FLOW_LIMITS.steps) return `A flow can have ${FLOW_LIMITS.steps} steps at most.`;
      if (!item || typeof item !== "object") return "A step is malformed.";
      const s = item as Record<string, unknown>;
      const id = str(s.id);
      if (!ID_RE.test(id) || seen.has(id)) return "A step has a missing or repeated id.";
      seen.add(id);
      if (s.type === "wait") {
        const days = Number(s.days);
        out.push({ id, type: "wait", days: Number.isFinite(days) ? Math.trunc(days) : 0 });
      } else if (s.type === "email") {
        const e = (s.email ?? {}) as Record<string, unknown>;
        if (e.kind === "builtin") out.push({ id, type: "email", email: { kind: "builtin", key: str(e.key) } });
        else if (e.kind === "custom") {
          out.push({
            id,
            type: "email",
            email: {
              kind: "custom",
              subject: str(e.subject),
              heading: str(e.heading),
              body: str(e.body),
              buttonLabel: str(e.buttonLabel),
              buttonUrl: str(e.buttonUrl).trim(),
            },
          });
        } else return "An email step has no email.";
      } else if (s.type === "decision") {
        const yes = steps(s.yes, depth + 1);
        if (typeof yes === "string") return yes;
        const no = steps(s.no, depth + 1);
        if (typeof no === "string") return no;
        out.push({ id, type: "decision", condition: str(s.condition) as FlowCondition, yes, no });
      } else return "A step has an unknown type.";
    }
    return out;
  };

  const parsed = steps(r.steps, 0);
  if (typeof parsed === "string") return { ok: false, error: parsed };
  return { ok: true, flow: { version: 1, exitOnPaid: r.exitOnPaid !== false, steps: parsed } };
}

export function isSafeButtonUrl(url: string): boolean {
  if (url.startsWith("/") && !url.startsWith("//")) return !/\s/.test(url);
  try {
    const u = new URL(url);
    return u.protocol === "https:" && !u.username && !u.password;
  } catch {
    return false;
  }
}

/**
 * Everything that stops a flow from being switched on. Empty means it can
 * run. `builtinKeys` are the built-in emails an email step may use.
 */
export function flowIssues(flow: FlowDefinition, builtinKeys: readonly string[]): FlowIssue[] {
  const issues: FlowIssue[] = [];
  let emails = 0;
  const visit = (list: FlowStep[]) => {
    for (const s of list) {
      if (s.type === "wait") {
        if (!Number.isInteger(s.days) || s.days < 1 || s.days > FLOW_LIMITS.waitDays) {
          issues.push({ stepId: s.id, message: `Wait between 1 and ${FLOW_LIMITS.waitDays} days.` });
        }
      } else if (s.type === "decision") {
        if (!isFlowCondition(s.condition)) issues.push({ stepId: s.id, message: "Pick what this decision checks." });
        if (s.yes.length === 0 && s.no.length === 0) {
          issues.push({ stepId: s.id, message: "Both paths are empty - add a step to Yes or No, or remove the decision." });
        }
        visit(s.yes);
        visit(s.no);
      } else {
        emails++;
        const e = s.email;
        if (e.kind === "builtin") {
          if (!builtinKeys.includes(e.key)) issues.push({ stepId: s.id, message: "Pick which email to send." });
        } else {
          const need = (v: string, field: string, max: number) => {
            if (!v.trim()) issues.push({ stepId: s.id, message: `The custom email needs a ${field}.` });
            else if (v.length > max) issues.push({ stepId: s.id, message: `Keep the ${field} under ${max} characters.` });
          };
          need(e.subject, "subject", FLOW_LIMITS.subject);
          need(e.heading, "heading", FLOW_LIMITS.heading);
          need(e.body, "message", FLOW_LIMITS.body);
          if (e.subject.includes("\n")) issues.push({ stepId: s.id, message: "The subject must be one line." });
          if (e.buttonLabel.length > FLOW_LIMITS.buttonLabel) {
            issues.push({ stepId: s.id, message: `Keep the button under ${FLOW_LIMITS.buttonLabel} characters.` });
          }
          if (e.buttonLabel.trim() && !isSafeButtonUrl(e.buttonUrl)) {
            issues.push({ stepId: s.id, message: 'The button link must be a path like "/dashboard" or an https:// address.' });
          }
        }
      }
    }
  };
  visit(flow.steps);
  if (flow.steps.length === 0) issues.push({ stepId: null, message: "Add at least one step." });
  else if (emails === 0) issues.push({ stepId: null, message: "The flow never sends an email - add a Send email step." });
  return issues;
}

/* ------------------------------------------------------------------ */
/* Walking                                                            */
/* ------------------------------------------------------------------ */

interface Location {
  step: FlowStep;
  list: FlowStep[];
  index: number;
  /** The decision this list is a branch of, or null on the main path. */
  parent: Extract<FlowStep, { type: "decision" }> | null;
}

function locate(flow: FlowDefinition): Map<string, Location> {
  const map = new Map<string, Location>();
  const visit = (list: FlowStep[], parent: Location["parent"]) => {
    list.forEach((step, index) => {
      map.set(step.id, { step, list, index, parent });
      if (step.type === "decision") {
        visit(step.yes, step);
        visit(step.no, step);
      }
    });
  };
  visit(flow.steps, null);
  return map;
}

export function findStep(flow: FlowDefinition, id: string): FlowStep | null {
  return locate(flow).get(id)?.step ?? null;
}

/** The step after `id` once `id` is finished: the next in its list, or after the decision it sits in. */
export function stepAfter(flow: FlowDefinition, id: string): FlowStep | null {
  const map = locate(flow);
  let loc = map.get(id);
  while (loc) {
    if (loc.index + 1 < loc.list.length) return loc.list[loc.index + 1];
    if (!loc.parent) return null;
    loc = map.get(loc.parent.id);
  }
  return null;
}

export type FlowPlan =
  | { kind: "send"; step: Extract<FlowStep, { type: "email" }>; nextId: string | null; decisions: FlowDecisionTaken[] }
  | { kind: "wait"; step: Extract<FlowStep, { type: "wait" }>; nextId: string | null; decisions: FlowDecisionTaken[] }
  | { kind: "done"; decisions: FlowDecisionTaken[] }
  | { kind: "missing" };

export interface FlowDecisionTaken {
  stepId: string;
  answer: boolean;
}

/**
 * From the step an account is at, what happens now: decisions are answered
 * on the spot from `facts`, until the account reaches an email to send, a
 * wait, or the end. `fromId` null means the start of the flow. A `fromId`
 * that no longer exists (the step was deleted while an account waited on
 * it) is "missing": the engine ends that run rather than guessing.
 */
export function planFrom(flow: FlowDefinition, fromId: string | null, facts: FlowFacts): FlowPlan {
  const decisions: FlowDecisionTaken[] = [];
  let step: FlowStep | null;
  if (fromId === null) step = flow.steps[0] ?? null;
  else {
    step = findStep(flow, fromId);
    if (!step) return { kind: "missing" };
  }
  let guard = 0;
  while (step && guard++ < 200) {
    if (step.type === "decision") {
      const answer: boolean = Boolean(facts[step.condition]);
      decisions.push({ stepId: step.id, answer });
      const branch: FlowStep[] = answer ? step.yes : step.no;
      step = branch[0] ?? stepAfter(flow, step.id);
      continue;
    }
    const nextId = stepAfter(flow, step.id)?.id ?? null;
    if (step.type === "wait") return { kind: "wait", step, nextId, decisions };
    return { kind: "send", step, nextId, decisions };
  }
  return { kind: "done", decisions };
}

export interface SimulatedEmail {
  stepId: string;
  day: number;
  email: FlowEmail;
}

/**
 * Walk the whole flow for one kind of account: which steps it passes
 * through and on which day (counted from the trigger) each email goes out.
 * Facts are held fixed for the whole walk - the real engine re-reads them
 * at every decision, which the builder says.
 */
export function simulateFlow(flow: FlowDefinition, facts: FlowFacts): { path: string[]; emails: SimulatedEmail[]; totalDays: number } {
  const path: string[] = [];
  const emails: SimulatedEmail[] = [];
  let day = 0;
  let at: string | null = null;
  for (let i = 0; i < 200; i++) {
    const plan = planFrom(flow, at, facts);
    if (plan.kind === "done" || plan.kind === "missing") {
      if (plan.kind === "done") path.push(...plan.decisions.map((d) => d.stepId));
      break;
    }
    path.push(...plan.decisions.map((d) => d.stepId), plan.step.id);
    if (plan.kind === "wait") day += plan.step.days;
    else emails.push({ stepId: plan.step.id, day, email: plan.step.email });
    if (!plan.nextId) break;
    at = plan.nextId;
  }
  return { path, emails, totalDays: day };
}

/** Every step, depth first, for counting and lookups. */
export function allSteps(flow: FlowDefinition): FlowStep[] {
  const out: FlowStep[] = [];
  const visit = (list: FlowStep[]) => {
    for (const s of list) {
      out.push(s);
      if (s.type === "decision") {
        visit(s.yes);
        visit(s.no);
      }
    }
  };
  visit(flow.steps);
  return out;
}

/** The send-log key for a custom email step. Built-in emails keep their own key. */
export function flowEmailKey(flowId: string, stepId: string): string {
  return `flow:${flowId}:${stepId}`;
}

export function isFlowEmailKey(key: string): boolean {
  return key.startsWith("flow:");
}
