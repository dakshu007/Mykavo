import { NextResponse } from "next/server";
import { prisma } from "@mykavo/database";
import { noStore, videoContext } from "@/lib/brand-video/api";

type Params = { params: Promise<{ jobId: string }> };

/** GET: one brand video job's status (polled while it runs). */
export async function GET(_request: Request, { params }: Params) {
  const gate = await videoContext({ mutate: false, bucket: "job", limit: 120 });
  if (!gate.ok) return gate.response;
  const { jobId } = await params;
  const job = await prisma.aiJob.findFirst({
    where: { id: jobId, workspaceId: gate.ctx.workspace.id, kind: { in: ["brand", "video-script", "video-render"] } },
    select: { id: true, kind: true, status: true, step: true, progress: true, error: true, resultId: true },
  });
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(job, { headers: noStore });
}
