import { describe, expect, it } from "vitest";

import { activeInterval } from "./interval";

describe("activeInterval", () => {
  it("uses the fast cadence during activity and idle cadence otherwise", () => {
    expect(activeInterval(true)).toBe(3500);
    expect(activeInterval(false)).toBe(20000);
    expect(activeInterval(true, 30000, 3000)).toBe(3000);
    expect(activeInterval(false, 30000, 3000)).toBe(30000);
  });
});
