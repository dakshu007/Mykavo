"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { track } from "@/lib/analytics";
import { CTA_COOKIE, CTA_MAX_AGE, cleanPath, ctaPlacement, isAppPath, pageTypeOf } from "@/lib/attribution/core";
import { sectionAnchors } from "@/lib/section-anchors";
import { measurementAllowed } from "@/lib/consent";

/**
 * Section tracking for every public page and blog post, with no per-page
 * code. On each page it:
 *
 * 1. Gives every section an anchor id (from data-track-section, aria-label
 *    or its first heading), so any section can be linked to and UTM-tagged:
 *    /pricing#faq, /blog/some-post#how-to-fix-it. Blog posts already have
 *    ids on their h2 headings; those are the post's sections.
 * 2. Sends `section_view` (page, page_type, section) the first time each
 *    section is on screen.
 * 3. Sends `cta_click` (page, page_type, section, label, target) for every
 *    link and button click, and for links to sign-up or log-in remembers
 *    "<page>:<section>" as the CTA, so the account records which page and
 *    section it came from (an explicit ?from= on the link still wins).
 *
 * Signed-in app pages are skipped: this is about the public site.
 */

function setCookie(name: string, value: string, maxAge: number) {
  if (!measurementAllowed()) return;
  try {
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${name}=${value}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
  } catch {
    // Cookies blocked: the signup still works, it just has no CTA.
  }
}

/** Which section an element belongs to. */
function sectionOf(el: Element): string {
  const marked = el.closest<HTMLElement>("[data-track-section]");
  if (marked) return marked.id || marked.dataset.trackSection || "section";
  if (el.closest("footer")) return "footer";
  if (!el.closest("main") && el.closest("header, nav")) return "nav";
  const section = el.closest<HTMLElement>("main section");
  if (section?.id) return section.id;
  const article = el.closest("article");
  if (article) {
    // The last h2 above the element is the part of the post it sits in.
    let current = "intro";
    const top = el.getBoundingClientRect().top;
    for (const h of Array.from(article.querySelectorAll<HTMLElement>("h2[id]"))) {
      if (h.getBoundingClientRect().top <= top) current = h.id;
    }
    return current;
  }
  return "page";
}

function labelOf(el: HTMLElement): string {
  const raw = el.getAttribute("aria-label") || el.textContent || el.getAttribute("title") || "";
  return raw.replace(/\s+/g, " ").trim().slice(0, 60) || "(no label)";
}

export function PageTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || isAppPath(pathname)) return;
    const page = cleanPath(pathname);
    const pageType = pageTypeOf(page);
    let io: IntersectionObserver | null = null;

    // After the new page has painted (client navigations included).
    const frame = window.requestAnimationFrame(() => {
      const hash = decodeURIComponent(window.location.hash.slice(1));
      const hadTarget = hash ? Boolean(document.getElementById(hash)) : true;
      const sections = sectionAnchors(document, { assign: true }).map((a) => a.element);
      // A link to a section that only got its id just now: scroll to it.
      if (!hadTarget) document.getElementById(hash)?.scrollIntoView();

      const seen = new Set<string>();
      io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            const id = (e.target as HTMLElement).id;
            if (!e.isIntersecting || !id || seen.has(id)) continue;
            seen.add(id);
            track("section_view", { page, page_type: pageType, section: id });
            io?.unobserve(e.target);
          }
        },
        { threshold: 0.3 },
      );
      sections.forEach((s) => io?.observe(s));
    });

    const onClick = (event: MouseEvent) => {
      const el = (event.target as Element | null)?.closest<HTMLElement>("a, button");
      if (!el || el.closest("[data-track-ignore]")) return;
      const section = sectionOf(el);
      const href = el instanceof HTMLAnchorElement ? el.href : "";
      let target = "button";
      if (href) {
        try {
          const url = new URL(href);
          const own = url.origin === window.location.origin;
          if (own && (url.pathname === "/signup" || url.pathname === "/login")) {
            target = "signup";
            if (!url.searchParams.get("from")) setCookie(CTA_COOKIE, ctaPlacement(page, section), CTA_MAX_AGE);
          } else {
            target = own ? (url.pathname === window.location.pathname && url.hash ? "anchor" : "internal") : "external";
          }
        } catch {
          target = "link";
        }
      }
      let to = "";
      if (href) {
        try {
          const url = new URL(href);
          to = url.origin === window.location.origin ? `${url.pathname}${url.hash}` : url.hostname;
        } catch {
          to = "";
        }
      }
      track("cta_click", { page, page_type: pageType, section, label: labelOf(el), target, to: to.slice(0, 100) });
    };
    document.addEventListener("click", onClick, true);

    return () => {
      window.cancelAnimationFrame(frame);
      io?.disconnect();
      document.removeEventListener("click", onClick, true);
    };
  }, [pathname]);

  return null;
}
