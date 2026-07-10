import { describe, expect, it } from "vitest";
import {
  badgeLabel,
  formatUptimePercent,
  renderStatusBadge,
} from "./status-badge";

describe("formatUptimePercent", () => {
  it("shows exactly 100 without a decimal", () => {
    expect(formatUptimePercent(100)).toBe("100%");
  });

  it("shows one decimal place otherwise", () => {
    expect(formatUptimePercent(99.94)).toBe("99.9%");
    expect(formatUptimePercent(97.5)).toBe("97.5%");
    expect(formatUptimePercent(0)).toBe("0.0%");
  });

  it("collapses values that round to 100 into 100%", () => {
    expect(formatUptimePercent(99.96)).toBe("100%");
  });
});

describe("badgeLabel", () => {
  it("combines up with the uptime percentage", () => {
    expect(badgeLabel({ status: "up", uptimePercent: 99.9 })).toBe("up · 99.9%");
  });

  it("shows plain up when no percentage is available", () => {
    expect(badgeLabel({ status: "up", uptimePercent: null })).toBe("up");
  });

  it("shows down and unknown without a percentage", () => {
    expect(badgeLabel({ status: "down", uptimePercent: 42 })).toBe("down");
    expect(badgeLabel({ status: "unknown", uptimePercent: null })).toBe("unknown");
  });
});

describe("renderStatusBadge", () => {
  it("renders the up variant in green with the percentage", () => {
    const svg = renderStatusBadge({ status: "up", uptimePercent: 99.9 });
    expect(svg.startsWith("<svg xmlns=")).toBe(true);
    expect(svg).toContain(">uptime</text>");
    expect(svg).toContain(">up · 99.9%</text>");
    expect(svg).toContain('fill="#2da44e"');
  });

  it("renders the down variant in red without a percentage", () => {
    const svg = renderStatusBadge({ status: "down", uptimePercent: 12.3 });
    expect(svg).toContain(">down</text>");
    expect(svg).not.toContain("12.3");
    expect(svg).toContain('fill="#cf222e"');
  });

  it("renders the unknown variant in gray", () => {
    const svg = renderStatusBadge({ status: "unknown", uptimePercent: null });
    expect(svg).toContain(">unknown</text>");
    expect(svg).toContain('fill="#9f9f9f"');
  });

  it("is a fixed-height shield with a width that fits the label", () => {
    const up = renderStatusBadge({ status: "up", uptimePercent: 100 });
    const down = renderStatusBadge({ status: "down", uptimePercent: null });
    expect(up).toContain('height="20"');
    const widthOf = (svg: string) => Number(/width="(\d+)"/.exec(svg)?.[1]);
    expect(widthOf(up)).toBeGreaterThan(widthOf(down));
  });

  it("declares an accessible label", () => {
    const svg = renderStatusBadge({ status: "up", uptimePercent: 100 });
    expect(svg).toContain('aria-label="uptime: up · 100%"');
    expect(svg).toContain("<title>uptime: up · 100%</title>");
  });
});
