"use client";

import { ArrowUpRight, Clock } from "lucide-react";
import { track } from "@/lib/analytics";
import { CHROME_EXTENSION_VERSION, CHROME_STORE_URL } from "@/config/chrome-extension";

/**
 * The main install action: the Chrome Web Store listing, counted per
 * placement. Until the listing is live it says so instead of linking.
 */
export function ChromeStoreButton({ placement, variant = "gold" }: { placement: string; variant?: "gold" | "ink" }) {
  const styles =
    variant === "gold"
      ? "border-[#151515] bg-[#FFD400] text-[#151515] shadow-[4px_4px_0_#151515] hover:bg-[#ffe14d]"
      : "border-[#151515] bg-white text-[#151515] hover:bg-[#F3F1E6]";
  if (!CHROME_STORE_URL) {
    return (
      <span
        className={`inline-flex items-center justify-center gap-2 rounded-full border px-6 py-3.5 text-sm font-semibold ${styles} cursor-default`}
      >
        <Clock className="size-4" aria-hidden />
        Coming soon to the Chrome Web Store
      </span>
    );
  }
  return (
    <a
      href={CHROME_STORE_URL}
      target="_blank"
      rel="noopener"
      onClick={() => track("chrome_store_clicked", { placement, version: CHROME_EXTENSION_VERSION })}
      className={`inline-flex items-center justify-center gap-2 rounded-full border px-6 py-3.5 text-sm font-semibold transition-colors ${styles}`}
    >
      <ChromeMark className="size-4.5" />
      Add to Chrome - it&apos;s free
      <ArrowUpRight className="size-4" aria-hidden />
    </a>
  );
}

/** A plain three-segment ring for Chrome, not Google's logo. */
export function ChromeMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9.5" />
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 8.5h9M8.97 13.75 4.47 5.95M15.03 13.75l-4.5 7.8" strokeLinecap="round" />
    </svg>
  );
}
