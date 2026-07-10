import { BellRing, CheckCircle2, Mail, XCircle } from "lucide-react";
import { prisma } from "@fluxen/database";
import { requireSession, getCurrentWorkspace } from "@/lib/session";
import { getEmailSettings } from "@/lib/notification-settings";
import { getAlertChannels } from "@/lib/notification-channels";
import { Card, CardHeader } from "@/components/ui/card";
import { NotificationSettingsForm } from "@/components/dashboard/notification-settings-form";
import { AlertChannels } from "@/components/dashboard/alert-channels";

export default async function NotificationsPage() {
  const session = await requireSession();
  const workspace = await getCurrentWorkspace(session.user.id, session.user.name);

  const [settings, channels, history] = await Promise.all([
    getEmailSettings(workspace.id, session.user.email),
    getAlertChannels(workspace.id),
    prisma.notification.findMany({
      where: { workspaceId: workspace.id },
      include: { website: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 25,
    }),
  ]);

  return (
    <div className="max-w-2xl space-y-6">
      <Card>
        <CardHeader
          title="Email notifications"
          action={
            <span className="inline-flex size-10 items-center justify-center rounded-xl bg-surface">
              <Mail className="size-4.5 text-ink-secondary" aria-hidden />
            </span>
          }
        />
        <NotificationSettingsForm initial={settings} />
      </Card>

      <Card>
        <CardHeader
          title="Alert channels"
          action={
            <span className="inline-flex size-10 items-center justify-center rounded-xl bg-surface">
              <BellRing className="size-4.5 text-ink-secondary" aria-hidden />
            </span>
          }
        />
        <AlertChannels initial={channels} />
      </Card>

      <Card>
        <CardHeader title="Recent notifications" />
        {history.length === 0 ? (
          <p className="py-4 text-sm text-ink-secondary">
            No notifications sent yet. When a scan finds important changes, a grouped summary is
            emailed to your recipients and logged here.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {history.map((n) => (
              <li key={n.id} className="flex items-center gap-3 py-3">
                {n.status === "SENT" ? (
                  <CheckCircle2 className="size-4.5 shrink-0 text-success" aria-hidden />
                ) : (
                  <XCircle className="size-4.5 shrink-0 text-critical" aria-hidden />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{n.subject}</p>
                  <p className="truncate text-xs text-ink-faint">
                    {n.website?.name ?? "—"} · {n.recipient}
                    {n.errorMessage ? ` · ${n.errorMessage}` : ""}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-ink-faint">
                  {n.createdAt.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
