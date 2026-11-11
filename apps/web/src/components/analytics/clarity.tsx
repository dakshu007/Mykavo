"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { isPrivateAnalyticsPath } from "@/lib/analytics-privacy";
import { useEngaged } from "./use-engaged";

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
 * Loaded on the visitor's first interaction, or 8 seconds after load (see
 * useEngaged): Clarity walks the whole page to record it, which on a phone
 * was a long task in the very seconds the page was becoming usable. A
 * recording of a visitor who never scrolled, tapped or moved the pointer has
 * little to show, so the later fallback costs almost nothing.
 */

export const CLARITY_PROJECT_ID = "yq0hjq8pqa";

/** Clarity records only pages outside the private prefixes (lib/analytics-privacy). */
export function isClarityPath(pathname: string): boolean {
  return !isPrivateAnalyticsPath(pathname);
}

const SNIPPET = `(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${CLARITY_PROJECT_ID}");`;

export function Clarity() {
  const pathname = usePathname() ?? "/";
  const engaged = useEngaged(8000);
  if (!engaged || !isClarityPath(pathname)) return null;
  return (
    <Script id="ms-clarity" strategy="afterInteractive">
      {SNIPPET}
    </Script>
  );
}
