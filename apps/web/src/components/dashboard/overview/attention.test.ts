import { describe, expect, it } from "vitest";
import {
  buildAttention,
  summarizeWebsiteHealth,
  websiteProblems,
  type AttentionChange,
  type AttentionInput,
  type AttentionWebsite,
} from "./attention";

const T = (h: number) => new Date(Date.UTC(2026, 9, 17, h));

const site = (id: string, status: AttentionWebsite["status"] = "ACTIVE"): AttentionWebsite => ({
  id,
  name: `Site ${id}`,
  url: `https://${id}.example.com`,
  status,
});

const change = (
  id: string,
  websiteId: string,
  severity: AttentionChange["severity"],
  hour: number,
  pageUrl: string | null = `https://${websiteId}.example.com/pricing`,
): AttentionChange => ({ id, websiteId, title: `Change ${id}`, severity, detectedAt: T(hour), pageUrl });

function input(partial: Partial<AttentionInput>): AttentionInput {
  return {
    websites: [],
    openChanges: [],
    openAttentionTotals: new Map(),
    latestScans: new Map(),
    autoPause: new Map(),
    down: new Map(),
    ...partial,
  };
}

describe("buildAttention", () => {
  it("lists CRITICAL, HIGH and MEDIUM changes only, worst first, with a Review link", () => {
    const result = buildAttention(
      input({
        websites: [site("a")],
        openChanges: [
          change("1", "a", "MEDIUM", 9),
          change("2", "a", "LOW", 10),
          change("3", "a", "CRITICAL", 1),
          change("4", "a", "INFO", 11),
          change("5", "a", "HIGH", 8),
        ],
      }),
    );
    expect(result.groups).toHaveLength(1);
    const rows = result.groups[0].rows;
    expect(rows.map((r) => r.key)).toEqual(["change:3", "change:5", "change:1"]);
    expect(rows[0]).toMatchObject({
      href: "/dashboard/changes/3",
      actionLabel: "Review",
      detail: "/pricing",
      badge: { type: "severity", severity: "CRITICAL" },
    });
    expect(result.totalCount).toBe(3);
  });

  it("labels site-wide changes", () => {
    const result = buildAttention(
      input({ websites: [site("a")], openChanges: [change("1", "a", "HIGH", 1, null)] }),
    );
    expect(result.groups[0].rows[0].detail).toBe("Site-wide");
  });

  it("orders groups by their worst item, then by newest", () => {
    const result = buildAttention(
      input({
        websites: [site("a"), site("b"), site("c")],
        openChanges: [
          change("a1", "a", "MEDIUM", 12),
          change("b1", "b", "HIGH", 2),
          change("c1", "c", "HIGH", 5),
        ],
      }),
    );
    expect(result.groups.map((g) => g.websiteId)).toEqual(["c", "b", "a"]);
  });

  it("caps rows across groups and reports what each group hides", () => {
    const changes = Array.from({ length: 6 }, (_, i) => change(`a${i}`, "a", "HIGH", i));
    const more = Array.from({ length: 5 }, (_, i) => change(`b${i}`, "b", "MEDIUM", i));
    const result = buildAttention(
      input({
        websites: [site("a"), site("b")],
        openChanges: [...changes, ...more],
        // The page loads a capped query; totals say how many really exist.
        openAttentionTotals: new Map([
          ["a", 9],
          ["b", 5],
        ]),
      }),
    );
    expect(result.shownCount).toBe(8);
    expect(result.totalCount).toBe(14);
    expect(result.groups[0]).toMatchObject({ websiteId: "a", hiddenCount: 3 });
    expect(result.groups[0].rows).toHaveLength(6);
    expect(result.groups[1]).toMatchObject({ websiteId: "b", hiddenCount: 3 });
    expect(result.groups[1].rows).toHaveLength(2);
  });

  it("puts a failed scan above changes of the same tier and links to the scan", () => {
    const result = buildAttention(
      input({
        websites: [site("a")],
        openChanges: [change("1", "a", "CRITICAL", 20)],
        latestScans: new Map([
          ["a", { id: "s1", status: "FAILED", errorMessage: "Every monitored page failed to scan.", finishedAt: T(3) }],
        ]),
      }),
    );
    const rows = result.groups[0].rows;
    expect(rows.map((r) => r.key)).toEqual(["scan:s1", "change:1"]);
    expect(rows[0]).toMatchObject({
      href: "/dashboard/scans/s1",
      actionLabel: "View scan",
      detail: "Every monitored page failed to scan.",
    });
  });

  it("counts websites with problems but no changes", () => {
    const result = buildAttention(
      input({
        websites: [site("a", "ERROR"), site("b")],
        down: new Map([["b", T(4)]]),
      }),
    );
    expect(result.totalCount).toBe(2);
    expect([...result.websiteIds].sort()).toEqual(["a", "b"]);
  });

  it("returns an empty list when nothing needs attention", () => {
    const result = buildAttention(
      input({ websites: [site("a")], openChanges: [change("1", "a", "LOW", 1)] }),
    );
    expect(result).toMatchObject({ groups: [], shownCount: 0, totalCount: 0 });
  });
});

describe("websiteProblems", () => {
  it("reports ERROR once, folding in the failed scan's message", () => {
    const rows = websiteProblems(
      site("a", "ERROR"),
      { id: "s1", status: "FAILED", errorMessage: "Site blocked us.", finishedAt: T(1) },
      undefined,
      undefined,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ key: "error:a", detail: "Site blocked us.", actionLabel: "Open website" });
  });

  it("offers an upgrade for a website paused at the plan limit", () => {
    const rows = websiteProblems(site("a", "PAUSED"), undefined, "OVER_LIMIT", undefined);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      badge: { type: "problem", label: "Paused", tone: "warning" },
      href: "/dashboard/billing?from=paused:over-limit",
      actionLabel: "Upgrade",
    });
  });

  it("ignores an owner's pause and an inactivity pause", () => {
    expect(websiteProblems(site("a", "PAUSED"), undefined, undefined, undefined)).toEqual([]);
    expect(websiteProblems(site("a", "PAUSED"), undefined, "DORMANT", undefined)).toEqual([]);
  });

  it("ignores downtime on a paused website", () => {
    expect(websiteProblems(site("a", "PAUSED"), undefined, undefined, T(1))).toEqual([]);
  });

  it("does not flag a completed or partial last scan", () => {
    for (const status of ["COMPLETED", "PARTIAL"] as const) {
      expect(
        websiteProblems(site("a"), { id: "s", status, errorMessage: null, finishedAt: T(1) }, undefined, undefined),
      ).toEqual([]);
    }
  });

  it("flags a website that is down", () => {
    const rows = websiteProblems(site("a"), undefined, undefined, T(2));
    expect(rows).toEqual([
      expect.objectContaining({ key: "down:a", at: T(2), href: "/dashboard/websites/a" }),
    ]);
  });
});

describe("summarizeWebsiteHealth", () => {
  it("buckets websites", () => {
    const summary = summarizeWebsiteHealth(
      [
        site("a"),
        site("b"),
        site("c", "BASELINING"),
        site("d", "PAUSED"),
        site("e", "ERROR"),
      ],
      new Set(["b", "e"]),
    );
    expect(summary).toEqual({ healthy: 1, needsAttention: 2, settingUp: 1, paused: 1 });
  });
});
