import { NextResponse } from "next/server";
import { getOwnedWebsite } from "@/lib/api-auth";
import { loadAgentPage } from "@/lib/keywords/agent-data";
import { agentContext } from "@/lib/keywords/api";

type Params = { params: Promise<{ websiteId: string }> };

/**
 * GET: one website's AI Writer - profile, latest jobs, keyword ideas, posts
 * (with their WordPress draft state) and the allowance with its upgrade offer.
 * The same loader as the web page, so the two never disagree.
 */
export async function GET(_request: Request, { params }: Params) {
  const gate = await agentContext({ mutate: false, bucket: "mobile-site", limit: 40 });
  if (!gate.ok) return gate.response;
  const { websiteId } = await params;
  const website = await getOwnedWebsite(gate.ctx, websiteId);
  if (!website) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data = await loadAgentPage(gate.ctx.workspace.id, website.id);
  return NextResponse.json(
    { website: { id: website.id, name: website.name, url: website.url }, ...data },
    { headers: { "cache-control": "no-store" } },
  );
}
