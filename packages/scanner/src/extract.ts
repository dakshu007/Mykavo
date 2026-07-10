/**
 * In-page extraction and DOM normalization (spec §16). Runs inside the
 * browser via page.evaluate, so it must be a self-contained serializable
 * function — no imports, no closures over Node scope.
 */

export interface InPageExtraction {
  title: string | null;
  metaDescription: string | null;
  canonicalUrl: string | null;
  robotsMeta: string | null;
  h1Values: string[];
  structuredData: string;
  links: Array<{ href: string }>;
  scripts: Array<{ src: string }>;
  normalizedDom: string;
  visibleText: string;
}

export function extractInPage(): InPageExtraction {
  const doc = document;

  const meta = (name: string): string | null => {
    const el = doc.querySelector(`meta[name="${name}" i]`);
    return el?.getAttribute("content") ?? null;
  };

  const canonical =
    doc.querySelector('link[rel="canonical" i]')?.getAttribute("href") ?? null;

  const h1Values = Array.from(doc.querySelectorAll("h1"))
    .map((h) => (h.textContent ?? "").replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, 10);

  // Structured data: concatenated JSON-LD blocks (hashed by the caller).
  const structuredData = Array.from(
    doc.querySelectorAll('script[type="application/ld+json"]'),
  )
    .map((s) => (s.textContent ?? "").trim())
    .filter(Boolean)
    .join("\n");

  const links = Array.from(doc.querySelectorAll("a[href]"))
    .map((a) => ({ href: (a as HTMLAnchorElement).href }))
    .filter((l) => /^https?:/.test(l.href));

  const scripts = Array.from(doc.querySelectorAll("script[src]"))
    .map((s) => ({ src: (s as HTMLScriptElement).src }))
    .filter((s) => /^https?:/.test(s.src));

  // ---- DOM normalization (spec §16) ----
  const VOLATILE_ATTRIBUTES = [
    "nonce",
    "integrity",
    "data-reactid",
    "data-react-checksum",
    "data-reactroot",
    "data-next-hide-fouc",
    "data-n-g",
    "data-n-p",
    "data-emotion",
    "data-styled",
    "data-v-app",
    "data-server-rendered",
    "data-turbo-track",
    "data-cfasync",
    "data-timestamp",
    "data-ts",
    "aria-live",
  ];
  const VOLATILE_ATTR_PATTERNS = [/^data-v-[0-9a-f]{6,}$/, /^data-astro-/, /^ng-/];
  const SKIPPED_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE", "IFRAME"]);

  function normalizeElement(el: Element): string {
    if (SKIPPED_TAGS.has(el.tagName)) return "";

    const attrs = Array.from(el.attributes)
      .filter((a) => {
        const name = a.name.toLowerCase();
        if (VOLATILE_ATTRIBUTES.includes(name)) return false;
        if (VOLATILE_ATTR_PATTERNS.some((re) => re.test(name))) return false;
        // Inline styles frequently carry animation state.
        if (name === "style") return false;
        return true;
      })
      .map((a) => {
        let value = a.value;
        // Sort class lists so reordering isn't a change.
        if (a.name.toLowerCase() === "class") {
          value = value.split(/\s+/).filter(Boolean).sort().join(" ");
        }
        return `${a.name.toLowerCase()}="${value.replace(/\s+/g, " ").trim()}"`;
      })
      .sort()
      .join(" ");

    const children = Array.from(el.childNodes)
      .map((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) return normalizeElement(node as Element);
        if (node.nodeType === Node.TEXT_NODE) {
          return (node.textContent ?? "").replace(/\s+/g, " ").trim();
        }
        return ""; // comments and other node types are dropped
      })
      .filter(Boolean)
      .join("");

    const tag = el.tagName.toLowerCase();
    return `<${tag}${attrs ? " " + attrs : ""}>${children}</${tag}>`;
  }

  const normalizedDom = doc.documentElement ? normalizeElement(doc.documentElement) : "";

  const visibleText = (doc.body?.innerText ?? "").replace(/\s+/g, " ").trim();

  return {
    title: doc.title || null,
    metaDescription: meta("description"),
    canonicalUrl: canonical,
    robotsMeta: meta("robots"),
    h1Values,
    structuredData,
    links,
    scripts,
    normalizedDom,
    visibleText,
  };
}

/**
 * Remove ignored elements from the live DOM (spec §25 false-positive
 * controls). Runs inside the browser via page.evaluate, so — like
 * extractInPage — it must be a self-contained serializable function.
 * Each selector is applied inside its own try/catch: an invalid selector
 * is skipped and must never fail the scan. Returns the number of elements
 * removed (useful for diagnostics; callers may ignore it).
 */
export function removeElementsInPage(selectors: string[]): number {
  let removed = 0;
  for (const selector of selectors) {
    try {
      for (const el of Array.from(document.querySelectorAll(selector))) {
        el.remove();
        removed++;
      }
    } catch {
      // Invalid selector — skip it; the rest still apply.
    }
  }
  return removed;
}

/**
 * Keep only selectors the browser's CSS engine accepts (per-selector
 * try/catch). Runs in-page via page.evaluate — self-contained. Used to
 * pre-filter screenshot mask selectors so Playwright's mask locators never
 * throw on invalid user-supplied CSS.
 */
export function filterValidSelectorsInPage(selectors: string[]): string[] {
  return selectors.filter((selector) => {
    try {
      document.querySelector(selector);
      return true;
    } catch {
      return false;
    }
  });
}

export interface ElementProbe {
  id: string;
  selector: string;
}

export interface ElementObservation {
  id: string;
  exists: boolean;
  visible: boolean;
  text: string | null;
  href: string | null;
}

/**
 * Observe conversion elements in-page (spec §23, Phase 9). Runs inside the
 * browser via page.evaluate, so — like extractInPage — it must be a
 * self-contained serializable function. For each probe (a MonitoredElement id
 * plus its CSS selector) it reports whether the FIRST match exists, whether it
 * is visible, and its text/href. The comparison engine diffs these against the
 * baseline snapshot's observations to raise CONVERSION change events.
 */
export function checkElementsInPage(probes: ElementProbe[]): ElementObservation[] {
  const doc = document;

  function isVisible(el: Element): boolean {
    const html = el as HTMLElement;
    const style = window.getComputedStyle(el);
    if (style.display === "none") return false;
    if (style.visibility === "hidden" || style.visibility === "collapse") return false;
    if (parseFloat(style.opacity || "1") === 0) return false;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return false;
    // offsetParent is null when an ancestor is display:none; fixed-position
    // elements are the documented exception to that rule.
    if (html.offsetParent === null && style.position !== "fixed") return false;
    return true;
  }

  return probes.map((probe) => {
    let el: Element | null = null;
    try {
      el = doc.querySelector(probe.selector);
    } catch {
      // Invalid selector — report as not found rather than throwing.
      el = null;
    }
    if (!el) {
      return { id: probe.id, exists: false, visible: false, text: null, href: null };
    }
    const text = (el.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 500) || null;
    const href = el.hasAttribute("href") ? el.getAttribute("href") : null;
    return { id: probe.id, exists: true, visible: isVisible(el), text, href };
  });
}
