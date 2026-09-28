import { NextResponse } from "next/server";
import { prisma } from "@mykavo/database";
import { validateSettings } from "@mykavo/email";
import { automationRequest, readJson, notMigrated } from "@/lib/automations-api";
import { loadSettings, settingsToRow } from "@/lib/automations-admin";
import { logger } from "@/lib/logger";

/**
 * Admin > Automations: save, switch on/off, or reset one automated email.
 * Platform admins only (404 for everyone else). The worker reads these on
 * its next sweep - within the hour for reminders, at the next signup for
 * the welcome email.
 */

type Params = { params: Promise<{ key: string }> };

/** Save the whole edit form. */
export async function PUT(request: Request, { params }: Params) {
  const req = await automationRequest(params, "save", 30);
  if (!req.ok) return req.response;
  const body = await readJson(request);
  if (!body) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const { ready, settings } = await loadSettings();
  if (!ready) return notMigrated();
  const result = validateSettings(req.key, body, settings);
  if (!result.ok) return NextResponse.json({ error: "Check the highlighted fields.", errors: result.errors }, { status: 400 });

  const row = settingsToRow(result.settings, req.email);
  await prisma.emailAutomation.upsert({ where: { key: req.key }, create: { key: req.key, ...row }, update: row });
  logger.info("automation saved", { userId: req.userId, automation: req.key, enabled: result.settings.enabled });
  return NextResponse.json({ settings: result.settings });
}

/** Switch on or off, leaving the wording alone. */
export async function PATCH(request: Request, { params }: Params) {
  const req = await automationRequest(params, "toggle", 60);
  if (!req.ok) return req.response;
  const body = await readJson(request);
  if (!body || typeof body.enabled !== "boolean") return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const { ready } = await loadSettings();
  if (!ready) return notMigrated();
  await prisma.emailAutomation.upsert({
    where: { key: req.key },
    create: { key: req.key, enabled: body.enabled, updatedByEmail: req.email },
    update: { enabled: body.enabled, updatedByEmail: req.email },
  });
  logger.info("automation switched", { userId: req.userId, automation: req.key, enabled: body.enabled });
  return NextResponse.json({ enabled: body.enabled });
}

/** Back to the shipped wording and timing. Keeps the on/off switch. */
export async function DELETE(_request: Request, { params }: Params) {
  const req = await automationRequest(params, "save", 30);
  if (!req.ok) return req.response;
  const { ready, settings } = await loadSettings();
  if (!ready) return notMigrated();
  const enabled = settings[req.key].enabled;
  const row = settingsToRow({ enabled, copy: {}, sendOnDay: null, offerCode: null, offerPercent: null }, req.email);
  await prisma.emailAutomation.upsert({ where: { key: req.key }, create: { key: req.key, ...row }, update: row });
  logger.info("automation reset to default", { userId: req.userId, automation: req.key });
  return NextResponse.json({ ok: true });
}
