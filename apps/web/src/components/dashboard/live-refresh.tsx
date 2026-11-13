"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { liveSignature, type LiveItem, type LiveStatus, type LiveWatch } from "@/lib/live-status";

/**
 * Re-renders the page only when its scan or site audit actually moves.
 *
 * Polls GET /api/live-status (one tiny row) every `intervalMs`, only while the
 * tab is visible, and calls router.refresh() - which re-runs every query on
 * the page - only when the watched signature changes. Stops when the job is
 * done, on an auth or not-found answer, or after `maxMinutes`. Replaces the
 * old fixed-interval full refresh (see lib/live-status.ts).
 */
export function LiveRefresh({
  query,
  initial,
  watch = "status",
  step = 1,
  intervalMs = 10_000,
  maxMinutes = 45,
}: {
  /** "scan=ID" or "audits=ID,ID". */
  query: string;
  /** What the server rendered, so a change before the first poll is not missed. */
  initial: LiveItem[];
  watch?: LiveWatch;
  /** Progress bucket size for watch="progress". */
  step?: number;
  intervalMs?: number;
  maxMinutes?: number;
}) {
  const router = useRouter();
  const seen = useRef(liveSignature(initial, watch, step));
  const initialKey = liveSignature(initial, watch, step);

  useEffect(() => {
    // A fresh server render is the new baseline.
    seen.current = initialKey;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;
    let busy = false;
    const deadline = Date.now() + maxMinutes * 60_000;

    const stop = () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };

    async function poll() {
      if (stopped || busy || document.visibilityState !== "visible") return;
      if (Date.now() > deadline) return stop();
      busy = true;
      try {
        const res = await fetch(`/api/live-status?${query}`, { cache: "no-store" });
        if (res.status === 401 || res.status === 404 || res.status === 400) return stop();
        if (!res.ok) return;
        const body = (await res.json()) as LiveStatus;
        const next = liveSignature(body.items, watch, step);
        if (next !== seen.current) {
          seen.current = next;
          router.refresh();
        }
        if (body.done) stop();
      } catch {
        // Offline or transient: the next tick retries.
      } finally {
        busy = false;
      }
    }

    function schedule() {
      if (stopped) return;
      timer = setTimeout(async () => {
        await poll();
        schedule();
      }, intervalMs);
    }

    // Coming back to the tab: check at once rather than waiting a full tick.
    function onVisible() {
      if (document.visibilityState === "visible") void poll();
    }

    document.addEventListener("visibilitychange", onVisible);
    schedule();
    return stop;
  }, [query, initialKey, watch, step, intervalMs, maxMinutes, router]);

  return null;
}
