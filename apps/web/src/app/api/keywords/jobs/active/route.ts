import { NextResponse } from "next/server";
import { prisma } from "@mykavo/database";
import { agentContext } from "@/lib/keywords/api";

/** Jobs worth an alert when they finish: a post being written, a keyword report. */
const WATCHED_KINDS = ["write", "deep"];
/** A job older than this that is still "running" is stuck, not worth watching. */
const MAX_AGE_MS = 2 * 60 * 60 * 1000;
const ID = /^[A-Za-z0-9_-]{1,64}$/;

function keywordOf(input: unknown): string | null {
  if (input && typeof input === "object" && typeof (input as { keyword?: unknown }).keyword === "string") {
    return (input as { keyword: string }).keyword.slice(0, 120);
  }
  return null;
}

/**
 * GET: the dashboard-wide watcher (components/keywords/ai-job-watcher.tsx).
 * Returns this workspace's running post and report jobs, and the final state
 * of the jobs it was already watching (`?ids=a,b`), so it can say "your post
 * is ready" on whatever dashboard page the person is on. Small rows only.
 */
export async function GET(request: Request) {
  const gate = await agentContext({ mutate: false, bucket: "watch", limit: 30 });
  if (!gate.ok) return gate.response;
  const workspaceId = gate.ctx.workspace.id;
  const ids = (new URL(request.url).searchParams.get("ids") ?? "")
    .split(",")
    .filter((id) => ID.test(id))
    .slice(0, 10);

  const select = {
    id: true,
    kind: true,
    status: true,
    websiteId: true,
    resultId: true,
    error: true,
    input: true,
    website: { select: { name: true } },
  } as const;
  const [active, finished] = await Promise.all([
    prisma.aiJob.findMany({
      where: {
        workspaceId,
        kind: { in: WATCHED_KINDS },
        status: { in: ["queued", "running"] },
        createdAt: { gte: new Date(Date.now() - MAX_AGE_MS) },
      },
      select,
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    ids.length
      ? prisma.aiJob.findMany({ where: { workspaceId, id: { in: ids }, status: { in: ["done", "failed"] } }, select })
      : Promise.resolve([]),
  ]);

  const shape = (j: (typeof active)[number]) => ({
    id: j.id,
    kind: j.kind,
    status: j.status,
    websiteId: j.websiteId,
    websiteName: j.website.name,
    resultId: j.resultId,
    keyword: keywordOf(j.input),
    error: j.status === "failed" ? j.error : null,
  });
  return NextResponse.json(
    { active: active.map(shape), finished: finished.map(shape) },
    { headers: { "cache-control": "no-store" } },
  );
}
