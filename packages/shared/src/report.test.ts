import { describe, expect, it } from "vitest";
import { buildReportModel, formatPeriodLabel, isClientReportDue, type ReportRawData } from "./report";

const PERIOD_START = new Date("2026-07-03T08:00:00Z");
const PERIOD_END = new Date("2026-07-10T08:00:00Z");

function raw(overrides: Partial<ReportRawData> = {}): ReportRawData {
  return {
    websiteName: "Aurora Outdoor",
    websiteHost: "aurora-outdoor.com",
    periodStart: PERIOD_START,
    periodEnd: PERIOD_END,
    scansRun: 7,
    scansFailed: 0,
    changesBySeverity: {},
    uptimePercent: 100,
    avgResponseTimeMs: 231.4,
    sslValidTo: new Date("2026-10-01T00:00:00Z"),
    lighthouse: null,
    dashboardUrl: "https://mykavo.app/dashboard/websites/w1",
    ...overrides,
  };
}

describe("formatPeriodLabel", () => {
  it("renders a compact range with the year once", () => {
    expect(formatPeriodLabel(PERIOD_START, PERIOD_END)).toBe("Jul 3 – Jul 10, 2026");
  });
});

describe("buildReportModel", () => {
  it("orders non-zero severities highest first and totals them", () => {
    const model = buildReportModel(
      raw({ changesBySeverity: { INFO: 4, CRITICAL: 1, MEDIUM: 2 } }),
    );
    expect(model.changesBySeverity).toEqual([
      { severity: "CRITICAL", count: 1 },
      { severity: "MEDIUM", count: 2 },
      { severity: "INFO", count: 4 },
    ]);
    expect(model.totalChanges).toBe(7);
    expect(model.allQuiet).toBe(false);
  });

  it("rounds uptime to one decimal and response time to whole ms", () => {
    const model = buildReportModel(raw({ uptimePercent: 99.8765, avgResponseTimeMs: 231.4 }));
    expect(model.uptimePercent).toBe(99.9);
    expect(model.avgResponseMs).toBe(231);
  });

  it("passes through null uptime/response/ssl/lighthouse as unknown", () => {
    const model = buildReportModel(
      raw({ uptimePercent: null, avgResponseTimeMs: null, sslValidTo: null }),
    );
    expect(model.uptimePercent).toBeNull();
    expect(model.avgResponseMs).toBeNull();
    expect(model.sslDaysLeft).toBeNull();
    expect(model.lighthouse).toBeNull();
  });

  it("computes whole days until certificate expiry from the period end", () => {
    const model = buildReportModel(raw({ sslValidTo: new Date("2026-07-20T08:00:00Z") }));
    expect(model.sslDaysLeft).toBe(10);
  });

  it("is all quiet when nothing changed, nothing failed, and uptime is clean", () => {
    const model = buildReportModel(raw());
    expect(model.allQuiet).toBe(true);
    expect(model.totalChanges).toBe(0);
    expect(model.changesBySeverity).toEqual([]);
  });

  it("stays all quiet when uptime is unknown but everything else is clean", () => {
    expect(buildReportModel(raw({ uptimePercent: null, sslValidTo: null })).allQuiet).toBe(true);
  });

  it("treats >= 99.95% uptime as clean (rounds to 100)", () => {
    const model = buildReportModel(raw({ uptimePercent: 99.96 }));
    expect(model.uptimePercent).toBe(100);
    expect(model.allQuiet).toBe(true);
  });

  it("is not all quiet when a scan failed", () => {
    expect(buildReportModel(raw({ scansFailed: 1 })).allQuiet).toBe(false);
  });

  it("is not all quiet when there was downtime", () => {
    expect(buildReportModel(raw({ uptimePercent: 98.2 })).allQuiet).toBe(false);
  });

  it("is not all quiet when the certificate is inside the expiry window", () => {
    const model = buildReportModel(raw({ sslValidTo: new Date("2026-07-15T08:00:00Z") }));
    expect(model.sslDaysLeft).toBe(5);
    expect(model.allQuiet).toBe(false);
  });

  it("keeps lighthouse scores intact for the template", () => {
    const lighthouse = { performance: 92, accessibility: 98, bestPractices: 100, seo: 100 };
    expect(buildReportModel(raw({ lighthouse })).lighthouse).toEqual(lighthouse);
  });
});

describe("isClientReportDue", () => {
  const now = new Date("2026-08-02T08:30:00Z");
  const daysAgo = (d: number) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000);

  it("is never due when OFF, even if never sent", () => {
    expect(isClientReportDue("OFF", null, now)).toBe(false);
    expect(isClientReportDue("OFF", daysAgo(400), now)).toBe(false);
  });

  it("is due immediately when never sent", () => {
    expect(isClientReportDue("WEEKLY", null, now)).toBe(true);
    expect(isClientReportDue("MONTHLY", null, now)).toBe(true);
  });

  it("weekly: due at ~7 days with drift margin, not day after day", () => {
    expect(isClientReportDue("WEEKLY", daysAgo(1), now)).toBe(false);
    expect(isClientReportDue("WEEKLY", daysAgo(6), now)).toBe(false);
    expect(isClientReportDue("WEEKLY", daysAgo(6.6), now)).toBe(true);
    expect(isClientReportDue("WEEKLY", daysAgo(7), now)).toBe(true);
  });

  it("monthly: due at ~28 days with drift margin", () => {
    expect(isClientReportDue("MONTHLY", daysAgo(20), now)).toBe(false);
    expect(isClientReportDue("MONTHLY", daysAgo(26), now)).toBe(false);
    expect(isClientReportDue("MONTHLY", daysAgo(27), now)).toBe(true);
    expect(isClientReportDue("MONTHLY", daysAgo(31), now)).toBe(true);
  });
});
