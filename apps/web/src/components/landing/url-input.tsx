"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Globe } from "lucide-react";
import { track } from "@/lib/analytics";

/**
 * Landing hero URL input: a crisp white prompt card with an ink hairline and
 * offset shadow, gold action button. Routes into the free Website Change
 * Detector so visitors get instant value without signing up.
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
      className="mx-auto flex w-full max-w-xl items-center gap-2 rounded-2xl border border-[#151515] bg-white p-2 shadow-[5px_5px_0_#151515]"
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
        className="h-11 min-w-0 flex-1 bg-transparent text-[15px] text-[#151515] placeholder:text-[#151515]/40 focus:outline-none"
      />
      <button
        type="submit"
        className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl border border-[#151515] bg-[#FFD400] px-5 text-sm font-semibold text-[#151515] transition-colors hover:bg-[#ffe14d]"
      >
        Inspect
        <ArrowRight className="size-4" aria-hidden />
      </button>
    </form>
  );
}
