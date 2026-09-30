/**
 * Per-person email engagement for the admin: who was sent what, who opened
 * and clicked, and whether they went on to add a website or pay. Pure - the
 * loaders in lib/email-engagement.ts fetch, this module only joins and
 * counts, so the numbers are unit-tested.
 */

export interface EngagementEmail {
  /** What it was: "Welcome", a flow's name, a campaign's name. */
  label: string;
  subject: string;
  sentAt: string | null;
  failed: boolean;
  /** null = the provider does not report opens for this email. */
  opened: boolean | null;
  clicked: boolean | null;
}

export interface PersonEngagement {
  userId: string;
  name: string;
  email: string;
  signedUpAt: string;
  plan: string;
  paid: boolean;
  websites: number;
  emails: EngagementEmail[];
}

export interface EngagementTotals {
  people: number;
  /** People sent at least one email. */
  reached: number;
  /** People who opened at least one. */
  openedPeople: number;
  /** People who clicked at least one. */
  clickedPeople: number;
  paidPeople: number;
  /** Paid among the people who opened something - the number that matters. */
  paidAfterOpening: number;
  emailsSent: number;
}

export interface EventLike {
  email: string;
  event: string;
  subject?: string;
  date: string;
}

export interface OpenState {
  delivered: boolean;
  opened: boolean;
  clicked: boolean;
}

const eventKey = (email: string, subject: string) => `${email.trim().toLowerCase()}\n${subject.trim()}`;

/**
 * Brevo's event log reduced to one state per (address, subject). Apple Mail
 * privacy "loadedByProxy" loads are deliberately NOT counted as opens: Apple
 * fetches every message whether or not a person ever looks at it.
 */
export function indexEvents(events: EventLike[]): Map<string, OpenState> {
  const index = new Map<string, OpenState>();
  for (const e of events) {
    if (!e.email || !e.subject) continue;
    const key = eventKey(e.email, e.subject);
    const state = index.get(key) ?? { delivered: false, opened: false, clicked: false };
    if (e.event === "delivered" || e.event === "requests") state.delivered = true;
    if (e.event === "opened" || e.event === "uniqueOpened") state.opened = true;
    if (e.event === "clicks" || e.event === "click") {
      state.clicked = true;
      state.opened = true; // a click implies the email was opened
    }
    index.set(key, state);
  }
  return index;
}

/** Open state for one sent email, or null when the provider logged nothing for it. */
export function openStateFor(index: Map<string, OpenState>, email: string, subject: string): OpenState | null {
  return index.get(eventKey(email, subject)) ?? null;
}

export function engagementTotals(people: PersonEngagement[]): EngagementTotals {
  let reached = 0;
  let openedPeople = 0;
  let clickedPeople = 0;
  let paidPeople = 0;
  let paidAfterOpening = 0;
  let emailsSent = 0;
  for (const p of people) {
    const sent = p.emails.filter((e) => !e.failed);
    emailsSent += sent.length;
    if (sent.length > 0) reached++;
    const opened = sent.some((e) => e.opened === true);
    if (opened) openedPeople++;
    if (sent.some((e) => e.clicked === true)) clickedPeople++;
    if (p.paid) paidPeople++;
    if (p.paid && opened) paidAfterOpening++;
  }
  return { people: people.length, reached, openedPeople, clickedPeople, paidPeople, paidAfterOpening, emailsSent };
}

/** Most engaged first: paid, then clicked, then opened, then newest signup. */
export function sortByEngagement(people: PersonEngagement[]): PersonEngagement[] {
  const score = (p: PersonEngagement) =>
    (p.paid ? 8 : 0) +
    (p.emails.some((e) => e.clicked) ? 4 : 0) +
    (p.emails.some((e) => e.opened) ? 2 : 0) +
    (p.emails.some((e) => !e.failed) ? 1 : 0);
  return [...people].sort((a, b) => score(b) - score(a) || b.signedUpAt.localeCompare(a.signedUpAt));
}
