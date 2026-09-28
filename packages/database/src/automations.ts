/**
 * Admin > Automations persistence: the saved settings of each automated
 * email, and the log of which automation sent which Notification.
 *
 * Both tables are optional at runtime. Until their migration is applied the
 * loader reports `ready: false`, and callers fall back to the shipped wording
 * and to matching sent emails on their default subjects - which is exactly
 * how the emails were de-duplicated before these tables existed.
 */

import { Prisma, type EmailAutomation, type PrismaClient } from "@prisma/client";

type Db = PrismaClient | Prisma.TransactionClient;

/** Prisma's "table does not exist" - the migration has not been applied. */
export function isMissingTableError(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2021";
}

/**
 * Saved automation settings. Any error other than a missing table is
 * thrown: falling back to defaults on a database blip could send an email
 * an operator switched off.
 */
export async function loadAutomationRows(db: Db): Promise<{ ready: boolean; rows: EmailAutomation[] }> {
  try {
    const [rows] = await Promise.all([
      db.emailAutomation.findMany(),
      db.emailAutomationSend.findFirst({ select: { id: true } }),
    ]);
    return { ready: true, rows };
  } catch (err) {
    if (isMissingTableError(err)) return { ready: false, rows: [] };
    throw err;
  }
}

export type LegacySubject = { exact: string } | { prefix: string };

/**
 * Notifications that one automation sent (status not included): recorded in
 * the send log, or - for emails sent before the log existed - carrying the
 * automation's original subject. Test sends never count.
 */
export function automationSentWhere(key: string, legacy: LegacySubject, ready: boolean): Prisma.NotificationWhereInput {
  const bySubject: Prisma.NotificationWhereInput =
    "exact" in legacy ? { subject: legacy.exact } : { subject: { startsWith: legacy.prefix } };
  if (!ready) return bySubject;
  return { OR: [bySubject, { automationSend: { is: { automationKey: key, isTest: false } } }] };
}

/** Log that a Notification was sent by an automation. No-op before the migration. */
export async function recordAutomationSend(
  db: Db,
  input: { notificationId: string; automationKey: string; isTest?: boolean },
  ready: boolean,
): Promise<void> {
  if (!ready) return;
  await db.emailAutomationSend.create({
    data: { notificationId: input.notificationId, automationKey: input.automationKey, isTest: input.isTest ?? false },
  });
}
