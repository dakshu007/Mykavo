"use client";

import Link from "next/link";
import { useEffect, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { Bell, CircleHelp, Layers, PanelLeft, Plus, Search, Sparkles } from "lucide-react";
import { dashboardNav, flattenNav, isNavItemActive, type NavAccess } from "@/lib/dashboard-nav";
import { OPEN_EVENT as OPEN_PALETTE_EVENT } from "@/components/dashboard/command-palette";
import { cn } from "@/lib/utils";
const COLLAPSED_KEY = "mk-dash-sidebar-collapsed";
const SHELL_ID = "dashboard-shell";

const noopSubscribe = () => () => {};

function setCollapsed(collapsed: boolean) {
  const shell = document.getElementById(SHELL_ID);
  if (!shell) return;
  if (collapsed) shell.setAttribute("data-sidebar-collapsed", "");
  else shell.removeAttribute("data-sidebar-collapsed");
  try {
    window.localStorage.setItem(COLLAPSED_KEY, collapsed ? "1" : "0");
  } catch {
    // Storage blocked: the toggle still works for this page view.
  }
}

/**
 * The bar across the top of every dashboard page: a sidebar toggle and where
 * you are on the left; search, help, alerts and the two actions people take
 * most on the right.
 */
export function DashboardTopbar({
  workspaceName,
  access,
  attentionCount,
  showUpgrade,
  canAddWebsite,
}: {
  workspaceName: string;
  access: NavAccess;
  /** Open high and critical changes: puts a dot on the bell. */
  attentionCount: number;
  /** Free or trial, and allowed to manage billing. */
  showUpgrade: boolean;
  /** Viewers cannot add websites, so they do not get the button. */
  canAddWebsite: boolean;
}) {
  const pathname = usePathname();
  const current = flattenNav(dashboardNav(access)).find((item) => isNavItemActive(item, pathname));

  const isMac = useSyncExternalStore(
    noopSubscribe,
    () => /Mac|iPhone|iPad/.test(window.navigator.platform),
    () => true,
  );

  // Restore the last sidebar state once mounted.
  useEffect(() => {
    try {
      if (window.localStorage.getItem(COLLAPSED_KEY) === "1") setCollapsed(true);
    } catch {
      // ignore
    }
  }, []);

  const iconButton =
    "relative inline-flex size-9 items-center justify-center rounded-lg text-ink-secondary transition-colors hover:bg-ink/5 hover:text-ink";

  return (
    <header className="sticky top-3 z-30 flex h-14 items-center gap-2 rounded-xl border border-line bg-card px-2.5 shadow-[0_1px_2px_rgb(22_24_29/4%)] sm:px-3">
      <button
        type="button"
        onClick={() => setCollapsed(!document.getElementById(SHELL_ID)?.hasAttribute("data-sidebar-collapsed"))}
        aria-label="Toggle sidebar"
        className={cn(iconButton, "hidden lg:inline-flex")}
      >
        <PanelLeft className="size-[18px]" aria-hidden />
      </button>
      <span aria-hidden className="mx-1 hidden h-5 w-px bg-line lg:block" />

      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-[13px]">
        <Layers className="size-4 shrink-0 text-ink-faint" aria-hidden />
        <span className="hidden truncate text-ink-secondary sm:inline">{workspaceName}</span>
        {current && (
          <>
            <span className="hidden text-ink-faint sm:inline">/</span>
            <span className="truncate font-medium text-ink">{current.label}</span>
          </>
        )}
      </nav>

      <div className="ml-auto flex items-center gap-1 sm:gap-1.5">
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event(OPEN_PALETTE_EVENT))}
          className="hidden h-9 items-center gap-2 rounded-lg border border-line px-2.5 text-[12.5px] text-ink-faint transition-colors hover:bg-ink/5 hover:text-ink md:inline-flex"
        >
          <Search className="size-4" aria-hidden />
          Search
          <kbd className="rounded bg-surface px-1.5 py-0.5 text-[10.5px] font-semibold">
            {isMac ? "⌘K" : "Ctrl K"}
          </kbd>
        </button>
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event(OPEN_PALETTE_EVENT))}
          aria-label="Search"
          className={cn(iconButton, "md:hidden")}
        >
          <Search className="size-[18px]" aria-hidden />
        </button>
        <Link href="/docs" aria-label="Help and docs" className={iconButton}>
          <CircleHelp className="size-[18px]" aria-hidden />
        </Link>
        <Link
          href="/dashboard/changes"
          aria-label={
            attentionCount > 0
              ? `Changes: ${attentionCount} high or critical open`
              : "Changes"
          }
          className={iconButton}
        >
          <Bell className="size-[18px]" aria-hidden />
          {attentionCount > 0 && (
            <span aria-hidden className="absolute right-2 top-2 size-2 rounded-full bg-critical ring-2 ring-card" />
          )}
        </Link>

        {showUpgrade && (
          <Link
            href="/dashboard/billing?from=topbar"
            className="ml-1 hidden h-9 items-center gap-1.5 rounded-full border border-line px-3.5 text-[13px] font-medium text-ink transition-colors hover:bg-ink/5 sm:inline-flex"
          >
            <Sparkles className="size-3.5 text-accent" aria-hidden />
            Upgrade to Pro
          </Link>
        )}
        {canAddWebsite && (
          <Link
            href="/dashboard/websites/new"
            className="ml-1 inline-flex h-9 items-center gap-1.5 rounded-full bg-ink px-3.5 text-[13px] font-semibold text-ink-inverse transition-colors hover:bg-ink-hover"
          >
            <Plus className="size-4" aria-hidden />
            <span className="hidden sm:inline">Add website</span>
          </Link>
        )}
      </div>
    </header>
  );
}
