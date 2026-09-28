/**
 * Brevo contact sync, as the worker runs it: MyKavo accounts into Brevo's
 * "MyKavo" lists, and Brevo unsubscribes back into email_opt_out. The steps
 * live in @mykavo/email (runBrevoSyncWith) and the database side in
 * @mykavo/database, shared with the admin's "Sync now" in the web app.
 *
 *   incremental - every hourly sweep: accounts created, given a first
 *                 website or unsubscribed in the last few hours, and
 *                 unsubscribes Brevo recorded in that window.
 *   full        - once a day: every account (plans change, sites get added),
 *                 every Brevo unsubscribe, and deleted accounts leave the lists.
 *
 * Does nothing until Brevo is configured (BREVO_API_KEY, BREVO_SENDER_EMAIL).
 */

import {
  finishBrevoSyncLog,
  isMissingTableError,
  loadMarketingContacts,
  prisma,
  saveMarketingOptOuts,
  startBrevoSyncLog,
} from "@mykavo/database";
import { brevoConfigured, runBrevoSyncWith } from "@mykavo/email";
import { logger } from "./logger";

const HOUR_MS = 60 * 60 * 1000;

export async function runBrevoSync(kind: "full" | "incremental", requestedByEmail?: string): Promise<void> {
  if (!brevoConfigured()) return;
  const logId = await startBrevoSyncLog(prisma, kind, requestedByEmail);
  try {
    const result = await runBrevoSyncWith(
      {
        loadContacts: (since) => loadMarketingContacts(prisma, since),
        saveOptOuts: (emails) => saveMarketingOptOuts(prisma, emails, "brevo"),
      },
      kind,
    );
    await finishBrevoSyncLog(prisma, logId, { status: "OK", ...result });
    logger.info("brevo sync finished", { kind, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await finishBrevoSyncLog(prisma, logId, { status: "FAILED", error: message.slice(0, 500) });
    logger.error("brevo sync failed", { kind, error: message });
    throw err;
  }
}

/**
 * The daily full sync, decided inside the hourly sweep: once the last full
 * run (worker or "Sync now") is 20 hours old. Without the log table, the
 * sweep at 03:00 UTC does it.
 */
export async function fullSyncDue(): Promise<boolean> {
  try {
    const last = await prisma.brevoSyncRun.findFirst({
      where: { kind: "full", status: "OK" },
      orderBy: { startedAt: "desc" },
      select: { startedAt: true },
    });
    return !last || Date.now() - last.startedAt.getTime() > 20 * HOUR_MS;
  } catch (err) {
    if (isMissingTableError(err)) return new Date().getUTCHours() === 3;
    throw err;
  }
}
