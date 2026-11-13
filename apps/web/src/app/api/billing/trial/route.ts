import { NextResponse } from "next/server";

/**
 * Used to start a workspace's free Pro trial. New trials ended on 13 Nov 2026
 * (NEW_TRIALS_OPEN in @mykavo/database): new accounts start on Free. Trials
 * that were already running are not affected by this route. It stays so an
 * old tab or cached client gets a clear answer instead of a 404.
 */
export function POST() {
  return NextResponse.json(
    { error: "Free trials have ended. Upgrade to Pro on the Billing page." },
    { status: 410 },
  );
}
