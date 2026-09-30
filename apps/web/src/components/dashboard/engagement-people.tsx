import { ChevronDown, Globe, MailOpen, MousePointerClick, Send, Sparkles, Users } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { engagementTotals, type EngagementEmail } from "@/lib/engagement-core";
import type { EngagementReport } from "@/lib/email-engagement";

/**
 * Who got which emails, who opened and clicked, and who went on to add a
 * website or pay - person by person, most engaged first. Shared by Admin >
 * Automations and Admin > Email marketing, each with its own data.
 */

const dateFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
const fmt = (iso: string | null) => (iso ? dateFmt.format(new Date(iso)) : "-");
const pct = (n: number, of: number) => (of > 0 ? `${Math.round((n / of) * 100)}%` : "-");

function Stat({ icon: Icon, label, value, sub }: { icon: typeof Users; label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-tile bg-surface px-4 py-3">
      <p className="flex items-center gap-1.5 text-[12px] text-ink-secondary">
        <Icon className="size-3.5" aria-hidden />
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold tracking-tight text-ink">{value}</p>
      {sub && <p className="text-[11px] text-ink-faint">{sub}</p>}
    </div>
  );
}

function EmailState({ e }: { e: EngagementEmail }) {
  const [label, tone] = e.failed
    ? ["Failed", "bg-critical-soft text-critical-strong"]
    : e.clicked
      ? ["Clicked", "bg-success-soft text-success"]
      : e.opened
        ? ["Opened", "bg-success-soft text-success"]
        : e.opened === false
          ? ["Not opened", "bg-ink/5 text-ink-secondary"]
          : ["Sent", "bg-ink/5 text-ink-faint"];
  return <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold", tone)}>{label}</span>;
}

function PlanBadge({ plan, paid }: { plan: string; paid: boolean }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize",
        paid ? "bg-primary text-primary-contrast" : "bg-ink/5 text-ink-secondary",
      )}
    >
      {paid ? `${plan} · paid` : "Free"}
    </span>
  );
}

export function EngagementPeople({
  title,
  description,
  report,
  unknownOpensNote,
}: {
  title: string;
  description: string;
  report: EngagementReport;
  /** Explains "Sent" (open state unknown), when this report can have it. */
  unknownOpensNote?: string;
}) {
  const t = engagementTotals(report.people);
  return (
    <Card>
      <CardHeader icon={Users} title={title} />
      <p className="-mt-2 mb-4 text-[13px] text-ink-secondary">{description}</p>

      <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-5">
        <Stat icon={Users} label="Real users" value={t.people} />
        <Stat icon={Send} label="Got an email" value={t.reached} sub={`${t.emailsSent} emails`} />
        <Stat icon={MailOpen} label="Opened" value={t.openedPeople} sub={`${pct(t.openedPeople, t.reached)} of reached`} />
        <Stat icon={MousePointerClick} label="Clicked" value={t.clickedPeople} sub={`${pct(t.clickedPeople, t.reached)} of reached`} />
        <Stat icon={Sparkles} label="Paid" value={t.paidPeople} sub={`${t.paidAfterOpening} after opening`} />
      </div>

      {report.notice && (
        <p className="mb-4 rounded-tile bg-warning-soft px-4 py-2.5 text-[13px] text-warning-strong" role="status">
          {report.notice}
        </p>
      )}

      {report.people.length === 0 ? (
        <p className="py-8 text-center text-sm text-ink-secondary">No real users yet.</p>
      ) : (
        <ul className="divide-y divide-line rounded-field border border-line">
          {report.people.map((p) => {
            const sent = p.emails.filter((e) => !e.failed);
            const opened = sent.filter((e) => e.opened).length;
            const clicked = sent.filter((e) => e.clicked).length;
            return (
              <li key={p.userId}>
                <details className="group">
                  <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 hover:bg-ink/[0.02] [&::-webkit-details-marker]:hidden">
                    <div className="min-w-0 flex-1 basis-56">
                      <p className="truncate text-sm font-medium text-ink">{p.name}</p>
                      <p className="truncate font-mono text-xs text-ink-faint">{p.email}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-[12px] text-ink-secondary">
                      <PlanBadge plan={p.plan} paid={p.paid} />
                      <span className="inline-flex items-center gap-1" title="Websites">
                        <Globe className="size-3.5" aria-hidden />
                        {p.websites}
                      </span>
                      <span title="Emails sent · opened · clicked" className="tabular-nums">
                        {sent.length} sent · <span className={opened ? "font-semibold text-success" : ""}>{opened} opened</span>
                        {" · "}
                        <span className={clicked ? "font-semibold text-success" : ""}>{clicked} clicked</span>
                      </span>
                      <span className="text-ink-faint">joined {fmt(p.signedUpAt)}</span>
                      <ChevronDown className="size-4 text-ink-faint transition-transform group-open:rotate-180" aria-hidden />
                    </div>
                  </summary>
                  <div className="border-t border-line bg-surface/60 px-4 py-3">
                    {p.emails.length === 0 ? (
                      <p className="text-[13px] text-ink-secondary">Nothing sent to this person yet.</p>
                    ) : (
                      <ul className="space-y-2">
                        {p.emails.map((e, i) => (
                          <li key={i} className="flex items-center gap-3 text-[13px]">
                            <EmailState e={e} />
                            <span className="min-w-0 flex-1 truncate text-ink">
                              <span className="font-medium">{e.label}</span>
                              {e.subject && e.subject !== e.label && (
                                <span className="text-ink-secondary"> - {e.subject}</span>
                              )}
                            </span>
                            <span className="shrink-0 text-xs text-ink-faint">{fmt(e.sentAt)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </details>
              </li>
            );
          })}
        </ul>
      )}
      {unknownOpensNote && <p className="mt-3 text-[12px] text-ink-faint">{unknownOpensNote}</p>}
    </Card>
  );
}
