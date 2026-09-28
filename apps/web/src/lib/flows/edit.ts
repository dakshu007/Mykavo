import type { FlowCondition, FlowDefinition, FlowStep } from "@mykavo/shared/flows";

/**
 * Pure edits on a flow's step tree, for the builder. Every function returns
 * a new definition and never mutates, so undo is a stack of old values.
 */

/** Where a new step goes: a list (the main path, or one branch of a decision) and a position in it. */
export interface InsertTarget {
  /** The decision whose branch this is; null for the main path. */
  decisionId: string | null;
  branch: "yes" | "no" | null;
  index: number;
}

export type NewStepKind =
  | { type: "wait" }
  | { type: "decision" }
  | { type: "builtin"; key: string }
  | { type: "custom" };

export function newStepId(): string {
  return `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

export function createStep(kind: NewStepKind, id: string = newStepId()): FlowStep {
  switch (kind.type) {
    case "wait":
      return { id, type: "wait", days: 1 };
    case "decision":
      return { id, type: "decision", condition: "has_website" as FlowCondition, yes: [], no: [] };
    case "builtin":
      return { id, type: "email", email: { kind: "builtin", key: kind.key } };
    case "custom":
      return {
        id,
        type: "email",
        email: { kind: "custom", subject: "", heading: "", body: "Hi {firstName},\n\n", buttonLabel: "Open MyKavo", buttonUrl: "/dashboard" },
      };
  }
}

function mapLists(steps: FlowStep[], fn: (list: FlowStep[], decisionId: string | null, branch: "yes" | "no" | null) => FlowStep[]): FlowStep[] {
  const walk = (list: FlowStep[], decisionId: string | null, branch: "yes" | "no" | null): FlowStep[] =>
    fn(list, decisionId, branch).map((s) =>
      s.type === "decision" ? { ...s, yes: walk(s.yes, s.id, "yes"), no: walk(s.no, s.id, "no") } : s,
    );
  return walk(steps, null, null);
}

export function insertStep(def: FlowDefinition, target: InsertTarget, step: FlowStep): FlowDefinition {
  return {
    ...def,
    steps: mapLists(def.steps, (list, decisionId, branch) => {
      if (decisionId !== target.decisionId || branch !== target.branch) return list;
      const i = Math.max(0, Math.min(target.index, list.length));
      return [...list.slice(0, i), step, ...list.slice(i)];
    }),
  };
}

/** Remove a step; a decision goes with both of its branches. */
export function removeStep(def: FlowDefinition, id: string): FlowDefinition {
  return { ...def, steps: mapLists(def.steps, (list) => list.filter((s) => s.id !== id)) };
}

export function replaceStep(def: FlowDefinition, id: string, next: FlowStep): FlowDefinition {
  return { ...def, steps: mapLists(def.steps, (list) => list.map((s) => (s.id === id ? next : s))) };
}

/** The main-path position just after a step, for "add after the selected step". */
export function targetAfter(def: FlowDefinition, id: string): InsertTarget | null {
  let found: InsertTarget | null = null;
  mapLists(def.steps, (list, decisionId, branch) => {
    const i = list.findIndex((s) => s.id === id);
    if (i >= 0) found = { decisionId, branch, index: i + 1 };
    return list;
  });
  return found;
}

/** Count steps, for the list page and limits. */
export function countSteps(steps: FlowStep[]): number {
  return steps.reduce((n, s) => n + 1 + (s.type === "decision" ? countSteps(s.yes) + countSteps(s.no) : 0), 0);
}
