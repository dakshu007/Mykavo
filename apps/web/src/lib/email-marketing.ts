import { isMissingTableError, prisma } from "@mykavo/database";
import {
  AUDIENCE_DESCRIPTIONS,
  AUDIENCE_KEYS,
  brevoAccount,
  brevoCampaigns,
  brevoConfigured,
  brevoDomains,
  brevoReport,
  brevoSenders,
  findAudiences,
  marketingProvider,
  marketingSender,
  sendCreditsLeft,
  type AudienceKey,
  type BrevoCampaign,
  type BrevoReport,
} from "@mykavo/email";

/**
 * Admin > Email marketing, server side: everything the page shows about
 * Brevo, gathered in parallel. Each part fails on its own - a Brevo outage
 * shows as a message on that card, not a broken page. Callers check
 * isPlatformAdmin first; nothing here does.
 */

export interface SyncRunRow {
  id: string;
  kind: string;
  status: string;
  startedAt: string;
  finishedAt: string | null;
  contacts: number;
  blocklisted: number;
  removed: number;
  pulledUnsubscribes: number;
  error: string | null;
}

export interface AudienceRow {
  key: AudienceKey;
  id: number;
  name: string;
  description: string;
  subscribers: number;
}

export interface MarketingOverview {
  configured: boolean;
  provider: "brevo" | "resend";
  forcedResend: boolean;
  sender: { name: string; email: string };
  checks: {
    apiKey: boolean;
    senderEmail: boolean;
    senderVerified: boolean | null;
    domainAuthenticated: boolean | null;
    migration: boolean;
    synced: boolean;
  };
  account: { plan: string; creditsLeft: number | null } | null;
  report: BrevoReport | null;
  audiences: AudienceRow[] | null;
  mykavo: { accounts: number; optedOut: number };
  syncs: SyncRunRow[];
  campaigns: BrevoCampaign[];
  /** Brevo errors, per card. */
  errors: Partial<Record<"account" | "report" | "audiences" | "campaigns" | "senders", string>>;
}

const msg = (err: unknown) => (err instanceof Error ? err.message : String(err));

export async function getMarketingOverview(): Promise<MarketingOverview> {
  const configured = brevoConfigured();
  const sender = marketingSender();
  const errors: MarketingOverview["errors"] = {};
  const guard = async <T>(key: keyof MarketingOverview["errors"], fn: () => Promise<T>): Promise<T | null> => {
    if (!process.env.BREVO_API_KEY) return null;
    try {
      return await fn();
    } catch (err) {
      errors[key] = msg(err);
      return null;
    }
  };

  const audiencesP = guard("audiences", findAudiences);
  const [account, report, audiences, campaigns, senders, domains, accounts, optedOut, syncs] = await Promise.all([
    guard("account", brevoAccount),
    guard("report", () => brevoReport(30)),
    audiencesP,
    // Free Brevo plans cannot tag campaigns, so MyKavo's are also recognised by its lists.
    guard("campaigns", async () => {
      const lists = await audiencesP;
      return brevoCampaigns(30, lists ? Object.values(lists).map((a) => a.id) : []);
    }),
    guard("senders", brevoSenders),
    guard("senders", brevoDomains),
    prisma.user.count({ where: { ownedWorkspaces: { some: {} } } }),
    prisma.emailOptOut.count().catch(() => 0),
    prisma.brevoSyncRun
      .findMany({ orderBy: { startedAt: "desc" }, take: 8 })
      .then((rows) => rows)
      .catch((err: unknown) => {
        if (isMissingTableError(err)) return null;
        throw err;
      }),
  ]);

  const senderDomain = sender.email.split("@")[1]?.toLowerCase() ?? "";
  const senderRow = senders?.find((s) => s.email.toLowerCase() === sender.email.toLowerCase());
  const domainRow = domains?.find((d) => d.domainName.toLowerCase() === senderDomain);

  return {
    configured,
    provider: marketingProvider(),
    forcedResend: process.env.MARKETING_EMAIL_PROVIDER === "resend",
    sender,
    checks: {
      apiKey: Boolean(process.env.BREVO_API_KEY),
      senderEmail: Boolean(sender.email),
      senderVerified: senders ? Boolean(senderRow?.active) : null,
      domainAuthenticated: domains ? Boolean(domainRow?.authenticated) : null,
      migration: syncs !== null,
      synced: Boolean(syncs?.some((s) => s.status === "OK")),
    },
    account: account
      ? { plan: account.plan.find((p) => p.creditsType === "sendLimit")?.type ?? account.plan[0]?.type ?? "unknown", creditsLeft: sendCreditsLeft(account) }
      : null,
    report,
    audiences: audiences
      ? AUDIENCE_KEYS.map((k) => ({ ...audiences[k], description: AUDIENCE_DESCRIPTIONS[k] }))
      : null,
    mykavo: { accounts, optedOut },
    syncs: (syncs ?? []).map((s) => ({
      id: s.id,
      kind: s.kind,
      status: s.status,
      startedAt: s.startedAt.toISOString(),
      finishedAt: s.finishedAt?.toISOString() ?? null,
      contacts: s.contacts,
      blocklisted: s.blocklisted,
      removed: s.removed,
      pulledUnsubscribes: s.pulledUnsubscribes,
      error: s.error,
    })),
    campaigns: campaigns ?? [],
    errors,
  };
}
