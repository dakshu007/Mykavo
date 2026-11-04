import { describe, expect, it } from "vitest";
import { classifyWpOrgPlugin, isFlaggedWpPluginStatus, parseWpOrgDate, wpOrgPluginInfoUrl } from "./wp-plugin-health";

const now = new Date("2026-11-04T12:00:00Z");

describe("classifyWpOrgPlugin", () => {
  it("flags a closed plugin with the reason WordPress.org gives", () => {
    const v = classifyWpOrgPlugin(
      404,
      { error: "closed", slug: "old-forms", closed: true, closed_date: "2025-03-01", reason_text: "Security Issue" },
      now,
    );
    expect(v?.status).toBe("closed");
    expect(v?.reason).toBe("Closed on WordPress.org on 2025-03-01 (Security Issue). It gets no more updates, including security fixes.");
  });

  it("treats a plugin WordPress.org does not know as unknown (premium)", () => {
    expect(classifyWpOrgPlugin(404, { error: "Plugin not found." }, now)).toEqual({
      status: "unknown",
      lastUpdated: null,
      reason: null,
    });
    expect(classifyWpOrgPlugin(404, null, now)?.status).toBe("unknown");
  });

  it("flags a plugin with no release in over two years", () => {
    const v = classifyWpOrgPlugin(200, { slug: "abandoned", last_updated: "2023-05-02 3:45pm GMT" }, now);
    expect(v).toEqual({
      status: "outdated",
      lastUpdated: "2023-05-02",
      reason: "Not updated on WordPress.org in over 3 years (last release 2023-05-02).",
    });
  });

  it("is ok for a maintained plugin", () => {
    expect(classifyWpOrgPlugin(200, { slug: "woocommerce", last_updated: "2026-10-30 9:12am GMT" }, now)).toEqual({
      status: "ok",
      lastUpdated: "2026-10-30",
      reason: null,
    });
  });

  it("returns null for answers that say nothing (try again later)", () => {
    expect(classifyWpOrgPlugin(429, null, now)).toBeNull();
    expect(classifyWpOrgPlugin(500, { slug: "x" }, now)).toBeNull();
    expect(classifyWpOrgPlugin(200, "nope", now)).toBeNull();
    expect(classifyWpOrgPlugin(500, { error: "Internal error" }, now)).toBeNull();
  });
});

describe("helpers", () => {
  it("parses WordPress.org dates", () => {
    expect(parseWpOrgDate("2024-10-22 4:55pm GMT")).toBe("2024-10-22");
    expect(parseWpOrgDate("2024-02-30")).toBeNull();
    expect(parseWpOrgDate(42)).toBeNull();
  });

  it("builds the lookup URL without sections", () => {
    expect(wpOrgPluginInfoUrl("contact-form-7")).toBe(
      "https://api.wordpress.org/plugins/info/1.2/?action=plugin_information&request%5Bslug%5D=contact-form-7&request%5Bfields%5D%5Bsections%5D=0",
    );
  });

  it("knows which statuses are flagged", () => {
    expect(isFlaggedWpPluginStatus("closed")).toBe(true);
    expect(isFlaggedWpPluginStatus("outdated")).toBe(true);
    expect(isFlaggedWpPluginStatus("unknown")).toBe(false);
    expect(isFlaggedWpPluginStatus("ok")).toBe(false);
  });
});
