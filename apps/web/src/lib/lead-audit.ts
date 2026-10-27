/**
 * Limits for "Email me a free site audit" (POST /api/audit-report).
 *
 * The endpoint sends email to an address a stranger typed in and starts a
 * crawl of a site they named, so it is limited per address, per requester,
 * per site and overall - counted from the audit_lead table itself, which,
 * unlike the in-memory limiter, holds across every serverless instance.
 */

export const LEAD_AUDIT_LIMITS = {
  /** Reports one inbox can receive a day. */
  perEmail: 2,
  /** Requests one IP can make a day. */
  perIp: 5,
  /** Audits of one site a day, whoever asks. */
  perHost: 3,
  /** All leads a day: protects the worker and the sending reputation. */
  perDay: 300,
  /** Waiting in the queue at once before new requests are turned away. */
  maxQueued: 25,
} as const;

export interface LeadAuditCounts {
  email: number;
  ip: number;
  host: number;
  day: number;
  queued: number;
}

/** Why a request is refused, in words for the visitor, or null to accept it. */
export function leadAuditRefusal(counts: LeadAuditCounts): string | null {
  if (counts.email >= LEAD_AUDIT_LIMITS.perEmail)
    return "We've already sent audits to this address today. Check your inbox, or try again tomorrow.";
  if (counts.host >= LEAD_AUDIT_LIMITS.perHost)
    return "This site has been audited several times today. Try again tomorrow.";
  if (counts.ip >= LEAD_AUDIT_LIMITS.perIp)
    return "You've requested a lot of audits today. Try again tomorrow.";
  if (counts.day >= LEAD_AUDIT_LIMITS.perDay || counts.queued >= LEAD_AUDIT_LIMITS.maxQueued)
    return "We're running a lot of audits right now. Please try again in a little while.";
  return null;
}
