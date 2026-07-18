/**
 * Query-string builder. React Native's URLSearchParams polyfill is partial
 * and differs from browsers, so we never rely on it - plain
 * encodeURIComponent is fully supported by Hermes and cannot surprise us.
 */

export function buildQuery(params: Record<string, string | undefined>): string {
  const pairs = Object.entries(params).filter(
    (pair): pair is [string, string] => typeof pair[1] === "string" && pair[1].length > 0,
  );
  if (pairs.length === 0) return "";
  return `?${pairs
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join("&")}`;
}
