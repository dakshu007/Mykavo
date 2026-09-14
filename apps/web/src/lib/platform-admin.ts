/**
 * Platform admin allowlist - the operator of this MyKavo installation, as
 * distinct from a customer who owns a workspace.
 *
 * Separate from `isBlogAdmin` on purpose. Publishing a blog post and reading
 * the infrastructure bill are different privileges, and collapsing them means
 * granting one always grants the other. They happen to be the same person
 * today, which is exactly when the distinction is cheap to make.
 *
 * `ADMIN_EMAILS` is the allowlist. It falls back to `BLOG_ADMIN_EMAILS` so an
 * existing deployment does not lose access to a page that did not exist
 * before - but an explicit `ADMIN_EMAILS` always wins, including when it is
 * set to a narrower list.
 *
 * Server-only imports are avoided so this stays unit-testable.
 */

import { parseAdminEmails } from "./blog-admin";

/**
 * True when the email is on the platform admin allowlist.
 * Case-insensitive. An unset allowlist means nobody is an admin, which is the
 * right default: a fresh deployment should not expose its usage figures.
 */
export function isPlatformAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  // PRESENCE decides, not content. `ADMIN_EMAILS=""` is an operator turning
  // this page off, and falling back to BLOG_ADMIN_EMAILS there would quietly
  // re-enable it - the failure that matters, since this page exposes every
  // workspace's totals. Only an ABSENT variable inherits the blog allowlist.
  const raw = process.env.ADMIN_EMAILS;
  const allowlist =
    raw === undefined
      ? parseAdminEmails(process.env.BLOG_ADMIN_EMAILS)
      : parseAdminEmails(raw);
  return allowlist.includes(email.trim().toLowerCase());
}
