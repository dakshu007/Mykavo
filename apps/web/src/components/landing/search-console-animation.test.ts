import { describe, expect, it } from "vitest";
import {
  CAUSE_AT,
  CLICKS,
  CLICKS_AFTER,
  CLICKS_BEFORE,
  DROP_PERCENT,
  GSC_CYCLE,
  IMPRESSIONS,
  ONSET,
  OPPORTUNITIES,
  SORTED_SLOT,
  STEPS,
  gscFrameAt,
} from "./search-console-animation";

describe("Search Console animation", () => {
  it("plays connect, sync, drop, why, prioritize - then loops", () => {
    const seen: number[] = [];
    for (let t = 0; t < GSC_CYCLE; t += 0.1) {
      const s = gscFrameAt(t).step;
      if (seen[seen.length - 1] !== s) seen.push(s);
    }
    expect(seen).toEqual([0, 1, 2, 3, 4]);
    expect(STEPS).toHaveLength(5);
  });

  it("keeps the drop card's numbers true to the chart", () => {
    expect(CLICKS).toHaveLength(28);
    expect(IMPRESSIONS).toHaveLength(28);
    expect(CLICKS_BEFORE).toBe(412);
    expect(CLICKS_AFTER).toBe(255);
    expect(DROP_PERCENT).toBe(38);
    // the change MyKavo found lands two days before the onset
    expect(ONSET - CAUSE_AT).toBe(2);
    expect(OPPORTUNITIES.find((o) => o.page === "/subscriptions")?.reason).toBe(
      "Clicks dropped by 157 vs the previous period.",
    );
  });

  it("connects before it syncs, and explains the drop only after it happens", () => {
    expect(gscFrameAt(1).status).toBe("none");
    expect(gscFrameAt(3.2).status).toBe("syncing");
    expect(gscFrameAt(5).status).toBe("synced");
    expect(gscFrameAt(6).draw2).toBe(0);
    expect(gscFrameAt(9.5).draw2).toBeCloseTo(1, 5);
    expect(gscFrameAt(9.5).beam).toBe(0);
    expect(gscFrameAt(13).beam).toBeCloseTo(1, 5);
  });

  it("sorts Priority Opportunities with the traffic drop on top", () => {
    expect([...SORTED_SLOT].sort()).toEqual([0, 1, 2]);
    const top = OPPORTUNITIES[SORTED_SLOT.indexOf(0)];
    expect(top.page).toBe("/subscriptions");
    expect(top.high).toBe(true);
    expect(gscFrameAt(15).sort).toBe(0);
    expect(gscFrameAt(18).sort).toBeCloseTo(1, 5);
  });

  it("never produces NaN", () => {
    for (let t = 0; t < GSC_CYCLE * 2; t += 0.13) {
      const f = gscFrameAt(t);
      const values = [
        f.fade, f.connectPress, f.pickPress, f.count, f.draw1, f.draw2, f.dropMark, f.dropChip, f.ring,
        f.lane, f.beam, f.bracket, f.likely, f.evidence, f.sort, f.lift, f.top, f.cur.o, f.cur.x, f.cur.y, f.cur.click,
        ...f.queries, ...f.suspects, ...f.rows,
      ];
      for (const v of values) expect(Number.isFinite(v)).toBe(true);
    }
  });
});
