"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown, Menu, X } from "lucide-react";
import { LogoMark } from "@/components/brand/logo";
import { SitePromoBar } from "./campaign-announcement";
import { GoogleIcon, McpIcon } from "@/components/brand/integration-icons";
import { TOOLS, TOOLS_HUB_PATH, toolHref } from "@/config/tools";

/**
 * Site header, alyn.dev-style: two clean glass islands (logo + links on the
 * left, the connector, log in and the main call to action on the right) and
 * one wide "Product" panel underneath them with every page grouped into
 * columns, small grey headings over plain links.
 */

type NavLink = { href: string; label: string; badge?: string };
type NavGroup = { title: string; links: NavLink[] };

const PLATFORMS: NavLink[] = [
  { href: "/wordpress-plugin", label: "WordPress plugin" },
  { href: "/shopify-app", label: "Shopify app", badge: "Soon" },
  { href: "/website-monitoring-for-webflow", label: "Webflow" },
  { href: "/chrome-extension", label: "Chrome extension" },
  { href: "/android-app", label: "Android app" },
  { href: "/platforms", label: "All platforms" },
];

const popularTools = TOOLS.filter((t) => t.popular).slice(0, 7);

const GROUPS: NavGroup[] = [
  {
    title: "Monitor",
    links: [
      { href: "/#categories", label: "What it watches" },
      { href: "/visual-regression-testing", label: "Visual regression" },
      { href: "/seo-monitoring", label: "SEO monitoring" },
      { href: "/website-content-monitoring", label: "Content monitoring" },
      { href: "/site-audit", label: "Site Audit" },
      { href: "/ai-website-insights", label: "AI Website Insights" },
      { href: "/#client-reports", label: "Client reports" },
      { href: "/preview", label: "Dashboard preview" },
    ],
  },
  {
    title: "AI Writer",
    links: [
      { href: "/ai-blog-writer", label: "AI blog writer", badge: "New" },
      { href: "/best-ai-blog-writer", label: "Best AI blog writer" },
      { href: "/seo-blog-writer", label: "SEO blog writer" },
      { href: "/ai-content-writer", label: "AI content writer" },
      { href: "/ai-article-writer", label: "AI article writer" },
      { href: "/free-ai-blog-writer", label: "Free AI blog writer" },
      { href: "/blog-post-generator", label: "Blog post generator" },
      { href: "/ai-blog-writer-for-wordpress", label: "For WordPress" },
    ],
  },
  {
    title: "Free tools",
    links: [
      ...popularTools.map((t) => ({ href: toolHref(t.slug), label: t.menuLabel })),
      { href: TOOLS_HUB_PATH, label: `All ${TOOLS.length} tools` },
    ],
  },
  {
    title: "Compare",
    links: [
      { href: "/alternatives/jasper-alternative", label: "vs Jasper" },
      { href: "/alternatives/surfer-seo-alternative", label: "vs Surfer" },
      { href: "/alternatives/visualping-alternative", label: "vs Visualping" },
      { href: "/alternatives/distill-alternative", label: "vs Distill" },
      { href: "/alternatives/hexometer-alternative", label: "vs Hexometer" },
      { href: "/alternatives/hexowatch-alternative", label: "vs Hexowatch" },
      { href: "/best-website-monitoring-tools", label: "Best monitoring tools" },
      { href: "/alternatives", label: "All comparisons" },
    ],
  },
  {
    title: "Learn",
    links: [
      { href: "/blog", label: "Blog" },
      { href: "/docs", label: "Docs" },
      { href: "/video-tutorials", label: "Video tutorials" },
      { href: "/whats-new-on-mykavo", label: "What's new" },
      { href: "/support", label: "Support" },
      { href: "/contact", label: "Contact" },
    ],
  },
];

const ASSISTANTS: NavLink[] = [
  { href: "/ai-connector", label: "Claude & ChatGPT" },
  { href: "/ai-assistants", label: "AI assistants (MCP)" },
];

/** Plain links in the left island, after the Product menu. */
const TOP_LINKS: NavLink[] = [
  { href: "/ai-blog-writer", label: "AI Writer", badge: "New" },
  { href: "/pricing", label: "Pricing" },
  { href: TOOLS_HUB_PATH, label: "Free tools" },
  { href: "/blog", label: "Blog" },
];

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-[#FFD400] px-1.5 py-px font-mono text-[9.5px] font-semibold uppercase tracking-[0.08em] text-[#151515]">
      {children}
    </span>
  );
}

const island =
  "flex h-14 items-center rounded-2xl border border-[#151515]/10 bg-white/85 shadow-[0_10px_30px_-14px_rgba(21,21,21,0.28)] backdrop-blur-xl";

const topLink =
  "inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-[14.5px] font-medium text-[#151515]/80 transition-colors hover:bg-[#151515]/[0.05] hover:text-[#151515]";

function GroupList({ group, onPick }: { group: NavGroup; onPick: () => void }) {
  return (
    <div className="min-w-0">
      <p className="text-[13px] font-medium text-[#6B6B60]">{group.title}</p>
      <ul className="mt-3 space-y-0.5">
        {group.links.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              // Hidden menu links stay in the page; prefetching them all would
              // cost every visitor dozens of requests per page.
              prefetch={false}
              onClick={onPick}
              className="-mx-2 flex items-center gap-2 rounded-lg px-2 py-[7px] text-[15px] text-[#151515]/85 transition-colors hover:bg-[#151515]/[0.04] hover:text-[#151515]"
            >
              <span className="truncate">{l.label}</span>
              {l.badge ? <Badge>{l.badge}</Badge> : null}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The wide Product panel under both islands. */
function MegaPanel({ onPick }: { onPick: () => void }) {
  return (
    <div className="grid gap-x-8 gap-y-8 rounded-[26px] border border-[#151515]/10 bg-white/95 p-7 shadow-[0_30px_70px_-30px_rgba(21,21,21,0.45)] backdrop-blur-xl lg:grid-cols-4 xl:grid-cols-[minmax(0,1.05fr)_repeat(5,minmax(0,1fr))_minmax(0,1fr)]">
      <div className="min-w-0">
        <Link
          href="/signup?provider=google&from=nav:panel"
          prefetch={false}
          onClick={onPick}
          className="group block rounded-2xl bg-[#FFD400]/20 p-4 transition-colors hover:bg-[#FFD400]/35"
        >
          <p className="text-[16px] font-semibold text-[#151515]">Start monitoring free</p>
          <p className="mt-1 text-[13px] leading-snug text-[#5b5b52]">Know what changed on every site you manage. No card.</p>
          <span className="mt-2 inline-flex items-center gap-1 text-[13px] font-semibold text-[#151515]">
            Get started <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </span>
        </Link>
        <div className="mt-7">
          <GroupList group={{ title: "By platform", links: PLATFORMS }} onPick={onPick} />
        </div>
      </div>
      {GROUPS.map((g) => (
        <GroupList key={g.title} group={g} onPick={onPick} />
      ))}
      <div className="min-w-0">
        <GroupList group={{ title: "With AI assistants", links: ASSISTANTS }} onPick={onPick} />
        <div className="mt-7">
          <GroupList
            group={{
              title: "Company",
              links: [
                { href: "/about", label: "About" },
                { href: "/partners", label: "Partners" },
                { href: "/demo", label: "Book a demo" },
              ],
            }}
            onPick={onPick}
          />
        </div>
      </div>
    </div>
  );
}

export function LandingNav() {
  const [panelOpen, setPanelOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  // A short grace period before a hover-close, so crossing the gap between
  // the button and the panel never makes it flicker.
  const closeTimer = useRef<number | undefined>(undefined);
  const openNow = () => {
    window.clearTimeout(closeTimer.current);
    setPanelOpen(true);
  };
  const closeSoon = () => {
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setPanelOpen(false), 160);
  };
  const closeNow = () => {
    window.clearTimeout(closeTimer.current);
    setPanelOpen(false);
  };
  useEffect(() => () => window.clearTimeout(closeTimer.current), []);

  useEffect(() => {
    if (!panelOpen) return;
    const onPointer = (e: PointerEvent) => {
      if (!headerRef.current?.contains(e.target as Node)) setPanelOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPanelOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [panelOpen]);

  return (
    <>
      {/* A seasonal offer bar across the very top. Its height (--promo-h,
          set before first paint only while an offer runs) is held open by
          the spacer and added to the nav's offset, so nothing overlaps. */}
      <SitePromoBar />
      <div aria-hidden className="h-[var(--promo-h,0px)]" />
      <header
        ref={headerRef}
        data-landing-nav
        onMouseLeave={closeSoon}
        className="fixed inset-x-0 top-[calc(var(--promo-h,0px)+0.75rem)] z-50 px-3 sm:top-[calc(var(--promo-h,0px)+1rem)] sm:px-4"
      >
        <div className="relative mx-auto max-w-7xl">
          <div className="flex items-center justify-between gap-3 whitespace-nowrap">
            {/* Left island: logo and the main links. */}
            <div className={`${island} gap-1 pl-4 pr-2`}>
              <Link href="/" aria-label="MyKavo home" className="mr-3 flex shrink-0 items-center gap-2" onMouseEnter={closeSoon}>
                <LogoMark size={24} />
                <span className="text-[17px] font-semibold tracking-tight text-[#151515]">MyKavo</span>
              </Link>
              <nav aria-label="Main" className="hidden items-center gap-0.5 lg:flex">
                <button
                  ref={triggerRef}
                  type="button"
                  onMouseEnter={openNow}
                  onClick={() => (panelOpen ? closeNow() : openNow())}
                  aria-expanded={panelOpen}
                  aria-controls="nav-product-panel"
                  className={`${topLink} ${panelOpen ? "bg-[#151515]/[0.05] text-[#151515]" : ""}`}
                >
                  Product
                  <ChevronDown className={`size-3.5 transition-transform duration-200 ${panelOpen ? "rotate-180" : ""}`} aria-hidden />
                </button>
                {TOP_LINKS.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    onMouseEnter={closeSoon}
                    className={`${topLink} ${l.href === TOOLS_HUB_PATH ? "hidden xl:inline-flex" : ""}`}
                  >
                    {l.label}
                    {l.badge ? <Badge>{l.badge}</Badge> : null}
                  </Link>
                ))}
              </nav>
            </div>

            {/* Right island: connector, log in, the main call to action. */}
            <div className={`${island} hidden gap-1.5 px-2 lg:flex`} onMouseEnter={closeSoon}>
              <Link
                href="/ai-connector"
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#151515]/10 bg-white px-3 text-[14px] font-medium text-[#151515] transition-colors hover:border-[#151515]/25"
              >
                <McpIcon className="size-4" />
                <span className="hidden xl:inline">Claude &amp; ChatGPT</span>
                <span className="xl:hidden">MCP</span>
              </Link>
              <Link href="/login" className="inline-flex h-10 items-center rounded-xl px-3 text-[14px] font-medium text-[#151515]/75 transition-colors hover:text-[#151515]">
                Log in
              </Link>
              <Link
                href="/signup?provider=google"
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#151515] px-4 text-[14px] font-semibold text-white transition-colors hover:bg-[#2a2a28] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD400] focus-visible:ring-offset-2"
              >
                <span className="inline-flex size-4.5 items-center justify-center rounded-full bg-white">
                  <GoogleIcon className="size-3" />
                </span>
                Start free
              </Link>
            </div>

            {/* Mobile: the same right-hand call to action, compact, and the menu toggle. */}
            <div className={`${island} gap-1 px-1.5 lg:hidden`}>
              <Link
                href="/signup?provider=google"
                className="inline-flex h-10 items-center rounded-xl bg-[#151515] px-3.5 text-[13.5px] font-semibold text-white"
              >
                Start free
              </Link>
              <button
                type="button"
                onClick={() => setMobileOpen((v) => !v)}
                aria-expanded={mobileOpen}
                aria-controls="landing-menu"
                className="inline-flex size-10 items-center justify-center rounded-xl text-[#151515] transition-colors hover:bg-[#151515]/5"
              >
                <span className="sr-only">{mobileOpen ? "Close menu" : "Open menu"}</span>
                {mobileOpen ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
              </button>
            </div>
          </div>

          {/* The Product panel: always mounted so it can animate both ways.
              The top padding is the hover bridge from the islands. */}
          <div
            id="nav-product-panel"
            onMouseEnter={openNow}
            className={`absolute inset-x-0 top-full hidden origin-top pt-2.5 transition-[opacity,translate,visibility] duration-200 ease-out motion-reduce:transition-none lg:block ${
              panelOpen ? "visible translate-y-0 opacity-100" : "pointer-events-none invisible -translate-y-1.5 opacity-0"
            }`}
          >
            <MegaPanel onPick={closeNow} />
          </div>

          {/* Mobile menu card. */}
          {mobileOpen ? (
            <div
              id="landing-menu"
              className="mt-2 max-h-[calc(100svh-7rem)] overflow-y-auto rounded-[22px] border border-[#151515]/10 bg-white p-4 shadow-[0_24px_60px_-20px_rgba(21,21,21,0.4)] lg:hidden"
            >
              <nav aria-label="Main mobile" className="flex flex-col">
                {TOP_LINKS.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2 rounded-xl px-3 py-3 text-[16px] font-medium text-[#151515] hover:bg-[#151515]/[0.04]"
                  >
                    {l.label}
                    {l.badge ? <Badge>{l.badge}</Badge> : null}
                  </Link>
                ))}
                <Link
                  href="/ai-connector"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 rounded-xl px-3 py-3 text-[16px] font-medium text-[#151515] hover:bg-[#151515]/[0.04]"
                >
                  <McpIcon className="size-[18px]" />
                  Claude &amp; ChatGPT
                </Link>
                <div className="mt-2 border-t border-black/10 pt-2">
                  {[{ title: "By platform", links: PLATFORMS }, ...GROUPS].map((g) => (
                    <details key={g.title} className="group [&_summary::-webkit-details-marker]:hidden">
                      <summary className="flex cursor-pointer list-none items-center justify-between rounded-xl px-3 py-3 text-[15px] font-medium text-[#151515]/80 hover:bg-[#151515]/[0.04]">
                        {g.title}
                        <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden />
                      </summary>
                      <ul className="mb-2 ml-3 border-l border-black/10 pl-3">
                        {g.links.map((l) => (
                          <li key={l.href}>
                            <Link
                              href={l.href}
                              prefetch={false}
                              onClick={() => setMobileOpen(false)}
                              className="flex items-center gap-2 rounded-lg px-2 py-2 text-[14.5px] text-[#151515]/80 hover:bg-[#151515]/[0.04]"
                            >
                              {l.label}
                              {l.badge ? <Badge>{l.badge}</Badge> : null}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </details>
                  ))}
                </div>
              </nav>
              <div className="mt-3 grid grid-cols-2 gap-2 border-t border-black/10 pt-4">
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-xl border border-[#151515]/15 px-4 py-3 text-center text-sm font-medium text-[#151515]"
                >
                  Log in
                </Link>
                <Link
                  href="/signup?provider=google"
                  onClick={() => setMobileOpen(false)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#151515] px-4 py-3 text-center text-sm font-semibold text-white"
                >
                  <span className="inline-flex size-5 items-center justify-center rounded-full bg-white">
                    <GoogleIcon className="size-3.5" />
                  </span>
                  Start free
                </Link>
              </div>
            </div>
          ) : null}
        </div>
      </header>
    </>
  );
}
