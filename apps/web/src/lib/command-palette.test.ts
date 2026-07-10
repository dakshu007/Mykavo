import { describe, expect, it } from "vitest";
import {
  SECTION_ORDER,
  filterEntries,
  flattenGroups,
  groupEntries,
  matchesQuery,
  moveIndex,
  staticEntries,
  type PaletteEntry,
} from "./command-palette";

function entry(overrides: Partial<PaletteEntry> & Pick<PaletteEntry, "id">): PaletteEntry {
  return {
    section: "Navigation",
    label: overrides.id,
    href: "/dashboard",
    ...overrides,
  };
}

describe("staticEntries", () => {
  it("mirrors the sidebar navigation for non-admins", () => {
    const labels = staticEntries(false)
      .filter((e) => e.section === "Navigation")
      .map((e) => e.label);
    expect(labels).toEqual([
      "Overview",
      "Websites",
      "Changes",
      "Scan History",
      "Notifications",
      "Billing",
      "Settings",
    ]);
  });

  it("hides blog entries from non-admins", () => {
    const entries = staticEntries(false);
    expect(entries.some((e) => e.label === "Blog")).toBe(false);
    expect(entries.some((e) => e.label === "Write blog post")).toBe(false);
  });

  it("adds Blog navigation and the write-post action for admins", () => {
    const entries = staticEntries(true);
    expect(entries.find((e) => e.label === "Blog")?.href).toBe("/dashboard/blog");
    expect(entries.find((e) => e.label === "Write blog post")?.href).toBe(
      "/dashboard/blog/new",
    );
  });

  it("has unique ids so option elements never collide", () => {
    const ids = staticEntries(true).map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("lists actions before navigation", () => {
    const sections = staticEntries(false).map((e) => e.section);
    expect(sections.indexOf("Navigation")).toBeGreaterThan(sections.lastIndexOf("Actions"));
  });
});

describe("matchesQuery / filterEntries", () => {
  const entries = [
    entry({ id: "a", label: "Scan History" }),
    entry({ id: "b", label: "Billing" }),
    entry({ id: "c", label: "Acme site", hint: "https://acme.example.com" }),
  ];

  it("matches case-insensitively on the label", () => {
    expect(filterEntries(entries, "scan").map((e) => e.id)).toEqual(["a"]);
    expect(filterEntries(entries, "BILL").map((e) => e.id)).toEqual(["b"]);
  });

  it("matches the hint (URL) as well as the label", () => {
    expect(filterEntries(entries, "example.com").map((e) => e.id)).toEqual(["c"]);
  });

  it("returns everything for an empty or whitespace query", () => {
    expect(filterEntries(entries, "")).toHaveLength(3);
    expect(filterEntries(entries, "   ")).toHaveLength(3);
  });

  it("trims the query before matching", () => {
    expect(matchesQuery(entries[0], "  scan  ")).toBe(true);
  });

  it("returns nothing when no entry matches", () => {
    expect(filterEntries(entries, "zzz")).toHaveLength(0);
  });
});

describe("groupEntries", () => {
  it("orders groups by SECTION_ORDER regardless of input order", () => {
    const grouped = groupEntries([
      entry({ id: "c", section: "Changes" }),
      entry({ id: "n", section: "Navigation" }),
      entry({ id: "a", section: "Actions" }),
    ]);
    expect(grouped.map((g) => g.section)).toEqual(["Actions", "Navigation", "Changes"]);
  });

  it("drops empty sections", () => {
    const grouped = groupEntries([entry({ id: "w", section: "Websites" })]);
    expect(grouped).toHaveLength(1);
    expect(grouped[0].section).toBe("Websites");
  });

  it("keeps within-section input order", () => {
    const grouped = groupEntries([
      entry({ id: "one", section: "Pages" }),
      entry({ id: "two", section: "Pages" }),
    ]);
    expect(grouped[0].entries.map((e) => e.id)).toEqual(["one", "two"]);
  });

  it("covers every declared section", () => {
    const all = SECTION_ORDER.map((section, i) => entry({ id: `s${i}`, section }));
    expect(groupEntries(all).map((g) => g.section)).toEqual([...SECTION_ORDER]);
  });
});

describe("flattenGroups", () => {
  it("flattens in render order so flat indexes match what the user sees", () => {
    const grouped = groupEntries([
      entry({ id: "p1", section: "Pages" }),
      entry({ id: "a1", section: "Actions" }),
      entry({ id: "w1", section: "Websites" }),
    ]);
    expect(flattenGroups(grouped).map((e) => e.id)).toEqual(["a1", "w1", "p1"]);
  });

  it("returns an empty list for no groups", () => {
    expect(flattenGroups([])).toEqual([]);
  });
});

describe("moveIndex", () => {
  it("steps down and up", () => {
    expect(moveIndex(0, 1, 5)).toBe(1);
    expect(moveIndex(3, -1, 5)).toBe(2);
  });

  it("wraps at both ends", () => {
    expect(moveIndex(4, 1, 5)).toBe(0);
    expect(moveIndex(0, -1, 5)).toBe(4);
  });

  it("is safe on empty lists", () => {
    expect(moveIndex(0, 1, 0)).toBe(0);
    expect(moveIndex(3, -1, 0)).toBe(0);
  });

  it("clamps a stale index after the list shrinks", () => {
    // active index was 7, list filtered down to 3 items
    expect(moveIndex(7, 1, 3)).toBe(0);
    expect(moveIndex(7, -1, 3)).toBe(1);
  });
});
