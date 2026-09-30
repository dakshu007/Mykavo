import { isMissingTableError, prisma } from "@mykavo/database";
import { logger } from "@/lib/logger";
import { summarizeVisits, type VisitSummary } from "./ai-crawler-visits-core";

export interface AiCrawlerPanelData {
  summary: VisitSummary;
  /** The website's WordPress connection, if any: where the counts come from. */
  wordpress: { pluginVersion: string | null; connectedAt: string | null } | null;
}

/**
 * AI crawler visits for one website over the last `days` days. Callers must
 * have already checked the website belongs to the viewer's workspace.
 *
 * Tolerant of the ai_crawler_visit migration not having run yet: the panel
 * then shows the empty state rather than taking the page down.
 */
export async function loadAiCrawlerVisits(websiteId: string, days = 30): Promise<AiCrawlerPanelData> {
  const since = new Date(Date.now() - days * 86_400_000);
  const [rows, connection] = await Promise.all([
    prisma.aiCrawlerVisit
      .findMany({
        where: { websiteId, day: { gte: since } },
        select: { day: true, agent: true, hits: true, errors: true, topPaths: true },
      })
      .catch((err: unknown) => {
        if (!isMissingTableError(err)) logger.error("could not load AI crawler visits", { websiteId }, err);
        return [];
      }),
    prisma.siteConnection
      .findFirst({
        where: { websiteId, platform: "wordpress", connectedAt: { not: null }, revokedAt: null },
        orderBy: { connectedAt: "desc" },
        select: { pluginVersion: true, connectedAt: true },
      })
      .catch(() => null),
  ]);
  return {
    summary: summarizeVisits(rows, days),
    wordpress: connection
      ? { pluginVersion: connection.pluginVersion, connectedAt: connection.connectedAt?.toISOString() ?? null }
      : null,
  };
}
