import { describe, expect, it } from "vitest";
import { AI_HEADLINE, AI_STEPS, aiFrameAt } from "./ai-insights-animation";

const at = (u: number) => aiFrameAt(0.8 + u);

describe("AI insights animation", () => {
  it("opens on the finished answer before the loop starts", () => {
    const f = aiFrameAt(0);
    expect(f.headline).toBe(AI_HEADLINE);
    expect(f.steps).toHaveLength(AI_STEPS.length);
  });

  it("shows the alert first and thinks before answering", () => {
    expect(at(0.7).alert.o).toBeGreaterThan(0.9);
    expect(at(0.7).ai.o).toBe(0);
    expect(at(2.2).thinking).toBe(true);
    expect(at(2.2).headline).toBe("");
  });

  it("types the headline, then the steps, then calls the urgency", () => {
    const mid = at(3.3).headline;
    expect(mid.length).toBeGreaterThan(0);
    expect(mid.length).toBeLessThan(AI_HEADLINE.length);
    expect(at(4.2).headline).toBe(AI_HEADLINE);
    expect(at(5.0).steps[2]).toBe(0);
    expect(at(7.0).steps.every((s) => s > 0.99)).toBe(true);
    expect(at(6.0).urgency).toBe(0);
    expect(at(8.0).urgency).toBeCloseTo(1, 5);
  });

  it("fades out and starts again", () => {
    expect(at(12.3).alert.o).toBe(0);
    expect(at(12.5 + 0.7).alert.o).toBeGreaterThan(0.9);
  });
});
