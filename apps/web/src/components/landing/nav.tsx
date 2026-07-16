"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { LogoMark } from "@/components/brand/logo";

const links = [
  { href: "/#categories", label: "What it watches" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#free-tools", label: "Free tools" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/blog", label: "Blog" },
];

/**
 * Slim full-width dark navigation (retool-style): hairline bottom border,
 * spark + wordmark left, links center-left, auth actions right with the gold
 * primary button. Collapses to a hamburger panel on small screens.
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

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 border-b border-white/10 backdrop-blur-md transition-colors ${
        scrolled ? "bg-[#151515]/95" : "bg-[#151515]/80"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-5 lg:px-8">
        <div className="flex min-w-0 items-center gap-8">
          <Link href="/" aria-label="MyKavo home" className="flex shrink-0 items-center gap-2.5">
            <LogoMark size={26} />
            <span className="text-[17px] font-semibold tracking-tight text-[#E9EBDF]">
              MyKavo
            </span>
          </Link>
          <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
            {links.map((l) => (
              <Link
                key={l.label}
                href={l.href}
                className="rounded-full px-3 py-2 text-[13.5px] font-medium text-[#9C9E93] transition-colors hover:text-[#E9EBDF]"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="hidden items-center gap-2 lg:flex">
          <Link
            href="/login"
            className="rounded-full px-3.5 py-2 text-[13.5px] font-medium text-[#9C9E93] transition-colors hover:text-[#E9EBDF]"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-full bg-[#FFD400] px-5 py-2.5 text-[13.5px] font-semibold text-[#151515] transition-colors hover:bg-[#ffe14d]"
          >
            Start free
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="landing-menu"
          className="inline-flex size-10 items-center justify-center rounded-full text-[#E9EBDF] transition-colors hover:bg-white/10 lg:hidden"
        >
          <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
          {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
        </button>
      </div>

      {/* Mobile dropdown panel */}
      {open && (
        <div id="landing-menu" className="border-t border-white/10 bg-[#151515] px-5 pb-5 lg:hidden">
          <nav aria-label="Main mobile" className="flex flex-col py-2">
            {links.map((l) => (
              <Link
                key={l.label}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-xl px-3 py-3 text-[15px] font-medium text-[#E9EBDF]/85 transition-colors hover:bg-white/5"
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="grid grid-cols-2 gap-2 border-t border-white/10 pt-4">
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="rounded-full border border-white/15 px-4 py-3 text-center text-sm font-medium text-[#E9EBDF]"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              onClick={() => setOpen(false)}
              className="rounded-full bg-[#FFD400] px-4 py-3 text-center text-sm font-semibold text-[#151515]"
            >
              Start free
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
