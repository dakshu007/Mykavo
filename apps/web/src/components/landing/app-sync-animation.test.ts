import { describe, expect, it } from "vitest";
import { syncFrameAt } from "./app-sync-animation";

describe("web and Android sync animation", () => {
  it("starts empty and is ready after the intro", () => {
    expect(syncFrameAt(0).br.o).toBe(0);
    expect(syncFrameAt(2.4).ready).toBeGreaterThan(0.99);
  });

  it("mirrors the scan on both screens, then resolves from the phone", () => {
    const scanning = syncFrameAt(2.4 + 3);
    expect(scanning.btnLabel).toMatch(/^Scanning \d+%$/);
    expect(scanning.phScanText).toMatch(/^Scanning 2 sites/);
    const newChange = syncFrameAt(2.4 + 5);
    expect(newChange.webOpen).toBe(3);
    expect(newChange.phOpen).toBe(3);
    const resolved = syncFrameAt(2.4 + 8.6);
    expect(resolved.webOpen).toBe(2);
    expect(resolved.phOpen).toBe(2);
    expect(resolved.toast.text).toBe("Resolved from Android · just now");
  });

  it("never produces NaN at any moment", () => {
    for (let t = 0; t < 30; t += 0.37) {
      const f = syncFrameAt(t);
      for (const v of [f.cur.x, f.cur.y, f.scanPct, f.webHero.h, f.phHero.h, f.push.y, f.finger.x, f.pk1.x]) {
        expect(Number.isFinite(v)).toBe(true);
      }
    }
  });
});
