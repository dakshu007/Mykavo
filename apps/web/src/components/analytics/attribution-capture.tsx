"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import {
  CTA_COOKIE,
  CTA_MAX_AGE,
  cleanPath,
  cleanPlacement,
  encodeFirstTouch,
  FIRST_TOUCH_COOKIE,
  FIRST_TOUCH_MAX_AGE,
  isAppPath,
  parseUtm,
  referrerHost,
  encodeUtm,
  UTM_COOKIE,
  UTM_MAX_AGE,
} from "@/lib/attribution/core";

function setCookie(name: string, value: string, maxAge: number) {
  try {
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${name}=${value}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
  } catch {
    // Cookies blocked: the signup still works, it just has no source.
  }
}

function hasCookie(name: string): boolean {
  try {
    return document.cookie.split("; ").some((c) => c.startsWith(`${name}=`));
  } catch {
    return true;
  }
}

/**
 * Remembers where a visitor first landed, the UTM tags of the last tagged
 * visit (utm_source, utm_medium, utm_campaign, utm_content, utm_term) and,
 * on the sign-up and log-in pages, which call to action brought them
 * (?from=). Read once when the account is created - see lib/attribution.
 * Renders nothing.
 */
export function AttributionCapture() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || isAppPath(pathname)) return;
    if (!hasCookie(FIRST_TOUCH_COOKIE)) {
      setCookie(
        FIRST_TOUCH_COOKIE,
        encodeFirstTouch({
          landing: cleanPath(pathname),
          referrer: referrerHost(document.referrer, window.location.hostname),
        }),
        FIRST_TOUCH_MAX_AGE,
      );
    }
    // Last touch for UTMs: a later tagged visit (a newsletter after an ad)
    // replaces an earlier one; an untagged visit leaves it alone.
    const utm = parseUtm(window.location.search);
    if (utm) setCookie(UTM_COOKIE, encodeUtm(utm), UTM_MAX_AGE);
    if (pathname === "/signup" || pathname === "/login") {
      const from = cleanPlacement(new URLSearchParams(window.location.search).get("from"));
      if (from) setCookie(CTA_COOKIE, from, CTA_MAX_AGE);
    }
  }, [pathname]);

  return null;
}
