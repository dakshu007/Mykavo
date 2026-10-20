import { NextResponse } from "next/server";
import { campaignToJson } from "@/config/campaign";
import { getLiveCampaign } from "@/lib/billing/campaign-server";

/**
 * The running offer, for the marketing pages' top bar and pricing banner
 * (those pages are cached, so they ask at view time). Public: the code is on
 * the banner anyway. Cached at the CDN for five minutes, so a busy day costs
 * a few function calls an hour, not one per visitor.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const campaign = await getLiveCampaign();
  return NextResponse.json(
    { campaign: campaign ? campaignToJson(campaign) : null },
    {
      headers: {
        "Cache-Control": "public, max-age=60",
        "Netlify-CDN-Cache-Control": "public, durable, s-maxage=300, stale-while-revalidate=600",
      },
    },
  );
}
