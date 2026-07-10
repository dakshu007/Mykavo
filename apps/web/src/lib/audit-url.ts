/**
 * Resolves the target URL for an on-demand Lighthouse audit.
 *
 * Users may audit any page of a website they monitor — but ONLY that website's
 * origin. The requested path is resolved against the website URL and rejected
 * unless the resolved origin exactly matches (protocol + host + port). This is
 * a hard server-side boundary: without it, the audit endpoint would let anyone
 * point our Chrome workers at arbitrary domains (spec §11, §59).
 *
 * Accepted inputs: "/pricing"-style paths, relative paths, and full URLs that
 * are same-origin. The resolved URL is normalized (hash stripped, query kept).
 */

export type AuditUrlResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

/** Longest path we accept — anything bigger is garbage or abuse. */
export const MAX_AUDIT_PATH_LENGTH = 2048;

export function resolveAuditUrl(websiteUrl: string, path?: string | null): AuditUrlResult {
  let base: URL;
  try {
    base = new URL(websiteUrl);
  } catch {
    return { ok: false, error: "Invalid website URL." };
  }

  // No path → homepage (the website URL as stored), unchanged.
  const trimmed = path?.trim() ?? "";
  if (trimmed === "") return { ok: true, url: websiteUrl };

  const rejection = {
    ok: false as const,
    error: `Only pages on ${base.hostname} can be audited.`,
  };

  if (trimmed.length > MAX_AUDIT_PATH_LENGTH) return rejection;

  let resolved: URL;
  try {
    resolved = new URL(trimmed, base);
  } catch {
    return rejection;
  }

  // Only web pages — blocks "javascript:", "data:", "file:", etc. (their
  // origin is "null" anyway, but be explicit).
  if (resolved.protocol !== "http:" && resolved.protocol !== "https:") return rejection;

  // URL.origin ignores embedded credentials, so check them separately —
  // "https://user:pass@example.com/" must not reach the scanner (spec §11).
  if (resolved.username !== "" || resolved.password !== "") return rejection;

  // Exact-origin enforcement. Catches other domains, subdomains, other ports,
  // protocol downgrades, and protocol-relative tricks ("//evil.com/x").
  if (resolved.origin !== base.origin) return rejection;

  resolved.hash = "";
  return { ok: true, url: resolved.toString() };
}
