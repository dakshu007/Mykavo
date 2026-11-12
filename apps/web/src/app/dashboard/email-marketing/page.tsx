import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowRight, Check, Circle, Plus } from "lucide-react";
import { requireSession } from "@/lib/session";
import { isPlatformAdmin } from "@/lib/platform-admin";
import { getMarketingOverview, type MarketingOverview } from "@/lib/email-marketing";
import { SyncNowButton } from "@/components/email-marketing/sync-now-button";
import { CampaignPeopleSection } from "@/components/dashboard/engagement-sections";
import { FlapNumber } from "@/components/dashboard/overview/summary-row";
import { SentLogList } from "@/components/dashboard/email-marketing/sent-log";
import { cn } from "@/lib/utils";
import { loadSentLog, type SentTotals } from "./sent-log";

export const metadata: Metadata = {
  title: "Email marketing",
  robots: { index: false },
};

function pct(part: number, whole: number): string {
  return whole > 0 ? `${Math.round((part / whole) * 100)}%` : "0%";
}

function ago(iso: string, now: Date): string {
  const mins = Math.round((now.getTime() - new Date(iso).getTime()) / 60_000);
  if (mins < 60) return `${Math.max(1, mins)}m ago`;
  const h = Math.round(mins / 60);
  return h < 48 ? `${h}h ago` : `${Math.round(h / 24)}d ago`;
}

/** Mono micro label used across the page. */
function Micro({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("font-mono text-[10.5px] font-medium uppercase tracking-[0.14em] text-ink-faint", className)}>{children}</p>
  );
}

/** A section card: mono eyebrow, title, optional action on the right. */
function Panel({
  eyebrow,
  title,
  action,
  children,
  className,
}: {
  eyebrow: string;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-2xl border border-line bg-card p-5 sm:p-6", className)}>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <Micro>{eyebrow}</Micro>
          <h2 className="mt-1 text-[16px] font-semibold tracking-tight text-ink">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Setup({ o }: { o: MarketingOverview }) {
  const domain = o.sender.email.split("@")[1] || "mykavo.app";
  const steps: { done: boolean | null; title: string; how: React.ReactNode }[] = [
    {
      done: o.checks.domainAuthenticated,
      title: `Authenticate ${domain} in Brevo`,
      how: (
        <>
          Brevo, Senders, Domains &amp; Dedicated IPs, Domains, Add a domain, then add the DNS records it shows (Brevo code,
          DKIM, DMARC) where mykavo.app&apos;s DNS lives. Without this, mail &quot;from&quot; your domain lands in spam.
        </>
      ),
    },
    {
      done: o.checks.senderVerified,
      title: `Add the sender ${o.sender.email || "hello@" + domain}`,
      how: <>Brevo, Senders, Add a sender, name &quot;MyKavo&quot;. Not a Gmail address: Gmail blocks bulk mail sent &quot;from&quot; gmail.com by other servers.</>,
    },
    {
      done: o.checks.apiKey && o.checks.senderEmail,
      title: "Connect MyKavo to Brevo",
      how: (
        <>
          Brevo, SMTP &amp; API, API keys, Generate. Put it in Netlify and in the worker&apos;s .env as{" "}
          <code className="font-mono">BREVO_API_KEY</code>, with <code className="font-mono">BREVO_SENDER_EMAIL</code> (the sender above) and{" "}
          <code className="font-mono">BREVO_SENDER_NAME=MyKavo</code>. Never paste the key anywhere else.
        </>
      ),
    },
    {
      done: o.checks.migration,
      title: "Create the sync log table",
      how: <>Run the <code className="font-mono">20260929090000_brevo_sync_run</code> migration in Supabase.</>,
    },
    { done: o.checks.synced, title: "Run the first contact sync", how: <>Press Sync now under Audiences once the steps above are done.</> },
  ];
  if (steps.every((s) => s.done)) return null;
  const left = steps.filter((s) => !s.done).length;
  return (
    <Panel eyebrow="Setup" title={`Brevo setup: ${left} ${left === 1 ? "step" : "steps"} left`}>
      <ol className="grid gap-3 md:grid-cols-2">
        {steps.map((s, i) => (
          <li key={i} className={cn("flex gap-3 rounded-xl border p-3.5", s.done ? "border-line opacity-60" : "border-ink/20")}>
            <span
              className={cn(
                "mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full font-mono text-[11px] font-semibold",
                s.done ? "bg-success text-white" : "bg-primary text-[#16181d]",
              )}
            >
              {s.done ? <Check className="size-3.5" aria-hidden /> : i + 1}
            </span>
            <div>
              <p className="text-[13.5px] font-medium text-ink">
                {s.title}
                {s.done === null && <span className="ml-2 text-[11.5px] font-normal text-ink-faint">(checked once connected)</span>}
              </p>
              <p className="mt-0.5 text-[12.5px] leading-5 text-ink-secondary">{s.how}</p>
            </div>
          </li>
        ))}
      </ol>
    </Panel>
  );
}

/** Who sends what: account email on Resend, promotional email on Brevo. */
function Routing({ onBrevo }: { onBrevo: boolean }) {
  const rows: { name: string; note: string; items: string[]; active: boolean }[] = [
    {
      name: "Brevo",
      note: "Promotional. Every email carries an unsubscribe link.",
      items: ["Day 3 / 6 / 10 lifecycle series", "Automation Tool flows", "Campaigns from this page", "Unsubscribes synced both ways"],
      active: onBrevo,
    },
    {
      name: "Resend",
      note: "Account email. Never promotional, never blocked by an unsubscribe.",
      items: ["Change alerts, scan summaries", "Site down, SSL expiry", "Weekly and client reports", "Welcome, invites, approvals"],
      active: true,
    },
  ];
  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <div key={r.name} className="rounded-xl border border-line p-4">
          <div className="flex items-center gap-2">
            <span className={cn("size-2 rounded-full", r.active ? "bg-success" : "bg-ink-faint")} aria-hidden />
            <p className="text-[13.5px] font-semibold text-ink">{r.name}</p>
          </div>
          <p className="mt-0.5 text-[12px] text-ink-faint">{r.note}</p>
          <ul className="mt-2.5 grid gap-x-4 gap-y-1 text-[12.5px] text-ink-secondary sm:grid-cols-2">
            {r.items.map((x) => (
              <li key={x} className="flex gap-1.5">
                {r.active ? (
                  <Check className="mt-0.5 size-3.5 shrink-0 text-success" aria-hidden />
                ) : (
                  <Circle className="mt-0.5 size-3.5 shrink-0 text-ink-faint" aria-hidden />
                )}
                {x}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

/**
 * Admin > Email marketing: MyKavo's promotional email through Brevo. The
 * headline numbers, then the sent log (every send, who got it and where each
 * email got to), then audiences and routing. Operator only; every API behind
 * it re-checks the allowlist.
 */
export default async function EmailMarketingPage() {
  const session = await requireSession();
  if (!isPlatformAdmin(session.user)) notFound();
  const now = new Date();
  const o = await getMarketingOverview();
  const log = await loadSentLog(o.campaigns, now);
  const onBrevo = o.provider === "brevo";

  // If Brevo's event log could not be read, fall back to its aggregated
  // report for the automated part, so the headline still has numbers.
  const t: SentTotals =
    log.eventsError && o.report
      ? {
          sent: log.totals.sent + o.report.requests,
          delivered: log.totals.delivered + o.report.delivered,
          opened: log.totals.opened + o.report.uniqueOpens,
          clicked: log.totals.clicked + o.report.uniqueClicks,
          problems: log.totals.problems + o.report.hardBounces + o.report.softBounces + o.report.spamReports,
          unsubscribed: log.totals.unsubscribed + o.report.unsubscribed,
        }
      : log.totals;

  const tiles = [
    { label: "Emails sent", value: t.sent, note: `Last ${log.days} days` },
    { label: "Delivered", value: t.delivered, note: t.problems > 0 ? `${t.problems} not delivered` : `${pct(t.delivered, t.sent)} of sent`, warn: t.problems > 0 },
    { label: "Opened", value: t.opened, note: `${pct(t.opened, t.delivered)} of delivered` },
    { label: "Clicked", value: t.clicked, note: t.unsubscribed > 0 ? `${t.unsubscribed} unsubscribed` : `${pct(t.clicked, t.delivered)} of delivered` },
  ];

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Micro className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <span className={cn("inline-flex items-center gap-1.5", onBrevo ? "text-success-strong" : "text-warning-strong")}>
              <span className="relative flex size-2">
                {onBrevo && <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60 motion-reduce:hidden" />}
                <span className={cn("relative inline-flex size-2 rounded-full", onBrevo ? "bg-success" : "bg-warning")} />
              </span>
              {onBrevo ? "Sending through Brevo" : o.forcedResend ? "Forced to Resend" : "Brevo not connected"}
            </span>
            {o.account && (
              <>
                <span aria-hidden>/</span>
                <span>{o.account.plan} plan</span>
                {o.account.creditsLeft !== null && (
                  <>
                    <span aria-hidden>/</span>
                    <span>{o.account.creditsLeft} sends left today</span>
                  </>
                )}
              </>
            )}
          </Micro>
          <h1 className="mt-2 text-[30px] font-semibold leading-tight tracking-[-0.02em] text-ink">
            {t.sent > 0 ? (
              <>
                <span className="mk-highlight">
                  {t.sent} {t.sent === 1 ? "email" : "emails"}
                </span>{" "}
                went out in the last {log.days} days.
              </>
            ) : (
              <>No promotional email in the last {log.days} days.</>
            )}
          </h1>
          <p className="mt-1.5 max-w-2xl text-[14px] text-ink-secondary">
            {t.sent > 0
              ? `${t.opened} opened, ${t.clicked} clicked. Every campaign, automated email and one-off send is in the log below.`
              : "Campaigns, the lifecycle series, flows and one-off sends through Brevo show up here."}
          </p>
        </div>
        <Link
          href="/dashboard/email-marketing/new"
          aria-disabled={!o.configured}
          className={cn(
            "inline-flex h-10 items-center gap-2 rounded-full border-[1.5px] border-ink bg-primary px-5 text-[13.5px] font-semibold text-[#16181d] shadow-[3px_3px_0_var(--color-ink)] transition-transform hover:-translate-y-px",
            !o.configured && "pointer-events-none opacity-50",
          )}
        >
          <Plus className="size-4" aria-hidden /> New campaign
        </Link>
      </div>

      <Setup o={o} />

      <dl className="grid grid-cols-2 overflow-hidden rounded-2xl border-[1.5px] border-ink bg-card shadow-[5px_5px_0_var(--color-primary)] lg:grid-cols-4">
        {tiles.map((tile, i) => (
          <div
            key={tile.label}
            className={cn(
              "flex flex-col gap-3 p-4 sm:p-5",
              i % 2 === 1 && "border-l border-line",
              i >= 2 && "border-t border-line lg:border-t-0",
              i === 2 && "lg:border-l",
            )}
          >
            <dt className="font-mono text-[10.5px] font-medium uppercase tracking-[0.14em] text-ink-faint">{tile.label}</dt>
            <dd className="order-first">
              <FlapNumber value={tile.value} index={i} />
            </dd>
            <dd className={cn("-mt-1 text-xs", tile.warn ? "font-medium text-critical-strong" : "text-ink-secondary")}>{tile.note}</dd>
          </div>
        ))}
      </dl>

      <Panel
        eyebrow="Sent log"
        title="Every email that went out"
        action={<Micro>From Brevo / last {log.days} days</Micro>}
      >
        {log.eventsError && (
          <p className="mb-4 flex items-start gap-2 rounded-xl border border-warning/40 bg-warning-soft px-4 py-3 text-[13px] text-warning-strong">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
            Brevo&apos;s email log could not be read ({log.eventsError}), so automated and one-off sends are missing below.
            Campaigns are still listed.
          </p>
        )}
        {o.errors.campaigns && (
          <p className="mb-4 rounded-xl bg-critical-soft px-4 py-3 text-[13px] text-critical-strong">Campaigns could not be read: {o.errors.campaigns}</p>
        )}
        {!o.configured ? (
          <p className="rounded-xl border border-dashed border-line px-4 py-8 text-center text-[13px] text-ink-secondary">
            The log fills in once Brevo is connected (see setup above).
          </p>
        ) : (
          <SentLogList groups={log.groups} nowIso={now.toISOString()} />
        )}
        {log.truncated && (
          <p className="mt-3 text-[11.5px] text-ink-faint">Brevo&apos;s log is long, so only the most recent 5,000 events are read; the oldest sends may be incomplete.</p>
        )}
      </Panel>

      <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr] [&>*]:min-w-0">
        <Panel eyebrow="Audiences" title="Lists MyKavo keeps in Brevo" action={<SyncNowButton disabled={!o.configured} />}>
          {o.errors.audiences && <p className="mb-3 text-[13px] text-critical-strong">Brevo: {o.errors.audiences}</p>}
          {o.audiences ? (
            <ul className="divide-y divide-line">
              {o.audiences.map((a) => (
                <li key={a.key} className="flex items-center gap-4 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-medium text-ink">{a.name.replace("MyKavo · ", "")}</p>
                    <p className="truncate text-[12px] text-ink-secondary">{a.description}</p>
                  </div>
                  <span className="font-mono text-[20px] font-semibold tabular-nums text-ink">{a.subscribers}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[13px] text-ink-secondary">The lists are created in Brevo on the first sync.</p>
          )}
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 border-t border-line pt-3 font-mono text-[10.5px] uppercase tracking-[0.1em] text-ink-faint">
            <span>
              Accounts <strong className="font-semibold text-ink">{o.mykavo.accounts}</strong>
            </span>
            <span>
              Unsubscribed <strong className="font-semibold text-ink">{o.mykavo.optedOut}</strong>
            </span>
            {o.syncs[0] && (
              <span className={o.syncs[0].status === "FAILED" ? "text-critical-strong" : undefined}>
                Last sync {o.syncs[0].kind}, {ago(o.syncs[0].startedAt, now)}:{" "}
                {o.syncs[0].status === "OK"
                  ? `${o.syncs[0].contacts} contacts, ${o.syncs[0].pulledUnsubscribes} new unsubscribes`
                  : o.syncs[0].status === "RUNNING"
                    ? "running"
                    : `failed, ${o.syncs[0].error ?? "unknown error"}`}
              </span>
            )}
          </div>
          <p className="mt-3 text-[12px] leading-5 text-ink-secondary">
            Kept up to date in a &quot;MyKavo&quot; folder: hourly for new signups and unsubscribes, fully once a day, or now with
            Sync now. Other Brevo lists are never touched.
          </p>
        </Panel>

        <Panel eyebrow="Routing" title="Who sends what">
          <Routing onBrevo={onBrevo} />
        </Panel>
      </div>

      {onBrevo && <CampaignPeopleSection />}

      <p className="flex flex-wrap items-center gap-2 text-[12px] text-ink-faint">
        <AlertTriangle className="size-3.5" aria-hidden />
        Only email people who have a MyKavo account or asked to hear from you. Bought or scraped lists get Brevo accounts suspended.
        <Link href="/dashboard/automations" className="ml-auto inline-flex items-center gap-1 font-medium text-accent hover:underline">
          Automations <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      </p>
    </div>
  );
}
