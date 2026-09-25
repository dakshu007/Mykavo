import { prisma } from "@mykavo/database";
import { EMAIL_ALERTS_ON_BY_DEFAULT } from "@mykavo/shared";

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
  const channel = await prisma.notificationChannel.findUnique({
    where: { workspaceId_type: { workspaceId, type: "EMAIL" } },
  });

  if (!channel) {
    // Nobody has chosen yet: alerts are on by default and go to the owner.
    // The switch shows exactly that, so the dashboard and the worker (same
    // shared rule) never disagree about what this workspace receives.
    return {
      recipients: [ownerEmail],
      minSeverity: "HIGH",
      failureAlerts: true,
      weeklyReports: true,
      enabled: EMAIL_ALERTS_ON_BY_DEFAULT,
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
