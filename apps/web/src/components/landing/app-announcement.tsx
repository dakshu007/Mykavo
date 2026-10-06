"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { ArrowUpRight, X } from "lucide-react";
import { track } from "@/lib/analytics";
import { CHROME_EXTENSION_PAGE_PATH, CHROME_EXTENSION_VERSION, CHROME_STORE_URL } from "@/config/chrome-extension";
import { ChromeMark } from "./chrome-store-button";

/**
 * "MyKavo for Chrome is live" - the standing announcement, on every
 * marketing page. (It announced the Android app until the Chrome extension
 * launched; the Android app keeps its nav link and homepage section.)
 *
 * WHY IT IS HERE AND NOT ONLY ON THE HOMEPAGE
 * Search Console says most arrivals land on a blog post or a free tool, not
 * on `/`. Somebody who reads "10 Best Website Change Detection Tools" and
 * leaves never sees the Android section at all, so the announcement travels
 * with the nav instead - which all the marketing pages already render.
 *
 * DISMISSAL IS REMEMBERED. An announcement that reappears on every page of a
 * session stops being an announcement and becomes a pop-up, and the person it
 * annoys most is the one reading three articles in a row. Thirty days, in
 * localStorage - and every read is wrapped, because Safari's private mode
 * throws on access rather than returning null.
 */

// A new key per announcement: dismissing the Android one doesn't hide this.
const KEY = "mykavo-chrome-launch-dismissed";
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
  // The extension's page is the announcement, so it would only cover its own hero.
  if (state === "hidden" || pathname === CHROME_EXTENSION_PAGE_PATH) return null;

  return (
    <div
      role="region"
      aria-label="MyKavo for Chrome"
      /* Bottom-LEFT on desktop so it never sits under the homepage's
         centred sticky CTA; on mobile it is raised above that pill instead
         of stacking on top of it. */
      className="fixed bottom-24 left-4 right-4 z-40 sm:bottom-5 sm:right-auto sm:max-w-sm"
    >
      <div className="flex items-start gap-3 rounded-2xl border border-[#151515] bg-[#151515] p-4 shadow-[6px_6px_0_#FFD400,6px_6px_0_1px_#151515]">
        <span className="relative mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#FFD400]">
          <ChromeMark className="size-5 text-[#151515]" />
          <span className="absolute -right-1 -top-1 flex size-3">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#34C979] opacity-70 motion-reduce:animate-none" />
            <span className="relative inline-flex size-3 rounded-full border-2 border-[#151515] bg-[#34C979]" />
          </span>
        </span>

        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#FFD400]">
            Just launched · v{CHROME_EXTENSION_VERSION}
          </p>
          <p className="mt-1 text-[14px] font-semibold text-[#F5F5F0]">MyKavo for Chrome is live</p>
          <p className="mt-0.5 text-[12.5px] leading-5 text-[#9C9E93]">
            Check any page&apos;s SEO in one click, and protect the website with one more. Free.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
            {CHROME_STORE_URL && (
              <a
                href={CHROME_STORE_URL}
                target="_blank"
                rel="noopener"
                onClick={() => track("chrome_store_clicked", { placement: "announcement", version: CHROME_EXTENSION_VERSION })}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#FFD400] px-3.5 py-2 text-[12.5px] font-semibold text-[#151515] transition-colors hover:bg-[#ffe14d]"
              >
                Try it now
                <ArrowUpRight className="size-3.5" aria-hidden />
              </a>
            )}
            <Link
              href={CHROME_EXTENSION_PAGE_PATH}
              className="text-[12.5px] font-semibold text-[#E9EBDF] underline decoration-[#FFD400] decoration-2 underline-offset-4"
            >
              See how it works
            </Link>
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
