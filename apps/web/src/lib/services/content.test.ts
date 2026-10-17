import { describe, expect, it } from "vitest";
import {
  FIX_AREAS,
  HOW_STEPS,
  PLATFORMS,
  SERVICES_FAQS,
  WHY_POINTS,
  WORK_OPTIONS,
} from "./content";

/** Every visible string in the services copy, flattened. */
function allCopy(): string[] {
  return [
    ...FIX_AREAS.flatMap((a) => [a.title, a.body, ...a.examples]),
    ...WORK_OPTIONS.flatMap((o) => [o.eyebrow, o.title, o.body, ...o.points]),
    ...HOW_STEPS.flatMap((s) => [s.title, s.body]),
    ...WHY_POINTS.flatMap((s) => [s.title, s.body]),
    ...PLATFORMS.flatMap((p) => [p.name, p.note]),
    ...SERVICES_FAQS.flatMap((f) => [f.q, f.a]),
  ];
}

describe("services copy", () => {
  it("uses no em or en dashes", () => {
    for (const text of allCopy()) expect(text).not.toMatch(/[\u2013\u2014]/);
  });

  it("states no prices: every job is a fixed quote", () => {
    for (const text of allCopy()) expect(text).not.toMatch(/[$€£]\s?\d/);
  });

  it("covers the six fix areas, two ways to work and four steps", () => {
    expect(FIX_AREAS).toHaveLength(6);
    expect(WORK_OPTIONS.map((o) => o.kind)).toEqual(["fix", "care_plan"]);
    expect(HOW_STEPS).toHaveLength(4);
    expect(WHY_POINTS).toHaveLength(3);
  });

  it("answers the positioning questions in the FAQ", () => {
    const questions = SERVICES_FAQS.map((f) => f.q);
    expect(questions).toContain("Do you build new websites?");
    expect(SERVICES_FAQS.find((f) => f.q === "Do you build new websites?")?.a).toMatch(/^No\./);
    expect(SERVICES_FAQS.find((f) => f.q.startsWith("How fast"))?.a).toContain(
      "usually within 1 to 2 business days",
    );
  });
});
