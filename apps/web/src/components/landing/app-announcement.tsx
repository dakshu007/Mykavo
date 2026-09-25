"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Smartphone, X } from "lucide-react";
import { RequestAppButton } from "./request-app-dialog";
import { ANDROID_APP_PAGE_PATH } from "@/config/android-app";

/**
 * "MyKavo for Android is here" - the standing announcement, on every
 * marketing page.
 *
 * WHY IT IS HERE AND NOT ONLY ON THE HOMEPAGE
 * Search Console says most arrivals land on a blog post or a free tool, not
 * on `/`. Somebody who reads "10 Best Website Change Detection Tools" and
 * leaves never sees the Android section at all, so the announcement travels
 * with the nav instead - which all thirteen marketing pages already render.
 *
 * DISMISSAL IS REMEMBERED. An announcement that reappears on every page of a
 * session stops being an announcement and becomes a pop-up, and the person it
 * annoys most is the one reading three articles in a row. Thirty days, in
 * localStorage - and every read is wrapped, because Safari's private mode
 * throws on access rather than returning null.
 */

const KEY = "mykavo-app-announcement-dismissed";
const REMEMBER_MS = 30 * 24 * 60 * 60 * 1000;

function dismissedRecently(): boolean {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return false;
    const at = Number(raw);
    return Number.isFinite(at) && Date.now() - at < REMEMBER_MS;
  } catch {
    return false;
  }
}

export function AppAnnouncement() {
  // Starts hidden and is revealed by an effect, never rendered on the server:
  // the decision depends on localStorage, and markup that says "visible" then
  // flips to hidden on hydration is a flash of something the reader dismissed
  // last week.
  const [state, setState] = useState<"hidden" | "shown">("hidden");

  useEffect(() => {
    if (dismissedRecently()) return;
    // A short delay so it arrives after the page has settled rather than
    // competing with first paint - and so it reads as a notification rather
    // than part of the layout.
    const timer = window.setTimeout(() => setState("shown"), 1400);
    return () => window.clearTimeout(timer);
  }, []);

  function dismiss() {
    setState("hidden");
    try {
      window.localStorage.setItem(KEY, String(Date.now()));
    } catch {
      // Private mode - it simply reappears next visit.
    }
  }

  const pathname = usePathname();
  // The Android page is the announcement, so it would only cover its own hero.
  if (state === "hidden" || pathname === ANDROID_APP_PAGE_PATH) return null;

  return (
    <div
      role="region"
      aria-label="MyKavo for Android"
      /* Bottom-LEFT on desktop so it never sits under the homepage's
         centred sticky CTA; on mobile it is raised above that pill instead
         of stacking on top of it. */
      className="fixed bottom-24 left-4 right-4 z-40 sm:bottom-5 sm:right-auto sm:max-w-sm"
    >
      <div className="flex items-start gap-3 rounded-2xl border border-[#151515] bg-[#151515] p-4 shadow-[6px_6px_0_#FFD400,6px_6px_0_1px_#151515]">
        <span className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#FFD400]">
          <Smartphone className="size-4.5 text-[#151515]" aria-hidden />
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold text-[#F5F5F0]">
            The MyKavo Android app is here
          </p>
          <p className="mt-0.5 text-[12.5px] leading-5 text-[#9C9E93]">
            Every site you monitor, on your phone - with push alerts the moment
            something changes. Access is being approved in batches.
          </p>
          <div className="mt-3">
            <RequestAppButton variant="bar" label="Apply for access" />
          </div>
        </div>

        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="-mr-1 -mt-1 shrink-0 rounded-full p-1.5 text-[#9C9E93] transition-colors hover:bg-white/10 hover:text-[#F5F5F0]"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
