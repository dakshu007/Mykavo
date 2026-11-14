"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Cookie } from "lucide-react";
import { track } from "@/lib/analytics";
import { isAppPath } from "@/lib/attribution/core";
import { CONSENT_OPEN_EVENT, openConsentSettings, readConsent, saveConsent, type ConsentChoice } from "@/lib/consent";

/**
 * The cookie banner: "Accept all" or "Only essential", asked once a year.
 *
 * Built to cost the page nothing: no third-party consent script, a few
 * hundred bytes of markup, and it only appears a moment after the page has
 * loaded (so it is never the page's largest paint and never delays it). It
 * floats over the page, so it shifts no layout. Public pages only; the
 * signed-in app runs no analytics. "Cookie settings" in the footer reopens it.
 */
export function CookieBanner() {
  const pathname = usePathname() ?? "/";
  // "auto": shown on a first visit; "settings": reopened from the footer link.
  const [open, setOpen] = useState<false | "auto" | "settings">(false);
  const acceptRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onOpen = () => setOpen("settings");
    window.addEventListener(CONSENT_OPEN_EVENT, onOpen);
    let timer: number | undefined;
    if (readConsent() === null) {
      const show = () => {
        timer = window.setTimeout(() => setOpen((o) => o || "auto"), 1200);
      };
      if (document.readyState === "complete") show();
      else window.addEventListener("load", show, { once: true });
    }
    return () => {
      window.removeEventListener(CONSENT_OPEN_EVENT, onOpen);
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, []);

  // Reopened from "Cookie settings": move focus to the banner.
  useEffect(() => {
    if (open === "settings") acceptRef.current?.focus();
  }, [open]);

  if (!open || (open === "auto" && isAppPath(pathname))) return null;

  const choose = (choice: ConsentChoice) => {
    saveConsent(choice);
    track("cookie_consent", { choice, page: pathname });
    setOpen(false);
  };

  return (
    <div
      role="region"
      aria-label="Cookie consent"
      data-track-ignore
      className="cookie-banner fixed inset-x-3 bottom-3 z-[60] sm:inset-x-auto sm:bottom-5 sm:left-5 sm:max-w-[400px]"
    >
      <div className="rounded-2xl border border-[#151515] bg-[#FBFAF3] p-4 text-[#151515] shadow-[4px_4px_0_#151515] sm:p-5">
        <div className="flex items-start gap-3">
          <span aria-hidden className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-[#151515] bg-[#FFD400]">
            <Cookie className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="text-[15px] font-semibold leading-snug">Cookies, kept simple</p>
            <p className="mt-1 text-[13px] leading-5 text-[#151515]/75">
              Essential cookies keep you signed in. With your OK, Google Analytics and Microsoft Clarity show us which pages
              help people. Never for ads, never sold.{" "}
              <Link href="/cookies" prefetch={false} className="font-medium text-[#151515] underline underline-offset-2">
                Cookie Policy
              </Link>
            </p>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <button
            ref={acceptRef}
            type="button"
            onClick={() => choose("all")}
            className="inline-flex h-10 flex-1 items-center justify-center rounded-xl border border-[#151515] bg-[#FFD400] px-4 text-[14px] font-semibold text-[#151515] shadow-[2px_2px_0_#151515] transition-all hover:-translate-y-px hover:shadow-[3px_3px_0_#151515] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#151515] active:translate-y-0 active:shadow-none"
          >
            Accept all
          </button>
          <button
            type="button"
            onClick={() => choose("essential")}
            className="inline-flex h-10 flex-1 items-center justify-center rounded-xl border border-[#151515] bg-white px-4 text-[14px] font-medium text-[#151515] transition-colors hover:bg-[#F3F1E6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#151515]"
          >
            Only essential
          </button>
        </div>
      </div>
    </div>
  );
}

/** Footer link that reopens the banner. */
export function CookieSettingsButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      data-track-ignore
      onClick={openConsentSettings}
      className={className}
    >
      Cookie settings
    </button>
  );
}
