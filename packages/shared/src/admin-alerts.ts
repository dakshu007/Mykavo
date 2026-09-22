/**
 * Alerts addressed to the operator of this MyKavo installation, as distinct
 * from the alerts customers receive about their own websites.
 *
 * Kept here, away from the worker, for the usual reason: apps/worker has no
 * test runner and is not in the deploy workflow's test list, so wording and
 * redaction rules placed there would ship unchecked.
 */

import type { PushAlert } from "./push";

export interface SignupSummary {
  name: string | null | undefined;
  email: string;
  /** How many accounts exist in total, including this one. Optional. */
  totalUsers?: number;
}

/**
 * The part of an address that is safe on a lock screen.
 *
 * A signup push arrives on a phone that may be face-up on a desk, and the
 * body is shown before anyone unlocks it. The operator needs to know WHO
 * signed up, so the name is worth showing; a full address is both longer than
 * the space allows and more of someone else's personal data than a glanceable
 * notification should carry. First character plus domain identifies the
 * signup unambiguously enough to go looking, without printing it in full.
 */
export function maskEmail(email: string): string {
  const trimmed = email.trim();
  const at = trimmed.lastIndexOf("@");
  if (at <= 0) return trimmed;
  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1);
  if (local.length <= 1) return `${local}@${domain}`;
  return `${local[0]}${"*".repeat(Math.min(local.length - 1, 6))}@${domain}`;
}

/** "Dakshesh Babu" -> "Dakshesh". Falls back to the masked address. */
function displayName(summary: SignupSummary): string {
  const name = summary.name?.trim();
  if (name) return name;
  return maskEmail(summary.email);
}

/**
 * Push alert for a new signup.
 *
 * Deep-links to the app's Users screen, which is where the notification's
 * obvious next question - who else has joined, and did any of them activate -
 * is answered. An APK older than that screen lands on expo-router's unmatched
 * route instead; these pushes only ever reach platform admins, who are the
 * people who update the app, so that is a tolerable floor rather than a
 * reason to leave every future tap doing nothing.
 */
export const SIGNUP_ALERT_PATH = "/users";

export function signupPushAlert(summary: SignupSummary): PushAlert {
  const who = displayName(summary);
  const total = summary.totalUsers;
  return {
    title: "New MyKavo signup",
    body:
      total && total > 0
        ? `${who} just created an account. That makes ${total} user${total === 1 ? "" : "s"}.`
        : `${who} just created an account.`,
    severity: "INFO",
    path: SIGNUP_ALERT_PATH,
  };
}

/** Subject and body for the same event by email, where the full address is fine. */
export function signupEmailLines(summary: SignupSummary): {
  subject: string;
  line: string;
} {
  const who = summary.name?.trim() || summary.email;
  return {
    subject: `New MyKavo signup: ${who}`,
    line: `${who} <${summary.email}> just created an account.`,
  };
}
