import { env } from "@/lib/env";
import { site } from "@/config/site";

/**
 * Absolute base URL of this deployment (no trailing slash) for links placed
 * in emails. Same precedence as billing/config.ts: APP_URL, then the auth
 * base URL, then the public site URL.
 */
export function appBaseUrl(): string {
  const raw = env.APP_URL ?? env.BETTER_AUTH_URL ?? site.url;
  return raw.replace(/\/+$/, "");
}
