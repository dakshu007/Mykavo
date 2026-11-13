"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
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
  BotMessageSquare,
  Activity,
  LifeBuoy,
  ChevronsUpDown,
  Target,
} from "lucide-react";
import { ShopifyGlyph, WordPressGlyph } from "@/components/brand/integration-icons";
import { LogoMark } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme-toggle";
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
  "ai-assistants": BotMessageSquare,
  notifications: Bell,
  billing: CreditCard,
  settings: Settings,
  blog: PenLine,
  users: UserPlus,
  tracking: Activity,
  usage: Gauge,
  keywords: Target,
  "app-requests": MailQuestion,
  automations: Workflow,
  "email-marketing": Megaphone,
  "support-questions": LifeBuoy,
  app: Smartphone,
};

export function DashboardSidebar({
  workspaceName,
  planLabel,
  user,
  upgradeCard,
  monitoringLive = false,
  appApproved = false,
  isBlogAdmin = false,
  isPlatformAdmin = false,
  workspaces = [],
  currentWorkspaceId,
}: {
  workspaceName: string;
  /** The plan's name for the badge beside the workspace, e.g. "Free", "Pro trial". */
  planLabel: string;
  /** The signed-in person, for the account menu pinned at the bottom. */
  user: { name: string; email: string; image: string | null };
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
      <Link
        href="/dashboard"
        className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-ink/5"
      >
        <LogoMark size={28} />
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-semibold tracking-tight text-ink">MyKavo</span>
          <span className="block truncate text-[11px] text-ink-faint">{workspaceName}</span>
        </span>
        <span className="shrink-0 rounded-md bg-ink/[0.06] px-1.5 py-0.5 text-[10.5px] font-medium text-ink-secondary">
          {planLabel}
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
        className="scroll-quiet -mx-1 mt-1 min-h-0 flex-1 overflow-y-auto overscroll-contain px-1 pb-4 pt-3"
        aria-label="Dashboard"
      >
        {groups.map((group, i) => (
          <div key={group.id} className={i > 0 ? "mt-4 border-t border-line/70 pt-4" : undefined}>
            <p className="px-2 pb-1.5 text-[11px] font-medium text-ink-faint">
              {group.label ?? "Monitoring"}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = ICONS[item.id];
                const active = isNavItemActive(item, pathname);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-[13.5px] transition-colors focus-visible:outline-offset-[-2px]",
                      active
                        ? "bg-ink/[0.07] font-medium text-ink"
                        : "text-ink-secondary hover:bg-ink/[0.04] hover:text-ink",
                    )}
                  >
                    <Icon className="size-4 shrink-0" aria-hidden />
                    {item.label}
                    {item.badge && (
                      <span className="ml-auto rounded-md bg-primary-soft px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
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

      {/* Pinned footer: the plan card, then the account menu. `shrink-0`
          keeps both at their natural height; the nav above scrolls instead. */}
      <div className="mt-3 shrink-0 space-y-3 border-t border-line/70 pt-3">
        {upgradeCard}
        <AccountMenu user={user} onSignOut={handleSignOut} />
      </div>
    </aside>
  );
}

/**
 * The person, at the foot of the sidebar: avatar, name and email, opening a
 * small menu with the theme switch, settings and sign out.
 */
function AccountMenu({
  user,
  onSignOut,
}: {
  user: { name: string; email: string; image: string | null };
  onSignOut: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: PointerEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      {open && (
        <div
          role="menu"
          className="absolute inset-x-0 bottom-full mb-2 rounded-xl border border-line bg-card p-1.5 shadow-card"
        >
          <div className="flex items-center justify-between gap-2 px-2 py-1.5">
            <span className="text-[12px] text-ink-secondary">Theme</span>
            <ThemeToggle />
          </div>
          <Link
            role="menuitem"
            href="/dashboard/settings"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-[13px] text-ink-secondary hover:bg-ink/5 hover:text-ink"
          >
            <Settings className="size-4" aria-hidden />
            Account settings
          </Link>
          <button
            role="menuitem"
            type="button"
            onClick={onSignOut}
            className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-[13px] text-ink-secondary hover:bg-critical-soft hover:text-critical-strong"
          >
            <LogOut className="size-4" aria-hidden />
            Sign out
          </button>
        </div>
      )}
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-ink/5"
      >
        {user.image ? (
          // eslint-disable-next-line @next/next/no-img-element -- avatar may be an inline data URL, which next/image cannot optimize
          <img src={user.image} alt="" className="size-8 shrink-0 rounded-full bg-card object-cover" />
        ) : (
          <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-ink text-[13px] font-semibold text-ink-inverse">
            {user.name.charAt(0).toUpperCase()}
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-medium text-ink">{user.name}</span>
          <span className="block truncate text-[11.5px] text-ink-faint">{user.email}</span>
        </span>
        <ChevronsUpDown className="size-4 shrink-0 text-ink-faint" aria-hidden />
      </button>
    </div>
  );
}
