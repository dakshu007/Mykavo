/**
 * When does this domain expire?
 *
 * Nobody tracks it. Renewal notices go to an inbox someone left the agency
 * with, the card on file expires, and the first anyone hears is the site being
 * gone - not slow, not broken, GONE, along with the email on that domain. It is
 * the single most expensive website failure and the easiest to prevent, and no
 * monitoring tool tells you it is coming.
 *
 * Read over RDAP, the registries' structured replacement for WHOIS. It is free,
 * public, needs no key and returns JSON, so this costs nothing to run.
 *
 * This module is pure: parsing and the urgency rules only. The fetching lives
 * in the worker, behind the same SSRF guard as every other outbound request,
 * because an RDAP lookup follows redirects to registry servers we do not
 * control.
 */

/** How close to expiry, in plain terms. */
export type ExpiryUrgency = "expired" | "critical" | "warning" | "notice" | "ok";

export interface DomainRegistration {
  /** Registrable domain the lookup was for, e.g. "example.co.uk". */
  domain: string;
  expiresAt: Date | null;
  registrar: string | null;
  /** Registry lock states that block a transfer/deletion, e.g. clientHold. */
  statuses: string[];
}

export interface ExpiryAssessment {
  daysRemaining: number | null;
  urgency: ExpiryUrgency;
  /** Plain-language summary. Empty when there is nothing to say. */
  message: string;
}

/**
 * Thresholds, named so they are arguable rather than magic.
 *
 * 30 days is the point most registrars begin the redemption countdown after a
 * lapse, and the point at which a human still has time to find whoever holds
 * the card. 60 gives an agency a full billing cycle to reach a client.
 */
export const EXPIRY_RULES = {
  criticalDays: 14,
  warningDays: 30,
  noticeDays: 60,
} as const;

const DAY_MS = 86_400_000;

/**
 * Extract the registrable domain ("example.co.uk" from "shop.example.co.uk").
 *
 * Uses a list of known multi-part public suffixes rather than the full Public
 * Suffix List: shipping a 15,000-entry list to read one field is not worth the
 * weight, and every case it misses degrades to one label too few - a lookup
 * that returns nothing, never a wrong answer about a different domain.
 */
const MULTI_PART_SUFFIXES = new Set([
  "co.uk", "org.uk", "me.uk", "ac.uk", "gov.uk", "net.uk", "sch.uk",
  "co.in", "net.in", "org.in", "firm.in", "gen.in", "ind.in",
  "com.au", "net.au", "org.au", "edu.au", "gov.au", "id.au",
  "co.nz", "net.nz", "org.nz", "govt.nz",
  "com.br", "net.br", "org.br", "gov.br",
  "co.za", "org.za", "net.za", "web.za",
  "com.sg", "com.my", "com.hk", "com.tw", "com.cn", "net.cn", "org.cn",
  "co.jp", "or.jp", "ne.jp", "ac.jp", "go.jp",
  "com.mx", "com.ar", "com.tr", "com.ua", "com.pl", "com.ph", "com.vn",
  "co.id", "co.kr", "co.il", "co.th", "com.pk", "com.bd", "com.ng", "com.eg",
]);

export function registrableDomain(hostname: string): string | null {
  const host = hostname.trim().toLowerCase().replace(/\.$/, "");
  if (!host || host.includes(" ")) return null;
  // An IP address has no registration to look up.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(":")) return null;

  const labels = host.split(".").filter(Boolean);
  if (labels.length < 2) return null;

  const lastTwo = labels.slice(-2).join(".");
  if (MULTI_PART_SUFFIXES.has(lastTwo)) {
    return labels.length >= 3 ? labels.slice(-3).join(".") : null;
  }
  return lastTwo;
}

/** The RDAP bootstrap endpoint for a domain. Redirects to the registry. */
export function rdapUrl(domain: string): string {
  return `https://rdap.org/domain/${encodeURIComponent(domain)}`;
}

interface RdapEvent {
  eventAction?: unknown;
  eventDate?: unknown;
}

/**
 * Pull the registration facts out of an RDAP response.
 *
 * Returns nulls rather than throwing for anything unrecognised: registries
 * differ in what they include, and a missing registrar must not cost us the
 * expiry date sitting right next to it.
 */
export function parseRdap(domain: string, payload: unknown): DomainRegistration {
  const empty: DomainRegistration = { domain, expiresAt: null, registrar: null, statuses: [] };
  if (typeof payload !== "object" || payload === null) return empty;
  const root = payload as Record<string, unknown>;

  let expiresAt: Date | null = null;
  if (Array.isArray(root.events)) {
    for (const raw of root.events as RdapEvent[]) {
      if (typeof raw !== "object" || raw === null) continue;
      if (raw.eventAction !== "expiration") continue;
      if (typeof raw.eventDate !== "string") continue;
      const parsed = new Date(raw.eventDate);
      if (!Number.isNaN(parsed.getTime())) expiresAt = parsed;
    }
  }

  let registrar: string | null = null;
  if (Array.isArray(root.entities)) {
    for (const entity of root.entities) {
      if (typeof entity !== "object" || entity === null) continue;
      const e = entity as Record<string, unknown>;
      const roles = Array.isArray(e.roles) ? e.roles : [];
      if (!roles.includes("registrar")) continue;
      // jCard: ["vcard", [["fn", {}, "text", "Example Registrar"], ...]]
      const vcard = Array.isArray(e.vcardArray) ? e.vcardArray[1] : null;
      if (!Array.isArray(vcard)) continue;
      for (const field of vcard) {
        if (Array.isArray(field) && field[0] === "fn" && typeof field[3] === "string") {
          registrar = field[3];
          break;
        }
      }
      if (registrar) break;
    }
  }

  const statuses = Array.isArray(root.status)
    ? root.status.filter((s): s is string => typeof s === "string")
    : [];

  return { domain, expiresAt, registrar, statuses };
}

/** How urgent is this expiry, and what should the user be told? */
export function assessExpiry(
  expiresAt: Date | null,
  now: Date = new Date(),
): ExpiryAssessment {
  if (!expiresAt) {
    return { daysRemaining: null, urgency: "ok", message: "" };
  }

  const daysRemaining = Math.floor((expiresAt.getTime() - now.getTime()) / DAY_MS);

  if (daysRemaining < 0) {
    return {
      daysRemaining,
      urgency: "expired",
      message:
        "This domain has passed its expiry date. Most registrars keep it recoverable for a short grace period, then release it - renew today.",
    };
  }
  if (daysRemaining <= EXPIRY_RULES.criticalDays) {
    return {
      daysRemaining,
      urgency: "critical",
      message: `Expires in ${daysRemaining} day${daysRemaining === 1 ? "" : "s"}. If auto-renew is off or the card on file is stale, the site and its email go dark.`,
    };
  }
  if (daysRemaining <= EXPIRY_RULES.warningDays) {
    return {
      daysRemaining,
      urgency: "warning",
      message: `Expires in ${daysRemaining} days. Confirm auto-renew is on and the billing card is current.`,
    };
  }
  if (daysRemaining <= EXPIRY_RULES.noticeDays) {
    return {
      daysRemaining,
      urgency: "notice",
      message: `Expires in ${daysRemaining} days. Worth checking who holds the renewal.`,
    };
  }
  return { daysRemaining, urgency: "ok", message: "" };
}

/** Registry states that mean the domain is already restricted. */
export function blockingStatuses(statuses: readonly string[]): string[] {
  const BLOCKING = new Set(["clienthold", "serverhold", "pendingdelete", "redemptionperiod"]);
  return statuses.filter((s) => BLOCKING.has(s.toLowerCase().replace(/\s+/g, "")));
}
