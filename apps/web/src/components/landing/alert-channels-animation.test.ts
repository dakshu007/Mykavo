import { describe, expect, it } from "vitest";
import { alertFrameAt } from "./alert-channels-animation";

describe("alert channels animation", () => {
  it("walks through scan, findings, grouping and delivery", () => {
    expect(alertFrameAt(2.2 + 1).label).toBe("Scanning northwind.coffee");
    expect(alertFrameAt(2.2 + 2).label).toBe("3 changes found");
    expect(alertFrameAt(2.2 + 3.5).label).toBe("Grouped · 1 alert");
    const delivered = alertFrameAt(2.2 + 7);
    expect(delivered.label).toBe("Delivered to 4 channels");
    for (const card of delivered.cards) expect(card.ph).toBeGreaterThan(70);
  });

  it("holds the Medium change back at the severity gate", () => {
    const f = alertFrameAt(2.2 + 2.9);
    expect(f.chips[2].strike).toBe("line-through");
    expect(f.chips[0].strike).toBe("none");
  });

  it("never produces NaN at any moment", () => {
    for (let t = 0; t < 30; t += 0.37) {
      const f = alertFrameAt(t);
      const values = [f.group.y, f.hub.s, ...f.chips.map((c) => c.y), ...f.cards.map((c) => c.ph), ...f.pk.flatMap((p) => [p.x, p.y, p.rot])];
      for (const v of values) expect(Number.isFinite(v)).toBe(true);
    }
  });
});
