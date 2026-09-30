"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Tells MyKavo which dashboard page is on screen, for the admin Tracking
 * pages. One small beacon per page, never blocking navigation; the path only
 * (no query string, no page content).
 */
export function ActivityBeacon() {
  const pathname = usePathname();
  useEffect(() => {
    if (!pathname) return;
    const body = JSON.stringify({ path: pathname });
    try {
      if (navigator.sendBeacon?.("/api/activity", new Blob([body], { type: "application/json" }))) return;
    } catch {
      // fall through to fetch
    }
    void fetch("/api/activity", {
      method: "POST",
      body,
      headers: { "content-type": "application/json" },
      keepalive: true,
    }).catch(() => undefined);
  }, [pathname]);
  return null;
}
