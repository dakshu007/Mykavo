"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/**
 * Sticky split-pill CTA that floats at the bottom center once the visitor
 * scrolls past the hero - gold "Start free" segment + ink "How it works"
 * segment sharing one crisp ink-bordered capsule.
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
      <div className="flex overflow-hidden rounded-full border border-[#151515] shadow-[4px_4px_0_#151515]">
        <Link
          href="/signup"
          className="bg-[#FFD400] px-6 py-3.5 text-sm font-semibold text-[#151515] transition-colors hover:bg-[#ffe14d]"
        >
          Start free
        </Link>
        <Link
          href="/#how-it-works"
          className="border-l border-[#151515] bg-[#151515] px-6 py-3.5 text-sm font-semibold text-[#F5F5F0] transition-colors hover:bg-[#2a2a2a]"
        >
          How it works
        </Link>
      </div>
    </div>
  );
}
