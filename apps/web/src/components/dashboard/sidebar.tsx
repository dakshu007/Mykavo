"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  CreditCard,
  Globe,
  History,
  LayoutDashboard,
  GitCompareArrows,
  SearchCheck,
  BarChart3,
  ShieldCheck,
  LogOut,
  Gauge,
  PenLine,
  Settings,
  UserPlus,
  Smartphone,
  MailQuestion,
  Workflow,
  Megaphone,
  Sparkles,
} from "lucide-react";
import { ShopifyGlyph, WordPressGlyph } from "@/components/brand/integration-icons";
import { LogoMark } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { CommandPaletteTrigger } from "@/components/dashboard/command-palette";
import {
  WorkspaceSwitcher,
  type WorkspaceOption,
} from "@/components/dashboard/workspace-switcher";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { dashboardNav, isNavItemActive, type NavItemId } from "@/lib/dashboard-nav";

/**
 * One icon per navigation item. Typed as a total record over NavItemId, so
 * adding an item to lib/dashboard-nav without an icon is a compile error
 * rather than a blank space in the sidebar.
 */
const ICONS: Record<NavItemId, React.ComponentType<{ className?: string }>> = {
  overview: LayoutDashboard,
  websites: Globe,
  changes: GitCompareArrows,
  scans: History,
  "site-audit": SearchCheck,
  "search-console": BarChart3,
  analyser: ShieldCheck,
  wordpress: WordPressGlyph,
  shopify: ShopifyGlyph,
  "ai-assistants": Sparkles,
  notifications: Bell,
  billing: CreditCard,
  settings: Settings,
  blog: PenLine,
  users: UserPlus,
  usage: Gauge,
  "app-requests": MailQuestion,
  automations: Workflow,
  "email-marketing": Megaphone,
  app: Smartphone,
};

export function DashboardSidebar({
  workspaceName,
  upgradeCard,
  monitoringLive = false,
  appApproved = false,
  isBlogAdmin = false,
  isPlatformAdmin = false,
  workspaces = [],
  currentWorkspaceId,
}: {
  workspaceName: string;
  /** Rendered upsell, or null on a paid plan. Passed in because the plan
      lookup is a server query and this is a client component. */
  upgradeCard?: React.ReactNode;
  /** First-run loop complete - reveals the "Deeper analysis" group. */
  monitoringLive?: boolean;
  /** Approved for the Android app - adds the download entry. */
  appApproved?: boolean;
  isBlogAdmin?: boolean;
  isPlatformAdmin?: boolean;
  /** All workspaces the user belongs to - switcher renders when >1. */
  workspaces?: WorkspaceOption[];
  currentWorkspaceId?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const groups = dashboardNav({ monitoringLive, appApproved, isBlogAdmin, isPlatformAdmin });

  async function handleSignOut() {
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="flex h-full flex-col">
      <Link href="/dashboard" className="mb-1 flex items-center gap-2.5 px-3 py-2">
        <LogoMark size={30} />
        <span className="min-w-0">
          <span className="block text-[15px] font-semibold tracking-tight text-ink">
            MyKavo
          </span>
          <span className="block truncate text-[11px] text-ink-faint">{workspaceName}</span>
        </span>
      </Link>

      {workspaces.length > 1 && currentWorkspaceId && (
        <WorkspaceSwitcher
          workspaces={workspaces}
          currentWorkspaceId={currentWorkspaceId}
        />
      )}

      <nav
        data-lenis-prevent
        className="scroll-quiet mt-2 min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain py-2 pr-1"
        aria-label="Dashboard"
      >
        {groups.map((group) => (
          <div key={group.id} className={group.label ? "pt-3" : undefined}>
            {group.label && (
              <p className="px-4 pb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                {group.label}
              </p>
            )}
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = ICONS[item.id];
                const active = isNavItemActive(item, pathname);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-full px-4 py-2.5 text-sm font-medium transition-colors",
                      active
                        ? "bg-ink text-ink-inverse"
                        : "text-ink-secondary hover:bg-ink/5 hover:text-ink",
                    )}
                  >
                    <Icon className="size-4.5 shrink-0" aria-hidden />
                    {item.label}
                    {item.badge && (
                      <span
                        className={cn(
                          "ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                          active ? "bg-ink-inverse/15 text-ink-inverse" : "bg-primary-soft text-accent",
                        )}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Pinned footer. `shrink-0` keeps search, the upsell and sign-out at
          their natural height; the nav above scrolls instead. Before this the
          nav could not shrink, so on a short viewport the upgrade card and
          sign-out button spilled out past the sidebar's rounded edge. */}
      <div className="mt-3 shrink-0 space-y-3">
        <CommandPaletteTrigger />

        {upgradeCard}

        <div className="flex items-center justify-between gap-2 px-1">
          <span className="px-3 text-[11px] font-medium text-ink-faint">Theme</span>
          <ThemeToggle />
        </div>

        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-full px-4 py-2.5 text-sm font-medium text-ink-secondary transition-colors hover:bg-critical-soft hover:text-critical-strong"
        >
          <LogOut className="size-4.5 shrink-0" aria-hidden />
          Sign out
        </button>
      </div>
    </aside>
  );
}
