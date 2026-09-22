"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { dashboardNav, flattenNav, isNavItemActive } from "@/lib/dashboard-nav";

/**
 * Horizontal pill navigation shown below the lg breakpoint.
 *
 * Reads the same grouped definition as the sidebar (lib/dashboard-nav), so
 * the two can no longer drift - they were separate hand-maintained lists, and
 * a pill row with ten entries is even worse than a sidebar with ten, since it
 * scrolls sideways and most of it is off screen. Group headings do not fit a
 * single scrolling row, so here the grouping shows up as ORDER and as the
 * analysis tools being absent until monitoring is live.
 */
export function DashboardMobileNav({
  monitoringLive = false,
  appApproved = false,
  isBlogAdmin = false,
  isPlatformAdmin = false,
}: {
  monitoringLive?: boolean;
  appApproved?: boolean;
  isBlogAdmin?: boolean;
  isPlatformAdmin?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const items = flattenNav(
    dashboardNav({ monitoringLive, appApproved, isBlogAdmin, isPlatformAdmin }),
  );

  async function handleSignOut() {
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="mb-4 lg:hidden">
      <div className="mb-3 flex items-center justify-between">
        <Link href="/dashboard" aria-label="Dashboard home" className="inline-flex">
          <Logo markSize={24} wordmarkClassName="text-[15px]" />
        </Link>
        <button
          onClick={handleSignOut}
          className="inline-flex items-center gap-1.5 rounded-full bg-card px-3.5 py-2 text-xs font-medium text-ink-secondary shadow-card transition-colors hover:bg-critical-soft hover:text-critical-strong"
        >
          <LogOut className="size-3.5" aria-hidden /> Sign out
        </button>
      </div>
      <nav
        className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label="Dashboard"
      >
        {items.map((item) => {
          const active = isNavItemActive(item, pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "shrink-0 rounded-full px-4 py-2 text-[13px] font-medium transition-colors",
                active
                  ? "bg-ink text-ink-inverse"
                  : "bg-card text-ink-secondary shadow-card hover:text-ink",
              )}
            >
              {item.short ?? item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
