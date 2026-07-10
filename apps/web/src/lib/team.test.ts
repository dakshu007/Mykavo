import { describe, expect, it } from "vitest";
import {
  canChangeRoles,
  canManageBilling,
  canManageMembers,
  canMutate,
  canRemoveMember,
  emailsMatch,
  hasSeatAvailable,
  INVITE_TTL_DAYS,
  inviteExpiry,
  isInvitableRole,
  isInviteUsable,
  resolveWorkspaceSelection,
  safeNextPath,
  seatsUsed,
} from "./team";

describe("role-permission matrix", () => {
  it("VIEWER is read-only; all other roles can mutate", () => {
    expect(canMutate("OWNER")).toBe(true);
    expect(canMutate("ADMIN")).toBe(true);
    expect(canMutate("MEMBER")).toBe(true);
    expect(canMutate("VIEWER")).toBe(false);
  });

  it("only OWNER and ADMIN manage members", () => {
    expect(canManageMembers("OWNER")).toBe(true);
    expect(canManageMembers("ADMIN")).toBe(true);
    expect(canManageMembers("MEMBER")).toBe(false);
    expect(canManageMembers("VIEWER")).toBe(false);
  });

  it("billing and role changes are owner-only", () => {
    expect(canManageBilling("OWNER")).toBe(true);
    expect(canManageBilling("ADMIN")).toBe(false);
    expect(canManageBilling("MEMBER")).toBe(false);
    expect(canManageBilling("VIEWER")).toBe(false);
    expect(canChangeRoles("OWNER")).toBe(true);
    expect(canChangeRoles("ADMIN")).toBe(false);
  });

  it("nobody can remove the OWNER", () => {
    expect(canRemoveMember("OWNER", "OWNER")).toBe(false);
    expect(canRemoveMember("ADMIN", "OWNER")).toBe(false);
    expect(canRemoveMember("MEMBER", "OWNER")).toBe(false);
  });

  it("OWNER can remove any non-owner; ADMIN cannot remove a fellow ADMIN", () => {
    expect(canRemoveMember("OWNER", "ADMIN")).toBe(true);
    expect(canRemoveMember("OWNER", "MEMBER")).toBe(true);
    expect(canRemoveMember("OWNER", "VIEWER")).toBe(true);
    expect(canRemoveMember("ADMIN", "ADMIN")).toBe(false);
    expect(canRemoveMember("ADMIN", "MEMBER")).toBe(true);
    expect(canRemoveMember("ADMIN", "VIEWER")).toBe(true);
  });

  it("MEMBER and VIEWER can remove nobody", () => {
    expect(canRemoveMember("MEMBER", "VIEWER")).toBe(false);
    expect(canRemoveMember("VIEWER", "VIEWER")).toBe(false);
  });
});

describe("invitable roles", () => {
  it("OWNER is never invitable", () => {
    expect(isInvitableRole("OWNER")).toBe(false);
    expect(isInvitableRole("ADMIN")).toBe(true);
    expect(isInvitableRole("MEMBER")).toBe(true);
    expect(isInvitableRole("VIEWER")).toBe(true);
    expect(isInvitableRole("SUPERADMIN")).toBe(false);
  });
});

describe("seat math", () => {
  it("pending invites hold a seat", () => {
    expect(seatsUsed(2, 1)).toBe(3);
    expect(hasSeatAvailable(5, 2, 2)).toBe(true);
    expect(hasSeatAvailable(5, 3, 2)).toBe(false);
    expect(hasSeatAvailable(5, 5, 0)).toBe(false);
  });

  it("free plan (1 seat) can never invite: the owner uses the only seat", () => {
    expect(hasSeatAvailable(1, 1, 0)).toBe(false);
  });
});

describe("invite lifecycle", () => {
  const now = new Date("2026-07-10T12:00:00Z");

  it("expires exactly INVITE_TTL_DAYS after issue", () => {
    const expiry = inviteExpiry(now);
    expect((expiry.getTime() - now.getTime()) / 86_400_000).toBe(INVITE_TTL_DAYS);
  });

  it("is usable only while unaccepted and unexpired", () => {
    const future = new Date(now.getTime() + 1000);
    const past = new Date(now.getTime() - 1000);
    expect(isInviteUsable({ expiresAt: future, acceptedAt: null }, now)).toBe(true);
    expect(isInviteUsable({ expiresAt: past, acceptedAt: null }, now)).toBe(false);
    expect(isInviteUsable({ expiresAt: future, acceptedAt: past }, now)).toBe(false);
  });

  it("matches emails case-insensitively with whitespace trimmed", () => {
    expect(emailsMatch("Ada@Example.com", " ada@example.COM ")).toBe(true);
    expect(emailsMatch("ada@example.com", "grace@example.com")).toBe(false);
  });
});

describe("resolveWorkspaceSelection", () => {
  const memberships = [
    { workspaceId: "ws-a", role: "OWNER" },
    { workspaceId: "ws-b", role: "VIEWER" },
  ];

  it("selects the membership matching the cookie", () => {
    expect(resolveWorkspaceSelection("ws-b", memberships)?.workspaceId).toBe("ws-b");
  });

  it("falls back to the first membership when the cookie is absent", () => {
    expect(resolveWorkspaceSelection(undefined, memberships)?.workspaceId).toBe("ws-a");
  });

  it("never trusts a cookie without a matching membership", () => {
    expect(resolveWorkspaceSelection("ws-evil", memberships)?.workspaceId).toBe("ws-a");
  });

  it("returns null with no memberships at all", () => {
    expect(resolveWorkspaceSelection("ws-a", [])).toBeNull();
  });
});

describe("safeNextPath", () => {
  it("allows same-origin relative paths", () => {
    expect(safeNextPath("/invite/abc123")).toBe("/invite/abc123");
    expect(safeNextPath("/dashboard")).toBe("/dashboard");
  });

  it("rejects absolute, protocol-relative, and malformed values", () => {
    expect(safeNextPath("https://evil.com")).toBeNull();
    expect(safeNextPath("//evil.com")).toBeNull();
    expect(safeNextPath("/\\evil.com")).toBeNull();
    expect(safeNextPath("javascript:alert(1)")).toBeNull();
    expect(safeNextPath("/a\r\nSet-Cookie: x")).toBeNull();
    expect(safeNextPath("")).toBeNull();
    expect(safeNextPath(null)).toBeNull();
    expect(safeNextPath(undefined)).toBeNull();
  });
});
