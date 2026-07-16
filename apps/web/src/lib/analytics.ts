/**
 * Analytics foundation (spec §47). Event names are a stable vocabulary;
 * the provider is pluggable via NEXT_PUBLIC_ANALYTICS_PROVIDER.
 *
 * Phase 0 providers:
 *  - "console": logs events in development
 *  - "plausible": forwards to Plausible if its script is present
 *  - default: no-op
 *
 * No personal information is attached to events.
 */

export type AnalyticsEvent =
  // Product lifecycle (spec §47)
  | "account_created"
  | "onboarding_started"
  | "website_added"
  | "discovery_completed"
  | "baseline_started"
  | "baseline_completed"
  | "monitoring_enabled"
  | "scan_completed"
  | "change_detected"
  | "change_reviewed"
  | "change_approved"
  | "baseline_updated"
  | "pricing_viewed"
  | "checkout_started"
  | "subscription_started"
  | "subscription_cancelled"
  // Phase 0 validation events
  | "waitlist_joined"
  | "tool_used"
  | "preview_viewed"
  | "cta_clicked";

type EventProps = Record<string, string | number | boolean>;

interface AnalyticsWindow extends Window {
  plausible?: (event: string, options?: { props?: EventProps }) => void;
  gtag?: (command: "event", name: string, params?: EventProps) => void;
}

export function track(event: AnalyticsEvent, props?: EventProps): void {
  if (typeof window === "undefined") return;

  const provider = process.env.NEXT_PUBLIC_ANALYTICS_PROVIDER;
  const w = window as AnalyticsWindow;

  // Google Analytics (gtag.js is loaded in the root layout in production):
  // product events flow there as GA4 custom events whenever it's present.
  w.gtag?.("event", event, props);

  if (provider === "plausible") {
    w.plausible?.(event, props ? { props } : undefined);
    return;
  }

  if (provider === "console" || process.env.NODE_ENV === "development") {
    console.info(`[analytics] ${event}`, props ?? {});
  }
}
