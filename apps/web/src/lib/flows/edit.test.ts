import { describe, expect, it } from "vitest";
import { emptyFlow, type FlowDefinition } from "@mykavo/shared/flows";
import { countSteps, createStep, insertStep, removeStep, replaceStep, targetAfter } from "./edit";

const base = (): FlowDefinition => {
  let f = emptyFlow();
  f = insertStep(f, { decisionId: null, branch: null, index: 0 }, createStep({ type: "builtin", key: "welcome" }, "a"));
  f = insertStep(f, { decisionId: null, branch: null, index: 1 }, createStep({ type: "decision" }, "d"));
  f = insertStep(f, { decisionId: "d", branch: "no", index: 0 }, createStep({ type: "wait" }, "w"));
  return f;
};

describe("flow editing", () => {
  it("inserts on the main path and inside branches", () => {
    const f = base();
    expect(f.steps.map((s) => s.id)).toEqual(["a", "d"]);
    const d = f.steps[1];
    expect(d.type === "decision" && d.no.map((s) => s.id)).toEqual(["w"]);
    expect(countSteps(f.steps)).toBe(3);
  });

  it("inserts before the first step and clamps out-of-range positions", () => {
    const f = insertStep(base(), { decisionId: null, branch: null, index: 99 }, createStep({ type: "custom" }, "z"));
    expect(f.steps.map((s) => s.id)).toEqual(["a", "d", "z"]);
    const g = insertStep(base(), { decisionId: null, branch: null, index: 0 }, createStep({ type: "wait" }, "first"));
    expect(g.steps[0].id).toBe("first");
  });

  it("removes a step, and a decision with its branches", () => {
    expect(countSteps(removeStep(base(), "w").steps)).toBe(2);
    expect(countSteps(removeStep(base(), "d").steps)).toBe(1);
  });

  it("replaces a step anywhere and never mutates the original", () => {
    const f = base();
    const g = replaceStep(f, "w", { id: "w", type: "wait", days: 5 });
    const d = g.steps[1];
    expect(d.type === "decision" && d.no[0]).toEqual({ id: "w", type: "wait", days: 5 });
    const orig = f.steps[1];
    expect(orig.type === "decision" && orig.no[0]).toEqual({ id: "w", type: "wait", days: 1 });
  });

  it("finds the slot after a step, in whichever list it is", () => {
    expect(targetAfter(base(), "a")).toEqual({ decisionId: null, branch: null, index: 1 });
    expect(targetAfter(base(), "w")).toEqual({ decisionId: "d", branch: "no", index: 1 });
    expect(targetAfter(base(), "nope")).toBeNull();
  });
});
