import { describe, expect, it } from "vitest";
import { EMAIL_ALERTS_ON_BY_DEFAULT } from "./notifications";

describe("email alert default", () => {
  it("emails a workspace that has not chosen otherwise", () => {
    expect(EMAIL_ALERTS_ON_BY_DEFAULT).toBe(true);
  });
});
