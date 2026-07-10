import { prisma } from "@fluxen/database";

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
    return {
      recipients: [ownerEmail],
      minSeverity: "HIGH",
      failureAlerts: true,
      weeklyReports: true,
      enabled: true,
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
