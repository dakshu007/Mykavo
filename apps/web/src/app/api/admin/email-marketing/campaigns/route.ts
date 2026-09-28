import { NextResponse } from "next/server";
import { BrevoError, brevoConfigured, brevoCreateCampaign, brevoUpdateCampaign, findAudiences, toBrevoTags } from "@mykavo/email";
import { adminRequest, readJson } from "@/lib/automations-api";
import { parseCampaign, renderCampaign } from "@/lib/campaign-input";
import { logger } from "@/lib/logger";

/**
 * Save a campaign draft in Brevo - create it, or update the one this
 * composer already created (`id`). Sending is a separate, confirmed step.
 * Platform admins only.
 */
export async function POST(request: Request) {
  const req = await adminRequest("brevo-campaign", 30);
  if (!req.ok) return req.response;
  if (!brevoConfigured()) return NextResponse.json({ error: "Brevo is not set up yet." }, { status: 400 });
  const body = await readJson(request);
  const parsed = parseCampaign(body);
  if (!parsed.ok) return NextResponse.json({ error: "Check the highlighted fields.", errors: parsed.errors }, { status: 400 });

  try {
    const audiences = await findAudiences();
    if (!audiences) {
      return NextResponse.json({ error: "The MyKavo lists do not exist in Brevo yet - press Sync now first." }, { status: 409 });
    }
    const input = parsed.input;
    const fields = {
      name: input.name,
      // {firstName} becomes Brevo's contact tag in every line Brevo personalises.
      subject: toBrevoTags(input.subject),
      previewText: toBrevoTags(input.previewText),
      htmlContent: renderCampaign(input, { kind: "brevo" }),
      listIds: [audiences[input.audience].id],
    };
    const existing = typeof body?.id === "number" && Number.isInteger(body.id) ? body.id : null;
    let id: number;
    if (existing) {
      await brevoUpdateCampaign(existing, fields);
      id = existing;
    } else {
      id = await brevoCreateCampaign({ ...fields, replyTo: req.email });
    }
    logger.info("brevo campaign saved", { userId: req.userId, campaignId: id, audience: input.audience });
    return NextResponse.json({ id, audience: audiences[input.audience].subscribers });
  } catch (err) {
    const message = err instanceof BrevoError ? err.message : "Brevo did not accept the campaign.";
    logger.warn("brevo campaign save failed", { userId: req.userId, error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
