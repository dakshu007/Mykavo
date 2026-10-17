/**
 * Blog admin allowlist. The mini-CMS is gated to a small set of trusted
 * emails configured via BLOG_ADMIN_EMAILS (comma-separated). Kept free of
 * server-only imports so it stays unit-testable.
 */

/**
 * Who is asking for admin rights: the signed-in user's address, and whether
 * they have proved they own it. Pass `session.user` straight in.
 *
 * The proof matters. Signing up does not check the address, so without it
 * anyone who registers with an allowlisted email (before the real owner
 * does, or with Better Auth's case-insensitive lookup in their favour) would
 * inherit every right that email carries.
 */
export interface AdminCandidate {
  email: string | null | undefined;
  emailVerified: boolean | null | undefined;
}

/**
 * Anything an allowlist check accepts. A bare string is still accepted by
 * the type so older call sites compile, but it carries no proof of
 * ownership and is always refused.
 *
 * @deprecated string form: pass `session.user` instead of `session.user.email`.
 */
export type AdminCandidateInput = AdminCandidate | string | null | undefined;

/**
 * The normalized email an allowlist may be checked against, or null when the
 * candidate has not verified it. Fails closed on a bare string.
 */
export function verifiedAdminEmail(candidate: AdminCandidateInput): string | null {
  if (!candidate || typeof candidate === "string") return null;
  if (candidate.emailVerified !== true) return null;
  const email = candidate.email?.trim().toLowerCase();
  return email ? email : null;
}

/** Parses a comma-separated allowlist into normalized (trimmed, lowercased) emails. */
export function parseAdminEmails(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter((email) => email.length > 0);
}

/**
 * True when the candidate's VERIFIED email is on the BLOG_ADMIN_EMAILS
 * allowlist. Case-insensitive; an unset/empty allowlist means nobody is an
 * admin, and an unverified email is never an admin.
 */
export function isBlogAdmin(candidate: AdminCandidateInput): boolean {
  const email = verifiedAdminEmail(candidate);
  if (!email) return false;
  return parseAdminEmails(process.env.BLOG_ADMIN_EMAILS).includes(email);
}
