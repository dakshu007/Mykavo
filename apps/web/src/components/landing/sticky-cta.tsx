"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { GoogleButton } from "./google-cta";

/**
 * Sticky CTA that floats at the bottom center once the visitor scrolls past
 * the hero: the shared "Continue with Google" button, plus an ink "How it
 * works" pill on wider screens.
 */
export function StickyCta() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > window.innerHeight * 1.5);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={`fixed inset-x-0 bottom-5 z-40 flex justify-center px-5 transition-all duration-500 ${
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-6 opacity-0"
      }`}
    >
      <div className="flex items-center gap-3">
        <GoogleButton size="md" />
        <Link
          href="/#how-it-works"
          className="hidden h-11 items-center rounded-full border border-[#151515] bg-[#151515] px-6 text-[14px] font-semibold text-[#F5F5F0] shadow-[4px_4px_0_#FFD400] transition-colors hover:bg-[#2a2a2a] sm:inline-flex"
        >
          How it works
        </Link>
      </div>
    </div>
  );
}
