import { NextResponse } from "next/server";
import { prisma } from "@mykavo/database";
import { agentContext } from "@/lib/keywords/api";

type Params = { params: Promise<{ jobId: string }> };

/**
 * GET: one job's progress. The page polls this while a job runs, so it reads
 * one tiny row and nothing else (Supabase egress).
 */
export async function GET(_request: Request, { params }: Params) {
  const gate = await agentContext({ mutate: false, bucket: "poll", limit: 60 });
  if (!gate.ok) return gate.response;
  const { jobId } = await params;
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(jobId)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const job = await prisma.aiJob.findFirst({
    where: { id: jobId, workspaceId: gate.ctx.workspace.id },
    select: { status: true, step: true, progress: true, error: true, resultId: true, kind: true },
  });
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(job, { headers: { "cache-control": "no-store" } });
}
