import { describe, expect, it } from "vitest";
import {
  isHttpUp,
  decideDownIncident,
  decideSslIncident,
  daysUntil,
  shouldRenotify,
  formatDowntime,
  HEALTH_RENOTIFY_INTERVAL_MS,
} from "./health";

const NOW = new Date("2026-07-10T12:00:00Z");

function daysFromNow(days: number): Date {
  return new Date(NOW.getTime() + days * 24 * 60 * 60 * 1000);
}

describe("isHttpUp (the up/down rule)", () => {
  it("treats 2xx and 3xx as up", () => {
    expect(isHttpUp(200)).toBe(true);
    expect(isHttpUp(204)).toBe(true);
    expect(isHttpUp(301)).toBe(true);
  });

  it("treats auth walls and rate limits as up - the server is serving", () => {
    expect(isHttpUp(401)).toBe(true);
    expect(isHttpUp(403)).toBe(true);
    expect(isHttpUp(429)).toBe(true);
  });

  it("treats a homepage 404 as down", () => {
    expect(isHttpUp(404)).toBe(false);
  });

  it("treats every 5xx as down", () => {
    expect(isHttpUp(500)).toBe(false);
    expect(isHttpUp(502)).toBe(false);
    expect(isHttpUp(503)).toBe(false);
  });

  it("treats no response (network error / timeout) as down", () => {
    expect(isHttpUp(null)).toBe(false);
  });
});

describe("decideDownIncident", () => {
  it("does NOT open on a single failed check (blip guard)", () => {
    expect(
      decideDownIncident({ currentUp: false, previousUp: true, hasOpenIncident: false }),
    ).toBe("none");
  });

  it("does NOT open on a site's very first check, even if it failed", () => {
    expect(
      decideDownIncident({ currentUp: false, previousUp: null, hasOpenIncident: false }),
    ).toBe("none");
  });

  it("opens after two consecutive failed checks", () => {
    expect(
      decideDownIncident({ currentUp: false, previousUp: false, hasOpenIncident: false }),
    ).toBe("open");
  });

  it("never double-opens while an incident is already open", () => {
    expect(
      decideDownIncident({ currentUp: false, previousUp: false, hasOpenIncident: true }),
    ).toBe("none");
  });

  it("resolves on the first successful check", () => {
    expect(
      decideDownIncident({ currentUp: true, previousUp: false, hasOpenIncident: true }),
    ).toBe("resolve");
  });

  it("is a no-op when up with nothing open", () => {
    expect(
      decideDownIncident({ currentUp: true, previousUp: true, hasOpenIncident: false }),
    ).toBe("none");
  });
});

describe("decideSslIncident", () => {
  it("opens when the certificate expires within 14 days", () => {
    expect(
      decideSslIncident({ sslValidTo: daysFromNow(10), hasOpenIncident: false, now: NOW }),
    ).toBe("open");
  });

  it("opens for an already-expired certificate", () => {
    expect(
      decideSslIncident({ sslValidTo: daysFromNow(-2), hasOpenIncident: false, now: NOW }),
    ).toBe("open");
  });

  it("opens exactly at the 14-day boundary", () => {
    expect(
      decideSslIncident({ sslValidTo: daysFromNow(14), hasOpenIncident: false, now: NOW }),
    ).toBe("open");
  });

  it("stays quiet with a healthy certificate", () => {
    expect(
      decideSslIncident({ sslValidTo: daysFromNow(238), hasOpenIncident: false, now: NOW }),
    ).toBe("none");
  });

  it("resolves when a check sees a renewed certificate (> 14 days)", () => {
    expect(
      decideSslIncident({ sslValidTo: daysFromNow(90), hasOpenIncident: true, now: NOW }),
    ).toBe("resolve");
  });

  it("does not re-open while an incident is already open", () => {
    expect(
      decideSslIncident({ sslValidTo: daysFromNow(5), hasOpenIncident: true, now: NOW }),
    ).toBe("none");
  });

  it("unknown expiry never opens NOR resolves (probe failure must not close a real incident)", () => {
    expect(decideSslIncident({ sslValidTo: null, hasOpenIncident: false, now: NOW })).toBe("none");
    expect(decideSslIncident({ sslValidTo: null, hasOpenIncident: true, now: NOW })).toBe("none");
  });
});

describe("daysUntil", () => {
  it("rounds up partial days", () => {
    const in13point2Days = new Date(NOW.getTime() + 13.2 * 24 * 60 * 60 * 1000);
    expect(daysUntil(in13point2Days, NOW)).toBe(14);
  });

  it("is negative for past dates", () => {
    expect(daysUntil(daysFromNow(-3), NOW)).toBe(-3);
  });
});

describe("shouldRenotify", () => {
  it("notifies a never-notified incident", () => {
    expect(shouldRenotify(null, NOW)).toBe(true);
  });

  it("suppresses within the 24h window", () => {
    const twentyThreeHoursAgo = new Date(NOW.getTime() - 23 * 60 * 60 * 1000);
    expect(shouldRenotify(twentyThreeHoursAgo, NOW)).toBe(false);
  });

  it("re-notifies after 24h", () => {
    const twentyFiveHoursAgo = new Date(NOW.getTime() - 25 * 60 * 60 * 1000);
    expect(shouldRenotify(twentyFiveHoursAgo, NOW)).toBe(true);
    expect(
      shouldRenotify(new Date(NOW.getTime() - HEALTH_RENOTIFY_INTERVAL_MS), NOW),
    ).toBe(true);
  });
});

describe("formatDowntime", () => {
  it("formats minutes, hours, and days", () => {
    expect(formatDowntime(23 * 60_000)).toBe("23m");
    expect(formatDowntime((3 * 60 + 12) * 60_000)).toBe("3h 12m");
    expect(formatDowntime(2 * 60 * 60_000)).toBe("2h");
    expect(formatDowntime((2 * 24 + 4) * 60 * 60_000)).toBe("2d 4h");
    expect(formatDowntime(3 * 24 * 60 * 60_000)).toBe("3d");
  });

  it("floors at one minute", () => {
    expect(formatDowntime(5_000)).toBe("1m");
  });
});
