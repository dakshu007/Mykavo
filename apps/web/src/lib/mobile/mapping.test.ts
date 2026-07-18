import { describe, expect, it } from "vitest";
import {
  canUpdateBaseline,
  hasDiffImage,
  highestSeverity,
  mapChangeListItem,
  mapScanListItem,
  parseBrokenLinks,
  parseSeverity,
  pathOf,
  sortChangesBySeverity,
  summarizeOpenChanges,
  type ChangeRowForList,
  type ScanRowForList,
} from "./mapping";

describe("highestSeverity", () => {
  it("returns null for an empty list", () => {
    expect(highestSeverity([])).toBeNull();
  });

  it("ranks CRITICAL > HIGH > MEDIUM > LOW > INFO", () => {
    expect(highestSeverity(["INFO", "HIGH", "LOW"])).toBe("HIGH");
    expect(highestSeverity(["MEDIUM", "CRITICAL", "HIGH"])).toBe("CRITICAL");
    expect(highestSeverity(["INFO"])).toBe("INFO");
  });
});

describe("parseSeverity", () => {
  it("passes through enum values and rejects everything else", () => {
    expect(parseSeverity("CRITICAL")).toBe("CRITICAL");
    expect(parseSeverity("INFO")).toBe("INFO");
    expect(parseSeverity("BOGUS")).toBeNull();
    expect(parseSeverity("")).toBeNull();
    expect(parseSeverity(null)).toBeNull();
  });
});

describe("pathOf", () => {
  it("returns pathname plus query", () => {
    expect(pathOf("https://example.com/pricing?utm=x")).toBe("/pricing?utm=x");
    expect(pathOf("https://example.com/")).toBe("/");
  });

  it("falls back to the raw string for unparseable URLs", () => {
    expect(pathOf("not a url")).toBe("not a url");
  });
});

describe("mapChangeListItem", () => {
  const base: ChangeRowForList = {
    id: "chg_1",
    title: "Title changed",
    severity: "MEDIUM",
    category: "SEO",
    status: "NEW",
    detectedAt: new Date("2026-07-01T10:00:00.000Z"),
    websiteId: "web_1",
    website: { name: "Acme" },
    monitoredPage: { url: "https://acme.com/pricing" },
  };

  it("maps a page-scoped change with an ISO timestamp and page path", () => {
    expect(mapChangeListItem(base)).toEqual({
      id: "chg_1",
      title: "Title changed",
      severity: "MEDIUM",
      category: "SEO",
      status: "NEW",
      detectedAt: "2026-07-01T10:00:00.000Z",
      websiteId: "web_1",
      websiteName: "Acme",
      pagePath: "/pricing",
    });
  });

  it("maps site-wide changes (no monitored page) to a null pagePath", () => {
    expect(mapChangeListItem({ ...base, monitoredPage: null }).pagePath).toBeNull();
  });
});

describe("sortChangesBySeverity", () => {
  it("orders most severe first, newest first within a severity", () => {
    const changes = [
      { id: "a", severity: "LOW" as const, detectedAt: new Date("2026-07-03") },
      { id: "b", severity: "CRITICAL" as const, detectedAt: new Date("2026-07-01") },
      { id: "c", severity: "LOW" as const, detectedAt: new Date("2026-07-04") },
      { id: "d", severity: "HIGH" as const, detectedAt: new Date("2026-07-02") },
    ];
    expect(sortChangesBySeverity(changes).map((c) => c.id)).toEqual([
      "b",
      "d",
      "c",
      "a",
    ]);
  });

  it("does not mutate the input array", () => {
    const changes = [
      { severity: "INFO" as const, detectedAt: new Date("2026-07-01") },
      { severity: "HIGH" as const, detectedAt: new Date("2026-07-01") },
    ];
    sortChangesBySeverity(changes);
    expect(changes[0].severity).toBe("INFO");
  });
});

describe("summarizeOpenChanges", () => {
  it("totals counts and keeps the highest severity per website", () => {
    const summary = summarizeOpenChanges([
      { websiteId: "w1", severity: "LOW", count: 3 },
      { websiteId: "w1", severity: "CRITICAL", count: 1 },
      { websiteId: "w2", severity: "MEDIUM", count: 2 },
    ]);
    expect(summary.get("w1")).toEqual({
      openChanges: 4,
      highestOpenSeverity: "CRITICAL",
    });
    expect(summary.get("w2")).toEqual({
      openChanges: 2,
      highestOpenSeverity: "MEDIUM",
    });
    expect(summary.get("w3")).toBeUndefined();
  });
});

describe("mapScanListItem", () => {
  const scan: ScanRowForList = {
    id: "scan_1",
    websiteId: "web_1",
    status: "COMPLETED",
    triggerType: "MANUAL",
    startedAt: new Date("2026-07-01T10:00:00.000Z"),
    completedAt: new Date("2026-07-01T10:01:30.000Z"),
    createdAt: new Date("2026-07-01T09:59:00.000Z"),
    pagesRequested: 5,
    pagesScanned: 4,
    pagesFailed: 1,
    changesDetected: 2,
    highestSeverity: "HIGH",
  };

  it("maps dates to ISO strings and attaches website name/url", () => {
    expect(mapScanListItem(scan, { name: "Acme", url: "https://acme.com" })).toEqual({
      id: "scan_1",
      websiteId: "web_1",
      websiteName: "Acme",
      websiteUrl: "https://acme.com",
      status: "COMPLETED",
      triggerType: "MANUAL",
      startedAt: "2026-07-01T10:00:00.000Z",
      completedAt: "2026-07-01T10:01:30.000Z",
      createdAt: "2026-07-01T09:59:00.000Z",
      pagesRequested: 5,
      pagesScanned: 4,
      pagesFailed: 1,
      changesDetected: 2,
      highestSeverity: "HIGH",
    });
  });

  it("keeps null timestamps null and drops unknown severities", () => {
    const mapped = mapScanListItem(
      { ...scan, startedAt: null, completedAt: null, highestSeverity: "weird" },
      { name: "Acme", url: "https://acme.com" },
    );
    expect(mapped.startedAt).toBeNull();
    expect(mapped.completedAt).toBeNull();
    expect(mapped.highestSeverity).toBeNull();
  });
});

describe("parseBrokenLinks", () => {
  it("maps worker metadata rows, translating status 0 to null", () => {
    expect(
      parseBrokenLinks({
        brokenLinks: [
          { url: "https://acme.com/gone", status: 404, pages: 3 },
          { url: "https://acme.com/dead", status: 0, pages: 1 },
        ],
      }),
    ).toEqual([
      { url: "https://acme.com/gone", status: 404, pageCount: 3 },
      { url: "https://acme.com/dead", status: null, pageCount: 1 },
    ]);
  });

  it("skips malformed entries and tolerates non-object metadata", () => {
    expect(parseBrokenLinks(null)).toEqual([]);
    expect(parseBrokenLinks("nope")).toEqual([]);
    expect(parseBrokenLinks({})).toEqual([]);
    expect(parseBrokenLinks({ brokenLinks: "nope" })).toEqual([]);
    expect(
      parseBrokenLinks({
        brokenLinks: [
          { url: 42, status: 404, pages: 1 },
          { url: "https://ok.com/x", status: 500, pages: 2 },
          null,
        ],
      }),
    ).toEqual([{ url: "https://ok.com/x", status: 500, pageCount: 2 }]);
  });
});

describe("hasDiffImage", () => {
  it("requires a string diffStorageKey in metadata", () => {
    expect(hasDiffImage({ diffStorageKey: "diffs/a.png" })).toBe(true);
    expect(hasDiffImage({ diffStorageKey: 7 })).toBe(false);
    expect(hasDiffImage({})).toBe(false);
    expect(hasDiffImage(null)).toBe(false);
  });
});

describe("canUpdateBaseline", () => {
  it("requires a monitored page and a successful current snapshot", () => {
    expect(
      canUpdateBaseline({
        monitoredPageId: "page_1",
        currentSnapshotId: "snap_1",
        currentSnapshot: { errorCode: null },
      }),
    ).toBe(true);
  });

  it("rejects site-wide changes, missing snapshots, and failed snapshots", () => {
    expect(
      canUpdateBaseline({
        monitoredPageId: null,
        currentSnapshotId: "snap_1",
        currentSnapshot: { errorCode: null },
      }),
    ).toBe(false);
    expect(
      canUpdateBaseline({
        monitoredPageId: "page_1",
        currentSnapshotId: null,
        currentSnapshot: null,
      }),
    ).toBe(false);
    expect(
      canUpdateBaseline({
        monitoredPageId: "page_1",
        currentSnapshotId: "snap_1",
        currentSnapshot: { errorCode: "NAVIGATION_TIMEOUT" },
      }),
    ).toBe(false);
  });
});
