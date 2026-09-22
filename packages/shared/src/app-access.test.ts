import { describe, expect, it } from "vitest";
import {
  accessStateLabel,
  canDownloadApp,
  decideAppAccess,
  normalizeAccessEmail,
  requestedAgo,
} from "./app-access";

describe("normalizeAccessEmail", () => {
  it("lowercases and trims, so the unique key cannot be dodged by casing", () => {
    expect(normalizeAccessEmail("  Daksh@Example.COM ")).toBe("daksh@example.com");
  });
});

describe("canDownloadApp", () => {
  it("allows only APPROVED", () => {
    expect(canDownloadApp("APPROVED")).toBe(true);
    expect(canDownloadApp("PENDING")).toBe(false);
    expect(canDownloadApp("DECLINED")).toBe(false);
  });

  /**
   * The rule the whole feature rests on: somebody who never asked must be
   * treated exactly like somebody still waiting, and neither sees a download.
   */
  it("treats no request at all as not approved", () => {
    expect(canDownloadApp(null)).toBe(false);
    expect(canDownloadApp(undefined)).toBe(false);
  });
});

describe("accessStateLabel", () => {
  /**
   * PENDING and DECLINED read the same on purpose. Somebody who was turned
   * down should not meet a "declined" badge every time they open the
   * dashboard, and somebody still waiting hears by email rather than from a
   * permanent grey panel.
   */
  it("does not tell a declined user they were declined", () => {
    expect(accessStateLabel("DECLINED")).toBe(accessStateLabel("PENDING"));
    expect(accessStateLabel("DECLINED")).not.toMatch(/declin/i);
  });

  it("names the approved state", () => {
    expect(accessStateLabel("APPROVED")).toBe("Approved");
  });
});

describe("decideAppAccess", () => {
  it("approves a pending request and sends the email", () => {
    expect(decideAppAccess({ status: "PENDING", next: "APPROVED" })).toEqual({
      apply: true,
      sendEmail: true,
    });
  });

  /**
   * The operator WILL click twice - slow connection, two devices, a refresh.
   * A second "your download is ready" is exactly the kind of small sloppiness
   * that makes a product feel unreliable.
   */
  it("never re-sends the email for an already-approved request", () => {
    expect(decideAppAccess({ status: "APPROVED", next: "APPROVED" })).toEqual({
      apply: false,
      reason: "already-in-state",
    });
  });

  it("declines silently - revoking access is not an announcement", () => {
    expect(decideAppAccess({ status: "PENDING", next: "DECLINED" })).toEqual({
      apply: true,
      sendEmail: false,
    });
    expect(decideAppAccess({ status: "APPROVED", next: "DECLINED" })).toEqual({
      apply: true,
      sendEmail: false,
    });
  });

  it("is a no-op for a repeated decline", () => {
    expect(decideAppAccess({ status: "DECLINED", next: "DECLINED" }).apply).toBe(false);
  });

  /** Re-approving after a decline must mail them - they never got the first one. */
  it("mails again when access is restored after a decline", () => {
    expect(decideAppAccess({ status: "DECLINED", next: "APPROVED" })).toEqual({
      apply: true,
      sendEmail: true,
    });
  });
});

describe("requestedAgo", () => {
  const now = new Date("2026-09-22T12:00:00Z");
  it("reads as a queue age", () => {
    expect(requestedAgo("2026-09-22T11:59:40Z", now)).toBe("just now");
    expect(requestedAgo("2026-09-22T11:30:00Z", now)).toBe("30m ago");
    expect(requestedAgo("2026-09-22T06:00:00Z", now)).toBe("6h ago");
    expect(requestedAgo("2026-09-18T12:00:00Z", now)).toBe("4d ago");
  });

  it("never shows a negative age for a clock skew", () => {
    expect(requestedAgo("2026-09-22T12:05:00Z", now)).toBe("just now");
  });

  it("says unknown rather than NaN for a bad value", () => {
    expect(requestedAgo("not-a-date", now)).toBe("unknown");
  });
});
