import { describe, expect, it } from "vitest";
import {
  billingCycleEnd,
  billingCycleStart,
  counterIncrease,
  projectCycleUsage,
  projectRefFromDatabaseUrl,
  transmitBytesFromMetrics,
} from "./egress";

const at = (iso: string) => new Date(iso);

describe("egress", () => {
  it("reads the project ref from a pooler or direct URL", () => {
    expect(
      projectRefFromDatabaseUrl("postgresql://postgres.abcdefghijklmnop:pw@aws-0-us-east-1.pooler.supabase.com:6543/postgres"),
    ).toBe("abcdefghijklmnop");
    expect(projectRefFromDatabaseUrl("postgresql://postgres:pw@db.abcdefghijklmnop.supabase.co:5432/postgres")).toBe(
      "abcdefghijklmnop",
    );
    expect(projectRefFromDatabaseUrl("postgresql://mk:mk@localhost:5432/mk")).toBeNull();
    expect(projectRefFromDatabaseUrl(undefined)).toBeNull();
  });

  it("sums bytes sent across interfaces, leaving out loopback", () => {
    const text = [
      "# TYPE node_network_transmit_bytes_total counter",
      'node_network_transmit_bytes_total{device="eth0",service_type="db"} 1.5e+09',
      'node_network_transmit_bytes_total{device="lo",service_type="db"} 9e+09',
      'node_network_transmit_bytes_total{device="ens5",service_type="db"} 500',
      'node_network_receive_bytes_total{device="eth0"} 42',
    ].join("\n");
    expect(transmitBytesFromMetrics(text)).toBe(1_500_000_500);
    expect(transmitBytesFromMetrics("pg_up 1")).toBeNull();
  });

  it("adds up a counter across a restart", () => {
    const r = (value: number, h: number) => ({ value, at: new Date(h * 3_600_000) });
    expect(counterIncrease([r(100, 0), r(150, 1), r(150, 2), r(30, 3), r(80, 4)])).toBe(50 + 0 + 30 + 50);
    expect(counterIncrease([r(100, 0)])).toBe(0);
  });

  it("finds the billing cycle around a renewal day", () => {
    expect(billingCycleStart(at("2026-10-20T10:00:00Z"), 1).toISOString()).toBe("2026-10-01T00:00:00.000Z");
    expect(billingCycleStart(at("2026-10-20T10:00:00Z"), 25).toISOString()).toBe("2026-09-25T00:00:00.000Z");
    expect(billingCycleStart(at("2026-01-10T00:00:00Z"), 15).toISOString()).toBe("2025-12-15T00:00:00.000Z");
    expect(billingCycleEnd(at("2026-09-25T00:00:00Z")).toISOString()).toBe("2026-10-25T00:00:00.000Z");
  });

  it("projects the cycle from the rate so far", () => {
    const measuredFrom = at("2026-10-01T00:00:00Z");
    expect(
      projectCycleUsage({ used: 10, measuredFrom, now: at("2026-10-11T00:00:00Z"), cycleEnd: at("2026-10-31T00:00:00Z") }),
    ).toBeCloseTo(30);
    expect(projectCycleUsage({ used: 10, measuredFrom, now: at("2026-10-01T00:30:00Z"), cycleEnd: at("2026-10-31T00:00:00Z") })).toBeNull();
  });
});
