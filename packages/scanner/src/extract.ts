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
