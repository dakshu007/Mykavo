import { describe, expect, it } from "vitest";
import { parseChangeFilters } from "./change-filters";

describe("the every-website view", () => {
  it("treats ?website=all as no website filter, not as a website id", () => {
    expect(parseChangeFilters({ website: "all" }).websiteId).toBeUndefined();
    expect(parseChangeFilters({ website: "site_1" }).websiteId).toBe("site_1");
  });
});
