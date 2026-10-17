"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { isPrivateAnalyticsPath } from "@/lib/analytics-privacy";

/**
 * Microsoft Clarity (heatmaps and session recordings) - public pages only,
 * production only.
 *
 * The privacy and cookie policies promise that analytics never runs inside
 * the signed-in app, so Clarity is not loaded on the dashboard or on any page
 * that shows someone's own data or carries a secret in its URL (client
 * reports, status pages, invites, unsubscribe links, connect screens) or
 * their credentials (sign-in). If a visitor moves from a public page into
 * the dashboard without a full reload, the script is already running - the
 * dashboard layout therefore also carries data-clarity-mask, which makes
 * Clarity mask everything inside it.
 *
 * Loaded lazyOnload, after the page and Google Analytics, so it never
 * competes with first paint.
 */

export const CLARITY_PROJECT_ID = "yq0hjq8pqa";

/** Clarity records only pages outside the private prefixes (lib/analytics-privacy). */
export function isClarityPath(pathname: string): boolean {
  return !isPrivateAnalyticsPath(pathname);
}

const SNIPPET = `(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${CLARITY_PROJECT_ID}");`;

export function Clarity() {
  const pathname = usePathname() ?? "/";
  if (!isClarityPath(pathname)) return null;
  return (
    <Script id="ms-clarity" strategy="lazyOnload">
      {SNIPPET}
    </Script>
  );
}
