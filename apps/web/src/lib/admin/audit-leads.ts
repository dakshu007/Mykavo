/**
 * The homepage "Email my free audit" form, for the Tracking page: how many
 * people asked for an audit, how many got it, and how many went on to sign
 * up. Pure, so it is tested without a database.
 */

const DAY_MS = 86_400_000;

export interface RawAuditLead {
  id: string;
  email: string;
  host: string;
  status: string;
  pagesCrawled: number;
  healthScore: number | null;
  errorCount: number;
  emailedAt: Date | null;
  errorMessage: string | null;
  createdAt: Date;
}

export interface AuditLeadUser {
  id: string;
  email: string;
  createdAt: Date;
}

export interface AuditLeadRow {
  id: string;
  email: string;
  host: string;
  status: string;
  pagesCrawled: number;
  healthScore: number | null;
  errorCount: number;
  emailed: boolean;
  errorMessage: string | null;
  createdAt: Date;
  /** The account with this email, if there is one. */
  userId: string | null;
  /** True when that account was created after the audit was requested. */
  signedUpAfter: boolean;
  internal: boolean;
}

export interface AuditLeadSummary {
  total: number;
  last7d: number;
  emailed: number;
  failed: number;
  /** Distinct emails that created an account after asking for an audit. */
  signedUpAfter: number;
  /** Most recent first. */
  recent: AuditLeadRow[];
}

export function summarizeAuditLeads(
  leads: RawAuditLead[],
  users: AuditLeadUser[],
  opts: { includeInternal: boolean; isInternal: (email: string) => boolean; now?: Date; limit?: number },
): AuditLeadSummary {
  const now = +(opts.now ?? new Date());
  const byEmail = new Map(users.map((u) => [u.email.trim().toLowerCase(), u]));
  const rows: AuditLeadRow[] = leads
    .map((l) => {
      const user = byEmail.get(l.email.trim().toLowerCase()) ?? null;
      return {
        id: l.id,
        email: l.email,
        host: l.host,
        status: l.status,
        pagesCrawled: l.pagesCrawled,
        healthScore: l.healthScore,
        errorCount: l.errorCount,
        emailed: l.emailedAt !== null,
        errorMessage: l.errorMessage,
        createdAt: l.createdAt,
        userId: user?.id ?? null,
        signedUpAfter: user !== null && +user.createdAt >= +l.createdAt,
        internal: opts.isInternal(l.email),
      };
    })
    .filter((r) => opts.includeInternal || !r.internal)
    .sort((a, b) => +b.createdAt - +a.createdAt);

  return {
    total: rows.length,
    last7d: rows.filter((r) => now - +r.createdAt < 7 * DAY_MS).length,
    emailed: rows.filter((r) => r.emailed).length,
    failed: rows.filter((r) => r.status === "FAILED").length,
    signedUpAfter: new Set(rows.filter((r) => r.signedUpAfter).map((r) => r.email.trim().toLowerCase())).size,
    recent: rows.slice(0, opts.limit ?? 25),
  };
}
