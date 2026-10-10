import { describe, expect, it } from "vitest";
import { withSocial } from "./social-metadata";

describe("withSocial", () => {
  it("copies the page's title, description and canonical into og and twitter", () => {
    const m = withSocial({ title: "Free Noindex Checker", description: "Is my page blocked?", alternates: { canonical: "/tools/noindex-checker" } });
    expect(m.openGraph).toMatchObject({ title: "Free Noindex Checker", description: "Is my page blocked?", url: "/tools/noindex-checker", siteName: "MyKavo" });
    expect(m.twitter).toMatchObject({ card: "summary_large_image", title: "Free Noindex Checker", description: "Is my page blocked?" });
    expect(m.title).toBe("Free Noindex Checker");
    expect(m.openGraph?.images).toEqual([expect.objectContaining({ url: "/opengraph-image.png", width: 1200, height: 630 })]);
    expect(m.twitter?.images).toEqual([expect.objectContaining({ url: "/opengraph-image.png" })]);
  });

  it("uses an absolute title, and lets explicit openGraph values win", () => {
    const m = withSocial({ title: { absolute: "Status - MyKavo" }, openGraph: { title: "Custom" } });
    expect(m.openGraph).toMatchObject({ title: "Custom" });
    expect(m.twitter).toMatchObject({ title: "Status - MyKavo" });
    expect(m.openGraph).not.toHaveProperty("url");
  });
});
