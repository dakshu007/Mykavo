"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Globe } from "lucide-react";
import { track } from "@/lib/analytics";

/**
 * Landing variant of the hero URL input — same behavior as the marketing
 * HeroUrlInput (routes into the free Website Change Detector), restyled as a
 * white pill on the dark canvas.
 */
export function LandingUrlInput() {
  const [url, setUrl] = useState("");
  const router = useRouter();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const target = url.trim();
    if (!target) return;
    track("cta_clicked", { cta: "hero_url_input" });
    router.push(`/tools/website-change-detector?url=${encodeURIComponent(target)}`);
  }

  return (
    <form
      onSubmit={submit}
      className="mx-auto flex w-full max-w-xl items-center gap-2 rounded-full bg-white p-2 shadow-[0_16px_50px_rgba(0,0,0,0.45)]"
    >
      <span className="ml-3 text-[#0d0c0e]/40">
        <Globe className="size-5" aria-hidden />
      </span>
      <label className="sr-only" htmlFor="landing-url">
        Website URL
      </label>
      <input
        id="landing-url"
        type="text"
        inputMode="url"
        placeholder="Enter a website URL to inspect it free"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        className="h-11 min-w-0 flex-1 bg-transparent text-[15px] text-[#0d0c0e] placeholder:text-[#0d0c0e]/40 focus:outline-none"
      />
      <button
        type="submit"
        className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-[#0d0c0e] px-5 text-sm font-medium text-white transition-colors hover:bg-[#2a2830]"
      >
        Inspect
        <ArrowRight className="size-4" aria-hidden />
      </button>
    </form>
  );
}
