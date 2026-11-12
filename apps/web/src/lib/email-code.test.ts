import { describe, expect, it } from "vitest";
import {
  cleanEmailCode,
  EMAIL_CODE_REQUIRED_FROM,
  EMAIL_CODE_RESEND_COOLDOWN_SECONDS,
  needsEmailCode,
  resendWaitSeconds,
} from "./email-code";

const after = new Date(EMAIL_CODE_REQUIRED_FROM.getTime() + 60_000);
const before = new Date(EMAIL_CODE_REQUIRED_FROM.getTime() - 60_000);

describe("needsEmailCode", () => {
  it("asks new unverified accounts for a code", () => {
    expect(needsEmailCode({ emailVerified: false, createdAt: after })).toBe(true);
    expect(needsEmailCode({ emailVerified: false, createdAt: EMAIL_CODE_REQUIRED_FROM })).toBe(true);
  });

  it("grandfathers accounts created before the cutoff", () => {
    expect(needsEmailCode({ emailVerified: false, createdAt: before })).toBe(false);
  });

  it("never asks verified accounts or missing users", () => {
    expect(needsEmailCode({ emailVerified: true, createdAt: after })).toBe(false);
    expect(needsEmailCode(null)).toBe(false);
    expect(needsEmailCode(undefined)).toBe(false);
  });

  it("accepts ISO strings and ignores bad dates", () => {
    expect(needsEmailCode({ emailVerified: false, createdAt: after.toISOString() })).toBe(true);
    expect(needsEmailCode({ emailVerified: false, createdAt: "not a date" })).toBe(false);
  });
});

describe("resendWaitSeconds", () => {
  const now = new Date("2026-11-12T12:00:00.000Z");

  it("is 0 with no code out", () => {
    expect(resendWaitSeconds(null, now)).toBe(0);
  });

  it("counts down from the cooldown", () => {
    expect(resendWaitSeconds(new Date(now.getTime() - 5_000), now)).toBe(EMAIL_CODE_RESEND_COOLDOWN_SECONDS - 5);
    expect(resendWaitSeconds(new Date(now.getTime() - EMAIL_CODE_RESEND_COOLDOWN_SECONDS * 1000), now)).toBe(0);
  });

  it("treats a future issue time as just issued", () => {
    expect(resendWaitSeconds(new Date(now.getTime() + 10_000), now)).toBe(EMAIL_CODE_RESEND_COOLDOWN_SECONDS);
  });
});

describe("cleanEmailCode", () => {
  it("keeps digits only, at most six", () => {
    expect(cleanEmailCode(" 482-913 ")).toBe("482913");
    expect(cleanEmailCode("12345678")).toBe("123456");
    expect(cleanEmailCode("abc")).toBe("");
  });
});
