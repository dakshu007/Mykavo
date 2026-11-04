import { describe, expect, it } from "vitest";
import { isValidTimeZone, parseSiteSettings, putSettingsSchema, updateWindowSchema, withUpdateWindow } from "./wp-settings";

const window = { enabled: true, days: [6, 0, 6], startHour: 1, endHour: 5, timezone: "America/New_York" };

describe("updateWindowSchema", () => {
  it("accepts a window and sorts and de-duplicates its days", () => {
    expect(updateWindowSchema.parse(window)).toEqual({ ...window, days: [0, 6] });
  });

  it("accepts a window that runs to or past midnight", () => {
    expect(updateWindowSchema.safeParse({ ...window, startHour: 22, endHour: 24 }).success).toBe(true);
    expect(updateWindowSchema.safeParse({ ...window, startHour: 22, endHour: 4 }).success).toBe(true);
  });

  it.each([
    { ...window, startHour: 5, endHour: 5 },
    { ...window, startHour: 24 },
    { ...window, endHour: 0 },
    { ...window, days: [7] },
    { ...window, timezone: "Mars/Olympus" },
    { ...window, startHour: 1.5 },
  ])("refuses %o", (bad) => {
    expect(updateWindowSchema.safeParse(bad).success).toBe(false);
  });

  it("allows an empty day list", () => {
    expect(updateWindowSchema.safeParse({ ...window, enabled: false, days: [] }).success).toBe(true);
    expect(updateWindowSchema.safeParse({ ...window, days: [] }).success).toBe(true);
  });
});

describe("settings storage", () => {
  it("reads stored settings defensively", () => {
    expect(parseSiteSettings({})).toEqual({ updateWindow: null });
    expect(parseSiteSettings(null)).toEqual({ updateWindow: null });
    expect(parseSiteSettings({ updateWindow: { enabled: "yes" } })).toEqual({ updateWindow: null });
    expect(parseSiteSettings({ updateWindow: window }).updateWindow?.days).toEqual([0, 6]);
  });

  it("replaces or clears the window and keeps other keys", () => {
    const parsed = updateWindowSchema.parse(window);
    expect(withUpdateWindow({ other: 1 }, parsed)).toEqual({ other: 1, updateWindow: parsed });
    expect(withUpdateWindow({ other: 1, updateWindow: parsed }, null)).toEqual({ other: 1 });
  });

  it("takes null to clear the window", () => {
    expect(putSettingsSchema.parse({ updateWindow: null })).toEqual({ updateWindow: null });
    expect(putSettingsSchema.safeParse({}).success).toBe(false);
  });

  it("knows time zones", () => {
    expect(isValidTimeZone("UTC")).toBe(true);
    expect(isValidTimeZone("Europe/Berlin")).toBe(true);
    expect(isValidTimeZone("Nowhere/Land")).toBe(false);
    expect(isValidTimeZone("")).toBe(false);
  });
});
