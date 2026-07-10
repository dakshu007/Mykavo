import Link from "next/link";
import { cookies } from "next/headers";
import { Bell, FileSearch, Globe, Plus, ShieldCheck } from "lucide-react";
import { prisma, getLatestHealthChecksForWorkspace } from "@fluxen/database";
import { WEBHOOK_CHANNEL_TYPES } from "@fluxen/shared";
import { requireSession, getCurrentWorkspace } from "@/lib/session";
import { deriveOnboarding, ONBOARDING_DISMISSED_COOKIE } from "@/lib/onboarding";
import { Card, CardHeader, IconChip } from "@/components/ui/card";
import { LogoMark } from "@/components/brand/logo";
import { OnboardingChecklist } from "@/components/dashboard/onboarding-checklist";
import { WebsiteStatusBadge } from "@/components/dashboard/website-status";

export default async function DashboardOverviewPage() {
  const session = await requireSession();
  const workspace = await getCurrentWorkspace(session.user.id, session.user.name);

  const cookieStore = await cookies();
  const checklistDismissed =
    cookieStore.get(ONBOARDING_DISMISSED_COOKIE)?.value === workspace.id;

  // Checklist-only counts are skipped entirely once the card is dismissed —
  // websites/pages/baselines below already cover the first three steps.
  const skip = Promise.resolve(0);
  const [
    websites,
    pageCount,
    baselineCount,
    openChanges,
    healthChecks,
    completedScans,
    extraChannels,
    memberCount,
    pendingInvites,
  ] = await Promise.all([
    prisma.website.findMany({
      where: { workspaceId: workspace.id },
      include: {
        _count: { select: { monitoredPages: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.monitoredPage.count({ where: { website: { workspaceId: workspace.id } } }),
    prisma.baseline.count({
      where: { status: "ACTIVE", website: { workspaceId: workspace.id } },
    }),
    prisma.changeEvent.count({
      where: { website: { workspaceId: workspace.id }, status: { in: ["NEW", "REVIEWED"] } },
    }),
    getLatestHealthChecksForWorkspace(prisma, workspace.id),
    checklistDismissed
      ? skip
      : prisma.scan.count({
          where: {
            website: { workspaceId: workspace.id },
            status: { in: ["COMPLETED", "PARTIAL"] },
          },
        }),
    checklistDismissed
      ? skip
      : prisma.notificationChannel.count({
          where: { workspaceId: workspace.id, type: { in: [...WEBHOOK_CHANNEL_TYPES] } },
        }),
    checklistDismissed
      ? skip
      : prisma.workspaceMember.count({ where: { workspaceId: workspace.id } }),
    checklistDismissed
      ? skip
      : prisma.workspaceInvite.count({
          where: {
            workspaceId: workspace.id,
            acceptedAt: null,
            expiresAt: { gt: new Date() },
          },
        }),
  ]);
  const healthByWebsite = new Map(healthChecks.map((h) => [h.websiteId, h.up]));

  const onboarding = deriveOnboarding({
    websites: websites.length,
    monitoredPages: pageCount,
    completedScans,
    activeBaselines: baselineCount,
    extraChannels,
    members: memberCount,
    pendingInvites,
  });
  const showChecklist = !checklistDismissed && !onboarding.allRequiredDone;

  const stats = [
    { label: "Websites monitored", value: websites.length, icon: Globe },
    { label: "Pages monitored", value: pageCount, icon: FileSearch },
    { label: "Baselined pages", value: baselineCount, icon: ShieldCheck },
    { label: "Open changes", value: openChanges, icon: Bell },
  ];

  return (
    <div className="space-y-6">
      {showChecklist && (
        <OnboardingChecklist steps={onboarding.steps} doneCount={onboarding.doneCount} />
      )}

      {websites.length === 0 ? (
        // Zero websites: a grid of zeros says nothing — lead with the one
        // action that matters instead.
        <div className="rounded-card bg-card px-8 py-14 text-center shadow-card">
          <span className="mb-5 inline-flex size-14 items-center justify-center rounded-2xl bg-primary-soft">
            <LogoMark size={30} aria-hidden />
          </span>
          <h2 className="text-2xl font-semibold tracking-tight text-ink">
            Monitor your first website
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-secondary">
            Fluxen discovers your pages, captures an approved baseline, then alerts you when
            something important changes or breaks.
          </p>
          <Link
            href="/dashboard/websites/new"
            className="mt-7 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-primary px-7 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
          >
            <Plus className="size-4" aria-hidden /> Add website
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((s) => (
            <Card key={s.label}>
              <CardHeader
                title={s.label}
                action={
                  <IconChip className="bg-surface">
                    <s.icon className="size-4.5 text-ink-secondary" aria-hidden />
                  </IconChip>
                }
              />
              <p className="text-5xl font-semibold tracking-tight text-ink">{s.value}</p>
            </Card>
          ))}
        </div>
      )}

      {websites.length > 0 && (
        <Card>
          <CardHeader
            title="Your websites"
            action={
              <Link
                href="/dashboard/websites"
                className="text-[13px] font-medium text-primary hover:underline"
              >
                View all →
              </Link>
            }
          />
          <ul className="divide-y divide-line">
            {websites.slice(0, 5).map((w) => (
              <li key={w.id}>
                <Link
                  href={`/dashboard/websites/${w.id}`}
                  className="group flex items-center gap-4 py-3.5"
                >
                  <span
                    aria-label={
                      healthByWebsite.get(w.id) === undefined
                        ? "Health unknown"
                        : healthByWebsite.get(w.id)
                          ? "Up"
                          : "Down"
                    }
                    title={
                      healthByWebsite.get(w.id) === undefined
                        ? "Health unknown"
                        : healthByWebsite.get(w.id)
                          ? "Up"
                          : "Down"
                    }
                    className={`inline-block size-2.5 shrink-0 rounded-full ${
                      healthByWebsite.get(w.id) === undefined
                        ? "bg-line"
                        : healthByWebsite.get(w.id)
                          ? "bg-green-500"
                          : "bg-red-500"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink group-hover:text-primary">
                      {w.name}
                    </p>
                    <p className="truncate font-mono text-xs text-ink-faint">
                      {new URL(w.url).hostname} · {w._count.monitoredPages} page
                      {w._count.monitoredPages === 1 ? "" : "s"}
                    </p>
                  </div>
                  <WebsiteStatusBadge status={w.status} />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
