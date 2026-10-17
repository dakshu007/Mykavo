"use client";

import { useEffect } from "react";
import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { analyticsPageLocation, analyticsReferrer } from "@/lib/analytics-privacy";

/**
 * Google Analytics 4 (gtag.js) with redacted page URLs.
 *
 * Private pages carry secrets in their URL (client report, status page,
 * invite and unsubscribe tokens, connect handshakes), so gtag never reads
 * the address bar itself: page_location and page_referrer are `set`
 * explicitly from lib/analytics-privacy, with tokens replaced by ":token"
 * and the query dropped on private pages. They are set while rendering,
 * before the router updates the address bar, so a page view GA records
 * for the navigation (enhanced measurement) already carries the redacted
 * URL, and so do product events (lib/analytics track()).
 *
 * The automatic page_view is off (send_page_view: false); the first page
 * view is sent here with the redacted URL. Later navigations are counted by
 * GA's own history-change page views, exactly as before.
 *
 * Google signals and ad personalisation stay off: they add doubleclick.net
 * third-party cookies for advertising features MyKavo does not use.
 */

type Gtag = (...args: unknown[]) => void;

interface GaWindow extends Window {
  dataLayer?: unknown[];
  gtag?: Gtag;
  __mkGa?: { configured: boolean; location: string | null; pageViewSent: boolean };
}

/** The gtag command queue, defined the way Google's snippet defines it. */
function ensureGtag(w: GaWindow): Gtag {
  if (!w.gtag) {
    const layer = (w.dataLayer = w.dataLayer ?? []);
    w.gtag = function gtag() {
      // gtag.js reads Arguments objects from the dataLayer, not arrays.
      // eslint-disable-next-line prefer-rest-params
      layer.push(arguments);
    };
  }
  return w.gtag;
}

/** Point every following hit at `location`. Idempotent per location. */
function applyLocation(measurementId: string, location: string): void {
  const w = window as GaWindow;
  const state = (w.__mkGa ??= { configured: false, location: null, pageViewSent: false });
  if (state.location === location) return;
  const gtag = ensureGtag(w);
  const referrer = state.location ?? analyticsReferrer(document.referrer, window.location.origin);
  gtag("set", { page_location: location, page_referrer: referrer });
  if (!state.configured) {
    gtag("js", new Date());
    gtag("config", measurementId, {
      send_page_view: false,
      page_location: location,
      page_referrer: referrer,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
    });
    state.configured = true;
  }
  state.location = location;
}

export function GoogleAnalytics({ measurementId }: { measurementId: string }) {
  const pathname = usePathname() ?? "/";
  const search = useSearchParams()?.toString() ?? "";

  if (typeof window !== "undefined") {
    applyLocation(measurementId, analyticsPageLocation(window.location.origin, pathname, search));
  }

  useEffect(() => {
    const w = window as GaWindow;
    const state = w.__mkGa;
    if (!state || state.pageViewSent || !state.location) return;
    state.pageViewSent = true;
    ensureGtag(w)("event", "page_view", { page_location: state.location });
  }, []);

  return (
    <Script
      src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
      strategy="lazyOnload"
    />
  );
}
