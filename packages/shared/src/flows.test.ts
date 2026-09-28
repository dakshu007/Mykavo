import { describe, expect, it } from "vitest";
import {
  emptyFlow,
  flowIssues,
  isSafeButtonUrl,
  parseFlowDefinition,
  planFrom,
  simulateFlow,
  stepAfter,
  type FlowDefinition,
  type FlowFacts,
} from "./flows";

const KEYS = ["welcome", "day10_offer"];
const facts = (over: Partial<FlowFacts> = {}): FlowFacts => ({
  has_website: false,
  is_paid: false,
  has_android_app: false,
  has_open_changes: false,
  has_urgent_changes: false,
  ...over,
});

const custom = { kind: "custom" as const, subject: "Hi {firstName}", heading: "Hello", body: "Body", buttonLabel: "Go", buttonUrl: "/dashboard" };

// welcome -> wait 2 -> has website? yes: [offer] no: [wait 1, custom] -> custom2
const flow: FlowDefinition = {
  version: 1,
  exitOnPaid: true,
  steps: [
    { id: "w", type: "email", email: { kind: "builtin", key: "welcome" } },
    { id: "t1", type: "wait", days: 2 },
    {
      id: "d",
      type: "decision",
      condition: "has_website",
      yes: [{ id: "offer", type: "email", email: { kind: "builtin", key: "day10_offer" } }],
      no: [
        { id: "t2", type: "wait", days: 1 },
        { id: "c", type: "email", email: custom },
      ],
    },
    { id: "c2", type: "email", email: custom },
  ],
};

describe("walking a flow", () => {
  it("continues after a decision once its branch ends", () => {
    expect(stepAfter(flow, "offer")?.id).toBe("c2");
    expect(stepAfter(flow, "t2")?.id).toBe("c");
    expect(stepAfter(flow, "c")?.id).toBe("c2");
    expect(stepAfter(flow, "c2")).toBeNull();
  });

  it("plans the next action, answering decisions on the way", () => {
    expect(planFrom(flow, null, facts())).toMatchObject({ kind: "send", step: { id: "w" }, nextId: "t1" });
    expect(planFrom(flow, "t1", facts())).toMatchObject({ kind: "wait", step: { days: 2 }, nextId: "d" });
    expect(planFrom(flow, "d", facts({ has_website: true }))).toMatchObject({
      kind: "send",
      step: { id: "offer" },
      nextId: "c2",
      decisions: [{ stepId: "d", answer: true }],
    });
    expect(planFrom(flow, "d", facts())).toMatchObject({ kind: "wait", step: { id: "t2" }, nextId: "c" });
    expect(planFrom(flow, "gone", facts())).toEqual({ kind: "missing" });
  });

  it("skips an empty branch straight to what follows the decision", () => {
    const f: FlowDefinition = { ...flow, steps: [{ id: "d", type: "decision", condition: "is_paid", yes: [], no: [{ id: "x", type: "email", email: custom }] }, { id: "y", type: "email", email: custom }] };
    expect(planFrom(f, null, facts({ is_paid: true }))).toMatchObject({ kind: "send", step: { id: "y" } });
    expect(planFrom(f, "y", facts())).toMatchObject({ kind: "send", step: { id: "y" }, nextId: null });
  });

  it("simulates the days each email goes out", () => {
    expect(simulateFlow(flow, facts()).emails.map((e) => [e.stepId, e.day])).toEqual([
      ["w", 0],
      ["c", 3],
      ["c2", 3],
    ]);
    const withSite = simulateFlow(flow, facts({ has_website: true }));
    expect(withSite.emails.map((e) => [e.stepId, e.day])).toEqual([["w", 0], ["offer", 2], ["c2", 2]]);
    expect(withSite.path).toEqual(["w", "t1", "d", "offer", "c2"]);
  });
});

describe("checking a flow", () => {
  it("accepts a complete flow", () => {
    expect(flowIssues(flow, KEYS)).toEqual([]);
  });

  it("lists what stops a flow from running", () => {
    expect(flowIssues(emptyFlow(), KEYS)[0].message).toMatch(/at least one step/);
    const bad: FlowDefinition = {
      version: 1,
      exitOnPaid: true,
      steps: [
        { id: "a", type: "wait", days: 0 },
        { id: "b", type: "email", email: { kind: "builtin", key: "nope" } },
        { id: "c", type: "email", email: { ...custom, subject: "", buttonUrl: "javascript:alert(1)" } },
        { id: "d", type: "decision", condition: "has_website", yes: [], no: [] },
      ],
    };
    expect(flowIssues(bad, KEYS).map((i) => i.stepId)).toEqual(["a", "b", "c", "c", "d"]);
  });

  it("only allows app paths and https links on buttons", () => {
    expect(isSafeButtonUrl("/dashboard/billing")).toBe(true);
    expect(isSafeButtonUrl("https://mykavo.app/pricing")).toBe(true);
    expect(isSafeButtonUrl("//evil.example")).toBe(false);
    expect(isSafeButtonUrl("http://example.com")).toBe(false);
    expect(isSafeButtonUrl("javascript:alert(1)")).toBe(false);
  });
});

describe("parsing untrusted JSON", () => {
  it("round-trips a flow", () => {
    expect(parseFlowDefinition(JSON.parse(JSON.stringify(flow)))).toEqual({ ok: true, flow });
  });

  it("rejects repeated ids, unknown types and runaway nesting", () => {
    expect(parseFlowDefinition({ steps: [{ id: "a", type: "wait", days: 1 }, { id: "a", type: "wait", days: 1 }] }).ok).toBe(false);
    expect(parseFlowDefinition({ steps: [{ id: "a", type: "shell" }] }).ok).toBe(false);
    let deep: unknown[] = [];
    for (let i = 0; i < 8; i++) deep = [{ id: `d${i}`, type: "decision", condition: "is_paid", yes: deep, no: [] }];
    expect(parseFlowDefinition({ steps: deep }).ok).toBe(false);
  });
});
