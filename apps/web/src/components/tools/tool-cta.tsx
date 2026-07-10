"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { track } from "@/lib/analytics";

/** Product CTA block shown under free-tool results, tying the tool to monitoring. */
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
    <div className="rounded-card bg-ink px-6 py-8 text-center">
      <h2 className="text-xl font-semibold tracking-tight text-white">{heading}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/70">{body}</p>
      <Link
        href="/signup"
        className="mt-5 inline-flex h-11 items-center gap-2 rounded-full bg-white px-6 text-sm font-medium text-ink transition-colors hover:bg-white/90"
        onClick={() => track("cta_clicked", { cta: "tool_to_waitlist", tool })}
      >
        Start Monitoring Free <ArrowRight className="size-4" aria-hidden />
      </Link>
    </div>
  );
}
