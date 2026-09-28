/**
 * Brevo - the provider for MyKavo's promotional mail.
 *
 * MyKavo sends two kinds of email, and they now go out through two
 * providers on purpose:
 *
 *   Resend - everything an account needs: alerts, scan summaries, down and
 *            recovery notices, reports, welcome, baseline ready, invites.
 *   Brevo  - everything optional: the Day 3 / 6 / 10 lifecycle series,
 *            custom emails from Automation Tool flows, and campaigns.
 *
 * Separate providers keep separate sending reputations. If a promotional
 * email draws spam complaints, the damage stays on Brevo's stream - the
 * CRITICAL alert about a customer's site still lands in the inbox. And the
 * Resend quota is left entirely to the mail that matters.
 *
 * No SDK: Brevo's REST API over fetch, like send.ts does for Resend. The
 * API key lives only in server environments (BREVO_API_KEY).
 */

import { sendEmail, type EmailMessage, type SendResult } from "./send";

const BASE = "https://api.brevo.com/v3";

export interface BrevoSender {
  name: string;
  email: string;
}

/** Brevo is used once it has a key and a sender. */
export function brevoConfigured(env: Record<string, string | undefined> = process.env): boolean {
  return Boolean(env.BREVO_API_KEY && env.BREVO_SENDER_EMAIL);
}

export function marketingSender(env: Record<string, string | undefined> = process.env): BrevoSender {
  return { name: env.BREVO_SENDER_NAME || "MyKavo", email: env.BREVO_SENDER_EMAIL ?? "" };
}

/**
 * Which provider sends promotional mail right now. Brevo when configured;
 * MARKETING_EMAIL_PROVIDER=resend forces Resend (a kill switch if Brevo has
 * a bad day); otherwise Resend, exactly as before Brevo existed.
 */
export function marketingProvider(env: Record<string, string | undefined> = process.env): "brevo" | "resend" {
  if (env.MARKETING_EMAIL_PROVIDER === "resend") return "resend";
  return brevoConfigured(env) ? "brevo" : "resend";
}

export class BrevoError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "BrevoError";
  }
}

/** One Brevo API call. Throws BrevoError with Brevo's own code and message. */
export async function brevo<T>(path: string, init: { method?: string; body?: unknown; query?: Record<string, string | number | boolean | undefined> } = {}): Promise<T> {
  const key = process.env.BREVO_API_KEY;
  if (!key) throw new BrevoError(0, "not_configured", "BREVO_API_KEY is not set");
  // BREVO_API_BASE exists for local end-to-end tests against a mock server.
  const url = new URL((process.env.BREVO_API_BASE || BASE) + path);
  for (const [k, v] of Object.entries(init.query ?? {})) if (v !== undefined) url.searchParams.set(k, String(v));
  const res = await fetch(url, {
    method: init.method ?? "GET",
    headers: { "api-key": key, accept: "application/json", ...(init.body !== undefined ? { "content-type": "application/json" } : {}) },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    signal: AbortSignal.timeout(20_000),
  });
  const text = await res.text();
  if (!res.ok) {
    let code = "http_error";
    let message = text.slice(0, 300);
    try {
      const j = JSON.parse(text) as { code?: string; message?: string };
      code = j.code ?? code;
      message = j.message ?? message;
    } catch {
      // Not JSON.
    }
    throw new BrevoError(res.status, code, `Brevo ${res.status}: ${message}`);
  }
  return (text ? JSON.parse(text) : {}) as T;
}

/**
 * Send one email through Brevo's transactional API, as the promotional
 * stream. Same shape and result as sendEmail, so callers only choose.
 */
export async function sendViaBrevo(message: EmailMessage, tags: string[] = []): Promise<SendResult> {
  const sender = marketingSender();
  try {
    const data = await brevo<{ messageId?: string }>("/smtp/email", {
      method: "POST",
      body: {
        sender,
        to: message.to.map((email) => ({ email })),
        subject: message.subject,
        htmlContent: message.html,
        ...(message.text ? { textContent: message.text } : {}),
        ...(message.headers ? { headers: message.headers } : {}),
        tags: ["mykavo", ...tags],
      },
    });
    return { ok: true, provider: "brevo", id: data.messageId };
  } catch (err) {
    return { ok: false, provider: "brevo", error: err instanceof Error ? err.message : "Brevo send failed" };
  }
}

/* ------------------------------------------------------------------ */
/* Account, senders, stats                                            */
/* ------------------------------------------------------------------ */

export interface BrevoAccount {
  email: string;
  companyName?: string;
  plan: { type: string; credits: number; creditsType: string }[];
}

export async function brevoAccount(): Promise<BrevoAccount> {
  return brevo<BrevoAccount>("/account");
}

/** Emails Brevo will still send today on this plan (null when the plan has no send limit). */
export function sendCreditsLeft(account: BrevoAccount): number | null {
  const p = account.plan.find((x) => x.creditsType === "sendLimit");
  return p ? p.credits : null;
}

export async function brevoSenders(): Promise<{ id: number; name: string; email: string; active: boolean }[]> {
  return (await brevo<{ senders?: { id: number; name: string; email: string; active: boolean }[] }>("/senders")).senders ?? [];
}

export async function brevoDomains(): Promise<{ domainName: string; authenticated: boolean; verified: boolean }[]> {
  const data = await brevo<{ domains?: { domain_name: string; authenticated: boolean; verified: boolean }[] }>("/senders/domains");
  return (data.domains ?? []).map((d) => ({ domainName: d.domain_name, authenticated: d.authenticated, verified: d.verified }));
}

export interface BrevoReport {
  requests: number;
  delivered: number;
  hardBounces: number;
  softBounces: number;
  uniqueOpens: number;
  uniqueClicks: number;
  spamReports: number;
  blocked: number;
  unsubscribed: number;
}

/** Totals for MyKavo's promotional sends over the last `days` days. */
export async function brevoReport(days: number, tag = "mykavo"): Promise<BrevoReport> {
  const r = await brevo<Partial<BrevoReport>>("/smtp/statistics/aggregatedReport", { query: { days, tag } });
  return {
    requests: r.requests ?? 0,
    delivered: r.delivered ?? 0,
    hardBounces: r.hardBounces ?? 0,
    softBounces: r.softBounces ?? 0,
    uniqueOpens: r.uniqueOpens ?? 0,
    uniqueClicks: r.uniqueClicks ?? 0,
    spamReports: r.spamReports ?? 0,
    blocked: r.blocked ?? 0,
    unsubscribed: r.unsubscribed ?? 0,
  };
}

/* ------------------------------------------------------------------ */
/* Contacts                                                           */
/* ------------------------------------------------------------------ */

/**
 * Put an address on Brevo's blocklist, so no campaign reaches it. Creates
 * the contact if Brevo has never seen it.
 */
export async function brevoBlocklist(email: string): Promise<void> {
  await brevo("/contacts", { method: "POST", body: { email, emailBlacklisted: true, updateEnabled: true } });
}

export interface BrevoContactPage {
  contacts: { email?: string; emailBlacklisted: boolean; modifiedAt: string; listIds: number[] }[];
  count: number;
}

export async function brevoContacts(query: { listId?: number; modifiedSince?: string; limit?: number; offset?: number }): Promise<BrevoContactPage> {
  const data = await brevo<Partial<BrevoContactPage>>("/contacts", {
    query: {
      ...(query.listId ? { listIds: query.listId } : {}),
      modifiedSince: query.modifiedSince,
      limit: query.limit ?? 500,
      offset: query.offset ?? 0,
    },
  });
  return { contacts: data.contacts ?? [], count: data.count ?? 0 };
}

/* ------------------------------------------------------------------ */
/* Campaigns                                                          */
/* ------------------------------------------------------------------ */

export interface BrevoCampaignStats {
  sent: number;
  delivered: number;
  uniqueViews: number;
  uniqueClicks: number;
  unsubscriptions: number;
  hardBounces: number;
  softBounces: number;
  complaints: number;
}

export interface BrevoCampaign {
  id: number;
  name: string;
  subject?: string;
  status: string;
  tag?: string;
  createdAt: string;
  scheduledAt?: string;
  sentDate?: string;
  stats: BrevoCampaignStats | null;
}

type RawCampaign = Omit<BrevoCampaign, "stats"> & { statistics?: { globalStats?: Partial<BrevoCampaignStats> } };

function toCampaign(c: RawCampaign): BrevoCampaign {
  const g = c.statistics?.globalStats;
  return {
    id: c.id,
    name: c.name,
    subject: c.subject,
    status: c.status,
    tag: c.tag,
    createdAt: c.createdAt,
    scheduledAt: c.scheduledAt,
    sentDate: c.sentDate,
    stats: g
      ? {
          sent: g.sent ?? 0,
          delivered: g.delivered ?? 0,
          uniqueViews: g.uniqueViews ?? 0,
          uniqueClicks: g.uniqueClicks ?? 0,
          unsubscriptions: g.unsubscriptions ?? 0,
          hardBounces: g.hardBounces ?? 0,
          softBounces: g.softBounces ?? 0,
          complaints: g.complaints ?? 0,
        }
      : null,
  };
}

/** Recent campaigns MyKavo created (tagged "mykavo"); the account may hold other brands' too. */
export async function brevoCampaigns(limit = 50): Promise<BrevoCampaign[]> {
  const data = await brevo<{ campaigns?: RawCampaign[] }>("/emailCampaigns", {
    query: { limit, sort: "desc", statistics: "globalStats", excludeHtmlContent: true },
  });
  return (data.campaigns ?? []).filter((c) => c.tag === MYKAVO_CAMPAIGN_TAG).map(toCampaign);
}

export const MYKAVO_CAMPAIGN_TAG = "mykavo";

export async function brevoCreateCampaign(input: {
  name: string;
  subject: string;
  previewText: string;
  htmlContent: string;
  listIds: number[];
  replyTo?: string;
}): Promise<number> {
  const data = await brevo<{ id: number }>("/emailCampaigns", {
    method: "POST",
    body: {
      name: input.name,
      subject: input.subject,
      previewText: input.previewText || undefined,
      sender: marketingSender(),
      htmlContent: input.htmlContent,
      recipients: { listIds: input.listIds },
      tag: MYKAVO_CAMPAIGN_TAG,
      ...(input.replyTo ? { replyTo: input.replyTo } : {}),
    },
  });
  return data.id;
}

/** Replace a draft campaign's content and audience (same fields as create). */
export async function brevoUpdateCampaign(
  id: number,
  input: { name: string; subject: string; previewText: string; htmlContent: string; listIds: number[] },
): Promise<void> {
  await brevo(`/emailCampaigns/${id}`, {
    method: "PUT",
    body: {
      name: input.name,
      subject: input.subject,
      previewText: input.previewText || undefined,
      sender: marketingSender(),
      htmlContent: input.htmlContent,
      recipients: { listIds: input.listIds },
    },
  });
}

export async function brevoSendTest(campaignId: number, emailTo: string[]): Promise<void> {
  await brevo(`/emailCampaigns/${campaignId}/sendTest`, { method: "POST", body: { emailTo } });
}

export async function brevoSendNow(campaignId: number): Promise<void> {
  await brevo(`/emailCampaigns/${campaignId}/sendNow`, { method: "POST" });
}

export async function brevoSchedule(campaignId: number, scheduledAt: string): Promise<void> {
  await brevo(`/emailCampaigns/${campaignId}`, { method: "PUT", body: { scheduledAt } });
}

/**
 * Send promotional mail - anything carrying an unsubscribe link - through
 * whichever provider marketingProvider() picks. Transactional mail keeps
 * calling sendEmail (Resend) directly.
 */
export async function sendMarketingEmail(message: EmailMessage, tags: string[] = []): Promise<SendResult> {
  return marketingProvider() === "brevo" ? sendViaBrevo(message, tags) : sendEmail(message);
}
