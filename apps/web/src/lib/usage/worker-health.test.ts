import { describe, expect, it } from "vitest";
import { classifyWorkerLiveness } from "./worker-health";

const NOW = new Date("2026-09-20T12:00:00.000Z");
const minutesBefore = (n: number) => new Date(NOW.getTime() - n * 60_000);

describe("classifyWorkerLiveness", () => {
  it("is healthy when a check landed within the sweep window", () => {
    const result = classifyWorkerLiveness({
      lastHealthCheckAt: minutesBefore(3),
      activeWebsites: 10,
      now: NOW,
    });
    expect(result.state).toBe("healthy");
    expect(result.minutesAgo).toBe(3);
  });

  it("tolerates a couple of missed sweeps before complaining", () => {
    // The sweep runs every 5 minutes. Flagging at the first late one would
    // train the operator to ignore this indicator, which defeats it entirely.
    expect(
      classifyWorkerLiveness({
        lastHealthCheckAt: minutesBefore(12),
        activeWebsites: 10,
        now: NOW,
      }).state,
    ).toBe("healthy");
  });

  it("goes stale once several sweeps in a row have been missed", () => {
    const result = classifyWorkerLiveness({
      lastHealthCheckAt: minutesBefore(30),
      activeWebsites: 10,
      now: NOW,
    });
    expect(result.state).toBe("stale");
  });

  it("calls it down after an hour of silence", () => {
    const result = classifyWorkerLiveness({
      lastHealthCheckAt: minutesBefore(90),
      activeWebsites: 10,
      now: NOW,
    });
    expect(result.state).toBe("down");
  });

  /**
   * The case this was built for: the worker was silently dead for five days
   * while the dashboard looked completely normal.
   */
  it("calls a five-day silence down, not stale", () => {
    const result = classifyWorkerLiveness({
      lastHealthCheckAt: minutesBefore(5 * 24 * 60),
      activeWebsites: 10,
      now: NOW,
    });
    expect(result.state).toBe("down");
    expect(result.minutesAgo).toBe(7200);
  });

  /**
   * Health checks only run for ACTIVE websites. With none, silence is the
   * expected outcome and proves nothing - reporting "down" there would be a
   * false alarm on every fresh installation.
   */
  it("says unknown rather than down when there are no active websites", () => {
    const result = classifyWorkerLiveness({
      lastHealthCheckAt: minutesBefore(5000),
      activeWebsites: 0,
      now: NOW,
    });
    expect(result.state).toBe("unknown");
    expect(result.minutesAgo).toBeNull();
  });

  it("is down, not unknown, when websites are active but nothing was ever checked", () => {
    const result = classifyWorkerLiveness({
      lastHealthCheckAt: null,
      activeWebsites: 3,
      now: NOW,
    });
    expect(result.state).toBe("down");
    expect(result.lastSeenAt).toBeNull();
  });

  it("never reports a negative age when clocks disagree", () => {
    // Server and database clocks drift; a check stamped slightly in the
    // future must not render as "-2 min ago".
    const result = classifyWorkerLiveness({
      lastHealthCheckAt: new Date(NOW.getTime() + 120_000),
      activeWebsites: 4,
      now: NOW,
    });
    expect(result.minutesAgo).toBe(0);
    expect(result.state).toBe("healthy");
  });

  it("explains itself in every state", () => {
    for (const [lastHealthCheckAt, activeWebsites] of [
      [minutesBefore(2), 5],
      [minutesBefore(30), 5],
      [minutesBefore(5000), 5],
      [minutesBefore(5), 0],
      [null, 5],
    ] as const) {
      const result = classifyWorkerLiveness({ lastHealthCheckAt, activeWebsites, now: NOW });
      expect(result.detail.length).toBeGreaterThan(20);
    }
  });
});
