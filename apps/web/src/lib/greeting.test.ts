import { describe, expect, it } from "vitest";
import { greetingForHour, hourInTimeZone, timezoneFromNetlifyGeo } from "./greeting";

describe("greetingForHour", () => {
  it("maps hours to the right greeting", () => {
    expect(greetingForHour(5)).toBe("Good morning");
    expect(greetingForHour(11)).toBe("Good morning");
    expect(greetingForHour(12)).toBe("Good afternoon");
    expect(greetingForHour(17)).toBe("Good afternoon");
    expect(greetingForHour(18)).toBe("Good evening");
    expect(greetingForHour(23)).toBe("Good evening");
    // Small hours read as evening/night, not "morning".
    expect(greetingForHour(0)).toBe("Good evening");
    expect(greetingForHour(4)).toBe("Good evening");
  });
});

describe("hourInTimeZone", () => {
  it("computes the hour in a given zone", () => {
    // 2026-07-11T12:00:00Z → 17:30 IST, 08:00 EDT
    const noonUtc = new Date("2026-07-11T12:00:00Z");
    expect(hourInTimeZone("Asia/Kolkata", noonUtc)).toBe(17);
    expect(hourInTimeZone("America/New_York", noonUtc)).toBe(8);
    expect(hourInTimeZone("UTC", noonUtc)).toBe(12);
  });

  it("returns null for invalid zones", () => {
    expect(hourInTimeZone("Not/AZone")).toBeNull();
    expect(hourInTimeZone("")).toBeNull();
  });
});

describe("timezoneFromNetlifyGeo", () => {
  it("extracts the timezone from the base64 geo header", () => {
    const header = Buffer.from(
      JSON.stringify({ city: "Chennai", timezone: "Asia/Kolkata" }),
    ).toString("base64");
    expect(timezoneFromNetlifyGeo(header)).toBe("Asia/Kolkata");
  });

  it("returns null for missing/malformed headers", () => {
    expect(timezoneFromNetlifyGeo(null)).toBeNull();
    expect(timezoneFromNetlifyGeo("not-base64-json")).toBeNull();
    expect(
      timezoneFromNetlifyGeo(Buffer.from(JSON.stringify({ city: "X" })).toString("base64")),
    ).toBeNull();
  });
});
