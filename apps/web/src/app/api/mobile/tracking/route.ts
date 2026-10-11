import { NextResponse } from "next/server";
import { adminRequest } from "@/lib/automations-api";
import { loadTrackingOverview } from "@/lib/admin/tracking";
import { TRACKING_SHOWS, matchesShow, parseTrackingShow, visibleRows } from "@/lib/admin/tracking-filter";

/**
 * Tracking for the Android app's admin area: the same overview the web
 * Tracking page renders (loadTrackingOverview), filtered with the same rules.
 * A separate contract from the page because a shipped APK cannot be updated
 * in lockstep with the website. Platform admins only (404 for anyone else).
 *
 * Query: ?show=all|active|inactive|stuck|<channel>, ?internal=1 to include
 * team accounts.
 */
const MAX_ROWS = 200;

export async function GET(request: Request) {
  const gate = await adminRequest("mobile-tracking", 20);
  if (!gate.ok) return gate.response;

  const url = new URL(request.url);
  const show = parseTrackingShow(url.searchParams.get("show"));
  const includeInternal = url.searchParams.get("internal") === "1";

  const overview = await loadTrackingOverview(includeInternal);
  const now = Date.now();
  const rows = visibleRows(overview.rows, show, now);

  return NextResponse.json(
    {
      recording: overview.recording,
      kpis: overview.kpis,
      daily: overview.daily,
      extension: overview.extension,
      show,
      includeInternal,
      shows: TRACKING_SHOWS.map((s) => ({
        ...s,
        count: overview.rows.filter((r) => matchesShow(r, s.id, now)).length,
      })),
      total: rows.length,
      rows: rows.slice(0, MAX_ROWS),
    },
    { headers: { "cache-control": "no-store" } },
  );
}
