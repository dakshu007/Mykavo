import { NextResponse } from "next/server";
import { displayPersonName } from "@mykavo/shared";
import { adminRequest, readJson } from "@/lib/automations-api";
import { parseCampaign, renderCampaign } from "@/lib/campaign-input";

/** Render a campaign as the composer has it, with the admin's name. Nothing is stored or sent. */
export async function POST(request: Request) {
  const req = await adminRequest("brevo-preview", 240);
  if (!req.ok) return req.response;
  const body = await readJson(request);
  const parsed = parseCampaign({ name: "preview", subject: "preview", heading: " ", body: " ", audience: "all", ...body });
  if (!parsed.ok) return NextResponse.json({ errors: parsed.errors }, { status: 400 });
  const firstName = displayPersonName(req.name, req.email).split(/\s+/)[0] ?? "";
  return NextResponse.json({ html: renderCampaign(parsed.input, { kind: "preview", firstName }) });
}
