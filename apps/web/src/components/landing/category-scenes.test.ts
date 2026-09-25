import { describe, expect, it } from "vitest";
import { SCENE_FRAMES, VERDICT_AT } from "./category-scenes";

describe("category scenes", () => {
  it("has one scene for each of the eight change categories", () => {
    expect(Object.keys(SCENE_FRAMES).sort()).toEqual(
      ["availability", "content", "conversion", "links", "performance", "scripts", "seo", "visual"],
    );
  });

  it("lands every change before the verdict appears", () => {
    const end = VERDICT_AT;
    expect(SCENE_FRAMES.availability(end).failed).toBe(1);
    expect(SCENE_FRAMES.visual(end).pct).toBeCloseTo(12.4, 1);
    expect(SCENE_FRAMES.seo(end).typed).toBe(1);
    expect(SCENE_FRAMES.content(end).typed).toBe(1);
    expect(SCENE_FRAMES.links(end).count).toBe(17);
    expect(SCENE_FRAMES.scripts(end).gone).toBe(1);
    expect(SCENE_FRAMES.performance(end).reqs).toBe(61);
    expect(SCENE_FRAMES.conversion(end).lost).toBe(1);
  });

  it("starts every scene from the unchanged page", () => {
    expect(SCENE_FRAMES.availability(0).failed).toBe(0);
    expect(SCENE_FRAMES.links(0).count).toBe(0);
    expect(SCENE_FRAMES.performance(0).reqs).toBe(38);
    expect(SCENE_FRAMES.conversion(0).lost).toBe(0);
  });

  it("never produces NaN", () => {
    for (const frame of Object.values(SCENE_FRAMES)) {
      for (let t = 0; t < 14; t += 0.11) {
        for (const v of Object.values(frame(t))) expect(Number.isFinite(v)).toBe(true);
      }
    }
  });
});
