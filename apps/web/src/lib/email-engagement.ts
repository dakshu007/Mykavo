import {
  isMissingTableError,
  loadMarketingContacts,
  prisma,
  type MarketingContact,
} from "@mykavo/database";
import {
  AUTOMATIONS,
  brevo,
  brevoConfigured,
  brevoContactCampaignStats,
  brevoEmailEvents,
  isAutomationKey,
} from "@mykavo/email";
import { logger } from "@/lib/logger";
import {
  indexEvents,
  openStateFor,
  sortByEngagement,
  type PersonEngagement,
} from "./engagement-core";

/**
 * Loaders for the admin's per-person engagement reports (Automations and
 * Email marketing). Real users only: loadMarketingContacts already leaves out
 * the team's own accounts (isInternalEmail).
 *
 * Opens and clicks come from Brevo, which is what sends the optional emails
 * and the campaigns. The welcome email and other must-reach emails go
 * through Resend, which reports no opens here, so those show as "sent" with
 * the open state unknown rather than guessed.
 */

export interface EngagementReport {
  people: PersonEngagement[];
  /** Why open data is missing or partial, in words; null when complete. */
  notice: string | null;
}

/** Brevo keeps transactional events for this long; older opens are unknowable. */
const EVENT_DAYS = 90;

function displayName(c: MarketingContact): string {
  return [c.firstName, c.lastName].filter(Boolean).join(" ") || c.email.split("@")[0];
}

function basePerson(c: MarketingContact): PersonEngagement {
  return {
    userId: c.userId,
    name: displayName(c),
    email: c.email,
    signedUpAt: c.signedUpAt.toISOString(),
    plan: c.plan,
    paid: c.paid,
    websites: c.websites,
    emails: [],
  };
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      for (;;) {
        const i = next++;
        if (i >= items.length) return;
        out[i] = await fn(items[i]);
      }
    }),
  );
  return out;
}

/** Every automation email (welcome, lifecycle series, Automation Tool flows) each real user was sent. */
export async function loadAutomationEngagement(): Promise<EngagementReport> {
  const contacts = await loadMarketingContacts(prisma, null);
  const byEmail = new Map(contacts.map((c) => [c.email, basePerson(c)]));

  let notice: string | null = null;
  const [sends, flows] = await Promise.all([
    prisma.emailAutomationSend
      .findMany({
        where: { isTest: false },
        orderBy: { createdAt: "desc" },
        take: 5000,
        select: {
          automationKey: true,
          notification: { select: { recipient: true, subject: true, sentAt: true, status: true } },
        },
      })
      .catch((err: unknown) => {
        if (isMissingTableError(err)) return [];
        throw err;
      }),
    prisma.automationFlow.findMany({ select: { id: true, name: true } }).catch(() => []),
  ]);
  const flowNames = new Map(flows.map((f) => [f.id, f.name]));

  let events: Awaited<ReturnType<typeof brevoEmailEvents>> = [];
  if (brevoConfigured()) {
    try {
      events = await brevoEmailEvents({ days: EVENT_DAYS });
    } catch (err) {
      logger.warn("could not load Brevo email events", { error: err instanceof Error ? err.message : String(err) });
      notice = "Brevo did not answer, so opens and clicks are not shown right now.";
    }
  } else {
    notice = "Brevo is not configured, so opens and clicks are not tracked.";
  }
  const index = indexEvents(events);

  for (const s of sends) {
    const person = byEmail.get(s.notification.recipient.trim().toLowerCase());
    if (!person) continue; // a deleted account or the team's own
    const key = s.automationKey;
    const label = isAutomationKey(key)
      ? AUTOMATIONS[key].name
      : key.startsWith("flow:")
        ? (flowNames.get(key.split(":")[1] ?? "") ?? "Flow email")
        : key;
    const state = openStateFor(index, person.email, s.notification.subject ?? "");
    person.emails.push({
      label,
      subject: s.notification.subject ?? "",
      sentAt: s.notification.sentAt?.toISOString() ?? null,
      failed: s.notification.status === "FAILED",
      opened: state ? state.opened : null,
      clicked: state ? state.clicked : null,
    });
  }

  return { people: sortByEngagement([...byEmail.values()]), notice };
}

/** Which Brevo campaigns each real user was sent, opened and clicked. */
export async function loadCampaignEngagement(): Promise<EngagementReport> {
  const contacts = await loadMarketingContacts(prisma, null);
  const people = contacts.map(basePerson);
  if (!brevoConfigured()) {
    return { people: sortByEngagement(people), notice: "Brevo is not configured, so campaign activity is not available." };
  }

  let notice: string | null = null;
  const names = new Map<number, { name: string; subject: string }>();
  try {
    const data = await brevo<{ campaigns?: { id: number; name: string; subject?: string }[] }>("/emailCampaigns", {
      query: { limit: 100, sort: "desc", excludeHtmlContent: true },
    });
    for (const c of data.campaigns ?? []) names.set(c.id, { name: c.name, subject: c.subject ?? "" });
  } catch (err) {
    logger.warn("could not list Brevo campaigns", { error: err instanceof Error ? err.message : String(err) });
  }

  let failures = 0;
  await mapLimit(people.slice(0, 300), 5, async (p) => {
    try {
      const stats = await brevoContactCampaignStats(p.email);
      if (!stats) return;
      const opened = new Set(stats.opened.map((o) => o.campaignId));
      const clicked = new Set(stats.clicked.map((c) => c.campaignId));
      for (const s of stats.sent) {
        const meta = names.get(s.campaignId);
        p.emails.push({
          label: meta?.name ?? `Campaign ${s.campaignId}`,
          subject: meta?.subject ?? "",
          sentAt: s.at,
          failed: false,
          opened: opened.has(s.campaignId) || clicked.has(s.campaignId),
          clicked: clicked.has(s.campaignId),
        });
      }
    } catch {
      failures++;
    }
  });
  if (failures > 0) notice = `Brevo did not answer for ${failures} ${failures === 1 ? "person" : "people"}; their campaigns are missing below.`;

  return { people: sortByEngagement(people), notice };
}
