import { isMissingTableError, prisma } from "@mykavo/database";
import { logger } from "@/lib/logger";

/**
 * The WordPress update history for one website: every update the MyKavo
 * plugin reported, on every plan, with the check it started or why none ran.
 */

export interface UpdateHistoryEntry {
  id: string;
  note: string;
  trigger: "manual" | "auto";
  itemCount: number;
  scanId: string | null;
  reason: string | null;
  createdAt: string;
}

export interface UpdateHistoryData {
  entries: UpdateHistoryEntry[];
  /** A live WordPress plugin connection that can report updates. */
  connected: boolean;
}

/** What the history says about the check after an update. */
export function checkStatus(entry: Pick<UpdateHistoryEntry, "scanId" | "reason">): {
  checked: boolean;
  label: string;
} {
  if (entry.scanId) return { checked: true, label: "Checked" };
  switch (entry.reason) {
    case "PLAN":
      return { checked: false, label: "Not checked - automatic checks after updates come with Pro" };
    case "NO_BASELINE":
      return { checked: false, label: "Not checked - the baseline was not ready yet" };
    case "NO_PAGES":
      return { checked: false, label: "Not checked - no pages are monitored" };
    case "QUOTA":
      return { checked: false, label: "Not checked - today's scan limit was reached" };
    default:
      return { checked: false, label: "Not checked - the check could not start" };
  }
}

export async function loadUpdateHistory(websiteId: string, take = 8): Promise<UpdateHistoryData> {
  const [rows, connection] = await Promise.all([
    prisma.siteUpdateEvent
      .findMany({
        where: { websiteId },
        orderBy: { createdAt: "desc" },
        take,
        select: { id: true, note: true, trigger: true, items: true, scanId: true, reason: true, createdAt: true },
      })
      .catch((err: unknown) => {
        if (!isMissingTableError(err)) logger.error("could not load update history", { websiteId }, err);
        return [];
      }),
    prisma.siteConnection.findFirst({
      where: { websiteId, platform: "wordpress", connectedAt: { not: null }, revokedAt: null },
      select: { id: true },
    }),
  ]);
  return {
    connected: connection !== null,
    entries: rows.map((r) => ({
      id: r.id,
      note: r.note,
      trigger: r.trigger === "auto" ? "auto" : "manual",
      itemCount: Array.isArray(r.items) ? r.items.length : 1,
      scanId: r.scanId,
      reason: r.reason,
      createdAt: r.createdAt.toISOString(),
    })),
  };
}
