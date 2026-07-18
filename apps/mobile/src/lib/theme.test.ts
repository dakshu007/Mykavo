import { describe, expect, it } from "vitest";

import {
  categoryLabels,
  changeStatusColors,
  darkPalette,
  lightPalette,
  scanStatusColors,
  severityColors,
  websiteStatusColors,
  type ChangeCategory,
  type ChangeStatus,
  type ScanStatus,
  type Severity,
  type WebsiteStatus,
} from "./theme";

const SEVERITIES: Severity[] = ["INFO", "LOW", "MEDIUM", "HIGH", "CRITICAL"];
const WEBSITE_STATUSES: WebsiteStatus[] = [
  "PENDING",
  "DISCOVERING",
  "BASELINING",
  "ACTIVE",
  "PAUSED",
  "ERROR",
];
const SCAN_STATUSES: ScanStatus[] = ["QUEUED", "RUNNING", "COMPLETED", "PARTIAL", "FAILED"];
const CHANGE_STATUSES: ChangeStatus[] = ["NEW", "REVIEWED", "APPROVED", "RESOLVED", "IGNORED"];
const CATEGORIES: ChangeCategory[] = [
  "AVAILABILITY",
  "VISUAL",
  "SEO",
  "CONTENT",
  "LINKS",
  "SCRIPT",
  "PERFORMANCE",
  "CONVERSION",
];

const HEX = /^#[0-9a-fA-F]{6}$/;

describe("mapping helpers are total over their enums (both palettes)", () => {
  for (const palette of [lightPalette, darkPalette]) {
    it("severityColors returns full colors for every severity", () => {
      for (const s of SEVERITIES) {
        const c = severityColors(palette, s);
        expect(c.bg).toMatch(HEX);
        expect(c.text).toMatch(HEX);
        expect(c.dot).toMatch(HEX);
        expect(c.label.length).toBeGreaterThan(0);
      }
    });

    it("websiteStatusColors covers every website status", () => {
      for (const s of WEBSITE_STATUSES) {
        const c = websiteStatusColors(palette, s);
        expect(c.dot).toMatch(HEX);
        expect(c.text).toMatch(HEX);
        expect(c.label.length).toBeGreaterThan(0);
      }
    });

    it("scanStatusColors covers every scan status", () => {
      for (const s of SCAN_STATUSES) {
        const c = scanStatusColors(palette, s);
        expect(c.bg).toMatch(HEX);
        expect(c.text).toMatch(HEX);
      }
    });

    it("changeStatusColors covers every change status", () => {
      for (const s of CHANGE_STATUSES) {
        const c = changeStatusColors(palette, s);
        expect(c.bg).toMatch(HEX);
        expect(c.text).toMatch(HEX);
      }
    });
  }

  it("categoryLabels covers every category", () => {
    for (const c of CATEGORIES) {
      expect(categoryLabels[c].length).toBeGreaterThan(0);
    }
  });
});
