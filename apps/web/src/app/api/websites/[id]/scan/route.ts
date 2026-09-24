import { NextResponse } from "next/server";
import { getApiContext, getOwnedWebsite, requireRole } from "@/lib/api-auth";
import { rateLimit } from "@/lib/security/rate-limit";
import { triggerWebsiteScan } from "@/lib/scans/trigger";

type Params = { params: Promise<{ id: string }> };

/** Trigger an asynchronous scan of the website's monitored pages. */
export async function POST(_request: Request, { params }: Params) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const denied = requireRole(ctx, "OWNER", "ADMIN", "MEMBER");
  if (denied) return denied;

  // Burst guard: cap scan triggers per workspace per minute (spec §43).
  const rl = rateLimit(`scan:${ctx.workspace.id}`, { limit: 10, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many scan requests. Please wait a moment and try again." },
      { status: 429, headers: { "retry-after": String(rl.retryAfterSeconds) } },
    );
  }

  const { id } = await params;
  const website = await getOwnedWebsite(ctx, id);
  if (!website) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const result = await triggerWebsiteScan({ workspaceId: ctx.workspace.id, websiteId: website.id });
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, ...(result.scanId ? { scanId: result.scanId } : {}) },
      { status: result.status },
    );
  }
  return NextResponse.json({ scan: result.scan }, { status: 201 });
}
