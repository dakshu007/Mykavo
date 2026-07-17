"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { track } from "@/lib/analytics";
import { fontDisplay } from "@/components/landing/style";

/**
 * Product CTA block shown under free-tool results, tying the tool to
 * monitoring. v4 landing design: the ink band with a gold offset shadow and
 * gold pill CTA - the same closing beat the blog posts use.
 */
export function ToolCta({
  heading,
  body,
  tool,
}: {
  heading: string;
  body: string;
  tool: string;
}) {
  return (
    <div className="rounded-2xl border border-[#151515] bg-[#151515] px-6 py-10 text-center shadow-[6px_6px_0_#FFD400,6px_6px_0_1px_#151515]">
      <h2 className={`${fontDisplay} text-2xl leading-tight text-[#F5F5F0] sm:text-3xl`}>
        {heading}
      </h2>
      <p className="mx-auto mt-2.5 max-w-md text-sm leading-6 text-[#9C9E93]">{body}</p>
      <Link
        href="/signup"
        className="mt-6 inline-flex h-11 items-center gap-2 rounded-full bg-[#FFD400] px-6 text-sm font-semibold text-[#151515] transition-colors hover:bg-[#ffe14d]"
        onClick={() => track("cta_clicked", { cta: "tool_to_waitlist", tool })}
      >
        Start Monitoring Free <ArrowRight className="size-4" aria-hidden />
      </Link>
    </div>
  );
}
