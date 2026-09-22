/**
 * Android app access: who may download, and what each state means.
 *
 * The app is not on a store yet, so access is granted by hand - a visitor
 * asks from the marketing site, the operator approves, and a download then
 * appears in that person's dashboard. This module holds the rules that
 * decision turns on, away from any route handler, because every one of them
 * is a rule a future change could quietly invert.
 *
 * WHAT THE GATE ACTUALLY PROTECTS
 * -------------------------------
 * The APK itself lives on a PUBLIC GitHub release, so the bytes are not
 * secret and this is not access control in the cryptographic sense - anyone
 * who has seen the release URL can fetch it. What the gate does control is
 * discovery and attribution: the link is only ever shown to, and emailed to,
 * an approved address, and every download is recorded against a request. Call
 * it a guest list, not a lock.
 */

export type AppAccessStatus = "PENDING" | "APPROVED" | "DECLINED";

/** Normalized form used for the unique key and every lookup. */
export function normalizeAccessEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

/**
 * May this account see the download?
 *
 * APPROVED only. PENDING and DECLINED are both hidden, and deliberately
 * indistinguishable in the dashboard: somebody who was turned down should not
 * be shown a "declined" badge every time they open the app, and somebody
 * still waiting is told so by email rather than by a permanent grey panel.
 * A missing request is the same as a pending one.
 */
export function canDownloadApp(status: AppAccessStatus | null | undefined): boolean {
  return status === "APPROVED";
}

/**
 * What to tell the requester right after they submit.
 *
 * One string for every outcome, including "you already asked". Telling
 * somebody their second request was a duplicate invites them to wonder
 * whether the first one worked; telling them the same thing both times is
 * true either way and ends the interaction.
 */
export const REQUEST_RECEIVED_MESSAGE =
  "Request received. We will get back to you by email soon.";

/** Copy for the state a signed-in user is in, on the dashboard. */
export function accessStateLabel(status: AppAccessStatus | null | undefined): string {
  return status === "APPROVED" ? "Approved" : "Not yet approved";
}

export interface DecisionInput {
  status: AppAccessStatus;
  /** The status being moved to. */
  next: "APPROVED" | "DECLINED";
}

export type DecisionOutcome =
  /** Apply the change and, for an approval, send the email. */
  | { apply: true; sendEmail: boolean }
  /** Nothing to do - already in that state. */
  | { apply: false; reason: "already-in-state" };

/**
 * Should a decision be applied, and should it send mail?
 *
 * Re-approving an already-approved request must NOT re-send the email. The
 * operator will click twice - on a slow connection, from two devices, after a
 * refresh - and a second "your download is ready" is the kind of small
 * sloppiness that makes a product feel unreliable. Moving APPROVED back to
 * DECLINED is allowed and silent: revoking access is not an announcement.
 */
export function decideAppAccess({ status, next }: DecisionInput): DecisionOutcome {
  if (status === next) return { apply: false, reason: "already-in-state" };
  return { apply: true, sendEmail: next === "APPROVED" };
}

/** "3 minutes ago" for the operator's queue. Same shape as joinedAgo. */
export function requestedAgo(iso: string, now: Date = new Date()): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "unknown";
  const minutes = Math.max(0, Math.round((now.getTime() - then) / 60_000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.round(days / 30);
  return months < 12 ? `${months}mo ago` : `${Math.round(months / 12)}y ago`;
}
