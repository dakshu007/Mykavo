import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { isBlogAdmin } from "@/lib/blog-admin";

/**
 * Server-side gate for the blog mini-CMS. Session and allowlist are always
 * checked here — never from client state (spec §59). Split from blog-admin.ts
 * so the pure allowlist logic stays unit-testable without server imports.
 */

export type BlogAdminGate =
  | { ok: true; userId: string; email: string }
  | { ok: false; status: 401 | 403; error: string };

export async function getBlogAdminGate(): Promise<BlogAdminGate> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { ok: false, status: 401, error: "Unauthorized" };
  if (!isBlogAdmin(session.user.email)) {
    return { ok: false, status: 403, error: "Forbidden" };
  }
  return { ok: true, userId: session.user.id, email: session.user.email };
}
