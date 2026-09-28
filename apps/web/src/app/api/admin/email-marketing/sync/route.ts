import { NextResponse } from "next/server";
import { brevoConfigured } from "@mykavo/email";
import { adminRequest } from "@/lib/automations-api";
import { enqueueBrevoSync } from "@/lib/queue";
import { logger } from "@/lib/logger";

/** "Sync now": a full Brevo contact sync, run by the worker. Platform admins only. */
export async function POST() {
  const req = await adminRequest("brevo-sync", 6);
  if (!req.ok) return req.response;
  if (!brevoConfigured()) {
    return NextResponse.json({ error: "Brevo is not set up yet - add BREVO_API_KEY and BREVO_SENDER_EMAIL first." }, { status: 400 });
  }
  try {
    await enqueueBrevoSync({ kind: "full", requestedByEmail: req.email });
  } catch (err) {
    logger.error("could not queue brevo sync", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Could not reach the job queue. Try again in a minute." }, { status: 503 });
  }
  logger.info("brevo sync requested", { userId: req.userId });
  return NextResponse.json({ queued: true });
}
