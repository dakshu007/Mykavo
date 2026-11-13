import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@mykavo/database";
import { writeJobInput } from "@mykavo/keyword-agent/pure";
import { getOwnedWebsite } from "@/lib/api-auth";
import { agentContext, readBody } from "@/lib/keywords/api";
import { startAgentJob } from "@/lib/keywords/jobs";
import { logger } from "@/lib/logger";

type Params = { params: Promise<{ websiteId: string }> };

const body = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("setup") }),
  z.object({ kind: z.literal("deep") }),
  z.object({ kind: z.literal("write") }).extend(writeJobInput.shape),
]);

/** POST: start an AI Keyword Agent job (setup, deep analysis or a post). */
export async function POST(request: Request, { params }: Params) {
  const gate = await agentContext({ mutate: true, bucket: "jobs", limit: 10 });
  if (!gate.ok) return gate.response;
  const { websiteId } = await params;
  const website = await getOwnedWebsite(gate.ctx, websiteId);
  if (!website) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = body.safeParse(await readBody(request));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const req = parsed.data;

  if (req.kind === "write" && req.postId) {
    // A rewrite must target a post of this same website.
    const post = await prisma.contentPost.findFirst({
      where: { id: req.postId, websiteId: website.id, workspaceId: gate.ctx.workspace.id },
      select: { id: true },
    });
    if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const result = await startAgentJob({
      workspaceId: gate.ctx.workspace.id,
      websiteId: website.id,
      userId: gate.ctx.userId,
      kind: req.kind,
      input: req.kind === "write" ? { keyword: req.keyword, notes: req.notes, postId: req.postId } : undefined,
    });
    if (!result.ok) return NextResponse.json({ error: result.error, code: result.code }, { status: result.status });
    return NextResponse.json({ jobId: result.jobId, reused: result.reused }, { status: result.reused ? 200 : 202 });
  } catch (err) {
    logger.error("ai agent job start failed", {
      websiteId: website.id,
      workspaceId: gate.ctx.workspace.id,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
