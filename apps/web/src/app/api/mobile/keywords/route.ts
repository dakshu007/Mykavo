import { NextResponse } from "next/server";
import { prisma } from "@mykavo/database";
import { agentContext } from "@/lib/keywords/api";
import { loadAllowance, remaining } from "@/lib/keywords/jobs";

/**
 * GET: the phone's AI Writer home - every website with where it stands, and
 * the workspace's post and report allowance. Counts only; no post bodies.
 * 404 when the AI Writer is not open to this account (same gate as the web).
 */
export async function GET() {
  const gate = await agentContext({ mutate: false, bucket: "mobile-list", limit: 30 });
  if (!gate.ok) return gate.response;
  const workspaceId = gate.ctx.workspace.id;

  const [websites, allowance, writing] = await Promise.all([
    prisma.website.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        url: true,
        contentProfile: { select: { confirmed: true } },
        gscConnection: { select: { property: true } },
        siteConnections: { where: { platform: "wordpress", revokedAt: null, connectedAt: { not: null } }, select: { id: true }, take: 1 },
        _count: { select: { contentPosts: true } },
        keywordReports: { orderBy: { createdAt: "desc" }, take: 1, select: { _count: { select: { opportunities: true } } } },
      },
    }),
    loadAllowance(workspaceId),
    prisma.aiJob.count({ where: { workspaceId, status: { in: ["queued", "running"] } } }),
  ]);

  const left = (kind: "report" | "post") => {
    const n = remaining(allowance, kind);
    return Number.isFinite(n) ? n : null;
  };

  return NextResponse.json(
    {
      websites: websites.map((w) => ({
        id: w.id,
        name: w.name,
        url: w.url,
        ready: w.contentProfile?.confirmed === true,
        searchConsole: Boolean(w.gscConnection?.property),
        wordpress: w.siteConnections.length > 0,
        posts: w._count.contentPosts,
        ideas: w.keywordReports[0]?._count.opportunities ?? 0,
      })),
      writing,
      allowance: {
        postsLeft: left("post"),
        reportsLeft: left("report"),
        postsLimit: allowance.limits.posts,
        reportsLimit: allowance.limits.reports,
        refillsOn: allowance.period.end.toLocaleDateString("en-US", { month: "long", day: "numeric" }),
        blocked: allowance.blocked,
      },
    },
    { headers: { "cache-control": "no-store" } },
  );
}
