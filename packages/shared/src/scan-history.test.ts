import { describe, expect, it } from "vitest";
import {
  ScanHistoryFormatError,
  decodeScanHistory,
  encodeScanHistory,
  parseBrokenLinks,
  type ScanHistory,
} from "./scan-history";
import { scanHistoryKey } from "./artifact-keys";

const sample: ScanHistory = {
  links: [
    { url: "https://a.com/x", normalizedUrl: "https://a.com/x", linkType: "INTERNAL", statusCode: 404 },
    { url: "https://b.com/", normalizedUrl: "https://b.com/", linkType: "EXTERNAL", statusCode: null },
  ],
  scripts: [{ src: "https://www.googletagmanager.com/gtm.js", domain: "www.googletagmanager.com", isThirdParty: true }],
};

describe("scan history format", () => {
  it("round-trips", () => {
    expect(decodeScanHistory(encodeScanHistory(sample))).toEqual(sample);
  });

  it("round-trips an empty page", () => {
    expect(decodeScanHistory(encodeScanHistory({ links: [], scripts: [] }))).toEqual({ links: [], scripts: [] });
  });

  it("rejects bad input instead of reading it as an empty page", () => {
    expect(() => decodeScanHistory("nope")).toThrow(ScanHistoryFormatError);
    expect(() => decodeScanHistory(JSON.stringify({ v: 2, links: [], scripts: [] }))).toThrow(ScanHistoryFormatError);
    expect(() => decodeScanHistory(JSON.stringify({ v: 1, links: [] }))).toThrow(ScanHistoryFormatError);
    expect(() =>
      decodeScanHistory(JSON.stringify({ v: 1, links: [{ url: "x", normalizedUrl: "x", linkType: "OTHER", statusCode: null }], scripts: [] })),
    ).toThrow(ScanHistoryFormatError);
  });

  it("parses the broken-links column leniently", () => {
    expect(parseBrokenLinks(null)).toEqual([]);
    expect(parseBrokenLinks([{ normalizedUrl: "https://a.com/x", statusCode: 404 }, { bad: true }])).toEqual([
      { normalizedUrl: "https://a.com/x", statusCode: 404 },
    ]);
  });

  it("keys the file next to the page's diff image", () => {
    expect(scanHistoryKey({ workspaceId: "w", scanId: "s", monitoredPageId: "p" })).toBe(
      "ws/w/scan/s/p/history.json.gz",
    );
  });
});
