import { BellRing, History, Mail, type LucideIcon } from "lucide-react";
import { prisma } from "@mykavo/database";
import { requireSession, getCurrentWorkspace } from "@/lib/session";
import { getEmailSettings, type EmailSettings } from "@/lib/notification-settings";
import { getAlertChannels, type AlertChannelView } from "@/lib/notification-channels";
import { NotificationSettingsForm } from "@/components/dashboard/notification-settings-form";
import { AlertChannels } from "@/components/dashboard/alert-channels";
import { slackInstallConfigured } from "@/lib/integrations/slack";
import { NotificationHistory } from "./history";

const LEVEL: Record<EmailSettings["minSeverity"], string> = {
  MEDIUM: "Medium, high and critical",
  HIGH: "High and critical",
  CRITICAL: "Critical",
};

const CHANNEL_NAME: Record<AlertChannelView["type"], string> = {
  SLACK: "Slack",
  DISCORD: "Discord",
  WEBHOOK: "a webhook",
};

/** "1 email and Slack", "2 emails, Slack and a webhook", "Slack". */
function destinations(settings: EmailSettings, channels: AlertChannelView[]): string[] {
  const out: string[] = [];
  if (settings.enabled) {
    const n = settings.recipients.length;
    out.push(`${n} email${n === 1 ? "" : "s"}`);
  }
  for (const c of channels) if (c.enabled) out.push(CHANNEL_NAME[c.type]);
  return out;
}

function joinList(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/**
 * One section of the page: a micro label, a title and a one-line description
 * in the same header row everywhere (the Settings page's pattern), then its
 * content. Anchored by id for the index on the left.
 */
function Section({
  id,
  label,
  title,
  description,
  children,
}: {
  id: string;
  label: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="scroll-mt-24 overflow-hidden rounded-2xl border border-line bg-card"
    >
      <header className="border-b border-line px-5 py-4 sm:px-6">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-faint">{label}</p>
        <h2 id={`${id}-title`} className="mt-1 text-[16px] font-semibold tracking-tight text-ink">
          {title}
        </h2>
        <p className="mt-0.5 text-[13px] text-ink-secondary">{description}</p>
      </header>
      <div className="px-5 py-5 sm:px-6">{children}</div>
    </section>
  );
}

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ slack?: string }>;
}) {
  const { slack } = await searchParams;
  const session = await requireSession();
  const workspace = await getCurrentWorkspace(session.user.id, session.user.name);
  const now = new Date();
  const since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [settings, channels, history, sent30, failed30] = await Promise.all([
    getEmailSettings(workspace.id, session.user.email),
    getAlertChannels(workspace.id),
    prisma.notification.findMany({
      where: { workspaceId: workspace.id },
      include: { website: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 25,
    }),
    prisma.notification.count({
      where: { workspaceId: workspace.id, status: "SENT", createdAt: { gte: since } },
    }),
    prisma.notification.count({
      where: { workspaceId: workspace.id, status: "FAILED", createdAt: { gte: since } },
    }),
  ]);

  const goesTo = destinations(settings, channels);
  const activeChannels = channels.filter((c) => c.enabled).length;
  const quiet = goesTo.length === 0;

  const readouts: { label: string; value: string; note: string; warn?: boolean }[] = [
    {
      label: "Email alerts",
      value: settings.enabled ? "On" : "Off",
      note: settings.configured ? "Saved by you" : "Default settings",
      warn: !settings.enabled,
    },
    {
      label: "Alert level",
      value: settings.minSeverity === "MEDIUM" ? "Medium+" : settings.minSeverity === "HIGH" ? "High+" : "Critical",
      note: settings.minSeverity === "HIGH" ? "Recommended" : "Your choice",
    },
    {
      label: "Recipients",
      value: String(settings.recipients.length),
      note: `${activeChannels} other channel${activeChannels === 1 ? "" : "s"} on`,
    },
    {
      label: "Sent, 30 days",
      value: String(sent30),
      note: failed30 > 0 ? `${failed30} failed` : "None failed",
      warn: failed30 > 0,
    },
  ];

  const index: { id: string; label: string; icon: LucideIcon }[] = [
    { id: "email", label: "Email", icon: Mail },
    { id: "channels", label: "Alert channels", icon: BellRing },
    { id: "history", label: "Recent alerts", icon: History },
  ];

  return (
    <div className="max-w-5xl">
      <header className="mb-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-faint">Notifications</p>
        <h1 className="mt-1.5 max-w-3xl text-[26px] font-semibold leading-tight tracking-[-0.02em] text-ink sm:text-[28px]">
          {quiet ? (
            <>Alerts are off. Changes are still recorded, but nobody is told.</>
          ) : (
            <>
              {LEVEL[settings.minSeverity]} alerts go to{" "}
              <span className="mk-highlight">{joinList(goesTo)}</span>.
            </>
          )}
        </h1>
        <p className="mt-2 text-[14px] text-ink-secondary">
          One grouped message per scan, never one per change. Choose who hears about it and how loud it gets.
        </p>
      </header>

      <dl className="mb-8 grid grid-cols-2 overflow-hidden rounded-2xl border border-line bg-card lg:grid-cols-4">
        {readouts.map((r, i) => (
          <div
            key={r.label}
            className={[
              "px-4 py-4 sm:px-5",
              i % 2 === 1 ? "border-l border-line" : "",
              i >= 2 ? "border-t border-line lg:border-t-0" : "",
              i === 2 ? "lg:border-l" : "",
            ].join(" ")}
          >
            <dt className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-faint">{r.label}</dt>
            <dd className="mt-1.5 text-[22px] font-semibold tracking-tight text-ink">{r.value}</dd>
            <dd
              className={
                r.warn
                  ? "mt-0.5 flex items-center gap-1.5 text-xs font-medium text-critical-strong"
                  : "mt-0.5 text-xs text-ink-secondary"
              }
            >
              {r.warn && <span aria-hidden className="size-1.5 rounded-full bg-critical" />}
              {r.note}
            </dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-6 lg:grid-cols-[190px_minmax(0,1fr)] lg:gap-10">
        {/* Section index: a sticky list on wide screens, a scrolling chip row on phones. */}
        <nav aria-label="Notification sections" className="lg:sticky lg:top-24 lg:self-start">
          <ul className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 lg:mx-0 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:px-0 lg:pb-0">
            {index.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.id} className="shrink-0">
                  <a
                    href={`#${item.id}`}
                    className="flex items-center gap-2.5 whitespace-nowrap rounded-full border border-line px-3 py-1.5 text-[13px] text-ink-secondary transition-colors hover:bg-ink/[0.04] hover:text-ink lg:rounded-lg lg:border-transparent lg:px-2.5"
                  >
                    <Icon className="size-4 shrink-0 text-ink-faint" aria-hidden />
                    {item.label}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="min-w-0 space-y-5">
          <Section
            id="email"
            label="Email"
            title="Email alerts"
            description="Who gets the grouped summary, which changes are worth an email, and the extras."
          >
            <NotificationSettingsForm initial={settings} />
          </Section>

          <Section
            id="channels"
            label="Channels"
            title="Alert channels"
            description="The same alerts in Slack, Discord or any webhook, alongside email."
          >
            <AlertChannels initial={channels} slackInstall={slackInstallConfigured()} slackResult={slack} />
          </Section>

          <Section
            id="history"
            label="History"
            title="Recent alerts"
            description="The last 25 messages MyKavo sent from this workspace, newest first."
          >
            <NotificationHistory
              items={history.map((n) => ({
                id: n.id,
                subject: n.subject,
                status: n.status,
                channel: n.channelType,
                recipient: n.recipient,
                website: n.website?.name ?? null,
                error: n.errorMessage,
                at: n.createdAt.toISOString(),
              }))}
            />
          </Section>
        </div>
      </div>
    </div>
  );
}
