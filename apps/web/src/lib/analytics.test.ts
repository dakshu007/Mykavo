import { afterEach, describe, expect, it, vi } from "vitest";
import { track } from "./analytics";

describe("track", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does nothing on the server (no window)", () => {
    expect(() => track("platform_clicked", { platform: "wordpress" })).not.toThrow();
  });

  it("sends the event and its props to Google Analytics, and nowhere else", () => {
    const gtag = vi.fn();
    const fetchSpy = vi.fn();
    vi.stubGlobal("window", { gtag });
    vi.stubGlobal("fetch", fetchSpy);
    track("platform_clicked", { platform: "chrome", placement: "homepage_band", status: "live" });
    expect(gtag).toHaveBeenCalledTimes(1);
    expect(gtag).toHaveBeenCalledWith("event", "platform_clicked", {
      platform: "chrome",
      placement: "homepage_band",
      status: "live",
    });
    // Tracking must never call MyKavo's own servers (and so never touch the database).
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("is safe when Google Analytics has not loaded", () => {
    vi.stubGlobal("window", {});
    expect(() => track("platforms_cta_clicked", { placement: "hero", target: "signup" })).not.toThrow();
  });
});
