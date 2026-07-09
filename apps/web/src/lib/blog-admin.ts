/**
 * Blog admin allowlist. The mini-CMS is gated to a small set of trusted
 * emails configured via BLOG_ADMIN_EMAILS (comma-separated). Kept free of
 * server-only imports so it stays unit-testable.
 */

/** Parses a comma-separated allowlist into normalized (trimmed, lowercased) emails. */
export function parseAdminEmails(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter((email) => email.length > 0);
}

/**
 * True when the email is on the BLOG_ADMIN_EMAILS allowlist.
 * Case-insensitive; an unset/empty allowlist means nobody is an admin.
 */
export function isBlogAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  const allowlist = parseAdminEmails(process.env.BLOG_ADMIN_EMAILS);
  return allowlist.includes(email.trim().toLowerCase());
}
