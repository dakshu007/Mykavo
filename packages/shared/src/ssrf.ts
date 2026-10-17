/**
 * SSRF protection pipeline (spec §11, docs/SECURITY_MODEL.md).
 * EVERY outbound fetch of a user-influenced URL must go through safeFetch(),
 * or connect through resolveSafeHost() + pinnedLookup() when it needs a
 * transport safeFetch does not offer (TLS probes, the scanner egress proxy).
 */

import { lookup } from "node:dns/promises";
import type { LookupAddress, LookupOptions } from "node:dns";
import { request as httpRequest, type IncomingMessage, type IncomingHttpHeaders } from "node:http";
import { request as httpsRequest } from "node:https";
import { isIP, type LookupFunction } from "node:net";
import type { Readable } from "node:stream";
import { constants as zlibConstants, createBrotliDecompress, createGunzip, createInflate } from "node:zlib";

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
  ["192.88.99.0", 24], // deprecated 6to4 relay anycast
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

/**
 * Parse an IPv6 address (any textual form: compressed, embedded dotted IPv4,
 * zone id) into its 16 bytes. Returns null for anything that is not IPv6.
 * Comparing bytes instead of strings is the point: `::ffff:7f00:1` and
 * `::ffff:127.0.0.1` are the same address, and the WHATWG URL parser emits
 * the hex form.
 */
export function parseIpv6(ip: string): Uint8Array | null {
  let text = ip.toLowerCase();
  const zone = text.indexOf("%");
  if (zone >= 0) text = text.slice(0, zone);
  if (isIP(text) !== 6) return null;

  // Rewrite a trailing dotted IPv4 as two hex groups.
  const lastColon = text.lastIndexOf(":");
  const tail = text.slice(lastColon + 1);
  if (tail.includes(".")) {
    const [a, b, c, d] = tail.split(".").map(Number);
    text = `${text.slice(0, lastColon + 1)}${((a << 8) | b).toString(16)}:${((c << 8) | d).toString(16)}`;
  }

  const halves = text.split("::");
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(":") : [];
  const rest = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const fill = halves.length === 2 ? 8 - head.length - rest.length : 0;
  if (fill < 0) return null;
  const groups = [...head, ...Array<string>(fill).fill("0"), ...rest];
  if (groups.length !== 8) return null;

  const bytes = new Uint8Array(16);
  for (let i = 0; i < 8; i++) {
    const value = Number.parseInt(groups[i], 16);
    if (!Number.isFinite(value) || value < 0 || value > 0xffff) return null;
    bytes[i * 2] = value >> 8;
    bytes[i * 2 + 1] = value & 0xff;
  }
  return bytes;
}

function bytesToIpv4(bytes: Uint8Array, offset: number): string {
  return `${bytes[offset]}.${bytes[offset + 1]}.${bytes[offset + 2]}.${bytes[offset + 3]}`;
}

/**
 * IPv6 is checked as an ALLOWLIST: only global unicast (2000::/3) may pass,
 * minus the parts of it that are not really "the internet". Everything
 * outside 2000::/3 is blocked: ::/128, ::1, IPv4-compatible ::/96, NAT64
 * 64:ff9b::/96 and 64:ff9b:1::/48, discard 100::/64, ULA fc00::/7,
 * link-local fe80::/10, multicast ff00::/8. The one exception is
 * IPv4-mapped ::ffff:0:0/96, which is judged by the IPv4 inside it.
 */
export function isBlockedIpv6(ip: string): boolean {
  const b = parseIpv6(ip);
  if (!b) return true;

  // IPv4-mapped ::ffff:a.b.c.d - the socket really talks to the IPv4.
  const mapped = b.slice(0, 10).every((x) => x === 0) && b[10] === 0xff && b[11] === 0xff;
  if (mapped) return isBlockedIpv4(bytesToIpv4(b, 12));

  // Outside global unicast 2000::/3 - blocked.
  if ((b[0] & 0xe0) !== 0x20) return true;

  // 2001::/23 IETF protocol assignments: Teredo 2001::/32 (tunnels to an
  // embedded, obfuscated IPv4), benchmarking 2001:2::/48, ORCHID. No website
  // is served from here.
  if (b[0] === 0x20 && b[1] === 0x01 && (b[2] & 0xfe) === 0x00) return true;
  // 2001:db8::/32 documentation.
  if (b[0] === 0x20 && b[1] === 0x01 && b[2] === 0x0d && b[3] === 0xb8) return true;
  // 2002::/16 6to4 - routes to whatever IPv4 is embedded in bits 16-47.
  if (b[0] === 0x20 && b[1] === 0x02) return true;
  // 3fff::/20 documentation (RFC 9637).
  if (b[0] === 0x3f && b[1] === 0xff && (b[2] & 0xf0) === 0x00) return true;

  return false;
}

export function isBlockedIp(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) return isBlockedIpv4(ip);
  if (version === 6) return isBlockedIpv6(ip);
  return true; // not an IP - caller error, block
}

/** One vetted address a connection may be pinned to. */
export interface SafeAddress {
  address: string;
  family: 4 | 6;
}

/** Resolves a hostname to vetted addresses or throws UnsafeUrlError. */
export type SafeHostResolver = (hostname: string) => Promise<SafeAddress[]>;

/** Lowercase, drop IPv6 brackets and a trailing root dot. */
function canonicalHost(hostname: string): string {
  return hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
}

/**
 * Hostname denylist, DNS resolution, and IP range checks on EVERY resolved
 * address. Returns the addresses a connection may use; callers that connect
 * must use exactly these (pinnedLookup) so a second DNS answer can never
 * point the socket somewhere else (rebinding).
 */
export async function resolveSafeHost(rawHostname: string): Promise<SafeAddress[]> {
  const hostname = canonicalHost(rawHostname);

  // Literal IP in the URL (including bracketed IPv6) - classify before the
  // hostname heuristics so IPv6 literals aren't misreported as blocked hosts.
  const literalVersion = isIP(hostname);
  if (literalVersion) {
    if (isBlockedIp(hostname)) {
      throw new UnsafeUrlError("BLOCKED_IP", "This IP address is not allowed.");
    }
    return [{ address: hostname, family: literalVersion === 6 ? 6 : 4 }];
  }

  if (
    BLOCKED_HOSTNAMES.has(hostname) ||
    BLOCKED_HOST_SUFFIXES.some((s) => hostname.endsWith(s)) ||
    !hostname.includes(".")
  ) {
    throw new UnsafeUrlError("BLOCKED_HOST", "This host is not allowed.");
  }

  let addresses: Array<{ address: string; family: number }>;
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

  return addresses.map(({ address }) => ({ address, family: isIP(address) === 6 ? 6 : 4 }));
}

/**
 * A resolveSafeHost with a per-host cache, for code that checks many URLs on
 * few hosts (one page scan, the egress proxy). Failures are cached too, so a
 * blocked host costs one lookup. `ttlMs` bounds how long an answer is reused.
 */
export function createSafeHostResolver(
  options: { ttlMs?: number; maxEntries?: number } = {},
): SafeHostResolver {
  const ttlMs = options.ttlMs ?? Number.POSITIVE_INFINITY;
  const maxEntries = options.maxEntries ?? 1_000;
  const cache = new Map<string, { expiresAt: number; result: Promise<SafeAddress[]> }>();
  return (rawHostname) => {
    const hostname = canonicalHost(rawHostname);
    const now = Date.now();
    const hit = cache.get(hostname);
    if (hit && hit.expiresAt > now) return hit.result;
    const result = resolveSafeHost(hostname);
    // The cached promise may never be awaited again; don't let a rejection
    // surface as unhandled.
    result.catch(() => undefined);
    if (cache.size >= maxEntries) {
      const oldest = cache.keys().next();
      if (!oldest.done) cache.delete(oldest.value);
    }
    cache.set(hostname, { expiresAt: now + ttlMs, result });
    return result;
  };
}

/**
 * A net/http `lookup` that only ever answers with already-vetted addresses.
 * Hand it to http.request / tls.connect / net.connect together with the
 * real hostname, so SNI and certificate verification still use the
 * hostname while the socket can only reach what the guard approved.
 */
export function pinnedLookup(addresses: SafeAddress[]): LookupFunction {
  return (_hostname: string, options: LookupOptions, callback) => {
    const usable =
      options.family === 4 || options.family === 6
        ? addresses.filter((a) => a.family === options.family)
        : addresses;
    if (usable.length === 0) {
      const err: NodeJS.ErrnoException = new Error("No vetted address for this family.");
      err.code = "ENOTFOUND";
      callback(err, "", 0);
      return;
    }
    if (options.all) {
      const all: LookupAddress[] = usable.map((a) => ({ address: a.address, family: a.family }));
      callback(null, all);
      return;
    }
    callback(null, usable[0].address, usable[0].family);
  };
}

function parseUrl(rawUrl: string | URL): URL {
  try {
    return typeof rawUrl === "string" ? new URL(rawUrl) : rawUrl;
  } catch {
    throw new UnsafeUrlError("INVALID_URL", "The URL could not be parsed.");
  }
}

/** Steps 1-7 of the pipeline, returning the vetted addresses as well. */
async function vetUrl(
  rawUrl: string | URL,
  resolver: SafeHostResolver,
): Promise<{ url: URL; addresses: SafeAddress[] }> {
  const url = parseUrl(rawUrl);

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new UnsafeUrlError("SCHEME_NOT_ALLOWED", "Only http and https URLs are allowed.");
  }

  if (url.username || url.password) {
    throw new UnsafeUrlError("CREDENTIALS_IN_URL", "URLs containing credentials are not allowed.");
  }

  const addresses = await resolver(url.hostname);
  return { url, addresses };
}

export interface AssertSafeUrlOptions {
  /** Cached resolver (createSafeHostResolver) when checking many URLs. */
  resolver?: SafeHostResolver;
}

/**
 * Validate a single URL (steps 1-7 of the pipeline): scheme, credentials,
 * hostname denylist, DNS resolution, and IP range checks on every resolved
 * address. Returns the parsed URL. Throws UnsafeUrlError.
 *
 * This only VALIDATES. A caller that then connects with its own client
 * resolves DNS again and is exposed to rebinding; use safeFetch, or
 * resolveSafeHost + pinnedLookup, to connect.
 */
export async function assertSafeUrl(
  rawUrl: string | URL,
  options: AssertSafeUrlOptions = {},
): Promise<URL> {
  const { url } = await vetUrl(rawUrl, options.resolver ?? resolveSafeHost);
  return url;
}

export interface SafeFetchOptions {
  timeoutMs?: number;
  maxRedirects?: number;
  maxBytes?: number;
  userAgent?: string;
  /**
   * When false, a 3xx is returned as the terminal response (Location in
   * headers, empty body) instead of being followed. Default true.
   */
  followRedirects?: boolean;
  /**
   * Decide from the terminal status/headers whether to read the body at
   * all. Returning false closes the connection without downloading it
   * (status probes, non-HTML responses). Default: always read.
   */
  readBody?: (status: number, headers: Headers) => boolean;
  /**
   * When true, a body over maxBytes is cut at maxBytes (result.truncated)
   * instead of failing with RESPONSE_TOO_LARGE. Default false.
   */
  truncate?: boolean;
}

export interface SafeFetchResult {
  finalUrl: string;
  status: number;
  headers: Headers;
  body: string;
  bodyBytes: number;
  redirectChain: Array<{ url: string; status: number }>;
  responseTimeMs: number;
  /** True when the body was cut at maxBytes (only with `truncate`). */
  truncated?: boolean;
}

type ResolvedSafeFetchOptions = Required<Omit<SafeFetchOptions, "readBody">> &
  Pick<SafeFetchOptions, "readBody">;

const DEFAULTS: Required<Omit<SafeFetchOptions, "readBody">> = {
  timeoutMs: 10_000,
  maxRedirects: 5,
  maxBytes: 2 * 1024 * 1024,
  userAgent: "MyKavoBot/0.1 (+https://mykavo.app/bot; website change detection)",
  followRedirects: true,
  truncate: false,
};

function toHeaders(raw: IncomingHttpHeaders): Headers {
  const headers = new Headers();
  for (const [name, value] of Object.entries(raw)) {
    if (value === undefined) continue;
    for (const item of Array.isArray(value) ? value : [value]) {
      try {
        headers.append(name, item);
      } catch {
        // A header value fetch would also refuse - drop it.
      }
    }
  }
  return headers;
}

/**
 * The response body with content-encoding undone, so the size cap applies to
 * what we actually hold in memory (a 1 MB gzip bomb cannot become 1 GB).
 * Lenient flushing mirrors fetch, which tolerates a truncated final block.
 */
function decodedBody(res: IncomingMessage): Readable {
  const encoding = String(res.headers["content-encoding"] ?? "").trim().toLowerCase();
  let decoder: Readable & NodeJS.WritableStream;
  if (encoding === "gzip" || encoding === "x-gzip") {
    decoder = createGunzip({ flush: zlibConstants.Z_SYNC_FLUSH, finishFlush: zlibConstants.Z_SYNC_FLUSH });
  } else if (encoding === "deflate") {
    decoder = createInflate({ flush: zlibConstants.Z_SYNC_FLUSH, finishFlush: zlibConstants.Z_SYNC_FLUSH });
  } else if (encoding === "br") {
    decoder = createBrotliDecompress({
      flush: zlibConstants.BROTLI_OPERATION_FLUSH,
      finishFlush: zlibConstants.BROTLI_OPERATION_FLUSH,
    });
  } else {
    return res;
  }
  res.on("error", (err) => decoder.destroy(err));
  res.pipe(decoder);
  return decoder;
}

/**
 * One GET over a socket pinned to the vetted addresses. The request still
 * names the real hostname, so the Host header, TLS SNI and certificate
 * verification are exactly what a normal fetch would do; only DNS is
 * replaced (no second lookup, no rebinding window).
 */
function pinnedGet(
  url: URL,
  addresses: SafeAddress[],
  opts: ResolvedSafeFetchOptions,
  signal: AbortSignal,
): Promise<IncomingMessage> {
  return new Promise((resolve, reject) => {
    const isHttps = url.protocol === "https:";
    const send = isHttps ? httpsRequest : httpRequest;
    const req = send(
      url,
      {
        method: "GET",
        agent: false,
        lookup: pinnedLookup(addresses),
        signal,
        headers: {
          "user-agent": opts.userAgent,
          accept: "text/html,application/xhtml+xml,*/*;q=0.8",
          "accept-encoding": "gzip, deflate, br",
        },
      },
      resolve,
    );
    req.on("error", reject);
    req.end();
  });
}

async function readCapped(
  stream: Readable,
  maxBytes: number,
  truncate: boolean,
): Promise<{ buffer: Buffer; received: number; truncated: boolean }> {
  const chunks: Buffer[] = [];
  let received = 0;
  for await (const chunk of stream) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array);
    if (received + buf.byteLength > maxBytes) {
      stream.destroy();
      if (!truncate) {
        throw new UnsafeUrlError(
          "RESPONSE_TOO_LARGE",
          `Response exceeded ${Math.round(maxBytes / 1024 / 1024)} MB.`,
        );
      }
      chunks.push(buf.subarray(0, maxBytes - received));
      received = maxBytes;
      return { buffer: Buffer.concat(chunks), received, truncated: true };
    }
    received += buf.byteLength;
    chunks.push(buf);
  }
  return { buffer: Buffer.concat(chunks), received, truncated: false };
}

/**
 * Fetch a user-influenced URL safely: validates the initial URL and EVERY
 * redirect hop, connects only to the addresses that passed validation (DNS
 * pinning), follows redirects manually, enforces a timeout and a streamed
 * response-size cap on the decoded body.
 */
export async function safeFetch(
  rawUrl: string,
  options: SafeFetchOptions = {},
): Promise<SafeFetchResult> {
  const opts: ResolvedSafeFetchOptions = { ...DEFAULTS, ...options };
  const redirectChain: Array<{ url: string; status: number }> = [];
  const startedAt = Date.now();

  let { url: current, addresses } = await vetUrl(rawUrl, resolveSafeHost);

  for (let hop = 0; hop <= opts.maxRedirects; hop++) {
    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, opts.timeoutMs);

    try {
      let response: IncomingMessage;
      try {
        response = await pinnedGet(current, addresses, opts, controller.signal);
      } catch {
        if (timedOut) throw new UnsafeUrlError("TIMEOUT", "The request timed out.");
        throw new UnsafeUrlError("FETCH_FAILED", "The request failed.");
      }

      const status = response.statusCode ?? 0;
      const headers = toHeaders(response.headers);

      if (status >= 300 && status < 400 && opts.followRedirects) {
        response.destroy();
        const location = headers.get("location");
        if (!location) {
          throw new UnsafeUrlError("FETCH_FAILED", "Redirect without a Location header.");
        }
        redirectChain.push({ url: current.href, status });
        let next: URL;
        try {
          next = new URL(location, current.href);
        } catch {
          throw new UnsafeUrlError("INVALID_URL", "Redirect target could not be parsed.");
        }
        // Re-validate every hop - redirects are untrusted input.
        ({ url: current, addresses } = await vetUrl(next, resolveSafeHost));
        continue;
      }

      const wantBody =
        !(status >= 300 && status < 400) && (opts.readBody ? opts.readBody(status, headers) : true);
      if (!wantBody) {
        response.destroy();
        return {
          finalUrl: current.href,
          status,
          headers,
          body: "",
          bodyBytes: 0,
          redirectChain,
          responseTimeMs: Date.now() - startedAt,
        };
      }

      // Terminal response - stream body with a hard size cap.
      let read: { buffer: Buffer; received: number; truncated: boolean };
      try {
        read = await readCapped(decodedBody(response), opts.maxBytes, opts.truncate);
      } catch (err) {
        response.destroy();
        if (err instanceof UnsafeUrlError) throw err;
        if (timedOut) {
          throw new UnsafeUrlError("TIMEOUT", "The request timed out while reading the response.");
        }
        throw new UnsafeUrlError("FETCH_FAILED", "Failed to read the response.");
      }
      const body = new TextDecoder("utf-8", { fatal: false }).decode(read.buffer);

      return {
        finalUrl: current.href,
        status,
        headers,
        body,
        bodyBytes: read.received,
        redirectChain,
        responseTimeMs: Date.now() - startedAt,
        ...(read.truncated ? { truncated: true } : {}),
      };
    } finally {
      clearTimeout(timer);
    }
  }

  throw new UnsafeUrlError("TOO_MANY_REDIRECTS", "Too many redirects.");
}
