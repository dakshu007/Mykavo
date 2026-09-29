import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowRight, Check, Circle, Megaphone, Pencil, Plus, Send, ShieldCheck, Users } from "lucide-react";
import { requireSession } from "@/lib/session";
import { isPlatformAdmin } from "@/lib/platform-admin";
import { getMarketingOverview, type MarketingOverview } from "@/lib/email-marketing";
import { Card, CardHeader } from "@/components/ui/card";
import { SyncNowButton } from "@/components/email-marketing/sync-now-button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Email marketing",
  robots: { index: false },
};

function pct(part: number, whole: number): string {
  return whole > 0 ? `${((part / whole) * 100).toFixed(1)}%` : "-";
}

function ago(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 60) return `${Math.max(1, mins)} min ago`;
  const h = Math.round(mins / 60);
  return h < 48 ? `${h} h ago` : `${Math.round(h / 24)} days ago`;
}

function Stat({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: "bad" }) {
  return (
    <div className="rounded-tile bg-card p-4 shadow-card">
      <p className="text-[11.5px] text-ink-faint">{label}</p>
      <p className={cn("mt-1 text-[22px] font-semibold tabular-nums tracking-tight text-ink", tone === "bad" && "text-critical-strong")}>{value}</p>
      {hint && <p className="text-[11.5px] text-ink-secondary">{hint}</p>}
    </div>
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
          Brevo → Senders, Domains &amp; Dedicated IPs → Domains → Add a domain, then add the DNS records it shows (Brevo
          code, DKIM, DMARC) where mykavo.app&apos;s DNS lives. Without this, mail &quot;from&quot; your domain lands in spam.
        </>
      ),
    },
    {
      done: o.checks.senderVerified,
      title: `Add the sender ${o.sender.email || "hello@" + domain}`,
      how: <>Brevo → Senders → Add a sender, name &quot;MyKavo&quot;. Not a Gmail address - Gmail blocks bulk mail sent &quot;from&quot; gmail.com by other servers.</>,
    },
    {
      done: o.checks.apiKey && o.checks.senderEmail,
      title: "Connect MyKavo to Brevo",
      how: (
        <>
          Brevo → SMTP &amp; API → API keys → Generate. Put it in Netlify and in the worker&apos;s .env as{" "}
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
    { done: o.checks.synced, title: "Run the first contact sync", how: <>Press Sync now below once the steps above are done.</> },
  ];
  if (steps.every((s) => s.done)) return null;
  return (
    <Card>
      <CardHeader icon={ShieldCheck} title="Set up Brevo" />
      <ol className="space-y-3">
        {steps.map((s, i) => (
          <li key={i} className="flex gap-3">
            <span
              className={cn(
                "mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold",
                s.done ? "bg-success text-white" : "bg-surface text-ink-secondary",
              )}
            >
              {s.done ? <Check className="size-3.5" aria-hidden /> : i + 1}
            </span>
            <div>
              <p className="text-[14px] font-medium text-ink">
                {s.title}
                {s.done === null && <span className="ml-2 text-[11.5px] font-normal text-ink-faint">(checked once connected)</span>}
              </p>
              <p className="text-[12.5px] leading-5 text-ink-secondary">{s.how}</p>
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}

/**
 * Admin > Email marketing: MyKavo's promotional email through Brevo -
 * setup, what goes where, delivery numbers, the synced audiences and
 * campaigns. Operator only; every API behind it re-checks the allowlist.
 */
export default async function EmailMarketingPage() {
  const session = await requireSession();
  if (!isPlatformAdmin(session.user.email)) notFound();
  const o = await getMarketingOverview();
  const onBrevo = o.provider === "brevo";
  const r = o.report;

  return (
    <div className="max-w-6xl space-y-6">
      <section className="relative overflow-hidden rounded-card bg-[#0f1115] p-7 text-white shadow-card">
        <div
          className="pointer-events-none absolute inset-0 opacity-40 [background-image:radial-gradient(circle,rgba(255,255,255,0.18)_1px,transparent_1px)] [background-size:20px_20px] [mask-image:linear-gradient(to_left,black,transparent_70%)]"
          aria-hidden
        />
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-xl">
            <div className="flex items-center gap-3">
              <span className="inline-flex size-10 items-center justify-center rounded-xl bg-primary text-primary-contrast">
                <Megaphone className="size-5" aria-hidden />
              </span>
              <div>
                <h1 className="text-[24px] font-semibold tracking-tight">Email marketing</h1>
                <p className="text-[12.5px] text-white/60">Powered by Brevo</p>
              </div>
            </div>
            <p className="mt-4 text-[14px] leading-6 text-white/70">
              Promotional email - the Day 3 / 6 / 10 series, Automation Tool flows and campaigns - goes out through Brevo.
              Alerts and account email stay on Resend, so a campaign can never hurt the delivery of an alert.
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-[12px]">
              <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-semibold", onBrevo ? "bg-success text-white" : "bg-white/10 text-white/80")}>
                <span className={cn("size-1.5 rounded-full", onBrevo ? "bg-white" : "bg-white/50")} aria-hidden />
                {onBrevo ? "Sending through Brevo" : o.forcedResend ? "Forced to Resend (MARKETING_EMAIL_PROVIDER)" : "Not connected - promotional mail uses Resend"}
              </span>
              {o.account && (
                <span className="rounded-full bg-white/10 px-2.5 py-1 font-medium text-white/80">
                  {o.account.plan} plan{o.account.creditsLeft !== null ? ` · ${o.account.creditsLeft} sends left today` : ""}
                </span>
              )}
            </div>
          </div>
          <Link
            href="/dashboard/email-marketing/new"
            aria-disabled={!o.configured}
            className={cn(
              "inline-flex h-10 items-center gap-2 rounded-full bg-white px-5 text-[13.5px] font-semibold text-[#0f1115] transition-colors hover:bg-white/90",
              !o.configured && "pointer-events-none opacity-50",
            )}
          >
            <Plus className="size-4" aria-hidden /> New campaign
          </Link>
        </div>
      </section>

      <Setup o={o} />

      <Card>
        <CardHeader icon={Send} title="Who sends what" />
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-tile border border-line p-4">
            <p className="text-[13px] font-semibold text-ink">Resend · account email</p>
            <p className="mb-2 text-[12px] text-ink-secondary">Always Resend. Never promotional, never blocked by an unsubscribe.</p>
            <ul className="space-y-1 text-[13px] text-ink">
              {["Change alerts and scan summaries", "Site down / recovered, SSL expiry", "Weekly and client reports", "Welcome, first website, baseline ready", "Team invites, app approvals, test sends of these"].map((x) => (
                <li key={x} className="flex gap-2"><Check className="mt-0.5 size-3.5 shrink-0 text-success" aria-hidden />{x}</li>
              ))}
            </ul>
          </div>
          <div className={cn("rounded-tile border p-4", onBrevo ? "border-success/40 bg-success-soft/40" : "border-line")}>
            <p className="text-[13px] font-semibold text-ink">{onBrevo ? "Brevo" : "Brevo (once connected)"} · promotional email</p>
            <p className="mb-2 text-[12px] text-ink-secondary">Every one carries an unsubscribe link and skips unsubscribed people.</p>
            <ul className="space-y-1 text-[13px] text-ink">
              {["Day 3 / 6 / 10 lifecycle series", "Custom emails from Automation Tool flows", "Campaigns sent from this page", "Unsubscribes synced both ways"].map((x) => (
                <li key={x} className="flex gap-2">
                  {onBrevo ? <Check className="mt-0.5 size-3.5 shrink-0 text-success" aria-hidden /> : <Circle className="mt-0.5 size-3.5 shrink-0 text-ink-faint" aria-hidden />}
                  {x}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Card>

      <section>
        <h2 className="mb-3 text-[15px] font-semibold text-ink">Promotional email, last 30 days</h2>
        {o.errors.report ? (
          <p className="rounded-tile bg-critical-soft px-4 py-3 text-[13px] text-critical-strong">Brevo stats unavailable: {o.errors.report}</p>
        ) : r ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <Stat label="Sent" value={String(r.requests)} />
            <Stat label="Delivered" value={pct(r.delivered, r.requests)} hint={`${r.delivered} emails`} />
            <Stat label="Opened" value={pct(r.uniqueOpens, r.delivered)} hint={`${r.uniqueOpens} people`} />
            <Stat label="Clicked" value={pct(r.uniqueClicks, r.delivered)} hint={`${r.uniqueClicks} people`} />
            <Stat label="Unsubscribed" value={String(r.unsubscribed)} />
            <Stat label="Spam reports" value={String(r.spamReports)} tone={r.spamReports > 0 ? "bad" : undefined} hint={`${r.hardBounces + r.softBounces} bounced`} />
          </div>
        ) : (
          <p className="text-[13px] text-ink-secondary">Numbers appear here once Brevo is connected.</p>
        )}
        <p className="mt-2 text-[11.5px] text-ink-faint">Lifecycle and flow emails (tagged &quot;mykavo&quot; in Brevo). Campaign numbers are in the campaign list below.</p>
      </section>

      <Card>
        <CardHeader
          icon={Users}
          title="Audiences"
          action={<SyncNowButton disabled={!o.configured} />}
        />
        <p className="-mt-2 mb-4 text-[13px] text-ink-secondary">
          MyKavo keeps four Brevo lists up to date in a &quot;MyKavo&quot; folder - Sync now at any time, and the worker every hour for
          new signups and unsubscribes and fully once a day. Your other Brevo lists are never touched.
        </p>
        {o.errors.audiences && <p className="mb-3 text-[13px] text-critical-strong">Brevo: {o.errors.audiences}</p>}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {(o.audiences ?? []).map((a) => (
            <div key={a.key} className="rounded-tile border border-line p-4">
              <p className="text-[13px] font-semibold text-ink">{a.name.replace("MyKavo · ", "")}</p>
              <p className="text-[12px] text-ink-secondary">{a.description}</p>
              <p className="mt-2 text-[22px] font-semibold tabular-nums text-ink">{a.subscribers}</p>
            </div>
          ))}
          {!o.audiences && (
            <p className="text-[13px] text-ink-secondary sm:col-span-2 xl:col-span-4">
              The lists are created in Brevo on the first sync.
            </p>
          )}
        </div>
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 border-t border-line pt-3 text-[12.5px] text-ink-secondary">
          <span>
            MyKavo accounts: <strong className="font-semibold text-ink">{o.mykavo.accounts}</strong>
          </span>
          <span>
            Unsubscribed from promotional email: <strong className="font-semibold text-ink">{o.mykavo.optedOut}</strong>
          </span>
          {o.syncs[0] && (
            <span>
              Last sync: {o.syncs[0].kind}, {ago(o.syncs[0].startedAt)} -{" "}
              <span className={o.syncs[0].status === "FAILED" ? "text-critical-strong" : o.syncs[0].status === "OK" ? "text-success-strong" : ""}>
                {o.syncs[0].status === "OK"
                  ? `${o.syncs[0].contacts} contacts, ${o.syncs[0].pulledUnsubscribes} new unsubscribes`
                  : o.syncs[0].status === "RUNNING"
                    ? "running"
                    : `failed: ${o.syncs[0].error ?? "unknown error"}`}
              </span>
            </span>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader
          icon={Megaphone}
          title="Campaigns"
          action={
            o.configured ? (
              <Link href="/dashboard/email-marketing/new" className="inline-flex h-9 items-center gap-1.5 rounded-full bg-primary px-4 text-[13px] font-semibold text-primary-contrast hover:bg-primary-hover">
                <Plus className="size-4" aria-hidden /> New campaign
              </Link>
            ) : undefined
          }
        />
        {o.errors.campaigns && <p className="mb-3 text-[13px] text-critical-strong">Brevo: {o.errors.campaigns}</p>}
        {o.campaigns.length === 0 ? (
          <p className="text-[13px] text-ink-secondary">
            No MyKavo campaigns yet. Campaigns created here are tagged &quot;mykavo&quot; in Brevo, so other brands in the same Brevo
            account stay out of this list.
          </p>
        ) : (
          <div className="-mx-2 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-[13px]">
              <thead>
                <tr className="text-[11.5px] text-ink-faint">
                  <th className="px-2 py-2 font-medium">Campaign</th>
                  <th className="px-2 py-2 font-medium">Status</th>
                  <th className="px-2 py-2 text-right font-medium">Sent</th>
                  <th className="px-2 py-2 text-right font-medium">Opened</th>
                  <th className="px-2 py-2 text-right font-medium">Clicked</th>
                  <th className="px-2 py-2 text-right font-medium">Unsubscribed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {o.campaigns.map((c) => (
                  <tr key={c.id}>
                    <td className="px-2 py-2.5">
                      {c.status === "draft" ? (
                        <Link href={`/dashboard/email-marketing/${c.id}`} className="group block">
                          <p className="flex items-center gap-2 font-medium text-ink group-hover:text-accent">
                            {c.name}
                            <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-semibold text-ink">
                              <Pencil className="size-3" aria-hidden /> Edit
                            </span>
                          </p>
                          <p className="truncate text-[12px] text-ink-secondary">{c.subject}</p>
                        </Link>
                      ) : (
                        <>
                          <p className="font-medium text-ink">{c.name}</p>
                          <p className="truncate text-[12px] text-ink-secondary">{c.subject}</p>
                        </>
                      )}
                    </td>
                    <td className="px-2 py-2.5">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize",
                          c.status === "sent" ? "bg-success-soft text-success-strong" : c.status === "queued" ? "bg-info-soft text-ink" : "bg-surface text-ink-secondary",
                        )}
                      >
                        {c.status === "queued" && c.scheduledAt ? `scheduled ${new Date(c.scheduledAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : c.status}
                      </span>
                      {c.sentDate && <p className="mt-0.5 text-[11.5px] text-ink-faint">{ago(c.sentDate)}</p>}
                    </td>
                    <td className="px-2 py-2.5 text-right tabular-nums">{c.stats?.sent ?? "-"}</td>
                    <td className="px-2 py-2.5 text-right tabular-nums">{c.stats ? pct(c.stats.uniqueViews, c.stats.delivered) : "-"}</td>
                    <td className="px-2 py-2.5 text-right tabular-nums">{c.stats ? pct(c.stats.uniqueClicks, c.stats.delivered) : "-"}</td>
                    <td className="px-2 py-2.5 text-right tabular-nums">{c.stats?.unsubscriptions ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <p className="flex items-center gap-2 text-[12px] text-ink-faint">
        <AlertTriangle className="size-3.5" aria-hidden />
        Only email people who have a MyKavo account or asked to hear from you. Bought or scraped lists get Brevo accounts suspended.
        <Link href="/dashboard/automations" className="ml-auto inline-flex items-center gap-1 font-medium text-accent hover:underline">
          Automations <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      </p>
    </div>
  );
}
