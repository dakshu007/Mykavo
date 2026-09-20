import { logger } from "@/lib/logger";

/**
 * Inbound enquiries (demo requests, guest-post pitches, partner applications)
 * exported to a Google Sheet via an Apps Script web app bound to it.
 *
 * Same shape as the signup export: the script runs as the sheet owner, so the
 * sheet stays private, and the POST is fire-and-forget so a Google outage
 * cannot make the form look broken to the person filling it in.
 *
 * DIFFERENT from signups in one important way: a signup is already recorded
 * in Postgres, so losing the sheet write loses nothing. These forms have no
 * other home, so a dropped write is a lost lead. Hence the submission is
 * awaited and its success reported back to the caller, and every payload is
 * also written to the application log - a lead that reached the log can be
 * recovered by hand, one that vanished silently cannot.
 */

const WEBHOOK_URL = process.env.LEAD_SHEET_WEBHOOK_URL ?? "";
const TIMEOUT_MS = 8000;

export type LeadKind = "demo" | "guest-post" | "partner-agency" | "partner-tech";

export interface LeadSubmission {
  kind: LeadKind;
  name: string;
  email: string;
  company?: string;
  website?: string;
  message?: string;
  /** Free-form extras that differ per form (team size, topic, audience…). */
  details?: Record<string, string>;
}

/** True when a sheet is configured. Forms still work without one. */
export function leadSheetConfigured(): boolean {
  return WEBHOOK_URL.length > 0;
}

export async function recordLead(lead: LeadSubmission): Promise<{ stored: boolean }> {
  // Logged BEFORE the network call, and regardless of whether a sheet is
  // configured: this is the copy that survives a misconfigured webhook.
  // Deliberately no message body in the log - it can be long and it is the
  // one field most likely to contain something the sender considers private.
  logger.info("lead received", {
    kind: lead.kind,
    email: lead.email,
    company: lead.company ?? null,
    website: lead.website ?? null,
    hasMessage: Boolean(lead.message),
  });

  if (!WEBHOOK_URL) return { stored: false };

  try {
    const res = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...lead, submittedAt: new Date().toISOString() }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      // Apps Script answers with a 302 to a googleusercontent URL - follow it
      // so the request counts as delivered.
      redirect: "follow",
    });
    if (!res.ok) {
      logger.warn("lead sheet webhook non-OK", { kind: lead.kind, status: res.status });
      return { stored: false };
    }
    return { stored: true };
  } catch (err) {
    logger.warn("lead sheet webhook failed", {
      kind: lead.kind,
      error: err instanceof Error ? err.message : String(err),
    });
    return { stored: false };
  }
}
