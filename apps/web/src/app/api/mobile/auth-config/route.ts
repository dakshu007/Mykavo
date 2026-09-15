import { NextResponse } from "next/server";
import { googleEnabled } from "@/lib/auth";

/**
 * What the login screen may offer, before anyone has signed in.
 *
 * Public on purpose - it is asked BY the login screen, so it cannot require a
 * session, and it reveals nothing beyond which buttons the web login page
 * already shows to anonymous visitors.
 *
 * It exists so the app never draws a "Continue with Google" button against a
 * deployment that has no Google credentials: the button would open a browser
 * and fail, which is a worse answer than not offering it. Same rule as the
 * admin tabs - the flag decides what is drawn, never what is permitted.
 */
export async function GET() {
  return NextResponse.json(
    { google: googleEnabled },
    // A deploy-time constant. Cache it so a cold login screen does not wait
    // on a function invocation, but briefly, so turning Google on does not
    // need a cache purge to reach phones.
    { headers: { "cache-control": "public, max-age=300" } },
  );
}
