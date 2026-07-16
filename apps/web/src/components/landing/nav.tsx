"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { LogoMark } from "@/components/brand/logo";

const links = [
  { href: "/#categories", label: "What it watches" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#free-tools", label: "Free tools" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/blog", label: "Blog" },
];

/**
 * Floating pill navigation: two white capsules over the light canvas —
 * logo + links on the left, auth actions on the right. Collapses to a
 * single full-width pill with a dropdown panel on small screens.
 */
export function LandingNav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const shadow = scrolled ? "shadow-[0_12px_36px_rgba(38,54,115,0.18)]" : "shadow-[0_4px_20px_rgba(38,54,115,0.10)]";

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-5 sm:pt-5">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
        {/* Left pill: logo + links */}
        <div
          className={`flex min-w-0 flex-1 items-center justify-between rounded-full bg-white py-2 pl-4 pr-2 transition-shadow lg:flex-none lg:justify-start lg:gap-1 lg:pr-4 ${shadow}`}
        >
          <Link href="/" aria-label="MyKavo home" className="flex items-center gap-2 pr-2">
            <LogoMark size={24} className="text-[#0d0c0e]" />
            <span className="text-[16px] font-semibold tracking-tight text-[#0d0c0e]">MyKavo</span>
          </Link>
          <nav aria-label="Main" className="hidden items-center lg:flex">
            {links.map((l) => (
              <Link
                key={l.label}
                href={l.href}
                className="rounded-full px-3.5 py-2 text-[13.5px] font-medium text-[#0d0c0e]/75 transition-colors hover:bg-[#0d0c0e]/5 hover:text-[#0d0c0e]"
              >
                {l.label}
              </Link>
            ))}
          </nav>
          {/* Mobile toggle */}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="landing-menu"
            className="inline-flex size-10 items-center justify-center rounded-full text-[#0d0c0e] transition-colors hover:bg-[#0d0c0e]/5 lg:hidden"
          >
            <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
            <ChevronDown
              className={`size-5 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
              aria-hidden
            />
          </button>
        </div>

        {/* Right pill: auth actions (desktop) */}
        <div className={`hidden items-center gap-1 rounded-full bg-white p-2 pl-4 transition-shadow lg:flex ${shadow}`}>
          <Link
            href="/login"
            className="rounded-full px-3.5 py-2 text-[13.5px] font-medium text-[#0d0c0e]/75 transition-colors hover:bg-[#0d0c0e]/5 hover:text-[#0d0c0e]"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-full bg-[#0d0c0e] px-5 py-2.5 text-[13.5px] font-medium text-white transition-colors hover:bg-[#2a2830]"
          >
            Start free
          </Link>
        </div>
      </div>

      {/* Mobile dropdown panel */}
      {open && (
        <div
          id="landing-menu"
          className="mx-auto mt-2 max-w-6xl rounded-3xl bg-white p-3 shadow-[0_20px_50px_rgba(38,54,115,0.20)] lg:hidden"
        >
          <nav aria-label="Main mobile" className="flex flex-col">
            {links.map((l) => (
              <Link
                key={l.label}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-2xl px-4 py-3 text-[15px] font-medium text-[#0d0c0e]/80 transition-colors hover:bg-[#0d0c0e]/5"
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="mt-2 grid grid-cols-2 gap-2 border-t border-[#0d0c0e]/10 p-2 pt-3">
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="rounded-full border border-[#0d0c0e]/15 px-4 py-3 text-center text-sm font-medium text-[#0d0c0e]"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              onClick={() => setOpen(false)}
              className="rounded-full bg-[#0d0c0e] px-4 py-3 text-center text-sm font-medium text-white"
            >
              Start free
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
