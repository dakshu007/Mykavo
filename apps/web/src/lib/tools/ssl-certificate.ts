/**
 * SSL/TLS certificate summary for the SSL Certificate Checker. The route does
 * the (SSRF-guarded) TLS handshake; everything here is pure so it's tested.
 */

export type ExpiryStatus = "expired" | "critical" | "warning" | "ok";

export interface CertSummary {
  subject: string | null;
  issuer: string | null;
  validFrom: string;
  validTo: string;
  daysLeft: number;
  lifetimeDays: number;
  status: ExpiryStatus;
  /** DNS names the certificate covers (from subjectAltName). */
  names: string[];
  coversHostname: boolean;
  fingerprint256: string | null;
}

export interface SslReport {
  hostname: string;
  ip: string;
  protocol: string | null;
  /** True when the chain verifies against Node's trusted root store. */
  trusted: boolean;
  /** Node's verification error code, e.g. CERT_HAS_EXPIRED. */
  trustError: string | null;
  trustErrorText: string | null;
  certificate: CertSummary;
  /** Issuer names from leaf to root, as presented by the server. */
  chain: string[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Whole days until `validTo` (negative once expired). */
export function daysUntil(validTo: Date, now: Date = new Date()): number {
  return Math.floor((validTo.getTime() - now.getTime()) / DAY_MS);
}

/**
 * Thresholds: under 7 days is an emergency, under 21 is worth acting on now.
 * Most certificates today are 90-day Let's Encrypt certs that renew around
 * day 60, so a healthy one rarely shows fewer than ~30 days.
 */
export function expiryStatus(daysLeft: number): ExpiryStatus {
  if (daysLeft < 0) return "expired";
  if (daysLeft < 7) return "critical";
  if (daysLeft < 21) return "warning";
  return "ok";
}

/** "DNS:example.com, DNS:*.example.com, IP Address:1.2.3.4" -> DNS names. */
export function parseSubjectAltNames(san: string | undefined | null): string[] {
  if (!san) return [];
  return san
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.toUpperCase().startsWith("DNS:"))
    .map((s) => s.slice(4).trim().toLowerCase());
}

/** Does a certificate name (possibly a wildcard) cover this hostname? */
export function nameCovers(certName: string, hostname: string): boolean {
  const name = certName.toLowerCase();
  const host = hostname.toLowerCase().replace(/\.$/, "");
  if (!name.startsWith("*.")) return name === host;
  // A wildcard covers exactly one label: *.example.com covers a.example.com,
  // not example.com and not a.b.example.com.
  const suffix = name.slice(1); // ".example.com"
  if (!host.endsWith(suffix)) return false;
  const label = host.slice(0, -suffix.length);
  return label.length > 0 && !label.includes(".");
}

/** Plain-English text for Node's TLS verification error codes. */
export function trustErrorText(code: string | null): string | null {
  if (!code) return null;
  const map: Record<string, string> = {
    CERT_HAS_EXPIRED: "The certificate has expired. Browsers show a full-page security warning.",
    CERT_NOT_YET_VALID: "The certificate isn't valid yet - check the server's clock and the certificate dates.",
    DEPTH_ZERO_SELF_SIGNED_CERT: "The certificate is self-signed, so browsers don't trust it.",
    SELF_SIGNED_CERT_IN_CHAIN: "The chain ends in a self-signed certificate browsers don't trust.",
    UNABLE_TO_VERIFY_LEAF_SIGNATURE:
      "The server isn't sending its intermediate certificate. Some browsers recover; many apps, bots and older devices fail.",
    UNABLE_TO_GET_ISSUER_CERT_LOCALLY:
      "The server isn't sending its intermediate certificate. Some browsers recover; many apps, bots and older devices fail.",
    ERR_TLS_CERT_ALTNAME_INVALID: "The certificate doesn't cover this hostname.",
    CERT_REVOKED: "The certificate has been revoked.",
  };
  return map[code] ?? `The certificate chain didn't verify (${code}).`;
}

/** The parts of Node's PeerCertificate we read - kept structural for tests. */
export interface PeerCertLike {
  subject?: Record<string, string | string[] | undefined> | null;
  issuer?: Record<string, string | string[] | undefined> | null;
  valid_from: string;
  valid_to: string;
  subjectaltname?: string;
  fingerprint256?: string;
  issuerCertificate?: PeerCertLike;
}

function first(v: string | string[] | undefined): string | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

function displayName(dn: PeerCertLike["subject"]): string | null {
  if (!dn) return null;
  const o = first(dn.O);
  const cn = first(dn.CN);
  if (o && cn && o !== cn) return `${cn} (${o})`;
  return cn ?? o;
}

export function summarizeCertificate(cert: PeerCertLike, hostname: string, now: Date = new Date()): CertSummary {
  const from = new Date(cert.valid_from);
  const to = new Date(cert.valid_to);
  const names = parseSubjectAltNames(cert.subjectaltname);
  const subject = first(cert.subject?.CN);
  const coverage = names.length > 0 ? names : subject ? [subject.toLowerCase()] : [];
  const daysLeft = daysUntil(to, now);
  return {
    subject,
    issuer: displayName(cert.issuer),
    validFrom: from.toISOString(),
    validTo: to.toISOString(),
    daysLeft,
    lifetimeDays: Math.round((to.getTime() - from.getTime()) / DAY_MS),
    status: expiryStatus(daysLeft),
    names: names.slice(0, 50),
    coversHostname: coverage.some((n) => nameCovers(n, hostname)),
    fingerprint256: cert.fingerprint256 ?? null,
  };
}

/** Issuer names from the leaf upward; stops at a self-issued root or loop. */
export function issuerChain(cert: PeerCertLike): string[] {
  const out: string[] = [];
  const seen = new Set<PeerCertLike>();
  let current: PeerCertLike | undefined = cert;
  while (current && !seen.has(current) && out.length < 6) {
    seen.add(current);
    // A self-issued root names itself as issuer; its name is already listed
    // as the issuer of the certificate below it.
    const selfIssued = first(current.subject?.CN) !== null && first(current.subject?.CN) === first(current.issuer?.CN);
    if (selfIssued && out.length > 0) break;
    const name = displayName(current.issuer);
    if (name) out.push(name);
    const next: PeerCertLike | undefined = current.issuerCertificate;
    if (!next || next === current) break;
    current = next;
  }
  return out;
}
