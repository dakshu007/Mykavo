import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@mykavo/database";
import { clientKey, rateLimit } from "@/lib/security/rate-limit";

/** A thumbs up or down on one support answer. Set once; later votes are ignored. */

const bodySchema = z.object({
  id: z.string().min(1).max(40),
  helpful: z.boolean(),
});

export async function POST(request: Request) {
  const limit = rateLimit(`support-feedback:${clientKey(request)}`, { limit: 30, windowMs: 60_000 });
  if (!limit.allowed) return NextResponse.json({ ok: false }, { status: 429 });

  let input: z.infer<typeof bodySchema>;
  try {
    input = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  try {
    const { count } = await prisma.supportQuestion.updateMany({
      where: { id: input.id, helpful: null, createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      data: { helpful: input.helpful },
    });
    return NextResponse.json({ ok: count > 0 });
  } catch (err) {
    console.error("[support] could not record feedback", err instanceof Error ? err.message : err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
