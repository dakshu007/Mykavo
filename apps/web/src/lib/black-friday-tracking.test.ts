import { describe, expect, it } from "vitest";
import { cleanPlacement } from "./attribution/core";
import {
  BF_SECTIONS,
  bfClaimHref,
  bfUtmLink,
  isBfSection,
} from "./black-friday-tracking";

describe("Black Friday section tracking", () => {
  it("tags every signup link with its section, in a form attribution keeps", () => {
    for (const section of BF_SECTIONS) {
      const href = bfClaimHref(section);
      expect(href.startsWith("/signup?next=%2Fdashboard%2Fbilling&from=")).toBe(
        true,
      );
      const from = new URLSearchParams(href.split("?")[1]).get("from");
      expect(from).toBe(`black-friday:${section}`);
      // AttributionCapture runs it through cleanPlacement: it must survive unchanged.
      expect(cleanPlacement(from)).toBe(`black-friday:${section}`);
    }
  });

  it("never puts UTM parameters on the page's own buttons", () => {
    for (const section of BF_SECTIONS)
      expect(bfClaimHref(section)).not.toContain("utm_");
  });

  it("builds UTM links that land on the section", () => {
    expect(
      bfUtmLink({ section: "hero", source: "Instagram", medium: "social" }),
    ).toBe(
      "https://mykavo.app/black-friday?utm_source=instagram&utm_medium=social&utm_campaign=black-friday-2026&utm_content=hero#hero",
    );
    expect(
      bfUtmLink({ section: "code", source: "news letter!", medium: "email" }),
    ).toContain("utm_source=news-letter&");
  });

  it("knows its sections", () => {
    expect(isBfSection("faq")).toBe(true);
    expect(isBfSection("pricing")).toBe(false);
    expect(isBfSection(null)).toBe(false);
  });
});
