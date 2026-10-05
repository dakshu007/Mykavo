import { isMissingTableError, prisma, type Prisma } from "@mykavo/database";
import { logger } from "@/lib/logger";
import type { ExtensionEvent } from "@/lib/integrations/extension-connect";

/**
 * Chrome extension acquisition funnel - recording. Fire-and-forget like the
 * rest of admin tracking: a failed write never fails the request it rides
 * on, and until the extension_install migration has run every write is
 * skipped quietly.
 */

let warnedMissing = false;

function swallow(err: unknown) {
  if (isMissingTableError(err)) {
    if (!warnedMissing) {
      warnedMissing = true;
      logger.warn("extension_install table missing - run migration 20261005090000_extension_install");
    }
    return;
  }
  logger.warn("extension tracking failed", { error: err instanceof Error ? err.message : String(err) });
}

const COUNTER: Partial<Record<ExtensionEvent, keyof Prisma.ExtensionInstallUpdateInput>> = {
  opened: "opens",
  page_checked: "pageChecks",
  monitor_clicked: "monitorClicks",
  dashboard_opened: "dashboardOpens",
  scan_triggered: "scansTriggered",
};

/** Count one anonymous event from the extension. */
export async function recordExtensionEvent(installId: string, event: ExtensionEvent, version: string | null) {
  const now = new Date();
  const counter = COUNTER[event];
  await prisma.extensionInstall
    .upsert({
      where: { id: installId },
      create: { id: installId, version, installedAt: now, lastSeenAt: now, ...(counter ? { [counter]: 1 } : {}) },
      update: {
        lastSeenAt: now,
        ...(version ? { version } : {}),
        ...(counter ? { [counter]: { increment: 1 } } : {}),
      },
    })
    .catch(swallow);
}

export type ExtensionMilestone =
  | { kind: "connect_started"; signedIn: boolean; userId?: string | null }
  | { kind: "signed_up"; userId: string }
  | { kind: "connected"; userId: string; existingUser: boolean };

/**
 * Record a step of the connect flow against an install. A milestone keeps
 * its FIRST time: retries and later sites don't move it.
 */
export async function recordExtensionMilestone(installId: string | null, m: ExtensionMilestone) {
  if (!installId) return;
  const now = new Date();
  try {
    const row = await prisma.extensionInstall.upsert({
      where: { id: installId },
      create: { id: installId, installedAt: now, lastSeenAt: now },
      update: { lastSeenAt: now },
      select: { connectStartedAt: true, authStartedAt: true, signedUpAt: true, connectedAt: true, userId: true },
    });
    const data: Prisma.ExtensionInstallUpdateInput = {};
    if (m.kind === "connect_started") {
      if (!row.connectStartedAt) data.connectStartedAt = now;
      if (!m.signedIn && !row.authStartedAt) data.authStartedAt = now;
    } else if (m.kind === "signed_up") {
      if (!row.signedUpAt) data.signedUpAt = now;
    } else if (!row.connectedAt) {
      data.connectedAt = now;
      data.existingUser = m.existingUser;
    }
    const userId = "userId" in m ? m.userId : null;
    if (userId && !row.userId) data.user = { connect: { id: userId } };
    if (Object.keys(data).length) await prisma.extensionInstall.update({ where: { id: installId }, data });
  } catch (err) {
    swallow(err);
  }
}
