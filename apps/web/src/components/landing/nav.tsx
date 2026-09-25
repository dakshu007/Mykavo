"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, Menu, X } from "lucide-react";
import { LogoMark } from "@/components/brand/logo";
import { AppAnnouncement } from "./app-announcement";
import { GoogleIcon } from "@/components/brand/integration-icons";

const links = [
  { href: "/pricing", label: "Pricing" },
  { href: "/android-app", label: "Android" },
  { href: "/blog", label: "Blog" },
  { href: "/support", label: "Support" },
];

type MenuItem = { href: string; label: string; badge?: string };

const integrations: MenuItem[] = [
  { href: "/wordpress-plugin", label: "WordPress plugin" },
  { href: "/shopify-app", label: "Shopify app", badge: "Coming soon" },
];

const tools: MenuItem[] = [
  { href: "/tools/competitor-analysis-tool", label: "Competitor Analysis" },
  { href: "/tools/website-change-detector", label: "Website Change Detector" },
  { href: "/tools/meta-tag-checker", label: "Meta Tag Checker" },
  { href: "/tools/eeat-analyzer", label: "E-E-A-T Analyzer" },
  { href: "/tools/redirect-chain-checker", label: "Redirect Chain Checker" },
  { href: "/tools/bulk-url-status-checker", label: "Bulk URL Status Checker" },
  { href: "/tools/script-detector", label: "Script Detector" },
];

function SoonBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-[#FFD400] px-2 py-0.5 font-mono text-[9.5px] font-semibold uppercase tracking-[0.08em] text-[#151515]">
      {children}
    </span>
  );
}

/**
 * A header dropdown (Integrations, Tools): opens on hover or click, closes
 * on outside click, Escape or mouse-leave.
 */
function NavMenu({ label, heading, items }: { label: string; heading: string; items: MenuItem[] }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  // A short grace period before a hover-close, so crossing the gap between
  // the button and the panel (or a wobbly mouse) never makes it flicker.
  const closeTimer = useRef<number | undefined>(undefined);
  const openNow = () => {
    window.clearTimeout(closeTimer.current);
    setMenuOpen(true);
  };
  const closeSoon = () => {
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setMenuOpen(false), 140);
  };
  useEffect(() => () => window.clearTimeout(closeTimer.current), []);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointer = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  return (
    <div
      ref={ref}
      className="relative"
      onMouseEnter={openNow}
      onMouseLeave={closeSoon}
    >
      <button
        type="button"
        // Open-only: hover already opens the menu, so a toggling click
        // would immediately close it for mouse users. Touch devices get
        // open-on-tap; closing is outside-tap, Escape, or mouse-leave.
        onClick={openNow}
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        className="flex items-center gap-1 rounded-full px-3 py-2 text-[13.5px] font-medium text-[#151515]/70 transition-colors hover:bg-[#151515]/[0.05] hover:text-[#151515]"
      >
        {label}
        <ChevronDown
          className={`size-3.5 transition-transform duration-200 ${menuOpen ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>
      {/* Always mounted so it can animate both ways. The top padding is the
          gap below the nav pill (the button sits ~10px above the pill's
          edge); being padding, it is also the hover bridge across that gap. */}
      <div
        role="menu"
        aria-label={heading}
        className={`absolute left-1/2 top-full w-64 origin-top -translate-x-1/2 pt-[22px] transition-[opacity,translate,scale,visibility] duration-200 ease-out motion-reduce:transition-none ${
          menuOpen
            ? "visible translate-y-0 scale-100 opacity-100"
            : "pointer-events-none invisible -translate-y-1.5 scale-[0.97] opacity-0"
        }`}
      >
          <div className="overflow-hidden rounded-2xl border border-[#151515]/15 bg-white p-1.5 shadow-[0_2px_0_#15151522,0_24px_50px_-18px_rgba(21,21,21,0.4)]">
            <p className="px-3 pb-1 pt-2 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-[#6B6B60]">
              {heading}
            </p>
            {items.map((t) => (
              <Link
                key={t.href}
                href={t.href}
                role="menuitem"
                onClick={() => setMenuOpen(false)}
                className="flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-[13.5px] font-medium text-[#151515]/80 transition-colors hover:bg-[#FFD400]/25 hover:text-[#151515]"
              >
                {t.label}
                {t.badge && <SoonBadge>{t.badge}</SoonBadge>}
              </Link>
            ))}
          </div>
      </div>
    </div>
  );
}

/**
 * Floating "island" navigation (ballpark.ing-style): a centered white pill
 * with an ink hairline and crisp offset shadow, hovering over the warm paper
 * canvas. Spark + wordmark left, links + Integrations and Tools dropdowns center, gold CTA
 * right. Collapses to a hamburger card on small screens.
 */
export function LandingNav() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Travels with the nav so it reaches all thirteen marketing pages -
          most arrivals land on a blog post or a tool, never on `/`. */}
      <AppAnnouncement />
      <header className="fixed inset-x-0 top-4 z-50 px-4 sm:top-5">
      <div className="mx-auto flex h-14 max-w-4xl items-center justify-between gap-4 rounded-full border border-[#151515]/15 bg-white/95 pl-5 pr-2 shadow-[0_2px_0_#15151522,0_18px_40px_-18px_rgba(21,21,21,0.35)] backdrop-blur">
        <Link href="/" aria-label="MyKavo home" className="flex shrink-0 items-center gap-2">
          <LogoMark size={24} />
          <span className="text-[16px] font-semibold tracking-tight text-[#151515]">MyKavo</span>
        </Link>

        <nav aria-label="Main" className="hidden items-center lg:flex">
          <Link
            href="/pricing"
            className="rounded-full px-3 py-2 text-[13.5px] font-medium text-[#151515]/70 transition-colors hover:bg-[#151515]/[0.05] hover:text-[#151515]"
          >
            Pricing
          </Link>
          <NavMenu label="Integrations" heading="Integrations" items={integrations} />
          {links.slice(1).map((l) => (
            <Link
              key={l.label}
              href={l.href}
              className="rounded-full px-3 py-2 text-[13.5px] font-medium text-[#151515]/70 transition-colors hover:bg-[#151515]/[0.05] hover:text-[#151515]"
            >
              {l.label}
            </Link>
          ))}

          <NavMenu label="Tools" heading="Free tools" items={tools} />
        </nav>

        <div className="hidden items-center gap-1.5 lg:flex">
          <Link
            href="/login"
            className="rounded-full px-3.5 py-2 text-[13.5px] font-medium text-[#151515]/70 transition-colors hover:text-[#151515]"
          >
            Log in
          </Link>
          <Link
            href="/signup?provider=google"
            className="inline-flex items-center gap-2 rounded-full bg-[#FFD400] px-5 py-2.5 text-[13.5px] font-semibold text-[#151515] ring-1 ring-inset ring-black/15 transition-colors hover:bg-[#ffe14d]"
          >
            <span className="inline-flex size-4.5 items-center justify-center rounded-full bg-white">
              <GoogleIcon className="size-3" />
            </span>
            Start free
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="landing-menu"
          className="inline-flex size-10 items-center justify-center rounded-full text-[#151515] transition-colors hover:bg-[#151515]/5 lg:hidden"
        >
          <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
          {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
        </button>
      </div>

      {/* Mobile dropdown card */}
      {open && (
        <div
          id="landing-menu"
          className="mx-auto mt-2 max-w-4xl rounded-3xl border border-[#151515]/15 bg-white p-4 shadow-[0_24px_60px_-20px_rgba(21,21,21,0.4)] lg:hidden"
        >
          <nav aria-label="Main mobile" className="flex flex-col">
            {links.map((l) => (
              <Link
                key={l.label}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-xl px-3 py-3 text-[15px] font-medium text-[#151515]/85 transition-colors hover:bg-[#151515]/[0.04]"
              >
                {l.label}
              </Link>
            ))}
            <p className="px-3 pb-1 pt-3 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-[#6B6B60]">
              Integrations
            </p>
            {integrations.map((t) => (
              <Link
                key={t.href}
                href={t.href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-[14px] font-medium text-[#151515]/75 transition-colors hover:bg-[#151515]/[0.04]"
              >
                {t.label}
                {t.badge && <SoonBadge>{t.badge}</SoonBadge>}
              </Link>
            ))}
            <p className="px-3 pb-1 pt-3 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-[#6B6B60]">
              Free tools
            </p>
            {tools.map((t) => (
              <Link
                key={t.href}
                href={t.href}
                onClick={() => setOpen(false)}
                className="rounded-xl px-3 py-2.5 text-[14px] font-medium text-[#151515]/75 transition-colors hover:bg-[#151515]/[0.04]"
              >
                {t.label}
              </Link>
            ))}
          </nav>
          <div className="mt-2 grid grid-cols-2 gap-2 border-t border-black/10 pt-4">
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="rounded-full border border-[#151515]/20 px-4 py-3 text-center text-sm font-medium text-[#151515]"
            >
              Log in
            </Link>
            <Link
              href="/signup?provider=google"
              onClick={() => setOpen(false)}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#FFD400] px-4 py-3 text-center text-sm font-semibold text-[#151515] ring-1 ring-inset ring-black/15"
            >
              <span className="inline-flex size-5 items-center justify-center rounded-full bg-white">
                <GoogleIcon className="size-3.5" />
              </span>
              Start free
            </Link>
          </div>
        </div>
      )}
      </header>
    </>
  );
}
