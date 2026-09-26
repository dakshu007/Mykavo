import { describe, expect, it } from "vitest";
import { livePostWhere, postDisplayStatus } from "./blog-schedule";

const NOW = Date.parse("2026-09-26T12:00:00Z");

describe("blog scheduling", () => {
  it("only lets public queries see posts whose time has come", () => {
    const now = new Date(NOW);
    expect(livePostWhere(now)).toEqual({ status: "PUBLISHED", publishedAt: { lte: now } });
  });

  it("calls a published post with a future date scheduled", () => {
    expect(postDisplayStatus("PUBLISHED", "2026-09-27T09:00:00Z", NOW)).toBe("SCHEDULED");
    expect(postDisplayStatus("PUBLISHED", "2026-09-25T09:00:00Z", NOW)).toBe("PUBLISHED");
    expect(postDisplayStatus("PUBLISHED", null, NOW)).toBe("PUBLISHED");
  });

  it("keeps a draft a draft, whatever its date", () => {
    expect(postDisplayStatus("DRAFT", "2026-09-27T09:00:00Z", NOW)).toBe("DRAFT");
  });
});
