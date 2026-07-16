/**
 * Stabilization settings - per-website ignored selectors and screenshot
 * masks (spec §25/§36 false-positive controls).
 *
 * Semantics:
 * - Ignored selectors: matching elements are REMOVED from the DOM before
 *   text/DOM hashing and never appear in the screenshot - excluded from
 *   comparison entirely (cookie banners, ads, rotating content).
 * - Screenshot masks: matching elements are covered with a solid block in
 *   the screenshot only - their content is still compared (dates, counters).
 *
 * Both are stored as `Json?` columns on Website (arrays of CSS selector
 * strings). These helpers are the single normalization/validation path used
 * by the web API (input validation), the worker (defensive parse of the DB
 * value), and the scanner (defensive re-normalization of caller options).
 */

/** Maximum number of selectors per list (ignored and masks each). */
export const MAX_STABILIZATION_SELECTORS = 20;

/** Maximum length of a single CSS selector. */
export const MAX_SELECTOR_LENGTH = 200;

/**
 * Basic CSS-selector sanity: non-empty, bounded length, and free of braces
 * and newlines (which indicate pasted CSS rules, not selectors). Full syntax
 * validation happens in the browser - invalid selectors are skipped
 * per-selector at scan time and never fail a scan.
 */
export function isPlausibleSelector(selector: string): boolean {
  if (selector.length === 0 || selector.length > MAX_SELECTOR_LENGTH) return false;
  if (/[{}\r\n]/.test(selector)) return false;
  return true;
}

/**
 * Defensively normalize an unknown value (e.g. a Prisma `Json?` column or
 * untrusted caller options) into a clean selector list: strings only,
 * trimmed, non-empty, plausible, deduplicated, capped. Never throws.
 */
export function parseSelectorList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") continue;
    const selector = item.trim();
    if (!isPlausibleSelector(selector)) continue;
    if (seen.has(selector)) continue;
    seen.add(selector);
    out.push(selector);
    if (out.length >= MAX_STABILIZATION_SELECTORS) break;
  }
  return out;
}

/**
 * Split textarea input ("one selector per line") into trimmed, non-empty,
 * deduplicated lines. Unlike parseSelectorList this does NOT silently drop
 * invalid or excess entries - pair it with validateSelectorLines so the UI
 * can show the user what is wrong instead of losing their input.
 */
export function selectorLines(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line || seen.has(line)) continue;
    seen.add(line);
    out.push(line);
  }
  return out;
}

/**
 * Validate a selector list for the UI/API boundary. Returns a user-facing
 * error message, or null when the list is acceptable.
 */
export function validateSelectorLines(selectors: string[]): string | null {
  if (selectors.length > MAX_STABILIZATION_SELECTORS) {
    return `Maximum ${MAX_STABILIZATION_SELECTORS} selectors per list.`;
  }
  for (const selector of selectors) {
    if (selector.length > MAX_SELECTOR_LENGTH) {
      return `Selectors must be ${MAX_SELECTOR_LENGTH} characters or fewer.`;
    }
    if (/[{}]/.test(selector)) {
      return "Selectors can't contain { or } - enter CSS selectors, not CSS rules.";
    }
  }
  return null;
}
