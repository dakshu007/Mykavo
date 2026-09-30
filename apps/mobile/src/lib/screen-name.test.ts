import { describe, expect, it } from "vitest";
import { screenName } from "./screen-name";

describe("screenName", () => {
  it("names tabs and detail screens", () => {
    expect(screenName("/")).toBe("Overview");
    expect(screenName("/changes")).toBe("Changes");
    expect(screenName("/change/cm9x2k4lq0000abc")).toBe("Change detail");
    expect(screenName("/website/new")).toBe("Add website");
    expect(screenName("/website/abc123")).toBe("Website detail");
  });

  it("skips sign-in and unknown screens", () => {
    expect(screenName("/login")).toBeNull();
    expect(screenName("/something-else")).toBeNull();
    expect(screenName(null)).toBeNull();
  });
});
