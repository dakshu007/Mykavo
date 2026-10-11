import { NextResponse } from "next/server";
import { adminRequest } from "@/lib/automations-api";
import { loadUserTracking } from "@/lib/admin/tracking";

/** One person's tracking for the Android app: the web detail page's data. Platform admins only. */
export async function GET(_request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const gate = await adminRequest("mobile-tracking-user", 30);
  if (!gate.ok) return gate.response;
  const { userId } = await params;
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(userId)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const tracking = await loadUserTracking(userId);
  if (!tracking) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(tracking, { headers: { "cache-control": "no-store" } });
}
