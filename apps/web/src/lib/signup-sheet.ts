import { logger } from "@/lib/logger";

/**
 * New-signup export for email marketing: POSTs {email, name, signedUpAt} to a
 * Google Apps Script web app bound to the marketing spreadsheet. The script
 * runs as the sheet owner, so the sheet itself stays private to them.
 *
 * Fire-and-forget by design - a marketing export must never slow down or
 * break account creation. Unset SIGNUP_SHEET_WEBHOOK_URL disables it, and
 * Postgres remains the source of truth for user emails regardless.
 */

const WEBHOOK_URL = process.env.SIGNUP_SHEET_WEBHOOK_URL ?? "";
const TIMEOUT_MS = 5000;

export function recordSignupToSheet(user: { email: string; name: string }): void {
  if (!WEBHOOK_URL) return;
  void fetch(WEBHOOK_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email: user.email,
      name: user.name,
      signedUpAt: new Date().toISOString(),
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
    // Apps Script answers with a 302 to a googleusercontent URL - follow it
    // so the request counts as delivered.
    redirect: "follow",
  })
    .then((res) => {
      if (!res.ok) {
        logger.warn("signup sheet webhook non-OK", { status: res.status });
      }
    })
    .catch((err) => {
      logger.warn("signup sheet webhook failed", {
        error: err instanceof Error ? err.message : String(err),
      });
    });
}
