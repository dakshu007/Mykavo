"use client";

import { useSyncExternalStore } from "react";

/**
 * Region-aware price display. The store charges in USD via Dodo; visitors
 * from India see the familiar rupee framing (fixed anchor rate, matching the
 * marketing quote: $20 = Rs 1,700) with an honest "billed in USD" note at
 * purchase points. SSR always renders USD (primary market) so marketing
 * pages stay static; the client corrects after hydration.
 */

const INDIA_TIMEZONES = new Set(["Asia/Calcutta", "Asia/Kolkata"]);
/** Display anchor rate (keeps $20 -> Rs 1,700 exactly, per marketing copy). */
const INR_PER_USD = 85;

function subscribe(): () => void {
  return () => {};
}

function isIndiaClient(): boolean {
  try {
    return INDIA_TIMEZONES.has(Intl.DateTimeFormat().resolvedOptions().timeZone);
  } catch {
    return false;
  }
}

export function useIsIndia(): boolean {
  // useSyncExternalStore keeps SSR + first client render consistent (false),
  // then snaps to the real value without a hydration mismatch.
  return useSyncExternalStore(subscribe, isIndiaClient, () => false);
}

export function formatInr(usd: number): string {
  return `₹${Math.round(usd * INR_PER_USD).toLocaleString("en-IN")}`;
}

/** "$20" or "₹1,700" - drop-in text for price figures. */
export function Price({ usd }: { usd: number }) {
  const india = useIsIndia();
  return <>{india ? formatInr(usd) : `$${usd}`}</>;
}

/** Purchase-point honesty note - renders only when prices show in rupees. */
export function BilledInUsdNote({ usd, className }: { usd: number; className?: string }) {
  const india = useIsIndia();
  if (!india) return null;
  return <span className={className}>Billed as ${usd} USD at checkout.</span>;
}
