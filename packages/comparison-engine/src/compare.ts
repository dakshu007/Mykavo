/**
 * Deterministic snapshot comparison (spec §19–§22, §24). Consumes a baseline
 * and a current snapshot (plus their links/scripts) and emits scored changes
 * via the centralized severity engine. No severity logic lives here — this
 * module only decides *what* differs; the severity engine decides *how much
 * it matters*. Related changes are grouped (e.g. "17 internal links removed").
 */

import { scoreChange, type ScoredChange, type ChangeSignal } from "@mykavo/severity-engine";

export interface SnapshotLink {
  normalizedUrl: string;
  linkType: "INTERNAL" | "EXTERNAL";
}

export interface SnapshotScript {
  domain: string;
  isThirdParty: boolean;
  /** Known service name (e.g. "Google Analytics") if recognized, else null. */
  service: string | null;
}

/** Observed state of a monitored conversion element (spec §23, Phase 9). */
export interface ComparableElement {
  monitoredElementId: string;
  name: string;
  importance: "NORMAL" | "IMPORTANT" | "CRITICAL";
  expectedExistence: boolean;
  expectedVisibility: boolean;
  expectedText: string | null;
  expectedHref: string | null;
  exists: boolean;
  visible: boolean;
  text: string | null;
  href: string | null;
}

export interface ComparableSnapshot {
  httpStatus: number | null;
  finalUrl: string | null;
  redirectCount: number;
  domHash: string | null;
  textHash: string | null;
  title: string | null;
  metaDescription: string | null;
  canonicalUrl: string | null;
  robotsMeta: string | null;
  h1Values: string[];
  pageWeightBytes: number | null;
  requestCount: number | null;
  responseTimeMs: number | null;
  links: SnapshotLink[];
  scripts: SnapshotScript[];
  elements: ComparableElement[];
}

/** Known-service detection so script identity survives cache-busting query strings. */
function scriptKey(s: SnapshotScript): string {
  return s.service ? `service:${s.service}` : `domain:${s.domain}`;
}

/**
 * Compare a current snapshot against its approved baseline. Returns scored,
 * meaningful changes only (signals below threshold are dropped by the
 * severity engine). Availability failures short-circuit the rest — if a page
 * is 4xx/5xx, its SEO/DOM/etc. diffs are noise.
 */
export function compareSnapshots(
  baseline: ComparableSnapshot,
  current: ComparableSnapshot,
): ScoredChange[] {
  const signals: ChangeSignal[] = [];

  // --- Availability (spec §19) ---
  const statusChanged =
    baseline.httpStatus !== null &&
    current.httpStatus !== null &&
    baseline.httpStatus !== current.httpStatus;
  if (statusChanged) {
    signals.push({
      kind: "http_status",
      previous: baseline.httpStatus!,
      current: current.httpStatus!,
    });
  }

  const currentBroken = (current.httpStatus ?? 0) >= 400;

  // When the page is now an error, only availability matters — skip the rest.
  if (!currentBroken) {
    if (
      baseline.finalUrl &&
      current.finalUrl &&
      normalizeForCompare(baseline.finalUrl) !== normalizeForCompare(current.finalUrl)
    ) {
      signals.push({ kind: "final_url", previous: baseline.finalUrl, current: current.finalUrl });
    } else if (baseline.redirectCount === 0 && current.redirectCount > 0) {
      signals.push({ kind: "redirect_appeared", hops: current.redirectCount });
    }

    // --- SEO (spec §19) ---
    if ((baseline.title ?? "") !== (current.title ?? "")) {
      signals.push({ kind: "title", previous: baseline.title, current: current.title });
    }
    if ((baseline.metaDescription ?? "") !== (current.metaDescription ?? "")) {
      signals.push({
        kind: "meta_description",
        previous: baseline.metaDescription,
        current: current.metaDescription,
      });
    }
    if ((baseline.canonicalUrl ?? "") !== (current.canonicalUrl ?? "")) {
      signals.push({
        kind: "canonical",
        previous: baseline.canonicalUrl,
        current: current.canonicalUrl,
      });
    }
    if ((baseline.robotsMeta ?? "") !== (current.robotsMeta ?? "")) {
      signals.push({ kind: "robots", previous: baseline.robotsMeta, current: current.robotsMeta });
    }
    if (baseline.h1Values.join("") !== current.h1Values.join("")) {
      signals.push({ kind: "h1", previous: baseline.h1Values, current: current.h1Values });
    }

    // --- Content (DOM / text hashes) ---
    const textChanged =
      baseline.textHash !== null &&
      current.textHash !== null &&
      baseline.textHash !== current.textHash;
    const domChanged =
      baseline.domHash !== null &&
      current.domHash !== null &&
      baseline.domHash !== current.domHash;
    if (textChanged) {
      signals.push({ kind: "content_text" });
    } else if (domChanged) {
      signals.push({ kind: "content_dom" });
    }

    // --- Links (spec §20): grouped set difference on internal links ---
    const baselineInternal = new Set(
      baseline.links.filter((l) => l.linkType === "INTERNAL").map((l) => l.normalizedUrl),
    );
    const currentInternal = new Set(
      current.links.filter((l) => l.linkType === "INTERNAL").map((l) => l.normalizedUrl),
    );
    const removed = [...baselineInternal].filter((u) => !currentInternal.has(u));
    const added = [...currentInternal].filter((u) => !baselineInternal.has(u));
    if (removed.length > 0) {
      signals.push({
        kind: "internal_links_removed",
        count: removed.length,
        total: baselineInternal.size,
      });
    }
    if (added.length > 0) {
      signals.push({ kind: "internal_links_added", count: added.length });
    }

    // --- Scripts (spec §21): each add/remove is individually meaningful ---
    const baselineScripts = new Map(baseline.scripts.map((s) => [scriptKey(s), s]));
    const currentScripts = new Map(current.scripts.map((s) => [scriptKey(s), s]));
    for (const [key, s] of baselineScripts) {
      if (!currentScripts.has(key)) {
        signals.push({ kind: "script_removed", domain: s.domain, service: s.service });
      }
    }
    for (const [key, s] of currentScripts) {
      if (!baselineScripts.has(key)) {
        signals.push({
          kind: "script_added",
          domain: s.domain,
          service: s.service,
          isThirdParty: s.isThirdParty,
        });
      }
    }

    // --- Performance (spec §22) ---
    if (baseline.pageWeightBytes && current.pageWeightBytes) {
      signals.push({
        kind: "page_weight",
        previousBytes: baseline.pageWeightBytes,
        currentBytes: current.pageWeightBytes,
      });
    }
    if (baseline.requestCount && current.requestCount) {
      signals.push({
        kind: "request_count",
        previous: baseline.requestCount,
        current: current.requestCount,
      });
    }
    if (baseline.responseTimeMs && current.responseTimeMs) {
      signals.push({
        kind: "response_time",
        previousMs: baseline.responseTimeMs,
        currentMs: current.responseTimeMs,
      });
    }

    // --- Conversion elements (spec §23): diff each element's observed state
    // against the baseline, matched by monitored-element id. ---
    const baselineElements = new Map(
      baseline.elements.map((e) => [e.monitoredElementId, e]),
    );
    for (const c of current.elements) {
      const b = baselineElements.get(c.monitoredElementId);
      if (!b) continue; // no baseline observation yet (element added post-baseline)

      if (c.expectedExistence) {
        // Element should be present. Flag only a real regression: present at
        // baseline, gone now.
        if (b.exists && !c.exists) {
          signals.push({ kind: "element_missing", name: c.name, importance: c.importance });
          continue; // gone → don't also diff its visibility/text/href
        }
        if (!c.exists) continue; // absent in both — no change to report

        if (c.expectedVisibility && b.visible && !c.visible) {
          signals.push({ kind: "element_hidden", name: c.name, importance: c.importance });
        }
        // Text/href: compare against the pinned expected value when the user set
        // one, otherwise against the baseline observation.
        const textRef = c.expectedText ?? b.text;
        if (textRef !== null && normalizeText(textRef) !== normalizeText(c.text)) {
          signals.push({
            kind: "element_text_changed",
            name: c.name,
            importance: c.importance,
            previous: textRef,
            current: c.text,
          });
        }
        const hrefRef = c.expectedHref ?? b.href;
        if (hrefRef !== null && hrefRef !== c.href) {
          signals.push({
            kind: "element_href_changed",
            name: c.name,
            importance: c.importance,
            previous: hrefRef,
            current: c.href,
          });
        }
      } else if (!b.exists && c.exists) {
        // Element is expected to be ABSENT — flag when it appears.
        signals.push({ kind: "element_appeared", name: c.name, importance: c.importance });
      }
    }
  }

  const scored = signals
    .map(scoreChange)
    .filter((c): c is ScoredChange => c !== null);

  const order = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"];
  return scored.sort((a, b) => order.indexOf(a.severity) - order.indexOf(b.severity));
}

function normalizeText(v: string | null): string {
  return (v ?? "").replace(/\s+/g, " ").trim();
}

function normalizeForCompare(url: string): string {
  try {
    const u = new URL(url);
    u.hash = "";
    if (u.pathname !== "/" && u.pathname.endsWith("/")) u.pathname = u.pathname.replace(/\/+$/, "");
    return u.href;
  } catch {
    return url;
  }
}
