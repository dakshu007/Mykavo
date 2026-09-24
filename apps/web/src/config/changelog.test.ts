import { describe, expect, it } from "vitest";
import { CHANGELOG } from "./changelog";

describe("changelog", () => {
  it("lists releases newest first, one per date", () => {
    const dates = CHANGELOG.map((r) => r.date);
    expect([...dates].sort().reverse()).toEqual(dates);
    expect(new Set(dates).size).toBe(dates.length);
  });

  it("has valid dates, text and internal links", () => {
    for (const release of CHANGELOG) {
      expect(release.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number.isNaN(Date.parse(release.date))).toBe(false);
      expect(release.items.length).toBeGreaterThan(0);
      for (const item of release.items) {
        expect(item.text.length).toBeGreaterThan(10);
        if (item.href) expect(item.href.startsWith("/")).toBe(true);
      }
    }
  });
});
