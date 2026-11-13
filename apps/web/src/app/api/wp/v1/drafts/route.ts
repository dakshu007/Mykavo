import { NextResponse } from "next/server";
import { prisma } from "@mykavo/database";
import { authenticateSiteRequest, unauthorizedSite } from "@/lib/integrations/site-auth";
import { queuedDraftsFor } from "@/lib/integrations/wp-drafts";

/**
 * GET: the AI Keywords posts queued for this site's WordPress. The MyKavo
 * plugin asks when someone opens WP Admin and every 15 minutes, creates a
 * draft for each, then reports back to /drafts/[id]. Nothing queued is the
 * common answer, so it is one indexed count first and nothing else.
 */
export async function GET(request: Request) {
  const ctx = await authenticateSiteRequest(request, { automated: true });
  if (!ctx || ctx.platform !== "wordpress") return unauthorizedSite();

  const waiting = await prisma.wpDraft.count({ where: { websiteId: ctx.website.id, status: "queued" } });
  const drafts = waiting > 0 ? await queuedDraftsFor(ctx.website.id) : [];
  // The queuedAt of each row goes back with the result, so a draft queued
  // again while this one was on its way is not marked done by the old copy.
  const tokens =
    drafts.length > 0
      ? await prisma.wpDraft.findMany({
          where: { id: { in: drafts.map((d) => d.id) } },
          select: { id: true, queuedAt: true },
        })
      : [];
  const tokenOf = new Map(tokens.map((t) => [t.id, t.queuedAt.toISOString()]));
  return NextResponse.json(
    { drafts: drafts.map((d) => ({ ...d, token: tokenOf.get(d.id) ?? "" })) },
    { headers: { "cache-control": "no-store" } },
  );
}
