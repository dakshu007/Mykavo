import { describe, expect, it } from "vitest";
import { cleanPath, cleanPlacement, decodeFirstTouch, encodeFirstTouch, isAppPath, referrerHost } from "./core";

describe("attribution", () => {
  it("keeps only a clean path", () => {
    expect(cleanPath("/blog/seo-tools?utm=x#top")).toBe("/blog/seo-tools");
    expect(cleanPath("//evil.example/x")).toBe("/");
    expect(cleanPath("https://x.com")).toBe("/");
    expect(cleanPath("/a<script>")).toBe("/ascript");
  });

  it("reads the referring host and ignores our own", () => {
    expect(referrerHost("https://www.google.com/search?q=x", "mykavo.app")).toBe("www.google.com");
    expect(referrerHost("https://mykavo.app/blog", "mykavo.app")).toBe("");
    expect(referrerHost("", "mykavo.app")).toBe("");
    expect(referrerHost("not a url", "mykavo.app")).toBe("");
  });

  it("sanitises CTA placements", () => {
    expect(cleanPlacement("blog:mid-tool")).toBe("blog:mid-tool");
    expect(cleanPlacement("Tool Results <b>")).toBe("toolresultsb");
    expect(cleanPlacement("")).toBeNull();
    expect(cleanPlacement(null)).toBeNull();
  });

  it("round-trips the first-touch cookie and rejects junk", () => {
    const raw = encodeFirstTouch({ landing: "/tools/script-detector", referrer: "www.google.com" });
    expect(decodeFirstTouch(raw)).toEqual({ landing: "/tools/script-detector", referrer: "www.google.com" });
    expect(decodeFirstTouch("%7Bbad")).toBeNull();
    expect(decodeFirstTouch(undefined)).toBeNull();
  });

  it("knows app paths are not landing pages", () => {
    expect(isAppPath("/dashboard/websites")).toBe(true);
    expect(isAppPath("/blog")).toBe(false);
    expect(isAppPath("/")).toBe(false);
  });
});
