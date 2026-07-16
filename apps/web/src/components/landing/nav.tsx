"use client";

import { useState } from "react";
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
 * Floating "island" navigation (ballpark.ing-style): a centered white pill
 * with an ink hairline and crisp offset shadow, hovering over the warm paper
 * canvas. Spark + wordmark left, links center, gold CTA right. Collapses to
 * a hamburger card on small screens.
 */
export function LandingNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-4 z-50 px-4 sm:top-5">
      <div className="mx-auto flex h-14 max-w-4xl items-center justify-between gap-4 rounded-full border border-[#151515]/15 bg-white/95 pl-5 pr-2 shadow-[0_2px_0_#15151522,0_18px_40px_-18px_rgba(21,21,21,0.35)] backdrop-blur">
        <Link href="/" aria-label="MyKavo home" className="flex shrink-0 items-center gap-2">
          <LogoMark size={24} />
          <span className="text-[16px] font-semibold tracking-tight text-[#151515]">MyKavo</span>
        </Link>

        <nav aria-label="Main" className="hidden items-center lg:flex">
          {links.map((l) => (
            <Link
              key={l.label}
              href={l.href}
              className="rounded-full px-3 py-2 text-[13.5px] font-medium text-[#151515]/70 transition-colors hover:bg-[#151515]/[0.05] hover:text-[#151515]"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-1.5 lg:flex">
          <Link
            href="/login"
            className="rounded-full px-3.5 py-2 text-[13.5px] font-medium text-[#151515]/70 transition-colors hover:text-[#151515]"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-full bg-[#FFD400] px-5 py-2.5 text-[13.5px] font-semibold text-[#151515] ring-1 ring-inset ring-black/15 transition-colors hover:bg-[#ffe14d]"
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
              href="/signup"
              onClick={() => setOpen(false)}
              className="rounded-full bg-[#FFD400] px-4 py-3 text-center text-sm font-semibold text-[#151515] ring-1 ring-inset ring-black/15"
            >
              Start free
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
