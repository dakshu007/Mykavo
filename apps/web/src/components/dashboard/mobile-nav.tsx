"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/dashboard", label: "Overview", exact: true },
  { href: "/dashboard/websites", label: "Websites" },
  { href: "/dashboard/changes", label: "Changes" },
  { href: "/dashboard/scans", label: "Scans" },
  { href: "/dashboard/notifications", label: "Notifications" },
  { href: "/dashboard/billing", label: "Billing" },
  { href: "/dashboard/settings", label: "Settings" },
];

/** Horizontal pill navigation shown below the lg breakpoint. */
export function DashboardMobileNav() {
  const pathname = usePathname();
  const router = useRouter();

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
          className="inline-flex items-center gap-1.5 rounded-full bg-card px-3.5 py-2 text-xs font-medium text-ink-secondary shadow-card"
        >
          <LogOut className="size-3.5" aria-hidden /> Sign out
        </button>
      </div>
      <nav
        className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label="Dashboard"
      >
        {nav.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "shrink-0 rounded-full px-4 py-2 text-[13px] font-medium transition-colors",
                active
                  ? "bg-ink text-white"
                  : "bg-card text-ink-secondary shadow-card hover:text-ink",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
