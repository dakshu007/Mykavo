import { NextResponse } from "next/server";
import { finishBrevoSyncLog, loadMarketingContacts, prisma, saveMarketingOptOuts, startBrevoSyncLog } from "@mykavo/database";
import { brevoConfigured, runBrevoSyncWith } from "@mykavo/email";
import { adminRequest } from "@/lib/automations-api";
import { logger } from "@/lib/logger";

/**
 * "Sync now": a full Brevo contact sync, run right here so it works the
 * moment Brevo is connected - no waiting on the worker. The worker keeps
 * syncing on its own every hour (and fully once a day) with the same code.
 * Platform admins only.
 */

// A few hundred accounts take seconds; allow room for more.
export const maxDuration = 60;

export async function POST() {
  const req = await adminRequest("brevo-sync", 6);
  if (!req.ok) return req.response;
  if (!brevoConfigured()) {
    return NextResponse.json({ error: "Brevo is not set up yet - add BREVO_API_KEY and BREVO_SENDER_EMAIL first." }, { status: 400 });
  }

  const logId = await startBrevoSyncLog(prisma, "full", req.email);
  try {
    const result = await runBrevoSyncWith(
      {
        loadContacts: (since) => loadMarketingContacts(prisma, since),
        saveOptOuts: (emails) => saveMarketingOptOuts(prisma, emails, "brevo"),
      },
      "full",
    );
    await finishBrevoSyncLog(prisma, logId, { status: "OK", ...result });
    logger.info("brevo sync finished", { userId: req.userId, ...result });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await finishBrevoSyncLog(prisma, logId, { status: "FAILED", error: message.slice(0, 500) });
    logger.error("brevo sync failed", { userId: req.userId, error: message });
    return NextResponse.json({ error: message.startsWith("Brevo") ? message : "The sync failed - see the sync log." }, { status: 502 });
  }
}
