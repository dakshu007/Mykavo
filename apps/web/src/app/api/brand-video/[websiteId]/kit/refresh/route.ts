import { NextResponse } from "next/server";
import { z } from "zod";
import { getOwnedWebsite } from "@/lib/api-auth";
import { readBody, videoContext } from "@/lib/brand-video/api";
import { startBrandRefresh } from "@/lib/brand-video/jobs";
import { logger } from "@/lib/logger";

type Params = { params: Promise<{ websiteId: string }> };
const body = z.object({ force: z.boolean().default(false) });

/** POST: read the brand from the homepage again now. force also replaces edited words and colors. */
export async function POST(request: Request, { params }: Params) {
  const gate = await videoContext({ mutate: true, bucket: "refresh", limit: 6 });
  if (!gate.ok) return gate.response;
  const { websiteId } = await params;
  const website = await getOwnedWebsite(gate.ctx, websiteId);
  if (!website) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const parsed = body.safeParse((await readBody(request)) ?? {});
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  try {
    const r = await startBrandRefresh({ workspaceId: gate.ctx.workspace.id, websiteId: website.id, userId: gate.ctx.userId, force: parsed.data.force });
    if (!r.ok) return NextResponse.json({ error: r.error, code: r.code }, { status: r.status });
    return NextResponse.json({ jobId: r.jobId }, { status: r.reused ? 200 : 202 });
  } catch (err) {
    logger.error("brand refresh start failed", { websiteId: website.id, error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
