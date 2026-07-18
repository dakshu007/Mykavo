import { describe, expect, it } from "vitest";
import {
  buildWebsiteHealth,
  healthStateOf,
  manualScanCapability,
  mapIncident,
  type UptimeStatsRow,
} from "./health";

const NOW = new Date("2026-07-15T12:00:00.000Z");

const emptyStats: UptimeStatsRow = {
  totalChecks: 0,
  uptimePercent: null,
  avgResponseTimeMs: null,
};

describe("healthStateOf", () => {
  it("maps the overview dot exactly like the dashboard", () => {
    expect(healthStateOf(true)).toBe("up");
    expect(healthStateOf(false)).toBe("down");
    expect(healthStateOf(undefined)).toBe("unknown");
  });
});

describe("buildWebsiteHealth", () => {
  it("is entirely unknown when the website was never checked", () => {
    expect(buildWebsiteHealth(null, emptyStats, emptyStats, NOW)).toEqual({
      status: "unknown",
      httpStatus: null,
      checkedAt: null,
      uptime24h: null,
      avgResponseMs24h: null,
      uptime7d: null,
      checks7d: null,
      sslDaysLeft: null,
      sslValidTo: null,
    });
  });

  it("maps a healthy check with uptime windows and SSL countdown", () => {
    const health = buildWebsiteHealth(
      {
        up: true,
        httpStatus: 200,
        checkedAt: new Date("2026-07-15T11:55:00.000Z"),
        sslValidTo: new Date("2026-07-25T12:00:00.000Z"),
      },
      { totalChecks: 288, uptimePercent: 99.5, avgResponseTimeMs: 187.2 },
      { totalChecks: 2016, uptimePercent: 99.9, avgResponseTimeMs: 190.1 },
      NOW,
    );
    expect(health).toEqual({
      status: "up",
      httpStatus: 200,
      checkedAt: "2026-07-15T11:55:00.000Z",
      uptime24h: 99.5,
      avgResponseMs24h: 187.2,
      uptime7d: 99.9,
      checks7d: 2016,
      sslDaysLeft: 10,
      sslValidTo: "2026-07-25T12:00:00.000Z",
    });
  });

  it("marks a failing check down and leaves SSL null without a certificate", () => {
    const health = buildWebsiteHealth(
      {
        up: false,
        httpStatus: null,
        checkedAt: new Date("2026-07-15T11:55:00.000Z"),
        sslValidTo: null,
      },
      emptyStats,
      emptyStats,
      NOW,
    );
    expect(health.status).toBe("down");
    expect(health.httpStatus).toBeNull();
    expect(health.sslDaysLeft).toBeNull();
    expect(health.sslValidTo).toBeNull();
  });
});

describe("mapIncident", () => {
  it("maps DOWN incidents with ISO timestamps", () => {
    expect(
      mapIncident({
        id: "inc_1",
        kind: "DOWN",
        openedAt: new Date("2026-07-10T08:00:00.000Z"),
        resolvedAt: new Date("2026-07-10T08:20:00.000Z"),
        detail: "HTTP 503",
      }),
    ).toEqual({
      id: "inc_1",
      kind: "DOWN",
      openedAt: "2026-07-10T08:00:00.000Z",
      resolvedAt: "2026-07-10T08:20:00.000Z",
      detail: "HTTP 503",
    });
  });

  it("maps SSL_EXPIRING to the contract's SSL kind and null detail to empty", () => {
    const mapped = mapIncident({
      id: "inc_2",
      kind: "SSL_EXPIRING",
      openedAt: new Date("2026-07-12T00:00:00.000Z"),
      resolvedAt: null,
      detail: null,
    });
    expect(mapped.kind).toBe("SSL");
    expect(mapped.resolvedAt).toBeNull();
    expect(mapped.detail).toBe("");
  });
});

describe("manualScanCapability", () => {
  const ready = {
    scanInProgress: false,
    monitoredPageCount: 3,
    hasFinishedScan: true,
    planAllowsManualScans: true,
  };

  it("allows manual scans on a plan with manualScans", () => {
    expect(manualScanCapability(ready)).toEqual({
      canRunManualScan: true,
      manualScanBlockedReason: null,
    });
  });

  it("blocks while a scan is in flight", () => {
    expect(manualScanCapability({ ...ready, scanInProgress: true })).toEqual({
      canRunManualScan: false,
      manualScanBlockedReason: "A scan is already running.",
    });
  });

  it("blocks with no monitored pages", () => {
    expect(manualScanCapability({ ...ready, monitoredPageCount: 0 })).toEqual({
      canRunManualScan: false,
      manualScanBlockedReason: "Select pages to monitor first.",
    });
  });

  it("always allows the first (baseline) scan, even on Free", () => {
    expect(
      manualScanCapability({
        ...ready,
        hasFinishedScan: false,
        planAllowsManualScans: false,
      }),
    ).toEqual({ canRunManualScan: true, manualScanBlockedReason: null });
  });

  it("Pro-gates re-scans on plans without manualScans", () => {
    expect(
      manualScanCapability({ ...ready, planAllowsManualScans: false }),
    ).toEqual({
      canRunManualScan: false,
      manualScanBlockedReason: "Manual scans are a Pro feature.",
    });
  });
});
