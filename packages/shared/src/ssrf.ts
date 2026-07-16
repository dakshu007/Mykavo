/**
 * SSRF protection pipeline (spec §11, docs/SECURITY_MODEL.md).
 * EVERY outbound fetch of a user-influenced URL must go through safeFetch().
 * This module migrates to packages/shared in Phase 2.
 */

import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export class UnsafeUrlError extends Error {
  constructor(
    public readonly code:
      | "INVALID_URL"
      | "SCHEME_NOT_ALLOWED"
      | "CREDENTIALS_IN_URL"
      | "BLOCKED_HOST"
      | "BLOCKED_IP"
      | "DNS_FAILURE"
      | "TOO_MANY_REDIRECTS"
      | "RESPONSE_TOO_LARGE"
      | "TIMEOUT"
      | "FETCH_FAILED",
    message: string,
  ) {
    super(message);
    this.name = "UnsafeUrlError";
  }
}

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "metadata.google.internal",
  "metadata.googleapis.com",
]);

const BLOCKED_HOST_SUFFIXES = [".local", ".internal", ".localdomain", ".localhost"];

function ipv4ToInt(ip: string): number {
  const parts = ip.split(".").map(Number);
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

function inCidr4(ip: number, base: string, maskBits: number): boolean {
  const mask = maskBits === 0 ? 0 : (~0 << (32 - maskBits)) >>> 0;
  return (ip & mask) === (ipv4ToInt(base) & mask);
}

const BLOCKED_V4_RANGES: Array<[string, number]> = [
  ["0.0.0.0", 8], // "this" network / unspecified
  ["10.0.0.0", 8], // private
  ["100.64.0.0", 10], // carrier-grade NAT
  ["127.0.0.0", 8], // loopback
  ["169.254.0.0", 16], // link-local + cloud metadata
  ["172.16.0.0", 12], // private
  ["192.0.0.0", 24], // IETF reserved
  ["192.0.2.0", 24], // TEST-NET-1
  ["192.168.0.0", 16], // private
  ["198.18.0.0", 15], // benchmarking
  ["198.51.100.0", 24], // TEST-NET-2
  ["203.0.113.0", 24], // TEST-NET-3
  ["224.0.0.0", 4], // multicast
  ["240.0.0.0", 4], // reserved + broadcast
];

export function isBlockedIpv4(ip: string): boolean {
  const n = ipv4ToInt(ip);
  return BLOCKED_V4_RANGES.some(([base, bits]) => inCidr4(n, base, bits));
}

export function isBlockedIpv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  // Unspecified and loopback
  if (lower === "::" || lower === "::1") return true;
  // IPv4-mapped / IPv4-compatible - extract and check the v4 part
  const v4Match = lower.match(/(?:^|:)((?:\d{1,3}\.){3}\d{1,3})$/);
  if (v4Match) return isBlockedIpv4(v4Match[1]);
  // Unique local fc00::/7
  if (/^f[cd]/.test(lower)) return true;
  // Link-local fe80::/10
  if (/^fe[89ab]/.test(lower)) return true;
  // Multicast ff00::/8
  if (lower.startsWith("ff")) return true;
  // AWS ECS metadata fd00:ec2::254 covered by fc00::/7 above
  return false;
}

export function isBlockedIp(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) return isBlockedIpv4(ip);
  if (version === 6) return isBlockedIpv6(ip);
  return true; // not an IP - caller error, block
}

/**
 * Validate a single URL (steps 1–7 of the pipeline): scheme, credentials,
 * hostname denylist, DNS resolution, and IP range checks on every resolved
 * address. Returns the parsed URL. Throws UnsafeUrlError.
 */
export async function assertSafeUrl(rawUrl: string | URL): Promise<URL> {
  let url: URL;
  try {
    url = typeof rawUrl === "string" ? new URL(rawUrl) : rawUrl;
  } catch {
    throw new UnsafeUrlError("INVALID_URL", "The URL could not be parsed.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new UnsafeUrlError("SCHEME_NOT_ALLOWED", "Only http and https URLs are allowed.");
  }

  if (url.username || url.password) {
    throw new UnsafeUrlError("CREDENTIALS_IN_URL", "URLs containing credentials are not allowed.");
  }

  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");

  // Literal IP in the URL (including bracketed IPv6) - classify before the
  // hostname heuristics so IPv6 literals aren't misreported as blocked hosts.
  const literal = hostname.startsWith("[") ? hostname.slice(1, -1) : hostname;
  if (isIP(literal)) {
    if (isBlockedIp(literal)) {
      throw new UnsafeUrlError("BLOCKED_IP", "This IP address is not allowed.");
    }
    return url;
  }

  if (
    BLOCKED_HOSTNAMES.has(hostname) ||
    BLOCKED_HOST_SUFFIXES.some((s) => hostname.endsWith(s)) ||
    !hostname.includes(".")
  ) {
    throw new UnsafeUrlError("BLOCKED_HOST", "This host is not allowed.");
  }

  let addresses: Array<{ address: string }>;
  try {
    addresses = await lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new UnsafeUrlError("DNS_FAILURE", "The hostname could not be resolved.");
  }

  if (addresses.length === 0) {
    throw new UnsafeUrlError("DNS_FAILURE", "The hostname resolved to no addresses.");
  }

  for (const { address } of addresses) {
    if (isBlockedIp(address)) {
      throw new UnsafeUrlError("BLOCKED_IP", "This host resolves to a blocked address.");
    }
  }

  return url;
}

export interface SafeFetchOptions {
  timeoutMs?: number;
  maxRedirects?: number;
  maxBytes?: number;
  userAgent?: string;
}

export interface SafeFetchResult {
  finalUrl: string;
  status: number;
  headers: Headers;
  body: string;
  bodyBytes: number;
  redirectChain: Array<{ url: string; status: number }>;
  responseTimeMs: number;
}

const DEFAULTS: Required<SafeFetchOptions> = {
  timeoutMs: 10_000,
  maxRedirects: 5,
  maxBytes: 2 * 1024 * 1024,
  userAgent: "MyKavoBot/0.1 (+https://mykavo.app/bot; website change detection)",
};

/**
 * Fetch a user-influenced URL safely: validates the initial URL and EVERY
 * redirect hop, disables automatic redirects, enforces timeout and a
 * streamed response-size cap.
 */
export async function safeFetch(
  rawUrl: string,
  options: SafeFetchOptions = {},
): Promise<SafeFetchResult> {
  const opts = { ...DEFAULTS, ...options };
  const redirectChain: Array<{ url: string; status: number }> = [];
  const startedAt = Date.now();

  let current = await assertSafeUrl(rawUrl);

  for (let hop = 0; hop <= opts.maxRedirects; hop++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), opts.timeoutMs);

    let response: Response;
    try {
      response = await fetch(current.href, {
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "user-agent": opts.userAgent,
          accept: "text/html,application/xhtml+xml,*/*;q=0.8",
        },
      });
    } catch (err) {
      clearTimeout(timer);
      if (err instanceof Error && err.name === "AbortError") {
        throw new UnsafeUrlError("TIMEOUT", "The request timed out.");
      }
      throw new UnsafeUrlError("FETCH_FAILED", "The request failed.");
    }

    if (response.status >= 300 && response.status < 400) {
      clearTimeout(timer);
      const location = response.headers.get("location");
      response.body?.cancel();
      if (!location) {
        throw new UnsafeUrlError("FETCH_FAILED", "Redirect without a Location header.");
      }
      redirectChain.push({ url: current.href, status: response.status });
      let next: URL;
      try {
        next = new URL(location, current.href);
      } catch {
        throw new UnsafeUrlError("INVALID_URL", "Redirect target could not be parsed.");
      }
      // Re-validate every hop - redirects are untrusted input.
      current = await assertSafeUrl(next);
      continue;
    }

    // Terminal response - stream body with a hard size cap.
    try {
      const reader = response.body?.getReader();
      const chunks: Uint8Array[] = [];
      let received = 0;
      if (reader) {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          received += value.byteLength;
          if (received > opts.maxBytes) {
            await reader.cancel();
            throw new UnsafeUrlError(
              "RESPONSE_TOO_LARGE",
              `Response exceeded ${Math.round(opts.maxBytes / 1024 / 1024)} MB.`,
            );
          }
          chunks.push(value);
        }
      }
      const buffer = new Uint8Array(received);
      let offset = 0;
      for (const chunk of chunks) {
        buffer.set(chunk, offset);
        offset += chunk.byteLength;
      }
      const body = new TextDecoder("utf-8", { fatal: false }).decode(buffer);

      return {
        finalUrl: current.href,
        status: response.status,
        headers: response.headers,
        body,
        bodyBytes: received,
        redirectChain,
        responseTimeMs: Date.now() - startedAt,
      };
    } catch (err) {
      if (err instanceof UnsafeUrlError) throw err;
      if (err instanceof Error && err.name === "AbortError") {
        throw new UnsafeUrlError("TIMEOUT", "The request timed out while reading the response.");
      }
      throw new UnsafeUrlError("FETCH_FAILED", "Failed to read the response.");
    } finally {
      clearTimeout(timer);
    }
  }

  throw new UnsafeUrlError("TOO_MANY_REDIRECTS", "Too many redirects.");
}
