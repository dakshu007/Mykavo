import { NextResponse } from "next/server";
import { brevoConfigured, sendViaBrevo } from "@mykavo/email";
import { displayPersonName } from "@mykavo/shared";
import { adminRequest, readJson } from "@/lib/automations-api";
import { parseCampaign, renderCampaign } from "@/lib/campaign-input";
import { logger } from "@/lib/logger";

/**
 * Send the campaign exactly as the composer has it to the team's test inbox
 * - no Brevo draft needed. It goes out through Brevo's transactional API (the
 * same stream as the lifecycle emails), with {firstName} filled in as the
 * admin's name, since campaign test sends need a Brevo test list and a saved
 * campaign. The address is fixed server-side (BREVO_TEST_EMAIL, default
 * test@mykavo.app), so this cannot mail anyone else. Platform admins only.
 */

const testInbox = () => (process.env.BREVO_TEST_EMAIL || "test@mykavo.app").trim();

export async function POST(request: Request) {
  const req = await adminRequest("brevo-campaign-test", 20);
  if (!req.ok) return req.response;
  if (!brevoConfigured()) return NextResponse.json({ error: "Brevo is not set up yet." }, { status: 400 });
  const body = await readJson(request);
  // The internal name only matters once the campaign is saved.
  const parsed = parseCampaign({ ...body, name: body?.name || "Test" });
  if (!parsed.ok) return NextResponse.json({ error: "Check the highlighted fields.", errors: parsed.errors }, { status: 400 });

  const input = parsed.input;
  const firstName = displayPersonName(req.name, req.email).split(/\s+/)[0] ?? "";
  const fill = (s: string) => s.replace(/\{firstName\}/g, firstName || "there");
  const to = testInbox();
  const result = await sendViaBrevo(
    {
      to: [to],
      subject: `[Test] ${fill(input.subject)}`,
      html: renderCampaign(input, { kind: "preview", firstName }),
    },
    ["campaign-test"],
  );
  if (!result.ok) {
    logger.warn("brevo campaign test failed", { userId: req.userId, error: result.error });
    return NextResponse.json({ error: result.error ?? "Brevo did not send the test." }, { status: 502 });
  }
  logger.info("brevo campaign test sent", { userId: req.userId });
  return NextResponse.json({ ok: true, sentTo: to });
}
