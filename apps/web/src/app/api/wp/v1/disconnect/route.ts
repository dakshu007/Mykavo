import { NextResponse } from "next/server";
import { prisma } from "@mykavo/database";
import { authenticateSiteRequest, unauthorizedSite } from "@/lib/integrations/site-auth";
import { logger } from "@/lib/logger";

/** Disconnect from the plugin or the Shopify app: revoke this site's own connection. */
export async function POST(request: Request) {
  const ctx = await authenticateSiteRequest(request);
  if (!ctx) return unauthorizedSite();
  await prisma.siteConnection.update({
    where: { id: ctx.connectionId },
    data: { revokedAt: new Date() },
  });
  logger.info("site connection disconnected from the site", {
    platform: ctx.platform,
    workspaceId: ctx.workspaceId,
    connectionId: ctx.connectionId,
  });
  return NextResponse.json({ ok: true });
}
