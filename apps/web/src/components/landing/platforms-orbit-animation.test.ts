import { describe, expect, it } from "vitest";
import { CX, CY, ORBIT_CYCLE, ORBIT_NODES, PING, RX_IN, RY_IN, orbitFrameAt } from "./platforms-orbit-animation";
import { ALERT_CHANNELS, PLATFORMS } from "@/config/platforms";

describe("Platforms orbit animation", () => {
  it("pings each platform in turn, then loops", () => {
    const seen: number[] = [];
    for (let t = 0; t < ORBIT_CYCLE; t += 0.1) {
      const a = orbitFrameAt(t).active;
      if (seen[seen.length - 1] !== a) seen.push(a);
    }
    expect(seen).toEqual([0, 1, 2, 3, 4, 5]);
    expect(orbitFrameAt(ORBIT_CYCLE + 0.2).active).toBe(0);
    expect(ORBIT_CYCLE).toBe(ORBIT_NODES.length * PING);
  });

  it("keeps every platform on the ellipse around the core", () => {
    for (const t of [0, 3.3, 9, 41.7]) {
      for (const n of orbitFrameAt(t).nodes) {
        expect(((n.x - CX) / RX_IN) ** 2 + ((n.y - CY) / RY_IN) ** 2).toBeCloseTo(1, 5);
      }
    }
  });

  it("sends the packet to the core and lights every alert channel for a live platform", () => {
    const start = orbitFrameAt(0.1);
    expect(start.packet.o).toBe(0);
    const mid = orbitFrameAt(0.8);
    expect(mid.packet.o).toBe(1);
    const node = mid.nodes[mid.active];
    expect(Math.hypot(mid.packet.x - CX, mid.packet.y - CY)).toBeLessThan(Math.hypot(node.x - CX, node.y - CY));
    const lit = orbitFrameAt(2.4);
    expect(lit.channels.every((c) => c.on > 0.9)).toBe(true);
    expect(lit.channels).toHaveLength(ALERT_CHANNELS.length);
  });

  it("never claims Shopify can alert yet: it only ghost-pings", () => {
    const shopify = ORBIT_NODES.findIndex((n) => n.id === "shopify");
    expect(ORBIT_NODES[shopify].live).toBe(false);
    for (let lt = 0; lt < PING; lt += 0.1) {
      const f = orbitFrameAt(shopify * PING + lt);
      expect(f.active).toBe(shopify);
      expect(f.packet.o).toBe(0);
      expect(f.flash).toBe(0);
      expect(f.channels.every((c) => c.on === 0)).toBe(true);
    }
    expect(orbitFrameAt(shopify * PING + 1.2).ghost).toBeGreaterThan(0.5);
  });

  it("agrees with the platforms config on what is live", () => {
    const soon = PLATFORMS.filter((p) => p.status === "soon").map((p) => p.id);
    for (const n of ORBIT_NODES) expect(!n.live).toBe((soon as string[]).includes(n.id));
    for (const n of ORBIT_NODES) expect(PLATFORMS.some((p) => p.id === n.id)).toBe(true);
  });

  it("never produces NaN or out-of-range values", () => {
    for (let t = 0; t < 80; t += 0.07) {
      const f = orbitFrameAt(t);
      const values = [f.glow, f.packet.x, f.packet.y, f.packet.o, f.ghost, f.flash, ...f.nodes.flatMap((n) => [n.x, n.y]), ...f.channels.flatMap((c) => [c.x, c.y, c.on])];
      for (const v of values) expect(Number.isFinite(v)).toBe(true);
      expect(f.glow).toBeGreaterThanOrEqual(0);
      expect(f.flash).toBeGreaterThanOrEqual(0);
      expect(f.flash).toBeLessThanOrEqual(1.0001);
    }
  });
});
