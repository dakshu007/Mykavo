import { NextResponse } from "next/server";
import { loadLiveProof } from "@/lib/live-proof";
import { logger } from "@/lib/logger";

/**
 * Real, anonymized proof for the homepage's top strip (see lib/live-proof.ts).
 * The homepage is cached, so it asks at view time; the CDN keeps the answer
 * for an hour, so the database is asked a few times an hour at most.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const proof = await loadLiveProof();
    return NextResponse.json(proof, {
      headers: {
        "Cache-Control": "public, max-age=300",
        "Netlify-CDN-Cache-Control": "public, durable, s-maxage=3600, stale-while-revalidate=7200",
      },
    });
  } catch (err) {
    logger.error("live proof could not be loaded", {}, err);
    return NextResponse.json({ error: "unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
