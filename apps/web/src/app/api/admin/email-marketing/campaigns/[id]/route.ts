import { NextResponse } from "next/server";
import { z } from "zod";
import { BrevoError, brevoConfigured, brevoSchedule, brevoSendNow } from "@mykavo/email";
import { adminRequest, readJson } from "@/lib/automations-api";
import { logger } from "@/lib/logger";

/**
 * Act on a saved campaign: send it now, or schedule it. Platform admins
 * only. The composer asks for confirmation, with the audience size, before
 * "send". Test sends go through ../test (no saved campaign needed).
 */

type Params = { params: Promise<{ id: string }> };

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("send"), confirm: z.literal(true) }),
  z.object({ action: z.literal("schedule"), scheduledAt: z.string().datetime({ offset: true }) }),
]);

export async function POST(request: Request, { params }: Params) {
  const req = await adminRequest("brevo-campaign-action", 10);
  if (!req.ok) return req.response;
  if (!brevoConfigured()) return NextResponse.json({ error: "Brevo is not set up yet." }, { status: 400 });
  const { id: raw } = await params;
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const parsed = schema.safeParse(await readJson(request));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const action = parsed.data;
  try {
    if (action.action === "schedule") {
      const at = new Date(action.scheduledAt);
      if (at.getTime() < Date.now() + 5 * 60_000) {
        return NextResponse.json({ error: "Schedule it at least 5 minutes ahead." }, { status: 400 });
      }
      await brevoSchedule(id, at.toISOString());
      logger.info("brevo campaign scheduled", { userId: req.userId, campaignId: id, at: at.toISOString() });
      return NextResponse.json({ ok: true, scheduledAt: at.toISOString() });
    }
    await brevoSendNow(id);
    logger.info("brevo campaign sent", { userId: req.userId, campaignId: id });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof BrevoError ? err.message : "Brevo did not accept that.";
    logger.warn("brevo campaign action failed", { userId: req.userId, campaignId: id, action: action.action, error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
