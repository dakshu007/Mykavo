/**
 * Multi-user workspace rules: the role-permission matrix, invite validation,
 * seat math, and current-workspace cookie resolution. Pure logic only (no DB,
 * no Next.js imports) so every rule is unit-testable and usable from both
 * server routes and client components (spec §39: enforcement is server-side;
 * UI reads the same matrix for display).
 */

import type { WorkspaceRole } from "@fluxen/database";

/** httpOnly cookie holding the user's selected workspace id. */
export const WORKSPACE_COOKIE = "fluxen-workspace";

/** Invites expire this many days after (re-)issue. */
export const INVITE_TTL_DAYS = 7;

/** Roles an invite may carry — a workspace has exactly one OWNER, ever. */
export const INVITABLE_ROLES = ["ADMIN", "MEMBER", "VIEWER"] as const;
export type InvitableRole = (typeof INVITABLE_ROLES)[number];

export function isInvitableRole(role: string): role is InvitableRole {
  return (INVITABLE_ROLES as readonly string[]).includes(role);
}

// ---------- Role-permission matrix ----------

/** VIEWER is read-only; everyone else can change monitoring data. */
export function canMutate(role: WorkspaceRole): boolean {
  return role !== "VIEWER";
}

/** Who can invite, revoke invites, and remove (removable) members. */
export function canManageMembers(role: WorkspaceRole): boolean {
  return role === "OWNER" || role === "ADMIN";
}

/** Billing (checkout, add-ons, cancel, portal) is owner-only. */
export function canManageBilling(role: WorkspaceRole): boolean {
  return role === "OWNER";
}

/** Only the owner may change a member's role. */
export function canChangeRoles(role: WorkspaceRole): boolean {
  return role === "OWNER";
}

/**
 * Whether `actor` may remove a member holding `target`. Nobody removes the
 * OWNER; ADMIN may remove MEMBER/VIEWER but not a fellow ADMIN (owner only).
 */
export function canRemoveMember(actor: WorkspaceRole, target: WorkspaceRole): boolean {
  if (target === "OWNER") return false;
  if (actor === "OWNER") return true;
  if (actor === "ADMIN") return target === "MEMBER" || target === "VIEWER";
  return false;
}

// ---------- Seats ----------

/** Pending invites hold a seat so accepting can never overshoot the plan. */
export function seatsUsed(activeMembers: number, pendingInvites: number): number {
  return activeMembers + pendingInvites;
}

export function hasSeatAvailable(
  maxMembers: number,
  activeMembers: number,
  pendingInvites: number,
): boolean {
  return seatsUsed(activeMembers, pendingInvites) < maxMembers;
}

// ---------- Invites ----------

export function inviteExpiry(now: Date = new Date()): Date {
  return new Date(now.getTime() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);
}

/** An invite can be accepted only while unaccepted and unexpired. */
export function isInviteUsable(
  invite: { expiresAt: Date; acceptedAt: Date | null },
  now: Date = new Date(),
): boolean {
  return invite.acceptedAt === null && invite.expiresAt.getTime() > now.getTime();
}

/** Invite emails match the session email case-insensitively. */
export function emailsMatch(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

// ---------- Current-workspace resolution ----------

/**
 * Picks the membership matching the workspace cookie, falling back to the
 * first membership. The cookie is a hint only — it is NEVER trusted without
 * a verified membership row (spec §59: no client-provided authorization).
 */
export function resolveWorkspaceSelection<T extends { workspaceId: string }>(
  cookieValue: string | undefined,
  memberships: T[],
): T | null {
  if (memberships.length === 0) return null;
  if (cookieValue) {
    const match = memberships.find((m) => m.workspaceId === cookieValue);
    if (match) return match;
  }
  return memberships[0];
}

// ---------- Post-auth redirect validation ----------

/**
 * Validates a `?next=` value used to return users to the invite page after
 * sign-in. Only same-origin relative paths are allowed — never absolute URLs,
 * protocol-relative ("//evil.com"), backslash tricks, or auth-scheme paths.
 */
export function safeNextPath(raw: string | null | undefined): string | null {
  if (!raw) return null;
  if (!raw.startsWith("/")) return null;
  if (raw.startsWith("//")) return null;
  if (raw.includes("\\")) return null;
  if (/[\r\n]/.test(raw)) return null;
  return raw;
}
