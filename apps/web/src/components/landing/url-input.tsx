"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Globe } from "lucide-react";
import { track } from "@/lib/analytics";

/**
 * Landing hero URL input, styled like a prompt card: warm bone surface on the
 * dark canvas with the gold action button. Routes into the free Website
 * Change Detector so visitors get instant value.
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
      className="mx-auto flex w-full max-w-xl items-center gap-2 rounded-2xl border border-black/10 bg-[#F7F8F4] p-2 shadow-[0_24px_60px_rgba(0,0,0,0.45)]"
    >
      <span className="ml-3 text-[#151515]/40">
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
        className="h-11 min-w-0 flex-1 bg-transparent text-[15px] text-[#151515] placeholder:text-[#151515]/45 focus:outline-none"
      />
      <button
        type="submit"
        className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl bg-[#FFD400] px-5 text-sm font-semibold text-[#151515] transition-colors hover:bg-[#ffe14d]"
      >
        Inspect
        <ArrowRight className="size-4" aria-hidden />
      </button>
    </form>
  );
}
