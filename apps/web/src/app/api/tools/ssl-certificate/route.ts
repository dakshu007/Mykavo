import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { connect, type PeerCertificate, type TLSSocket } from "node:tls";
import { NextResponse } from "next/server";
import { z } from "zod";
import { assertSafeUrl, isBlockedIp, UnsafeUrlError } from "@/lib/security/ssrf";
import { clientKey, rateLimit } from "@/lib/security/rate-limit";
import { parseUrlInput } from "@/lib/url";
import { issuerChain, summarizeCertificate, trustErrorText, type SslReport } from "@/lib/tools/ssl-certificate";
import { SAFE_FETCH_USER_MESSAGES } from "@/lib/tools/user-messages";

// node:tls needs the Node.js runtime.
export const runtime = "nodejs";

const bodySchema = z.object({
  url: z.string().trim().min(1).max(2048),
});

const TLS_TIMEOUT_MS = 8_000;

/**
 * Open a TLS connection to `ip`:443 presenting `hostname` (SNI) and read the
 * certificate. We connect to the IP we already vetted - not the hostname - so
 * a DNS answer that changes between the check and the connect (rebinding)
 * can't point us at an internal address. Port 443 only: this is not a port
 * scanner. rejectUnauthorized is off on purpose - an expired or untrusted
 * certificate is exactly what people come here to see - and the verification
 * result is still reported from socket.authorized.
 */
function handshake(ip: string, hostname: string): Promise<{ socket: TLSSocket; cert: PeerCertificate }> {
  return new Promise((resolve, reject) => {
    const socket = connect({
      host: ip,
      port: 443,
      servername: isIP(hostname) ? undefined : hostname,
      rejectUnauthorized: false,
      timeout: TLS_TIMEOUT_MS,
    });
    const fail = (code: UnsafeUrlError["code"], message: string) => {
      socket.destroy();
      reject(new UnsafeUrlError(code, message));
    };
    socket.once("secureConnect", () => {
      const cert = socket.getPeerCertificate(true);
      if (!cert || !cert.valid_to) return fail("FETCH_FAILED", "No certificate presented.");
      resolve({ socket, cert });
    });
    socket.once("timeout", () => fail("TIMEOUT", "TLS handshake timed out."));
    socket.once("error", () => fail("FETCH_FAILED", "TLS handshake failed."));
  });
}

export async function POST(request: Request) {
  const limit = rateLimit(`ssl-certificate:${clientKey(request)}`, { limit: 10, windowMs: 60_000 });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many requests - please wait a moment and try again." },
      { status: 429, headers: { "retry-after": String(limit.retryAfterSeconds) } },
    );
  }

  let input: z.infer<typeof bodySchema>;
  try {
    input = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Please enter a domain." }, { status: 400 });
  }

  const parsed = parseUrlInput(input.url);
  if (!parsed) {
    return NextResponse.json({ error: "That doesn't look like a valid domain." }, { status: 400 });
  }
  const hostname = parsed.hostname.replace(/^\[|\]$/g, "");

  try {
    // Same denylist + DNS checks every other tool runs.
    await assertSafeUrl(`https://${parsed.host}/`);
    let ip = hostname;
    if (!isIP(hostname)) {
      const addrs = await lookup(hostname, { all: true, verbatim: true }).catch(() => []);
      const safe = addrs.find((a) => !isBlockedIp(a.address));
      if (!safe) throw new UnsafeUrlError("DNS_FAILURE", "No usable address.");
      if (addrs.some((a) => isBlockedIp(a.address))) throw new UnsafeUrlError("BLOCKED_IP", "Blocked address.");
      ip = safe.address;
    }

    const { socket, cert } = await handshake(ip, hostname);
    const trustError = socket.authorized ? null : String(socket.authorizationError ?? "UNKNOWN");
    const report: SslReport = {
      hostname,
      ip,
      protocol: socket.getProtocol(),
      trusted: socket.authorized,
      trustError,
      trustErrorText: trustErrorText(trustError),
      certificate: summarizeCertificate(cert, hostname),
      chain: issuerChain(cert),
    };
    socket.destroy();
    return NextResponse.json({ report });
  } catch (err) {
    if (err instanceof UnsafeUrlError) {
      const message =
        err.code === "FETCH_FAILED"
          ? "We couldn't open a secure (HTTPS) connection to that site on port 443."
          : SAFE_FETCH_USER_MESSAGES[err.code];
      return NextResponse.json({ error: message }, { status: 400 });
    }
    console.error("[ssl-certificate] unexpected failure", err);
    return NextResponse.json({ error: "Something went wrong checking that certificate. Please try again." }, { status: 500 });
  }
}
