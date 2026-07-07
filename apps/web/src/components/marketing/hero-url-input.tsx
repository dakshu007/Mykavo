"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Globe } from "lucide-react";
import { track } from "@/lib/analytics";

/**
 * Interactive URL input in the hero — routes into the free
 * Website Change Detector so visitors get instant value.
 */
export function HeroUrlInput() {
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
      className="mx-auto flex w-full max-w-xl items-center gap-2 rounded-full bg-card p-2 shadow-float"
    >
      <span className="ml-3 text-ink-faint">
        <Globe className="size-5" aria-hidden />
      </span>
      <label className="sr-only" htmlFor="hero-url">
        Website URL
      </label>
      <input
        id="hero-url"
        type="text"
        inputMode="url"
        placeholder="Enter a website URL to inspect it free"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        className="h-11 min-w-0 flex-1 bg-transparent text-[15px] text-ink placeholder:text-ink-faint focus:outline-none"
      />
      <button
        type="submit"
        className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-ink px-5 text-sm font-medium text-white transition-colors hover:bg-black"
      >
        Inspect
        <ArrowRight className="size-4" aria-hidden />
      </button>
    </form>
  );
}
