import { prisma, getLatestHealthCheck, getUptimeStats } from "@fluxen/database";
import { renderStatusBadge, type BadgeStatus } from "@/lib/status-badge";

/**
 * Public embeddable uptime badge (no auth — the opaque publicToken is the
 * only identifier; website ids are never exposed). Returns a shields-style
 * SVG: green "up · 99.9%" (7-day uptime), red "down", gray "unknown".
 */

type Params = { params: Promise<{ token: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { token } = await params;

  const website = await prisma.website.findFirst({
    where: { publicToken: token, badgeEnabled: true },
    select: { id: true },
  });
  if (!website) return new Response("Not found", { status: 404 });

  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [latest, uptime] = await Promise.all([
    getLatestHealthCheck(prisma, website.id),
    getUptimeStats(prisma, { websiteId: website.id, since: since7d }),
  ]);

  const status: BadgeStatus = latest === null ? "unknown" : latest.up ? "up" : "down";
  const svg = renderStatusBadge({ status, uptimePercent: uptime.uptimePercent });

  return new Response(svg, {
    headers: {
      "content-type": "image/svg+xml",
      "cache-control": "public, max-age=300",
    },
  });
}
