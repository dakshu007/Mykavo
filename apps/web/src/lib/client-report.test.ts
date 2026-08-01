import { describe, expect, it } from "vitest";
import {
  buildSeverityRows,
  contrastTextClass,
  formatReportPeriod,
  formatReportUptime,
  isValidBrandColor,
  sslSummary,
} from "./client-report";

describe("buildSeverityRows", () => {
  it("returns all severities in fixed order with proportional bars", () => {
    const rows = buildSeverityRows([
      { severity: "HIGH", count: 4 },
      { severity: "CRITICAL", count: 1 },
      { severity: "LOW", count: 2 },
    ]);
    expect(rows.map((r) => r.severity)).toEqual([
      "CRITICAL",
      "HIGH",
      "MEDIUM",
      "LOW",
      "INFO",
    ]);
    expect(rows.find((r) => r.severity === "HIGH")).toMatchObject({
      count: 4,
      barPercent: 100,
      label: "High",
    });
    expect(rows.find((r) => r.severity === "LOW")?.barPercent).toBe(50);
    expect(rows.find((r) => r.severity === "MEDIUM")?.count).toBe(0);
  });

  it("handles no changes without dividing by zero", () => {
    const rows = buildSeverityRows([]);
    expect(rows).toHaveLength(5);
    expect(rows.every((r) => r.count === 0 && r.barPercent === 0)).toBe(true);
  });

  it("ignores unknown severity strings", () => {
    const rows = buildSeverityRows([{ severity: "BOGUS", count: 9 }]);
    expect(rows.every((r) => r.count === 0)).toBe(true);
  });
});

describe("formatReportPeriod", () => {
  it("formats a UTC range with the year on the end date", () => {
    expect(
      formatReportPeriod(
        new Date("2026-07-02T00:00:00Z"),
        new Date("2026-08-01T00:00:00Z"),
      ),
    ).toBe("Jul 2 – Aug 1, 2026");
  });
});

describe("formatReportUptime", () => {
  it("keeps 100% clean and never rounds partial uptime up to 100%", () => {
    expect(formatReportUptime(100)).toBe("100%");
    expect(formatReportUptime(99.999)).toBe("99.99%");
    expect(formatReportUptime(99.5)).toBe("99.50%");
    expect(formatReportUptime(null)).toBe("–");
  });
});

describe("sslSummary", () => {
  const now = new Date("2026-08-01T00:00:00Z");
  it("reports healthy, expiring, expired, and unmonitored", () => {
    expect(sslSummary(new Date("2026-11-01T00:00:00Z"), now)).toMatchObject({
      tone: "ok",
    });
    expect(sslSummary(new Date("2026-08-05T00:00:00Z"), now)).toMatchObject({
      tone: "warn",
      label: "Expires in 4 days",
    });
    expect(sslSummary(new Date("2026-07-01T00:00:00Z"), now)).toMatchObject({
      tone: "warn",
      label: "Certificate expired",
    });
    expect(sslSummary(null, now)).toMatchObject({ tone: "none" });
  });
});

describe("isValidBrandColor", () => {
  it("accepts only #rrggbb", () => {
    expect(isValidBrandColor("#1A2b3C")).toBe(true);
    expect(isValidBrandColor("#fff")).toBe(false);
    expect(isValidBrandColor("1A2b3C")).toBe(false);
    expect(isValidBrandColor("#12345g")).toBe(false);
    expect(isValidBrandColor("url(javascript:x)")).toBe(false);
  });
});

describe("contrastTextClass", () => {
  it("picks dark text on light accents and white on dark accents", () => {
    expect(contrastTextClass("#FFD400")).toBe("text-[#101010]");
    expect(contrastTextClass("#1a1a2e")).toBe("text-white");
  });
});
