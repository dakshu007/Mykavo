import { prisma } from "@mykavo/database";
import { displayPersonName, normalizeAccessEmail, type AppAccessStatus } from "@mykavo/shared";

/**
 * Android app access, server side: reading the queue and looking up whether
 * the signed-in account may download.
 *
 * The rules themselves (who may download, whether a decision sends mail) live
 * in @mykavo/shared where CI tests them. This file is queries.
 */

export const APP_REQUESTS_LIMIT = 100;

export interface AppRequestRow {
  id: string;
  name: string;
  email: string;
  status: AppAccessStatus;
  requestedAt: string;
  decidedAt: string | null;
  /** True once the approval email was accepted by the provider. */
  emailSent: boolean;
  downloadCount: number;
  /** Set when a MyKavo account exists for this address - they can act on it. */
  hasAccount: boolean;
}

export interface AppRequestsReport {
  rows: AppRequestRow[];
  pending: number;
  approved: number;
  total: number;
  /** Non-null when the list could not be read; the page says so. */
  error: string | null;
}

const EMPTY: AppRequestsReport = {
  rows: [],
  pending: 0,
  approved: 0,
  total: 0,
  error: null,
};

/**
 * The operator's queue, pending first.
 *
 * Never throws: a failure to list requests must not take down a page, and an
 * empty list and a failed read must not look the same - the caller renders
 * `error` rather than an empty state.
 *
 * `hasAccount` is worth the extra query. Approving somebody who has not
 * signed up yet is fine - the email tells them to use that address - but the
 * operator deciding blind cannot tell the difference between "a customer
 * wants the app" and "a stranger filled in a form", and those deserve
 * different levels of scrutiny.
 */
export async function getAppRequests(
  limit: number = APP_REQUESTS_LIMIT,
): Promise<AppRequestsReport> {
  try {
    const [requests, pending, approved, total] = await Promise.all([
      prisma.appAccessRequest.findMany({
        // Pending first, then newest: the queue is a to-do list, and a decided
        // request is history.
        orderBy: [{ status: "asc" }, { requestedAt: "desc" }],
        take: limit,
      }),
      prisma.appAccessRequest.count({ where: { status: "PENDING" } }),
      prisma.appAccessRequest.count({ where: { status: "APPROVED" } }),
      prisma.appAccessRequest.count(),
    ]);

    const emails = requests.map((r) => r.email);
    const accounts = emails.length
      ? await prisma.user.findMany({
          where: { email: { in: emails, mode: "insensitive" } },
          select: { email: true },
        })
      : [];
    const withAccount = new Set(accounts.map((a) => normalizeAccessEmail(a.email)));

    return {
      rows: requests.map((r) => ({
        id: r.id,
        // Requests predate nothing, but the same rule applies as elsewhere:
        // never print straight back what somebody typed into a name field.
        name: displayPersonName(r.name, r.email),
        email: r.email,
        status: r.status,
        requestedAt: r.requestedAt.toISOString(),
        decidedAt: r.decidedAt?.toISOString() ?? null,
        emailSent: r.approvalEmailSentAt !== null,
        downloadCount: r.downloadCount,
        hasAccount: withAccount.has(normalizeAccessEmail(r.email)),
      })),
      pending,
      approved,
      total,
      error: null,
    };
  } catch (err) {
    return { ...EMPTY, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * This account's access status, or null when it never asked.
 *
 * Looks up by ADDRESS, which is the whole reason the marketing copy insists
 * on "use the same address as your MyKavo account". Case-insensitive, because
 * the request form and the signup form are filled in by the same human on
 * different days.
 *
 * Returns null rather than throwing on a read failure: a database hiccup must
 * not hand somebody a download they were not approved for, and canDownloadApp
 * treats null as "no".
 */
export async function getAppAccessStatus(email: string): Promise<AppAccessStatus | null> {
  try {
    const row = await prisma.appAccessRequest.findFirst({
      where: { email: { equals: normalizeAccessEmail(email), mode: "insensitive" } },
      select: { status: true },
    });
    return row?.status ?? null;
  } catch {
    return null;
  }
}
