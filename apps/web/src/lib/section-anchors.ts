import { sectionSlug } from "@/lib/attribution/core";

/**
 * The sections of a page and their anchor ids, named the same way wherever
 * they are read: by the site-wide tracker on the live page (which writes the
 * ids it assigns, so /page#section links work) and by the admin UTM link
 * builder on a fetched copy of the page.
 *
 * A section is any `main section` or `[data-track-section]` element; one
 * without an id is named from data-track-section, its aria-label or its first
 * heading ("hero" for an unnamed first section). On blog posts, every h2 the
 * renderer anchored starts a section too.
 */

export const SECTION_SELECTOR = "main section, [data-track-section]";

export interface SectionAnchor {
  id: string;
  label: string;
  element: HTMLElement;
}

function headingText(el: Element): string {
  return (el.querySelector("h1, h2, h3")?.textContent ?? "").replace(/\s+/g, " ").trim();
}

export function sectionAnchors(doc: Document, options: { assign: boolean }): SectionAnchor[] {
  const taken = new Set(Array.from(doc.querySelectorAll<HTMLElement>("[id]")).map((e) => e.id));
  const out: SectionAnchor[] = [];
  Array.from(doc.querySelectorAll<HTMLElement>(SECTION_SELECTOR)).forEach((el, i) => {
    const label =
      el.dataset.trackSection || el.getAttribute("aria-label") || headingText(el) || (i === 0 ? "Hero" : `Section ${i + 1}`);
    let id = el.id;
    if (!id) {
      const base = sectionSlug(label === "Hero" && i === 0 ? "hero" : label);
      id = base;
      for (let n = 2; taken.has(id); n++) id = `${base}-${n}`;
      taken.add(id);
      if (options.assign) el.id = id;
    }
    out.push({ id, label, element: el });
  });
  for (const h of Array.from(doc.querySelectorAll<HTMLElement>("article h2[id]"))) {
    out.push({ id: h.id, label: (h.textContent ?? "").replace(/\s+/g, " ").trim(), element: h });
  }
  return out;
}
