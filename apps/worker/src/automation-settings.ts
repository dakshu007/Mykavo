/**
 * Admin > Automations, as the worker reads it: which automated emails are
 * switched on, their saved wording and timing, and how to tell whether one
 * was already sent. Loaded once per sweep or job.
 *
 * Before the email_automation migration is applied, `ready` is false: every
 * email uses its shipped wording and is de-duplicated on its original
 * subject, exactly as before.
 */

import { automationSentWhere, loadAutomationRows, prisma, type Prisma } from "@mykavo/database";
import { AUTOMATIONS, settingsFromRows, type AutomationKey, type AutomationSettings } from "@mykavo/email";

export interface Automations {
  ready: boolean;
  settings: Record<AutomationKey, AutomationSettings>;
}

export async function loadAutomations(): Promise<Automations> {
  const { ready, rows } = await loadAutomationRows(prisma);
  return { ready, settings: settingsFromRows(rows) };
}

/** Notifications this automation already produced (add `status: "SENT"`). */
export function sentBy(key: AutomationKey, a: Automations): Prisma.NotificationWhereInput {
  return automationSentWhere(key, AUTOMATIONS[key].legacySubject, a.ready);
}
