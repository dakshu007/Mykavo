import { describe, expect, it } from "vitest";
import { EMAIL_OPT_IN_SINCE, emailIsGrandfathered } from "./notifications";

describe("emailIsGrandfathered", () => {
  it("grandfathers a workspace created before the cutoff", () => {
    expect(emailIsGrandfathered(new Date("2026-01-01T00:00:00Z"))).toBe(true);
  });

  it("does not grandfather one created after it", () => {
    expect(emailIsGrandfathered(new Date("2026-12-01T00:00:00Z"))).toBe(false);
  });

  it("treats the cutoff instant itself as new", () => {
    expect(emailIsGrandfathered(EMAIL_OPT_IN_SINCE)).toBe(false);
  });

  /**
   * A missing date means the workspace could not be read. Defaulting to
   * "email them anyway" would mail people on the strength of a failed query,
   * so the safe answer is the opt-in one.
   */
  it("does not email when the creation date is unknown", () => {
    expect(emailIsGrandfathered(null)).toBe(false);
    expect(emailIsGrandfathered(undefined)).toBe(false);
  });
});
