import { describe, expect, it } from "vitest";
import {
  THEME_PREFERENCES,
  cycleThemePreference,
  parseThemePreference,
  resolveTheme,
  themeAttributeValue,
} from "./theme";

describe("parseThemePreference", () => {
  it("accepts explicit choices", () => {
    expect(parseThemePreference("light")).toBe("light");
    expect(parseThemePreference("dark")).toBe("dark");
  });

  it("falls back to system for anything else", () => {
    expect(parseThemePreference("system")).toBe("system");
    expect(parseThemePreference(null)).toBe("system");
    expect(parseThemePreference(undefined)).toBe("system");
    expect(parseThemePreference("")).toBe("system");
    expect(parseThemePreference("DARK")).toBe("system");
    expect(parseThemePreference("auto")).toBe("system");
    expect(parseThemePreference(42)).toBe("system");
  });
});

describe("resolveTheme", () => {
  it("system follows the OS preference", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
  });

  it("explicit choices win regardless of the OS", () => {
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("light", false)).toBe("light");
    expect(resolveTheme("dark", true)).toBe("dark");
    expect(resolveTheme("dark", false)).toBe("dark");
  });
});

describe("themeAttributeValue", () => {
  it("system clears the attribute so CSS media queries take over", () => {
    expect(themeAttributeValue("system")).toBeNull();
  });

  it("explicit choices stamp data-theme", () => {
    expect(themeAttributeValue("light")).toBe("light");
    expect(themeAttributeValue("dark")).toBe("dark");
  });
});

describe("cycleThemePreference", () => {
  it("cycles system → light → dark → system", () => {
    expect(cycleThemePreference("system")).toBe("light");
    expect(cycleThemePreference("light")).toBe("dark");
    expect(cycleThemePreference("dark")).toBe("system");
  });

  it("visits every preference exactly once per cycle", () => {
    const seen = new Set<string>();
    let current = THEME_PREFERENCES[0];
    for (let i = 0; i < THEME_PREFERENCES.length; i++) {
      seen.add(current);
      current = cycleThemePreference(current);
    }
    expect(seen.size).toBe(THEME_PREFERENCES.length);
    expect(current).toBe(THEME_PREFERENCES[0]);
  });
});
