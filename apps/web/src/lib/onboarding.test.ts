import { describe, expect, it } from "vitest";
import { deriveOnboarding, type OnboardingCounts } from "./onboarding";

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

  it("marks only invite-teammate as optional", () => {
    const state = deriveOnboarding(zero);
    expect(state.steps.filter((s) => s.optional).map((s) => s.id)).toEqual([
      "invite-teammate",
    ]);
  });

  it("does not block allRequiredDone on the optional teammate step", () => {
    const state = deriveOnboarding({
      ...zero,
      websites: 1,
      monitoredPages: 5,
      completedScans: 1,
      extraChannels: 1,
      // members still 1, no invites - optional step pending.
    });
    expect(state.doneCount).toBe(4);
    expect(state.allRequiredDone).toBe(true);
  });

  it("stays incomplete when a required step is missing even if teammate is done", () => {
    const state = deriveOnboarding({
      ...zero,
      websites: 1,
      monitoredPages: 5,
      completedScans: 1,
      members: 3, // teammate done
      // extraChannels still 0 - required step pending.
    });
    expect(state.allRequiredDone).toBe(false);
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
    expect(state.allRequiredDone).toBe(true);
  });

  it("derivation is independent of dismissal - no dismissal input exists", () => {
    // The function takes only live counts; dismissal is a cookie concern
    // handled by the page. Same counts always produce the same state.
    expect(deriveOnboarding(zero)).toEqual(deriveOnboarding({ ...zero }));
  });
});
