import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma, setRollout, VIDEO_ROLLOUT_KEY } from "@mykavo/database";
import { adminRequest, readJson } from "@/lib/automations-api";
import { logger } from "@/lib/logger";

const body = z.object({
  mode: z.enum(["admins", "beta", "everyone"]),
  betaEmails: z.array(z.string().trim().max(254)).max(200),
});

/**
 * POST: who can use Brand Video (platform admins only). Admins
 * always can; "beta" adds a list of verified emails; "everyone" launches it.
 */
export async function POST(request: Request) {
  const admin = await adminRequest("video-rollout", 20);
  if (!admin.ok) return admin.response;
  const parsed = body.safeParse(await readJson(request));
  if (!parsed.success) return NextResponse.json({ error: "Choose a rollout and list emails one per line." }, { status: 400 });
  try {
    const saved = await setRollout(prisma, VIDEO_ROLLOUT_KEY, parsed.data, admin.email);
    logger.warn("Brand video rollout changed", { userId: admin.userId, mode: saved.mode, beta: saved.betaEmails.length });
    return NextResponse.json(
      { mode: saved.mode, betaEmails: saved.betaEmails, updatedAt: saved.updatedAt?.toISOString() ?? null, updatedBy: saved.updatedBy },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (err) {
    logger.error("AI rollout not saved", { userId: admin.userId, error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Could not save. Try again." }, { status: 500 });
  }
}
