import { describe, expect, it } from "vitest";
import { deriveOnboarding, LOOP_STEP_IDS, type OnboardingCounts } from "./onboarding";

const zero: OnboardingCounts = {
  websites: 0,
  monitoredPages: 0,
  completedScans: 0,
  activeBaselines: 0,
  extraChannels: 0,
  members: 1,
  pendingInvites: 0,
};

function stepById(counts: OnboardingCounts, id: string) {
  const step = deriveOnboarding(counts).steps.find((s) => s.id === id);
  if (!step) throw new Error(`missing step ${id}`);
  return step;
}

describe("deriveOnboarding", () => {
  it("marks everything pending for a fresh workspace (owner counts as 1 member)", () => {
    const state = deriveOnboarding(zero);
    expect(state.steps).toHaveLength(5);
    expect(state.steps.every((s) => !s.done)).toBe(true);
    expect(state.doneCount).toBe(0);
    expect(state.allRequiredDone).toBe(false);
  });

  it("completes add-website when any website exists", () => {
    expect(stepById(zero, "add-website").done).toBe(false);
    expect(stepById({ ...zero, websites: 1 }, "add-website").done).toBe(true);
  });

  it("completes select-pages when any monitored page exists", () => {
    expect(stepById(zero, "select-pages").done).toBe(false);
    expect(stepById({ ...zero, monitoredPages: 3 }, "select-pages").done).toBe(true);
  });

  it("completes run-baseline from a completed/partial scan", () => {
    expect(stepById({ ...zero, completedScans: 1 }, "run-baseline").done).toBe(true);
  });

  it("completes run-baseline from an active baseline even with no scan counted", () => {
    expect(stepById({ ...zero, activeBaselines: 2 }, "run-baseline").done).toBe(true);
  });

  it("leaves run-baseline pending with neither scans nor baselines", () => {
    expect(stepById(zero, "run-baseline").done).toBe(false);
  });

  it("completes add-alert-channel when a non-email channel exists", () => {
    expect(stepById(zero, "add-alert-channel").done).toBe(false);
    expect(stepById({ ...zero, extraChannels: 1 }, "add-alert-channel").done).toBe(true);
  });

  it("completes invite-teammate from a second member OR a pending invite", () => {
    expect(stepById(zero, "invite-teammate").done).toBe(false);
    expect(stepById({ ...zero, members: 2 }, "invite-teammate").done).toBe(true);
    expect(stepById({ ...zero, pendingInvites: 1 }, "invite-teammate").done).toBe(true);
  });

  /**
   * The required set must be exactly the first-run loop. An extra required
   * step is not a small regression: the card tells a user they are not set up
   * yet, which is the confusion this whole shape exists to remove.
   */
  it("requires exactly the loop - add, select, baseline", () => {
    const state = deriveOnboarding(zero);
    expect(state.steps.filter((s) => !s.optional).map((s) => s.id)).toEqual([
      ...LOOP_STEP_IDS,
    ]);
    expect(state.requiredCount).toBe(3);
  });

  it("marks the non-loop steps optional", () => {
    const state = deriveOnboarding(zero);
    expect(state.steps.filter((s) => s.optional).map((s) => s.id)).toEqual([
      "add-alert-channel",
      "invite-teammate",
    ]);
  });

  /**
   * The bug this replaced: a new account with monitoring genuinely running was
   * still told it was mid-setup until it had wired up Slack, Discord or a
   * webhook. Email alerts already work; a third-party integration must not
   * gate the product's own setup.
   */
  it("is complete with the loop done and NO alert channel wired up", () => {
    const state = deriveOnboarding({
      ...zero,
      websites: 1,
      monitoredPages: 5,
      completedScans: 1,
      // extraChannels 0, members 1 - both optional steps pending.
    });
    expect(state.allRequiredDone).toBe(true);
    expect(state.requiredDoneCount).toBe(3);
  });

  it("is incomplete while any loop step is missing, whatever the extras say", () => {
    const state = deriveOnboarding({
      ...zero,
      websites: 1,
      monitoredPages: 5,
      extraChannels: 2,
      members: 3,
      // no scan and no baseline - the loop has not run.
    });
    expect(state.allRequiredDone).toBe(false);
    expect(state.requiredDoneCount).toBe(2);
  });

  it("orders the loop before the optional tail, so the card reads as one path", () => {
    const ids = deriveOnboarding(zero).steps.map((s) => s.id);
    const lastLoop = Math.max(...LOOP_STEP_IDS.map((id) => ids.indexOf(id)));
    const firstOptional = ids.indexOf("add-alert-channel");
    expect(firstOptional).toBeGreaterThan(lastLoop);
  });

  it("counts all five steps in doneCount when everything is done", () => {
    const state = deriveOnboarding({
      websites: 2,
      monitoredPages: 10,
      completedScans: 4,
      activeBaselines: 10,
      extraChannels: 2,
      members: 2,
      pendingInvites: 0,
    });
    expect(state.doneCount).toBe(5);
    expect(state.requiredDoneCount).toBe(3);
    expect(state.allRequiredDone).toBe(true);
  });

  /**
   * No "approve your baseline" step, however natural it reads. The first
   * baseline is created AND approved by the system (approvedByUserId null,
   * approvedAt set - see packages/database/src/baseline.ts); a human approves
   * only once a later scan finds a change. Such a step could not be completed
   * on day one, so it would leave the card up forever.
   */
  it("has no step that a brand-new workspace cannot complete", () => {
    const fresh = deriveOnboarding({
      ...zero,
      websites: 1,
      monitoredPages: 3,
      completedScans: 1,
      activeBaselines: 3,
    });
    expect(fresh.allRequiredDone).toBe(true);
  });

  it("derivation is independent of dismissal - no dismissal input exists", () => {
    // The function takes only live counts; dismissal is a cookie concern
    // handled by the page. Same counts always produce the same state.
    expect(deriveOnboarding(zero)).toEqual(deriveOnboarding({ ...zero }));
  });
});
