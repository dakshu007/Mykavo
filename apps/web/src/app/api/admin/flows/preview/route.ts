import { NextResponse } from "next/server";
import { flowCustomEmail, isAutomationKey } from "@mykavo/email";
import { displayPersonName, isSafeButtonUrl, parseFlowDefinition } from "@mykavo/shared";
import { adminRequest, readJson } from "@/lib/automations-api";
import { appBase, loadSettings, renderPreview } from "@/lib/automations-admin";

/**
 * Render one email step as it would go out, with sample data and the
 * admin's own name. Nothing is stored or sent.
 */
export async function POST(request: Request) {
  const req = await adminRequest("flow-preview", 240);
  if (!req.ok) return req.response;
  const body = await readJson(request);
  // Parse the step through the same validator as a saved flow.
  const parsed = parseFlowDefinition({ steps: [{ id: "preview", type: "email", email: body?.email }] });
  const step = parsed.ok ? parsed.flow.steps[0] : null;
  if (!step || step.type !== "email") return NextResponse.json({ error: "Invalid email." }, { status: 400 });

  const name = displayPersonName(req.name, req.email);
  const email = step.email;
  if (email.kind === "builtin") {
    if (!isAutomationKey(email.key)) return NextResponse.json({ error: "Pick an email." }, { status: 400 });
    const { settings } = await loadSettings();
    return NextResponse.json(renderPreview(email.key, settings, settings[email.key], name));
  }
  const buttonUrl = isSafeButtonUrl(email.buttonUrl)
    ? email.buttonUrl.startsWith("/")
      ? `${appBase}${email.buttonUrl}`
      : email.buttonUrl
    : `${appBase}/dashboard`;
  return NextResponse.json(
    flowCustomEmail({
      name,
      subject: email.subject || "(no subject yet)",
      heading: email.heading,
      body: email.body,
      buttonLabel: email.buttonLabel,
      buttonUrl,
      unsubscribeUrl: `${appBase}/unsubscribe?n=preview`,
    }),
  );
}
