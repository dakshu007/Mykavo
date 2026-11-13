import { NextResponse } from "next/server";
import { prisma, setAiPaused } from "@mykavo/database";
import { adminRequest, readJson } from "@/lib/automations-api";
import { logger } from "@/lib/logger";

/**
 * POST { paused: boolean }: the AI kill switch, platform admins only.
 *
 * Pausing stops every AI call (change explanations, weekly summaries and any
 * later AI feature) from the next request on, in the web app and the worker.
 * Scans, comparisons and alerts never read the switch, so monitoring carries
 * on unchanged.
 */
export async function POST(request: Request) {
  const admin = await adminRequest("ai-pause", 20);
  if (!admin.ok) return admin.response;

  const body = await readJson(request);
  if (typeof body?.paused !== "boolean") {
    return NextResponse.json({ error: "Send { paused: true } or { paused: false }." }, { status: 400 });
  }

  try {
    const state = await setAiPaused(prisma, body.paused, admin.email);
    logger.warn(state.paused ? "AI paused by admin" : "AI resumed by admin", { userId: admin.userId });
    return NextResponse.json(
      { paused: state.paused, updatedAt: state.updatedAt?.toISOString() ?? null, updatedBy: state.updatedBy },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (err) {
    logger.error("AI pause switch not saved", {
      userId: admin.userId,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Could not save the switch. Try again." }, { status: 500 });
  }
}
