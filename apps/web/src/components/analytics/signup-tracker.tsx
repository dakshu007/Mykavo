"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics";

/**
 * Sends account_created once, after a new account first reaches the
 * dashboard. Firing it on the sign-up form lost most Google sign-ups: the
 * page leaves for Google before the event is sent, and Google Analytics
 * itself loads late. Here the account certainly exists, so every signup is
 * counted once, with where it came from.
 */
export function SignupTracker({
  userId,
  landing,
  referrer,
  cta,
  method,
}: {
  userId: string;
  landing: string;
  referrer: string;
  cta: string;
  method: string;
}) {
  useEffect(() => {
    const key = `mk-signup-tracked-${userId}`;
    try {
      if (window.localStorage.getItem(key)) return;
    } catch {
      // No storage: the server window (first hour) still limits repeats.
    }
    let tries = 0;
    let timer: number | undefined;
    const send = () => {
      const w = window as Window & { gtag?: unknown };
      // gtag.js loads lazily; wait for it (up to ~20 s) so the event is not dropped.
      if (typeof w.gtag !== "function" && tries++ < 40 && process.env.NODE_ENV === "production") {
        timer = window.setTimeout(send, 500);
        return;
      }
      track("account_created", { method, landing, referrer: referrer || "direct", cta: cta || "none" });
      try {
        window.localStorage.setItem(key, "1");
      } catch {
        // ignore
      }
    };
    send();
    return () => window.clearTimeout(timer);
  }, [userId, landing, referrer, cta, method]);

  return null;
}
