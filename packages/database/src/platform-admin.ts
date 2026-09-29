/**
 * The platform admin allowlist, as the database layer reads it: the admin's
 * own workspaces resolve to the unlimited Agency plan (getWorkspaceEntitlement),
 * in the web app and the worker alike - so both need ADMIN_EMAILS set.
 *
 * Same rule as the web app's isPlatformAdmin (apps/web/src/lib/platform-admin.ts):
 * `ADMIN_EMAILS` is the allowlist, and PRESENCE decides, not content. An absent
 * variable falls back to `BLOG_ADMIN_EMAILS`; `ADMIN_EMAILS=""` means nobody.
 */

type Env = Record<string, string | undefined>;

function parseEmails(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter((email) => email.length > 0);
}

export function platformAdminEmails(env: Env = process.env): string[] {
  const raw = env.ADMIN_EMAILS;
  return raw === undefined ? parseEmails(env.BLOG_ADMIN_EMAILS) : parseEmails(raw);
}

/** Case-insensitive. An unset allowlist means nobody is an admin. */
export function isPlatformAdminEmail(email: string | null | undefined, env: Env = process.env): boolean {
  if (!email) return false;
  return platformAdminEmails(env).includes(email.trim().toLowerCase());
}
