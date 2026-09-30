import { createHash, randomBytes } from "node:crypto";

/**
 * MyKavo API keys: "mk_live_" + 32 random bytes (base64url). Only the SHA-256
 * of the key is stored; the key itself is shown once, at creation. The
 * prefix makes a leaked key recognisable (and scannable) as MyKavo's.
 */
export const API_KEY_PREFIX = "mk_live_";

export function generateApiKey(): { key: string; hash: string; displayPrefix: string } {
  const key = `${API_KEY_PREFIX}${randomBytes(32).toString("base64url")}`;
  return { key, hash: hashApiKey(key), displayPrefix: key.slice(0, API_KEY_PREFIX.length + 4) };
}

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

/** A bearer value worth a database lookup: our prefix and a sane length. */
export function looksLikeApiKey(value: string): boolean {
  return value.startsWith(API_KEY_PREFIX) && value.length >= 40 && value.length <= 100;
}

/** The key from an Authorization header, or null. */
export function bearerKey(header: string | null): string | null {
  const match = /^Bearer\s+(\S+)$/i.exec(header ?? "");
  return match && looksLikeApiKey(match[1]) ? match[1] : null;
}
