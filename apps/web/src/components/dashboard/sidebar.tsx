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
  LogOut,
  Settings,
} from "lucide-react";
import { LogoMark } from "@/components/logo";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/websites", label: "Websites", icon: Globe },
  { href: "/dashboard/changes", label: "Changes", icon: GitCompareArrows },
  { href: "/dashboard/scans", label: "Scan History", icon: History },
  { href: "/dashboard/notifications", label: "Notifications", icon: Bell },
  { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function DashboardSidebar({ workspaceName }: { workspaceName: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="flex h-full flex-col">
      <Link href="/dashboard" className="mb-1 flex items-center gap-2.5 px-3 py-2">
        <LogoMark />
        <span className="min-w-0">
          <span className="block text-[15px] font-semibold tracking-tight text-ink">
            Fluxen
          </span>
          <span className="block truncate text-[11px] text-ink-faint">{workspaceName}</span>
        </span>
      </Link>

      <nav className="mt-4 flex-1 space-y-1" aria-label="Dashboard">
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
                "flex items-center gap-3 rounded-full px-4 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-ink text-white"
                  : "text-ink-secondary hover:bg-black/5 hover:text-ink",
              )}
            >
              <item.icon className="size-4.5 shrink-0" aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <button
        onClick={handleSignOut}
        className="mt-4 flex items-center gap-3 rounded-full px-4 py-2.5 text-sm font-medium text-ink-secondary transition-colors hover:bg-black/5 hover:text-ink"
      >
        <LogOut className="size-4.5 shrink-0" aria-hidden />
        Sign out
      </button>
    </aside>
  );
}
