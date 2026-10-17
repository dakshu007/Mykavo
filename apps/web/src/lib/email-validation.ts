import { resolveMx } from "node:dns/promises";

/**
 * Signup email validation (spec §59: validate external input server-side).
 * Three layers, cheapest first:
 *
 *  1. Structural check - one @, sane local part and domain shape.
 *  2. Disposable-domain blocklist - the common throwaway providers.
 *  3. DNS MX lookup - the domain must actually accept mail. DNS
 *     *infrastructure* failures (timeout/SERVFAIL) fail OPEN so a resolver
 *     hiccup never blocks signups; a definitive NXDOMAIN/NODATA fails closed.
 */

/**
 * Linear-time on purpose. Domain labels exclude "." so each dot can only end
 * one label: the old `[^\s@]+\.[^\s@]{2,}` let the engine try every dot as
 * the TLD split, which backtracks badly on long dotted input.
 */
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)*\.[^\s@.]{2,}$/;

/** RFC 5321 caps a forward-path at 254 characters; anything longer is not an address. */
export const MAX_EMAIL_LENGTH = 254;

/** Well-known throwaway email domains (kept deliberately small and safe). */
const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com",
  "guerrillamail.com",
  "10minutemail.com",
  "tempmail.com",
  "temp-mail.org",
  "throwawaymail.com",
  "yopmail.com",
  "getnada.com",
  "trashmail.com",
  "sharklasers.com",
  "dispostable.com",
  "maildrop.cc",
  "fakeinbox.com",
  "mytemp.email",
  "tempinbox.com",
]);

const MX_LOOKUP_TIMEOUT_MS = 4000;

export type EmailValidationResult =
  | { ok: true }
  | { ok: false; reason: "format" | "disposable" | "undeliverable" };

/** Extract the lowercase domain part, or null when structurally invalid. */
export function emailDomain(email: string): string | null {
  // Length first: never hand an unbounded string to the regex.
  if (email.length > MAX_EMAIL_LENGTH) return null;
  if (!EMAIL_PATTERN.test(email)) return null;
  const at = email.lastIndexOf("@");
  return email.slice(at + 1).toLowerCase();
}

export function isDisposableDomain(domain: string): boolean {
  return DISPOSABLE_DOMAINS.has(domain);
}

/** MX resolver signature - injectable for tests. */
export type MxResolver = (domain: string) => Promise<Array<{ exchange: string }>>;

async function domainAcceptsMail(domain: string, resolver: MxResolver): Promise<boolean> {
  try {
    const records = await Promise.race([
      resolver(domain),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), MX_LOOKUP_TIMEOUT_MS)),
    ]);
    // Timeout → resolver infrastructure issue → fail open.
    if (records === null) return true;
    // "Null MX" (RFC 7505, exchange ".") explicitly means "no mail here".
    return records.some((r) => r.exchange && r.exchange !== ".");
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    // Definitive DNS answers: the domain cannot receive mail.
    if (code === "ENOTFOUND" || code === "ENODATA") return false;
    // Anything else (SERVFAIL, network) → fail open.
    return true;
  }
}

export async function validateSignupEmail(
  email: string,
  resolver: MxResolver = resolveMx,
): Promise<EmailValidationResult> {
  const domain = emailDomain(email);
  if (!domain) return { ok: false, reason: "format" };
  if (isDisposableDomain(domain)) return { ok: false, reason: "disposable" };
  if (!(await domainAcceptsMail(domain, resolver))) {
    return { ok: false, reason: "undeliverable" };
  }
  return { ok: true };
}

export const EMAIL_VALIDATION_MESSAGES: Record<
  Exclude<EmailValidationResult, { ok: true }>["reason"],
  string
> = {
  format: "Enter a valid email address.",
  disposable: "Disposable email addresses can't be used - please use a real inbox.",
  undeliverable: "That email domain can't receive mail. Double-check the address.",
};
