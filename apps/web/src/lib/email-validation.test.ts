import { describe, expect, it } from "vitest";
import {
  emailDomain,
  isDisposableDomain,
  validateSignupEmail,
  type MxResolver,
} from "./email-validation";

const mxYes: MxResolver = async () => [{ exchange: "mail.example.com" }];
const mxNullMx: MxResolver = async () => [{ exchange: "." }];
const mxNxdomain: MxResolver = async () => {
  const err = new Error("nx") as NodeJS.ErrnoException;
  err.code = "ENOTFOUND";
  throw err;
};
const mxServfail: MxResolver = async () => {
  const err = new Error("servfail") as NodeJS.ErrnoException;
  err.code = "ESERVFAIL";
  throw err;
};

describe("emailDomain", () => {
  it("extracts the lowercase domain", () => {
    expect(emailDomain("User@Example.COM")).toBe("example.com");
  });

  it("rejects structurally invalid addresses", () => {
    for (const bad of ["", "plain", "a@b", "a b@c.com", "a@@b.com", "a@b.c"]) {
      expect(emailDomain(bad)).toBeNull();
    }
  });
});

describe("isDisposableDomain", () => {
  it("flags known throwaway providers", () => {
    expect(isDisposableDomain("mailinator.com")).toBe(true);
    expect(isDisposableDomain("gmail.com")).toBe(false);
  });
});

describe("validateSignupEmail", () => {
  it("accepts a deliverable address", async () => {
    expect(await validateSignupEmail("user@example.com", mxYes)).toEqual({ ok: true });
  });

  it("rejects bad format without hitting DNS", async () => {
    expect(await validateSignupEmail("nope", mxYes)).toEqual({ ok: false, reason: "format" });
  });

  it("rejects disposable domains", async () => {
    expect(await validateSignupEmail("x@yopmail.com", mxYes)).toEqual({
      ok: false,
      reason: "disposable",
    });
  });

  it("rejects domains with no mail service (NXDOMAIN)", async () => {
    expect(await validateSignupEmail("x@no-such-domain.example", mxNxdomain)).toEqual({
      ok: false,
      reason: "undeliverable",
    });
  });

  it("rejects RFC 7505 null-MX domains", async () => {
    expect(await validateSignupEmail("x@nullmx.example", mxNullMx)).toEqual({
      ok: false,
      reason: "undeliverable",
    });
  });

  it("fails open on resolver infrastructure errors", async () => {
    expect(await validateSignupEmail("x@flaky.example", mxServfail)).toEqual({ ok: true });
  });
});
