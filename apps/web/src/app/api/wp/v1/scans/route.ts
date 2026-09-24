import { NextResponse } from "next/server";
import { prisma } from "@mykavo/database";
import { authenticateSiteRequest, unauthorizedSite } from "@/lib/integrations/site-auth";
import { mapScanListItem } from "@/lib/mobile/mapping";
import { rateLimit } from "@/lib/security/rate-limit";
import { triggerWebsiteScan } from "@/lib/scans/trigger";

/** The connected website's recent scans, newest first. */
export async function GET(request: Request) {
  const ctx = await authenticateSiteRequest(request);
  if (!ctx) return unauthorizedSite();

  const scans = await prisma.scan.findMany({
    where: { websiteId: ctx.website.id },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  return NextResponse.json(
    { scans: scans.map((scan) => ({ ...mapScanListItem(scan, ctx.website), note: scan.note })) },
    { headers: { "cache-control": "no-store" } },
  );
}

/** Run a scan now - the same rules, quota and plan gate as the dashboard. */
export async function POST(request: Request) {
  const ctx = await authenticateSiteRequest(request);
  if (!ctx) return unauthorizedSite();

  const rl = rateLimit(`scan:${ctx.workspaceId}`, { limit: 10, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many scan requests. Please wait a moment and try again." },
      { status: 429, headers: { "retry-after": String(rl.retryAfterSeconds) } },
    );
  }

  const result = await triggerWebsiteScan({ workspaceId: ctx.workspaceId, websiteId: ctx.website.id });
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, ...(result.scanId ? { scanId: result.scanId } : {}) },
      { status: result.status },
    );
  }
  return NextResponse.json({ scan: { id: result.scan.id, status: result.scan.status } }, { status: 201 });
}
