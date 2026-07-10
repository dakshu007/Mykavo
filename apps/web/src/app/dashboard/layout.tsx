import type { Metadata } from "next";
import { headers } from "next/headers";
import { prisma } from "@fluxen/database";
import { requireSession, getCurrentWorkspace } from "@/lib/session";
import { isBlogAdmin } from "@/lib/blog-admin";
import { greetingForHour, hourInTimeZone, timezoneFromNetlifyGeo } from "@/lib/greeting";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { DashboardMobileNav } from "@/components/dashboard/mobile-nav";
import { CommandPalette } from "@/components/dashboard/command-palette";
import { Greeting } from "@/components/dashboard/greeting";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false },
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();
  const workspace = await getCurrentWorkspace(session.user.id, session.user.name);

  // Greeting follows the visitor's clock, not the server's (Netlify = UTC).
  // Server guess from the request's geo timezone; the client re-derives from
  // the actual local clock after mount.
  const visitorTz = timezoneFromNetlifyGeo((await headers()).get("x-nf-geo"));
  const visitorHour = (visitorTz ? hourInTimeZone(visitorTz) : null) ?? new Date().getHours();
  const initialGreeting = greetingForHour(visitorHour);
  // All memberships power the sidebar workspace switcher (shown when >1).
  const memberships = await prisma.workspaceMember.findMany({
    where: { userId: session.user.id },
    select: { workspace: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-360 gap-6 p-4 lg:p-6">
      <CommandPalette isBlogAdmin={isBlogAdmin(session.user.email)} />
      <div className="sticky top-6 hidden h-[calc(100vh-3rem)] w-60 shrink-0 rounded-card bg-card p-3 shadow-card lg:block">
        <DashboardSidebar
          workspaceName={workspace.name}
          isBlogAdmin={isBlogAdmin(session.user.email)}
          workspaces={memberships.map((m) => m.workspace)}
          currentWorkspaceId={workspace.id}
        />
      </div>
      <div className="min-w-0 flex-1 rounded-card bg-surface p-5 sm:p-7">
        <DashboardMobileNav isBlogAdmin={isBlogAdmin(session.user.email)} />
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <Greeting
              name={session.user.name.split(" ")[0]}
              initialGreeting={initialGreeting}
            />
            <p className="text-[13px] text-ink-secondary">
              Here&apos;s what changed across your websites
            </p>
          </div>
          {session.user.image ? (
            // eslint-disable-next-line @next/next/no-img-element -- avatar may be an inline data URL, which next/image cannot optimize
            <img
              src={session.user.image}
              alt={`${session.user.name} profile photo`}
              className="size-11 shrink-0 rounded-full bg-card object-cover shadow-card"
            />
          ) : (
            <span
              className="inline-flex size-11 items-center justify-center rounded-full bg-card text-sm font-semibold text-ink shadow-card"
              aria-label="Account"
            >
              {session.user.name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}
