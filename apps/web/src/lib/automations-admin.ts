import { automationSentWhere, loadAutomationRows, prisma } from "@mykavo/database";
import {
  AUTOMATIONS,
  AUTOMATION_KEYS,
  DEFAULT_OFFER,
  renderAutomation,
  sampleAutomationData,
  sendDay,
  settingsFromRows,
  type AutomationKey,
  type AutomationMeta,
  type AutomationSettings,
} from "@mykavo/email";
import { env } from "@/lib/env";

/**
 * Admin > Automations, server side: the saved settings of every automated
 * email with its send numbers, and the preview renderer. Callers check
 * isPlatformAdmin first; nothing here does.
 *
 * `ready` is false until the email_automation migration is applied. The
 * page then still shows every email and its numbers (matched on original
 * subjects), but editing is off - there is nowhere to save to.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

export const appBase = (env.APP_URL ?? "https://mykavo.app").replace(/\/+$/, "");

export interface AutomationStats {
  sent7d: number;
  sent30d: number;
  failed30d: number;
  lastSentAt: string | null;
}

export interface AutomationSummary {
  meta: AutomationMeta;
  settings: AutomationSettings;
  /** Any wording, timing or offer differs from what shipped. */
  customised: boolean;
  /** Resolved values shown on the card. */
  sendOnDay: number | null;
  offer: { code: string; percent: number } | null;
  stats: AutomationStats;
}

export interface AutomationsOverview {
  ready: boolean;
  automations: AutomationSummary[];
  unsubscribes: { total: number; last30d: number } | null;
}

export async function loadSettings(): Promise<{ ready: boolean; settings: Record<AutomationKey, AutomationSettings> }> {
  const { ready, rows } = await loadAutomationRows(prisma);
  return { ready, settings: settingsFromRows(rows) };
}

export function isCustomised(s: AutomationSettings): boolean {
  return Boolean(s.copy.subject || s.copy.heading || s.copy.intro || s.copy.buttonLabel || s.sendOnDay !== null || s.offerCode || s.offerPercent !== null);
}

/** The day after signup a lifecycle step goes out; "finish setup" shares day 3's. */
export function resolvedDay(key: AutomationKey, all: Record<AutomationKey, AutomationSettings>): number | null {
  if (key === "day3_stats" || key === "day3_setup") return sendDay("day3_stats", all.day3_stats);
  if (key === "day6_android" || key === "day10_offer") return sendDay(key, all[key]);
  return null;
}

async function statsFor(key: AutomationKey, ready: boolean): Promise<AutomationStats> {
  const now = Date.now();
  const sentBy = { channelType: "EMAIL" as const, ...automationSentWhere(key, AUTOMATIONS[key].legacySubject, ready) };
  const [sent7d, sent30d, failed30d, last] = await Promise.all([
    prisma.notification.count({ where: { ...sentBy, status: "SENT", sentAt: { gte: new Date(now - 7 * DAY_MS) } } }),
    prisma.notification.count({ where: { ...sentBy, status: "SENT", sentAt: { gte: new Date(now - 30 * DAY_MS) } } }),
    prisma.notification.count({ where: { ...sentBy, status: "FAILED", createdAt: { gte: new Date(now - 30 * DAY_MS) } } }),
    prisma.notification.findFirst({ where: { ...sentBy, status: "SENT" }, orderBy: { sentAt: "desc" }, select: { sentAt: true } }),
  ]);
  return { sent7d, sent30d, failed30d, lastSentAt: last?.sentAt?.toISOString() ?? null };
}

async function unsubscribeCounts(): Promise<AutomationsOverview["unsubscribes"]> {
  try {
    const [total, last30d] = await Promise.all([
      prisma.emailOptOut.count(),
      prisma.emailOptOut.count({ where: { createdAt: { gte: new Date(Date.now() - 30 * DAY_MS) } } }),
    ]);
    return { total, last30d };
  } catch {
    // email_opt_out not migrated yet.
    return null;
  }
}

export async function getAutomationsOverview(): Promise<AutomationsOverview> {
  const { ready, settings } = await loadSettings();
  const [stats, unsubscribes] = await Promise.all([
    Promise.all(AUTOMATION_KEYS.map((k) => statsFor(k, ready))),
    unsubscribeCounts(),
  ]);
  return {
    ready,
    unsubscribes,
    automations: AUTOMATION_KEYS.map((key, i) => ({
      meta: AUTOMATIONS[key],
      settings: settings[key],
      customised: isCustomised(settings[key]),
      sendOnDay: resolvedDay(key, settings),
      offer: AUTOMATIONS[key].offer
        ? { code: settings[key].offerCode ?? DEFAULT_OFFER.code, percent: settings[key].offerPercent ?? DEFAULT_OFFER.percent }
        : null,
      stats: stats[i],
    })),
  };
}

/** Render one automation with sample data, as a given (possibly unsaved) setting. */
export function renderPreview(
  key: AutomationKey,
  all: Record<AutomationKey, AutomationSettings>,
  draft: AutomationSettings,
  name: string,
): { subject: string; html: string; text: string } {
  return renderAutomation(sampleAutomationData(key, appBase, name), { ...all, [key]: draft });
}

/** The row to upsert for validated settings. */
export function settingsToRow(s: AutomationSettings, updatedByEmail: string) {
  return {
    enabled: s.enabled,
    subject: s.copy.subject ?? null,
    heading: s.copy.heading ?? null,
    intro: s.copy.intro ?? null,
    buttonLabel: s.copy.buttonLabel ?? null,
    sendOnDay: s.sendOnDay,
    offerCode: s.offerCode,
    offerPercent: s.offerPercent,
    updatedByEmail,
  };
}
