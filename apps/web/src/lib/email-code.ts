/**
 * Email confirmation codes for new email/password accounts.
 *
 * Accounts created from EMAIL_CODE_REQUIRED_FROM on must type a 6-digit code
 * from their inbox before they get a session: no code, no dashboard. That
 * keeps throwaway and mistyped addresses out, which is what was filling the
 * user list with accounts nobody could ever reach.
 *
 * Accounts created before the cutoff are grandfathered, not migrated. They
 * keep signing in exactly as before, with the dashboard banner asking them to
 * confirm by link. Marking them "verified" in bulk would have been simpler,
 * but verified is what unlocks admin rights and the Pro trial, and none of
 * these addresses was ever proven. So nothing about their data changes.
 *
 * Google sign-ins arrive verified and never see a code.
 *
 * Pure so the rules can be tested without Better Auth or a database.
 */

/** Accounts created at or after this moment need a code before signing in. */
export const EMAIL_CODE_REQUIRED_FROM = new Date("2026-11-12T00:00:00.000Z");

/** Digits in a code. */
export const EMAIL_CODE_LENGTH = 6;

/** How long a code stays valid. */
export const EMAIL_CODE_EXPIRES_IN_SECONDS = 10 * 60;

/** Wrong guesses allowed per code before a new one is needed. */
export const EMAIL_CODE_ALLOWED_ATTEMPTS = 5;

/** Minimum gap between two codes for the same address. */
export const EMAIL_CODE_RESEND_COOLDOWN_SECONDS = 45;

export interface CodeCandidate {
  emailVerified: boolean;
  createdAt: Date | string;
}

/** True when this account must confirm its address with a code to sign in. */
export function needsEmailCode(user: CodeCandidate | null | undefined): boolean {
  if (!user || user.emailVerified) return false;
  const created = new Date(user.createdAt).getTime();
  return Number.isFinite(created) && created >= EMAIL_CODE_REQUIRED_FROM.getTime();
}

/**
 * Seconds to wait before another code may be sent, given when the current
 * one was issued. 0 means a new code can go now.
 */
export function resendWaitSeconds(lastIssuedAt: Date | string | null | undefined, now: Date = new Date()): number {
  if (!lastIssuedAt) return 0;
  const issued = new Date(lastIssuedAt).getTime();
  if (!Number.isFinite(issued)) return 0;
  const elapsed = (now.getTime() - issued) / 1000;
  if (elapsed < 0) return EMAIL_CODE_RESEND_COOLDOWN_SECONDS;
  return Math.max(0, Math.ceil(EMAIL_CODE_RESEND_COOLDOWN_SECONDS - elapsed));
}

/** Digits only, at most EMAIL_CODE_LENGTH of them: what a pasted code becomes. */
export function cleanEmailCode(input: string): string {
  return input.replace(/\D/g, "").slice(0, EMAIL_CODE_LENGTH);
}
