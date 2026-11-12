import { brevoConfigured, brevoEmailEvents, type BrevoCampaign, type BrevoEmailEvent } from "@mykavo/email";

/**
 * Admin > Email marketing: every promotional email MyKavo sent through
 * Brevo, as one log. Campaigns come with Brevo's own totals; everything sent
 * through the transactional API (the lifecycle series, Automation Tool
 * flows, product updates and one-off template sends) is rebuilt from Brevo's
 * event log, one row per send and one line per person.
 *
 * buildSentLog is pure, so the grouping is tested without Brevo.
 */

export type SendKind = "campaign" | "lifecycle" | "flow" | "product-update" | "automated" | "direct";

/** Where one email to one person got to. Problems outrank engagement. */
export type DeliveryState = "spam" | "bounced" | "blocked" | "clicked" | "opened" | "delivered" | "sent";

export interface SentRecipient {
  email: string;
  at: string;
  state: DeliveryState;
  unsubscribed: boolean;
}

export interface SentGroup {
  id: string;
  kind: SendKind;
  /** What the send was: a campaign name, a subject, or a one-off send's tag. */
  title: string;
  /** The subject line, when the title is something else. */
  subject: string | null;
  /** Other subject lines in the same send (personalised one-offs). */
  moreSubjects: number;
  /** Latest send, or for unsent campaigns the scheduled or created time. */
  at: string | null;
  /** Campaigns only: draft, queued, sent... */
  status: string | null;
  campaignId: number | null;
  recipients: number;
  delivered: number;
  opened: number;
  clicked: number;
  problems: number;
  unsubscribed: number;
  /** One line per email, newest first. Empty for campaigns (Brevo keeps those per contact). */
  people: SentRecipient[];
}

export interface SentTotals {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  problems: number;
  unsubscribed: number;
}

export interface SentLog {
  days: number;
  groups: SentGroup[];
  totals: SentTotals;
  /** Brevo's event log could not be read: the one-off and automated rows are missing. */
  eventsError: string | null;
  /** The event log hit the read cap, so the oldest sends may be incomplete. */
  truncated: boolean;
}

/** Brevo returns a send's tags as one string; it may be a JSON array or a comma list. */
export function parseTags(tag: string | undefined): string[] {
  if (!tag) return [];
  const t = tag.trim();
  if (t.startsWith("[")) {
    try {
      const arr: unknown = JSON.parse(t);
      if (Array.isArray(arr)) return arr.map((x) => String(x).trim()).filter(Boolean);
    } catch {
      // fall through to the comma split
    }
  }
  return t
    .split(",")
    .map((x) => x.replace(/["[\]]/g, "").trim())
    .filter(Boolean);
}

const AUTOMATED_TAGS: Record<string, SendKind> = {
  flow: "flow",
  lifecycle: "lifecycle",
  "product-update": "product-update",
};

/** What kind of send a set of tags marks, and the tag that names a one-off. */
export function kindOf(tags: string[]): { kind: SendKind; label: string | null } {
  for (const t of tags) {
    const k = AUTOMATED_TAGS[t.toLowerCase()];
    if (k) return { kind: k, label: null };
  }
  const own = tags.find((t) => t.toLowerCase() !== "mykavo");
  if (own) return { kind: "direct", label: own };
  return { kind: "automated", label: null };
}

const ACRONYMS = new Set(["wp", "ai", "seo", "mcp", "api", "ssl", "gsc", "bf"]);

/** "plugin-review-ask" -> "Plugin review ask", "wp-131-update" -> "WP 131 update". */
export function humanizeTag(tag: string): string {
  const words = tag
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((w) => (ACRONYMS.has(w.toLowerCase()) ? w.toUpperCase() : w.toLowerCase()));
  const text = words.join(" ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const PROBLEM_EVENTS = new Set(["hardBounces", "softBounces", "bounces", "blocked", "invalid", "error", "spam"]);

function stateOf(events: Set<string>): DeliveryState {
  if (events.has("spam")) return "spam";
  const delivered = events.has("delivered") || events.has("opened") || events.has("clicks");
  if (!delivered && (events.has("hardBounces") || events.has("softBounces") || events.has("bounces"))) return "bounced";
  if (!delivered && (events.has("blocked") || events.has("invalid") || events.has("error"))) return "blocked";
  if (events.has("clicks")) return "clicked";
  if (events.has("opened")) return "opened";
  if (delivered) return "delivered";
  return "sent";
}

function emptyTotals(): SentTotals {
  return { sent: 0, delivered: 0, opened: 0, clicked: 0, problems: 0, unsubscribed: 0 };
}

export function buildSentLog(input: {
  events: BrevoEmailEvent[];
  campaigns: BrevoCampaign[];
  days: number;
  now: Date;
  eventsError?: string | null;
  truncated?: boolean;
}): SentLog {
  // 1. One message per messageId (or per address + subject + minute when Brevo omits the id).
  type Msg = { email: string; subject: string; tags: string[]; at: string; firstAny: string; events: Set<string> };
  const messages = new Map<string, Msg>();
  for (const e of input.events) {
    const email = e.email.trim().toLowerCase();
    const key = e.messageId ?? `${email}|${e.subject ?? ""}|${e.date.slice(0, 16)}`;
    let m = messages.get(key);
    if (!m) {
      m = { email, subject: e.subject ?? "", tags: parseTags(e.tag), at: "", firstAny: e.date, events: new Set() };
      messages.set(key, m);
    }
    m.events.add(e.event);
    if (!m.subject && e.subject) m.subject = e.subject;
    if (m.tags.length === 0 && e.tag) m.tags = parseTags(e.tag);
    if (e.event === "requests" && (!m.at || e.date < m.at)) m.at = e.date;
    if (e.date < m.firstAny) m.firstAny = e.date;
  }

  // 2. Messages into sends: a one-off by its tag, an automated email by its subject.
  const groups = new Map<string, SentGroup & { subjects: Map<string, number> }>();
  const totals = emptyTotals();
  for (const m of messages.values()) {
    const { kind, label } = kindOf(m.tags);
    const key = kind === "direct" ? `direct:${label}` : `${kind}:${m.subject}`;
    let g = groups.get(key);
    if (!g) {
      g = {
        id: key,
        kind,
        title: kind === "direct" && label ? humanizeTag(label) : m.subject || "(no subject)",
        subject: null,
        moreSubjects: 0,
        at: null,
        status: null,
        campaignId: null,
        recipients: 0,
        delivered: 0,
        opened: 0,
        clicked: 0,
        problems: 0,
        unsubscribed: 0,
        people: [],
        subjects: new Map(),
      };
      groups.set(key, g);
    }
    const at = m.at || m.firstAny;
    const state = stateOf(m.events);
    const unsubscribed = m.events.has("unsubscribed");
    g.people.push({ email: m.email, at, state, unsubscribed });
    g.subjects.set(m.subject, (g.subjects.get(m.subject) ?? 0) + 1);
    if (!g.at || at > g.at) g.at = at;
    const delivered = state === "delivered" || state === "opened" || state === "clicked";
    const problem = [...m.events].some((x) => PROBLEM_EVENTS.has(x)) && !delivered;
    g.delivered += delivered ? 1 : 0;
    g.opened += state === "opened" || state === "clicked" ? 1 : 0;
    g.clicked += state === "clicked" ? 1 : 0;
    g.problems += problem || state === "spam" ? 1 : 0;
    g.unsubscribed += unsubscribed ? 1 : 0;
  }

  const out: SentGroup[] = [];
  for (const g of groups.values()) {
    const { subjects, ...rest } = g;
    rest.people.sort((a, b) => (a.at < b.at ? 1 : -1));
    rest.recipients = new Set(rest.people.map((p) => p.email)).size;
    const ranked = [...subjects.entries()].sort((a, b) => b[1] - a[1]);
    if (rest.kind === "direct") {
      rest.subject = ranked[0]?.[0] || null;
      rest.moreSubjects = Math.max(0, ranked.length - 1);
    }
    totals.sent += rest.people.length;
    totals.delivered += rest.delivered;
    totals.opened += rest.opened;
    totals.clicked += rest.clicked;
    totals.problems += rest.problems;
    totals.unsubscribed += rest.unsubscribed;
    out.push(rest);
  }

  // 3. Campaigns, with Brevo's totals. Only sent ones inside the window count toward the totals.
  const since = input.now.getTime() - input.days * 86_400_000;
  for (const c of input.campaigns) {
    const s = c.stats;
    const at = c.sentDate ?? c.scheduledAt ?? c.createdAt ?? null;
    const g: SentGroup = {
      id: `campaign:${c.id}`,
      kind: "campaign",
      title: c.name,
      subject: c.subject ?? null,
      moreSubjects: 0,
      at,
      status: c.status,
      campaignId: c.id,
      recipients: s?.sent ?? 0,
      delivered: s?.delivered ?? 0,
      opened: s?.uniqueViews ?? 0,
      clicked: s?.uniqueClicks ?? 0,
      problems: s ? s.hardBounces + s.softBounces + s.complaints : 0,
      unsubscribed: s?.unsubscriptions ?? 0,
      people: [],
    };
    out.push(g);
    if (s && c.sentDate && new Date(c.sentDate).getTime() >= since) {
      totals.sent += s.sent;
      totals.delivered += s.delivered;
      totals.opened += s.uniqueViews;
      totals.clicked += s.uniqueClicks;
      totals.problems += g.problems;
      totals.unsubscribed += s.unsubscriptions;
    }
  }

  out.sort((a, b) => new Date(b.at ?? 0).getTime() - new Date(a.at ?? 0).getTime());
  return {
    days: input.days,
    groups: out,
    totals,
    eventsError: input.eventsError ?? null,
    truncated: input.truncated ?? false,
  };
}

const LOG_DAYS = 30;
const MAX_EVENTS = 5000;
const CACHE_MS = 60_000;
let cache: { at: number; events: BrevoEmailEvent[]; error: string | null } | null = null;

/** Brevo's event log for the window, read at most once a minute per server instance. */
async function recentEvents(): Promise<{ events: BrevoEmailEvent[]; error: string | null }> {
  if (!brevoConfigured() || !process.env.BREVO_API_KEY) return { events: [], error: null };
  if (cache && Date.now() - cache.at < CACHE_MS) return cache;
  try {
    const events = await brevoEmailEvents({ days: LOG_DAYS, max: MAX_EVENTS });
    cache = { at: Date.now(), events, error: null };
  } catch (err) {
    // Not cached: the next load tries Brevo again.
    return { events: [], error: err instanceof Error ? err.message : String(err) };
  }
  return cache;
}

/** The sent log for the page. Campaigns come from the overview, already read. */
export async function loadSentLog(campaigns: BrevoCampaign[], now: Date): Promise<SentLog> {
  const { events, error } = await recentEvents();
  return buildSentLog({
    events,
    campaigns,
    days: LOG_DAYS,
    now,
    eventsError: error,
    truncated: events.length >= MAX_EVENTS,
  });
}
