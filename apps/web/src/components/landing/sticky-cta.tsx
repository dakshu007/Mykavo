"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/**
 * Sticky split-pill CTA that floats at the bottom center once the visitor
 * scrolls past the hero — white "Start free" segment + black "How it works"
 * segment sharing one capsule.
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
      <div className="flex overflow-hidden rounded-full border border-[#0d0c0e]/10 shadow-[0_20px_50px_rgba(38,54,115,0.25)]">
        <Link
          href="/signup"
          className="bg-white px-6 py-3.5 text-sm font-semibold text-[#0d0c0e] transition-colors hover:bg-[#3556f4] hover:text-white"
        >
          Start free
        </Link>
        <Link
          href="/#how-it-works"
          className="bg-[#0d0c0e] px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#2a2830]"
        >
          How it works
        </Link>
      </div>
    </div>
  );
}
