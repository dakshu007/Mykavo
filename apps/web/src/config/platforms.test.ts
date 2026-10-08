import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { WORKS_WITH_LOGO, isBrandedPlatform } from "@/components/landing/platform-marks";
import { ALERT_CHANNELS, PLATFORMS, PLATFORMS_PAGE_PATH, STATUS_LABEL, platformsByStatus } from "./platforms";

describe("platforms config", () => {
  it("lists each platform once, with unique ids", () => {
    const ids = PLATFORMS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(["web", "wordpress", "chrome", "android", "ai", "deploy", "shopify"]);
  });

  it("states the real status of each platform", () => {
    expect(platformsByStatus("live").map((p) => p.id)).toEqual(["web", "wordpress", "chrome", "ai", "deploy"]);
    expect(platformsByStatus("request").map((p) => p.id)).toEqual(["android"]);
    expect(platformsByStatus("soon").map((p) => p.id)).toEqual(["shopify"]);
    expect(STATUS_LABEL.soon).toBe("Coming soon");
  });

  it("links every card to a route that exists", () => {
    const appDir = join(process.cwd(), "src", "app");
    for (const p of PLATFORMS) {
      expect(p.href.startsWith("/")).toBe(true);
      const first = p.href.split("/")[1];
      // /signup lives in the (auth) route group; everything else is a top-level folder.
      const found = existsSync(join(appDir, first)) || existsSync(join(appDir, "(auth)", first));
      expect(found, `${p.id} links to ${p.href}`).toBe(true);
    }
    expect(PLATFORMS_PAGE_PATH).toBe("/platforms");
  });

  it("keeps the house style: hyphens only, no em or en dashes", () => {
    const text = JSON.stringify([PLATFORMS, ALERT_CHANNELS]);
    expect(text).not.toMatch(/[–—]/);
  });

  it("gives every platform a tagline, a call to action and at least three points", () => {
    for (const p of PLATFORMS) {
      expect(p.tagline.length).toBeGreaterThan(10);
      expect(p.cta.length).toBeGreaterThan(3);
      expect(p.points.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("only names tools it has a real logo for", () => {
    const withLogos = PLATFORMS.filter((p) => p.worksWith);
    expect(withLogos.map((p) => p.id)).toEqual(["ai", "deploy"]);
    for (const p of withLogos) {
      expect(p.worksWith!.items.length).toBeGreaterThan(0);
      for (const w of p.worksWith!.items) {
        expect(Object.keys(WORKS_WITH_LOGO), `${p.id}: ${w.name}`).toContain(w.logo);
      }
    }
  });

  it("gives the platforms that have an official logo a white tile, and MyKavo's own icons the rest", () => {
    const branded = PLATFORMS.filter((p) => isBrandedPlatform(p.id)).map((p) => p.id);
    expect(branded).toEqual(["wordpress", "chrome", "android", "ai", "shopify"]);
    expect(isBrandedPlatform("web")).toBe(false);
    expect(isBrandedPlatform("deploy")).toBe(false);
  });
});
