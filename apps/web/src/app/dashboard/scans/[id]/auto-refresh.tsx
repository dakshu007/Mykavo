"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Refreshes the server component while a scan is still in flight. */
export function AutoRefresh({ intervalMs = 3000 }: { intervalMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const timer = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(timer);
  }, [router, intervalMs]);
  return null;
}
