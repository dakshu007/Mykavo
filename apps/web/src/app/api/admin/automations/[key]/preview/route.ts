import { NextResponse } from "next/server";
import { validateSettings } from "@mykavo/email";
import { displayPersonName } from "@mykavo/shared";
import { automationRequest, readJson } from "@/lib/automations-api";
import { loadSettings, renderPreview } from "@/lib/automations-admin";

/**
 * Render the email as the editor currently has it (saved or not), with
 * sample data and the admin's own name. Nothing is stored or sent. Uses the
 * same renderer as the worker, so the preview is what customers get.
 */

type Params = { params: Promise<{ key: string }> };

export async function POST(request: Request, { params }: Params) {
  const req = await automationRequest(params, "preview", 240);
  if (!req.ok) return req.response;
  const body = await readJson(request);
  if (!body) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const { settings } = await loadSettings();
  const result = validateSettings(req.key, body, settings);
  if (!result.ok) return NextResponse.json({ errors: result.errors }, { status: 400 });
  const mail = renderPreview(req.key, settings, result.settings, displayPersonName(req.name, req.email));
  return NextResponse.json(mail);
}
