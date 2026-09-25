import { describe, expect, it } from "vitest";
import { SHOP_CYCLE, STEPS, STORE_PAGES, shopFrameAt } from "./shopify-admin-animation";

describe("Shopify admin animation", () => {
  it("plays publish, check, verdict, evidence, fixed - then loops", () => {
    const seen: number[] = [];
    for (let t = 0; t < SHOP_CYCLE; t += 0.1) {
      const s = shopFrameAt(t).step;
      if (seen[seen.length - 1] !== s) seen.push(s);
    }
    expect(seen).toEqual([0, 1, 2, 3, 4]);
    expect(STEPS).toHaveLength(5);
  });

  it("publishes the theme before MyKavo checks", () => {
    expect(shopFrameAt(1).published).toBe(false);
    expect(shopFrameAt(3).published).toBe(true);
    expect(shopFrameAt(3).screen).toBe("themes");
    expect(shopFrameAt(4).screen).toBe("checking");
  });

  it("checks every store page and fails the product page and cart", () => {
    const f = shopFrameAt(6.3);
    expect(f.pages.every((p) => p.done)).toBe(true);
    expect(STORE_PAGES.filter((p) => p.broken).map((p) => p.label)).toEqual(["Ethiopia Yirgacheffe", "Cart"]);
  });

  it("ends verified after the change is marked fixed", () => {
    expect(shopFrameAt(12).clear).toBe(0);
    expect(shopFrameAt(16).clear).toBeCloseTo(1, 5);
  });

  it("never produces NaN", () => {
    for (let t = 0; t < SHOP_CYCLE * 2; t += 0.13) {
      const f = shopFrameAt(t);
      const values = [f.fade, f.publishPress, f.toast, f.checkP, f.tabBadge, f.found, f.pulse, f.cur.o, f.cur.x, f.cur.y, f.cur.click, f.resolvedToast, f.clear, ...f.rows];
      for (const v of values) expect(Number.isFinite(v)).toBe(true);
    }
  });
});
