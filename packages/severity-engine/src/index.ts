/**
 * Centralized, rules-based severity engine (spec §19, §26).
 *
 * Comparators emit a semantic `ChangeSignal`; this module is the single place
 * that decides the resulting severity, category, user-facing title and
 * description, and notification eligibility. Every rule lives here so they
 * stay consistent and testable — no severity logic anywhere else.
 */

export type Severity = "INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type ChangeCategory =
  | "AVAILABILITY"
  | "VISUAL"
  | "SEO"
  | "CONTENT"
  | "LINKS"
  | "SCRIPT"
  | "PERFORMANCE"
  | "CONVERSION";

export type ElementImportance = "NORMAL" | "IMPORTANT" | "CRITICAL";

const SEVERITY_ORDER: Severity[] = ["INFO", "LOW", "MEDIUM", "HIGH", "CRITICAL"];

/** Returns the most severe of the given severities, or null if empty. */
export function highestSeverity(severities: Severity[]): Severity | null {
  let highest: Severity | null = null;
  for (const s of severities) {
    if (highest === null || SEVERITY_ORDER.indexOf(s) > SEVERITY_ORDER.indexOf(highest)) {
      highest = s;
    }
  }
  return highest;
}

export function compareSeverity(a: Severity, b: Severity): number {
  return SEVERITY_ORDER.indexOf(a) - SEVERITY_ORDER.indexOf(b);
}

/** Semantic signals produced by the comparison engine. */
export type ChangeSignal =
  | { kind: "http_status"; previous: number; current: number }
  | { kind: "final_url"; previous: string; current: string }
  | { kind: "redirect_appeared"; hops: number }
  | { kind: "title"; previous: string | null; current: string | null }
  | { kind: "meta_description"; previous: string | null; current: string | null }
  | { kind: "canonical"; previous: string | null; current: string | null }
  | { kind: "robots"; previous: string | null; current: string | null }
  | { kind: "h1"; previous: string[]; current: string[] }
  | { kind: "content_text" }
  | { kind: "content_dom" }
  | { kind: "internal_links_removed"; count: number; total: number }
  | { kind: "internal_links_added"; count: number }
  | { kind: "script_removed"; domain: string; service: string | null }
  | { kind: "script_added"; domain: string; service: string | null; isThirdParty: boolean }
  | { kind: "page_weight"; previousBytes: number; currentBytes: number }
  | { kind: "request_count"; previous: number; current: number }
  | { kind: "response_time"; previousMs: number; currentMs: number }
  | { kind: "visual_diff"; percentage: number }
  // Conversion elements (spec §23, Phase 9)
  | { kind: "element_missing"; name: string; importance: ElementImportance }
  | { kind: "element_hidden"; name: string; importance: ElementImportance }
  | { kind: "element_appeared"; name: string; importance: ElementImportance }
  | {
      kind: "element_text_changed";
      name: string;
      importance: ElementImportance;
      previous: string | null;
      current: string | null;
    }
  | {
      kind: "element_href_changed";
      name: string;
      importance: ElementImportance;
      previous: string | null;
      current: string | null;
    };

export interface ScoredChange {
  category: ChangeCategory;
  changeType: string;
  severity: Severity;
  title: string;
  description: string;
  previousValue: string | null;
  currentValue: string | null;
  /** Whether this change should trigger an immediate notification (spec §27). */
  notify: boolean;
}

function fmt(v: string | number | null | undefined): string {
  if (v === null || v === undefined || v === "") return "—";
  return String(v);
}

function includesNoindex(v: string | null): boolean {
  return /\bnoindex\b/i.test(v ?? "");
}

function pctDelta(previous: number, current: number): number {
  if (previous <= 0) return current > 0 ? Infinity : 0;
  return ((current - previous) / previous) * 100;
}

/**
 * Resolve a signal into a scored change, or `null` when the signal is below
 * the meaningful threshold (e.g. a tiny performance wobble). Immediate
 * notification is reserved for CRITICAL and HIGH (spec §27).
 */
export function scoreChange(signal: ChangeSignal): ScoredChange | null {
  switch (signal.kind) {
    case "http_status": {
      const wasOk = signal.previous >= 200 && signal.previous < 400;
      const nowError = signal.current >= 400;
      const severity: Severity = wasOk && nowError ? "CRITICAL" : "HIGH";
      return finalize({
        category: "AVAILABILITY",
        changeType: "http_status_changed",
        severity,
        title: `HTTP status changed ${signal.previous} → ${signal.current}`,
        description:
          nowError && wasOk
            ? `The page now returns HTTP ${signal.current}. Visitors and crawlers can no longer load it.`
            : `The HTTP status changed from ${signal.previous} to ${signal.current}.`,
        previousValue: fmt(signal.previous),
        currentValue: fmt(signal.current),
      });
    }

    case "final_url":
      return finalize({
        category: "AVAILABILITY",
        changeType: "final_url_changed",
        severity: "HIGH",
        title: "Final URL changed",
        description:
          "After following redirects, this page now resolves to a different URL. A redirect may have been added or changed.",
        previousValue: signal.previous,
        currentValue: signal.current,
      });

    case "redirect_appeared":
      return finalize({
        category: "AVAILABILITY",
        changeType: "redirect_appeared",
        severity: "MEDIUM",
        title: "New redirect detected",
        description: `The page now redirects (${signal.hops} hop${signal.hops === 1 ? "" : "s"}) before resolving.`,
        previousValue: "No redirect",
        currentValue: `${signal.hops} redirect${signal.hops === 1 ? "" : "s"}`,
      });

    case "title": {
      const removed = !signal.current && !!signal.previous;
      return finalize({
        category: "SEO",
        changeType: removed ? "title_removed" : "title_changed",
        severity: removed ? "HIGH" : "MEDIUM",
        title: removed ? "Title tag removed" : "Title tag changed",
        description: removed
          ? "The page no longer has a title tag. This hurts search visibility."
          : "The page title changed. Confirm this was intentional — titles affect rankings and click-through.",
        previousValue: fmt(signal.previous),
        currentValue: fmt(signal.current),
      });
    }

    case "meta_description": {
      const removed = !signal.current && !!signal.previous;
      return finalize({
        category: "SEO",
        changeType: removed ? "meta_description_removed" : "meta_description_changed",
        severity: removed ? "MEDIUM" : "LOW",
        title: removed ? "Meta description removed" : "Meta description changed",
        description: removed
          ? "The meta description was removed. Search engines will generate their own snippet."
          : "The meta description changed.",
        previousValue: fmt(signal.previous),
        currentValue: fmt(signal.current),
      });
    }

    case "canonical": {
      const removed = !signal.current && !!signal.previous;
      return finalize({
        category: "SEO",
        changeType: removed ? "canonical_removed" : "canonical_changed",
        severity: "HIGH",
        title: removed ? "Canonical URL removed" : "Canonical URL changed",
        description: removed
          ? "The canonical link was removed. This can cause duplicate-content issues."
          : "The canonical URL changed, which can redirect ranking signals to a different page.",
        previousValue: fmt(signal.previous),
        currentValue: fmt(signal.current),
      });
    }

    case "robots": {
      const becameNoindex = !includesNoindex(signal.previous) && includesNoindex(signal.current);
      const leftNoindex = includesNoindex(signal.previous) && !includesNoindex(signal.current);
      return finalize({
        category: "SEO",
        changeType: becameNoindex ? "robots_noindex" : "robots_changed",
        severity: becameNoindex ? "CRITICAL" : "MEDIUM",
        title: becameNoindex
          ? "Page changed to noindex"
          : leftNoindex
            ? "Page is indexable again"
            : "Robots meta changed",
        description: becameNoindex
          ? "The robots meta now contains noindex. Search engines will drop this page from their index."
          : "The robots meta directive changed.",
        previousValue: fmt(signal.previous),
        currentValue: fmt(signal.current),
      });
    }

    case "h1": {
      const removed = signal.current.length === 0 && signal.previous.length > 0;
      return finalize({
        category: "SEO",
        changeType: removed ? "h1_removed" : "h1_changed",
        severity: removed ? "HIGH" : "MEDIUM",
        title: removed ? "H1 heading removed" : "H1 heading changed",
        description: removed
          ? "The page no longer has an H1 heading."
          : "The main H1 heading text changed.",
        previousValue: signal.previous.join(" · ") || "—",
        currentValue: signal.current.join(" · ") || "—",
      });
    }

    case "content_text":
      return finalize({
        category: "CONTENT",
        changeType: "text_changed",
        severity: "LOW",
        title: "Page content changed",
        description: "The visible text content of the page changed.",
        previousValue: null,
        currentValue: null,
      });

    case "content_dom":
      return finalize({
        category: "CONTENT",
        changeType: "dom_changed",
        severity: "INFO",
        title: "Page structure changed",
        description:
          "The normalized page structure changed while the visible text stayed the same (markup or layout change).",
        previousValue: null,
        currentValue: null,
      });

    case "internal_links_removed": {
      const ratio = signal.total > 0 ? signal.count / signal.total : 0;
      const severity: Severity = ratio > 0.3 || signal.count >= 20 ? "HIGH" : signal.count >= 5 ? "MEDIUM" : "INFO";
      return finalize({
        category: "LINKS",
        changeType: "internal_links_removed",
        severity,
        title: `${signal.count} internal link${signal.count === 1 ? "" : "s"} removed`,
        description: `${signal.count} internal link${signal.count === 1 ? "" : "s"} present in the baseline ${signal.count === 1 ? "is" : "are"} no longer on the page. Navigation or content links may have been removed.`,
        previousValue: `${signal.total} internal links`,
        currentValue: `${signal.total - signal.count} internal links`,
      });
    }

    case "internal_links_added":
      return finalize({
        category: "LINKS",
        changeType: "internal_links_added",
        severity: "INFO",
        title: `${signal.count} internal link${signal.count === 1 ? "" : "s"} added`,
        description: `${signal.count} new internal link${signal.count === 1 ? "" : "s"} appeared on the page.`,
        previousValue: null,
        currentValue: `+${signal.count}`,
      });

    case "script_removed": {
      const important = signal.service !== null;
      return finalize({
        category: "SCRIPT",
        changeType: "script_removed",
        severity: important ? "HIGH" : "LOW",
        title: signal.service
          ? `${signal.service} script disappeared`
          : "Third-party script removed",
        description: signal.service
          ? `The ${signal.service} script is no longer loaded. If unintended, this can break analytics, payments, or tracking.`
          : `A script from ${signal.domain} is no longer loaded.`,
        previousValue: signal.service ?? signal.domain,
        currentValue: "—",
      });
    }

    case "script_added": {
      const unknownThirdParty = signal.isThirdParty && !signal.service;
      return finalize({
        category: "SCRIPT",
        changeType: "script_added",
        severity: unknownThirdParty ? "MEDIUM" : "LOW",
        title: signal.service
          ? `${signal.service} script added`
          : unknownThirdParty
            ? "Unknown third-party script added"
            : "Script added",
        description: unknownThirdParty
          ? `A new third-party script from ${signal.domain} was added. Verify it is expected — unexpected scripts can indicate a compromise.`
          : `A new script${signal.service ? ` (${signal.service})` : ""} from ${signal.domain} was added.`,
        previousValue: "—",
        currentValue: signal.service ?? signal.domain,
      });
    }

    case "page_weight": {
      const delta = pctDelta(signal.previousBytes, signal.currentBytes);
      if (delta <= 20) return null; // only regressions beyond +20% matter (spec §22)
      const severity: Severity = delta > 50 ? "HIGH" : "MEDIUM";
      return finalize({
        category: "PERFORMANCE",
        changeType: "page_weight_increased",
        severity,
        title: `Page weight increased ${Math.round(delta)}%`,
        description: `The HTML payload grew from ${kb(signal.previousBytes)} to ${kb(signal.currentBytes)}.`,
        previousValue: kb(signal.previousBytes),
        currentValue: kb(signal.currentBytes),
      });
    }

    case "request_count": {
      const delta = pctDelta(signal.previous, signal.current);
      if (delta <= 25) return null; // spec §22
      return finalize({
        category: "PERFORMANCE",
        changeType: "request_count_increased",
        severity: "MEDIUM",
        title: `Request count increased ${Math.round(delta)}%`,
        description: `The page now makes ${signal.current} requests, up from ${signal.previous}.`,
        previousValue: String(signal.previous),
        currentValue: String(signal.current),
      });
    }

    case "response_time": {
      const delta = pctDelta(signal.previousMs, signal.currentMs);
      // Single-scan response time is noisy; only flag large, absolute jumps.
      if (delta <= 50 || signal.currentMs < 1000) return null;
      return finalize({
        category: "PERFORMANCE",
        changeType: "response_time_increased",
        severity: "LOW",
        title: `Response time increased ${Math.round(delta)}%`,
        description: `Server response time rose from ${signal.previousMs}ms to ${signal.currentMs}ms. Confirm across multiple scans before acting.`,
        previousValue: `${signal.previousMs}ms`,
        currentValue: `${signal.currentMs}ms`,
      });
    }

    case "visual_diff": {
      const p = signal.percentage;
      if (p < 1) return null; // 0–1% ignored (spec §18)
      const severity: Severity =
        p >= 30 ? "HIGH" : p >= 15 ? "HIGH" : p >= 5 ? "MEDIUM" : "LOW";
      return finalize({
        category: "VISUAL",
        changeType: "visual_difference",
        severity,
        title: `Visual difference of ${p.toFixed(1)}% detected`,
        description: `The page screenshot differs from the baseline by ${p.toFixed(1)}% of pixels.`,
        previousValue: "Baseline screenshot",
        currentValue: `${p.toFixed(1)}% changed`,
      });
    }

    case "element_missing":
      return finalize({
        category: "CONVERSION",
        changeType: "conversion_element_missing",
        severity: byImportance(signal.importance),
        title: `"${signal.name}" is missing`,
        description: `The monitored conversion element "${signal.name}" is no longer on the page. Visitors can't see or use it — this can directly cost signups or sales.`,
        previousValue: "Present",
        currentValue: "Missing",
      });

    case "element_hidden":
      return finalize({
        category: "CONVERSION",
        changeType: "conversion_element_hidden",
        severity: byImportance(signal.importance),
        title: `"${signal.name}" is no longer visible`,
        description: `The monitored conversion element "${signal.name}" is still in the page but hidden from visitors (display, visibility, opacity, or zero size).`,
        previousValue: "Visible",
        currentValue: "Hidden",
      });

    case "element_appeared":
      return finalize({
        category: "CONVERSION",
        changeType: "conversion_element_appeared",
        severity: signal.importance === "CRITICAL" ? "HIGH" : "MEDIUM",
        title: `"${signal.name}" appeared unexpectedly`,
        description: `The monitored element "${signal.name}" was expected to be absent but is now present on the page.`,
        previousValue: "Absent",
        currentValue: "Present",
      });

    case "element_text_changed":
      return finalize({
        category: "CONVERSION",
        changeType: "conversion_element_text_changed",
        severity: signal.importance === "CRITICAL" ? "HIGH" : "MEDIUM",
        title: `"${signal.name}" text changed`,
        description: `The text of the monitored conversion element "${signal.name}" changed. Confirm the call-to-action still reads correctly.`,
        previousValue: fmt(signal.previous),
        currentValue: fmt(signal.current),
      });

    case "element_href_changed":
      return finalize({
        category: "CONVERSION",
        changeType: "conversion_element_href_changed",
        severity: byImportance(signal.importance),
        title: `"${signal.name}" link destination changed`,
        description: `The link target of the monitored conversion element "${signal.name}" changed. A wrong destination can silently break conversions.`,
        previousValue: fmt(signal.previous),
        currentValue: fmt(signal.current),
      });
  }
}

/** Conversion-element severity scaled by the user's declared importance. */
function byImportance(importance: ElementImportance): Severity {
  return importance === "CRITICAL"
    ? "CRITICAL"
    : importance === "IMPORTANT"
      ? "HIGH"
      : "MEDIUM";
}

function kb(bytes: number): string {
  return `${Math.round(bytes / 1024)} KB`;
}

/** Attach notification eligibility: immediate for CRITICAL/HIGH (spec §27). */
function finalize(c: Omit<ScoredChange, "notify">): ScoredChange {
  return { ...c, notify: c.severity === "CRITICAL" || c.severity === "HIGH" };
}
