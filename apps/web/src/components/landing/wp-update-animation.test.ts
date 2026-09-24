import { describe, expect, it } from "vitest";
import { frameAt } from "./wp-update-animation";

describe("WordPress update animation", () => {
  it("starts empty and connects during the intro", () => {
    expect(frameAt(0).wp.o).toBe(0);
    expect(frameAt(2.7).status).toBe("Connected");
    expect(frameAt(2.9).status).toBe("Watching 4 pages");
  });

  it("alternates a broken update with a clean one", () => {
    const broken = frameAt(2.8 + 8.6);
    expect(broken.status).toBe("2 changes found");
    expect(broken.badRow.o).toBeGreaterThan(0.9);
    const clean = frameAt(2.8 + 11 + 8.6);
    expect(clean.status).toBe("Nothing changed");
    expect(clean.okRow.o).toBeGreaterThan(0.9);
  });

  it("never produces NaN at any moment", () => {
    for (let t = 0; t < 30; t += 0.37) {
      const f = frameAt(t);
      for (const v of [f.card.prog, f.cmp.left, f.cmp.w, f.cmp.d, ...f.th.map((x) => x.band)]) {
        expect(Number.isFinite(v)).toBe(true);
      }
    }
  });
});
