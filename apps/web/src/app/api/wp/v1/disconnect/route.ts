import { NextResponse } from "next/server";
import { prisma } from "@mykavo/database";
import { authenticateSiteRequest, unauthorizedSite } from "@/lib/integrations/site-auth";
import { logger } from "@/lib/logger";

/** The plugin's Disconnect button: revoke this site's own token. */
export async function POST(request: Request) {
  const ctx = await authenticateSiteRequest(request);
  if (!ctx) return unauthorizedSite();
  await prisma.siteConnection.update({
    where: { id: ctx.connectionId },
    data: { revokedAt: new Date() },
  });
  logger.info("wordpress connection disconnected from plugin", {
    workspaceId: ctx.workspaceId,
    connectionId: ctx.connectionId,
  });
  return NextResponse.json({ ok: true });
}
