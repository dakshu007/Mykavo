import { prisma } from "@mykavo/database";
import { emailIsGrandfathered } from "@mykavo/shared";

/**
 * Effective email notification settings for a workspace. Mirrors the worker's
 * resolution: an explicit EMAIL channel, or a default derived from the owner.
 */
export interface EmailSettings {
  recipients: string[];
  minSeverity: "MEDIUM" | "HIGH" | "CRITICAL";
  failureAlerts: boolean;
  /** Weekly client-ready summary per website (Mondays). Defaults to true. */
  weeklyReports: boolean;
  enabled: boolean;
  /** True when saved explicitly; false when these are inherited defaults. */
  configured: boolean;
}

export async function getEmailSettings(
  workspaceId: string,
  ownerEmail: string,
): Promise<EmailSettings> {
  const [channel, workspace] = await Promise.all([
    prisma.notificationChannel.findUnique({
      where: { workspaceId_type: { workspaceId, type: "EMAIL" } },
    }),
    prisma.workspace.findUnique({ where: { id: workspaceId }, select: { createdAt: true } }),
  ]);

  if (!channel) {
    // OPT-IN for anything new: no email until somebody turns it on, with the
    // owner's address pre-filled so that is one toggle away. Mailing people
    // who never asked is how a monitoring product trains its own customers to
    // filter it into a folder they stop reading.
    //
    // Workspaces that predate the rule keep what they already had, and the
    // switch shows ON to match - a dashboard claiming alerts are off while
    // the worker is still sending them is worse than either state alone.
    // Mirrors emailIsGrandfathered in the worker; same shared rule.
    const grandfathered = emailIsGrandfathered(workspace?.createdAt);
    return {
      recipients: [ownerEmail],
      minSeverity: "HIGH",
      failureAlerts: true,
      weeklyReports: true,
      enabled: grandfathered,
      configured: false,
    };
  }

  const cfg = (channel.configuration ?? {}) as Partial<EmailSettings>;
  return {
    recipients: Array.isArray(cfg.recipients) && cfg.recipients.length > 0 ? cfg.recipients : [ownerEmail],
    minSeverity: cfg.minSeverity ?? "HIGH",
    failureAlerts: cfg.failureAlerts ?? true,
    weeklyReports: cfg.weeklyReports ?? true,
    enabled: channel.enabled,
    configured: true,
  };
}
