"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/logo";
import { ButtonLink } from "@/components/ui/button";

const links = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#use-cases", label: "Use cases" },
  { href: "/tools/website-change-detector", label: "Free tools" },
  { href: "/blog", label: "Blog" },
  { href: "/pricing", label: "Pricing" },
];

export function MarketingNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-line/60 bg-canvas/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-300 items-center justify-between px-5 lg:px-8">
        <Logo />
        <nav className="hidden items-center gap-7 md:flex" aria-label="Main">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-ink-secondary transition-colors hover:text-ink"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <ButtonLink href="/login" size="sm" variant="ghost">
            Sign in
          </ButtonLink>
          <ButtonLink href="/signup" size="sm">
            Start Monitoring Free
          </ButtonLink>
        </div>
        <button
          className="inline-flex size-10 items-center justify-center rounded-full text-ink md:hidden"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>
      {open && (
        <nav className="border-t border-line bg-canvas px-5 py-4 md:hidden" aria-label="Mobile">
          <ul className="space-y-1">
            {links.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-xl px-3 py-2.5 text-[15px] font-medium text-ink hover:bg-black/5"
                >
                  {l.label}
                </Link>
              </li>
            ))}
            <li className="pt-2">
              <ButtonLink href="/signup" className="w-full">
                Start Monitoring Free
              </ButtonLink>
            </li>
            <li>
              <ButtonLink href="/login" variant="secondary" className="w-full">
                Sign in
              </ButtonLink>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
