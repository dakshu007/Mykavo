import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { MetaTagChecker } from "@/app/tools/meta-tag-checker/meta-tag-checker";
import { RedirectChainChecker } from "@/app/tools/redirect-chain-checker/redirect-chain-checker";
import { ScriptDetector } from "@/app/tools/script-detector/script-detector";
import { BulkStatusChecker } from "@/app/tools/bulk-url-status-checker/bulk-status-checker";
import { EeatAnalyzer } from "@/app/tools/eeat-analyzer/eeat-analyzer";
import type { BlogToolId } from "@/lib/blog-tools";

/**
 * The free tool that matches a post, embedded in it (see lib/blog-tools.ts
 * for the matching). The reader tries the thing the post describes on their
 * own site without leaving the page - the most natural step from reading
 * about a problem to catching it - and each tool ends in its own MyKavo CTA.
 */
const TOOLS: Record<BlogToolId, { title: string; lede: string; href: string; Tool: () => React.ReactNode }> = {
  "meta-tags": {
    title: "Check your own page's meta tags",
    lede: "Title, description, canonical and robots - including an accidental noindex - in a few seconds.",
    href: "/tools/meta-tag-checker",
    Tool: MetaTagChecker,
  },
  redirects: {
    title: "Trace your own redirect chain",
    lede: "Every hop, its status code and where it ends up.",
    href: "/tools/redirect-chain-checker",
    Tool: RedirectChainChecker,
  },
  scripts: {
    title: "See which scripts your page loads",
    lede: "Analytics, tag managers, pixels and every other third-party script on the page.",
    href: "/tools/script-detector",
    Tool: ScriptDetector,
  },
  status: {
    title: "Check your URLs' status codes",
    lede: "Paste a list of URLs and see which return 200, redirect, or break.",
    href: "/tools/bulk-url-status-checker",
    Tool: BulkStatusChecker,
  },
  eeat: {
    title: "Score your own page's E-E-A-T signals",
    lede: "Authorship, trust and expertise signals, checked on your page.",
    href: "/tools/eeat-analyzer",
    Tool: EeatAnalyzer,
  },
};

export function PostTool({ tool }: { tool: BlogToolId }) {
  const t = TOOLS[tool];
  return (
    <section aria-label="Try it on your site" className="mt-8 rounded-[28px] border-2 border-[#151515] bg-[#FBFAF3] p-6 text-[#151515] shadow-[6px_6px_0_#FFD400] sm:p-8">
      <p className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-[#6B6B60]">Try it on your site · free</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight">{t.title}</h2>
      <p className="mt-1.5 text-[15px] leading-7 text-[#6B6B60]">{t.lede}</p>
      <div className="mt-5">
        <t.Tool />
      </div>
      <Link
        href={t.href}
        className="mt-5 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-[#151515] underline-offset-4 hover:underline"
      >
        Open the full tool <ArrowRight className="size-3.5" aria-hidden />
      </Link>
    </section>
  );
}
