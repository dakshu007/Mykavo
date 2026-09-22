import { prisma } from "@mykavo/database";

/**
 * Has this workspace's first-run loop completed?
 *
 * One definition of "monitoring is actually live", used by the dashboard
 * navigation (to reveal the "Deeper analysis" group) and matching the
 * condition the getting-started checklist's `run-baseline` step uses. If the
 * sidebar and the checklist disagreed about this, a user would be told they
 * were still setting up while looking at tools that only appear afterwards.
 *
 * A finished scan OR an active baseline counts, for the same reason the
 * checklist accepts either: a baseline scan that completed leaves both, but a
 * workspace restored from a partial state may have one without the other.
 *
 * Two indexed existence checks, run for every dashboard page render, so both
 * are `findFirst` selecting nothing but the id - never a count.
 */
export async function isMonitoringLive(workspaceId: string): Promise<boolean> {
  const [scan, baseline] = await Promise.all([
    prisma.scan.findFirst({
      where: { website: { workspaceId }, status: { in: ["COMPLETED", "PARTIAL"] } },
      select: { id: true },
    }),
    prisma.baseline.findFirst({
      where: { website: { workspaceId }, status: "ACTIVE" },
      select: { id: true },
    }),
  ]);
  return scan !== null || baseline !== null;
}
