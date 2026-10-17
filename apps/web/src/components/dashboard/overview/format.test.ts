import { describe, expect, it } from "vitest";
import { formatRelative, hostOf, pathOf, plural } from "./format";

const now = new Date(Date.UTC(2026, 9, 17, 12, 0, 0));
const offset = (ms: number) => new Date(now.getTime() + ms);
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

describe("formatRelative", () => {
  it("formats the past", () => {
    expect(formatRelative(offset(-20_000), now)).toBe("just now");
    expect(formatRelative(offset(-12 * MIN), now)).toBe("12m ago");
    expect(formatRelative(offset(-3 * HOUR - 5 * MIN), now)).toBe("3h ago");
    expect(formatRelative(offset(-2 * DAY), now)).toBe("2d ago");
  });

  it("formats the future", () => {
    expect(formatRelative(offset(30_000), now)).toBe("in under a minute");
    expect(formatRelative(offset(45 * MIN), now)).toBe("in 45m");
    expect(formatRelative(offset(5 * HOUR), now)).toBe("in 5h");
    expect(formatRelative(offset(3 * DAY), now)).toBe("in 3d");
  });

  it("falls back to a date a week or more away", () => {
    expect(formatRelative(offset(-10 * DAY), now)).toBe("Oct 7, 2026");
  });
});

describe("url helpers", () => {
  it("extracts host and path, tolerating bad input", () => {
    expect(hostOf("https://www.example.com/a?b=1")).toBe("www.example.com");
    expect(pathOf("https://www.example.com/a?b=1")).toBe("/a?b=1");
    expect(hostOf("not a url")).toBe("not a url");
    expect(pathOf("not a url")).toBe("not a url");
  });
});

describe("plural", () => {
  it("pluralizes", () => {
    expect(plural(1, "page")).toBe("1 page");
    expect(plural(0, "page")).toBe("0 pages");
    expect(plural(3, "change")).toBe("3 changes");
  });
});
