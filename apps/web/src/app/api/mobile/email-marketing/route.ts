import { NextResponse } from "next/server";
import { adminRequest } from "@/lib/automations-api";
import { getMarketingOverview } from "@/lib/email-marketing";

/**
 * Email marketing for the Android app's admin area: Brevo setup checks,
 * 30-day promotional results, audiences, recent syncs and campaigns - the web
 * Email marketing page's data. "Sync now" uses the website's own route
 * (POST /api/admin/email-marketing/sync). Writing and sending campaigns stays
 * on the website, where there is room to compose and preview them.
 * Platform admins only (404 for anyone else).
 */
export async function GET() {
  const gate = await adminRequest("mobile-marketing", 10);
  if (!gate.ok) return gate.response;
  const o = await getMarketingOverview();
  return NextResponse.json(
    {
      configured: o.configured,
      provider: o.provider,
      forcedResend: o.forcedResend,
      sender: o.sender,
      checks: o.checks,
      account: o.account,
      report: o.report,
      audiences: o.audiences,
      mykavo: o.mykavo,
      syncs: o.syncs.slice(0, 5),
      campaigns: o.campaigns.slice(0, 20),
      errors: o.errors,
    },
    { headers: { "cache-control": "no-store" } },
  );
}
