import Link from "next/link";
import { ArrowRight, FileText, PenLine, Search, Send } from "lucide-react";
import { AGENT_LIMITS } from "@mykavo/keyword-agent/pure";
import { GoogleIcon } from "@/components/brand/integration-icons";

/**
 * The hero's second card, beside the WordPress plugin: the AI Keywords &
 * Blog Writer. Monitoring protects the traffic a site has; this card is how
 * it wins more. The three steps are a labelled illustration of the flow, not
 * customer data.
 */
const STEPS = [
  { icon: Search, label: "Found", text: "“speed up wordpress”, you rank #14" },
  { icon: FileText, label: "Wrote", text: "Title, slug, meta, article, FAQ, schema" },
  { icon: Send, label: "Saved", text: "As a draft in WordPress, for you to publish" },
] as const;

export function HeroAiWriter() {
  const free = AGENT_LIMITS.free;
  return (
    <div className="flex h-full flex-col rounded-2xl border border-[#151515] bg-white/95 p-5 text-left shadow-[5px_5px_0_#151515] backdrop-blur sm:p-6">
      <div className="flex items-start gap-3.5">
        <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#FFD400] text-[#151515] ring-1 ring-[#151515]">
          <PenLine className="size-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 text-[17px] font-semibold leading-snug text-[#151515]">
            Want more traffic? Let AI write the post.
            <span className="rounded-full bg-[#151515] px-2 py-0.5 font-mono text-[9.5px] font-semibold uppercase tracking-[0.08em] text-[#FFD400]">New</span>
          </p>
          <p className="mt-1 text-[14px] leading-6 text-[#6B6B60]">
            The AI Keywords &amp; Blog Writer finds the searches your site can win, from your own Search Console data, and
            writes the full SEO post. Built to rank, never published without you.
          </p>
        </div>
      </div>

      <ol className="mt-4 space-y-1.5 rounded-xl bg-[#F6F5EE] p-3.5" aria-label="Example: from a search to a draft">
        {STEPS.map((s) => (
          <li key={s.label} className="flex items-start gap-2.5 text-[13px] leading-5">
            <span className="w-11 shrink-0 font-mono text-[11.5px] leading-5 text-[#6B6B60]">{s.label}</span>
            <s.icon className="mt-0.5 size-3.5 shrink-0 text-[#6B6B60]" aria-hidden />
            <span className={s.label === "Saved" ? "font-semibold text-[#151515]" : "text-[#3d3d38]"}>{s.text}</span>
          </li>
        ))}
        <li className="pl-[3.4rem] font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#6B6B60]">Example</li>
      </ol>

      <div className="mt-auto pt-5">
        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          <Link prefetch={false}
            href="/signup?provider=google&from=home_hero:ai-writer"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full border-2 border-[#151515] bg-[#FFD400] px-5 text-[14.5px] font-semibold text-[#151515] shadow-[0_3px_0_#151515] transition-[transform,box-shadow] duration-150 hover:translate-y-[3px] hover:shadow-none motion-reduce:transition-none"
          >
            <span className="inline-flex size-5 items-center justify-center rounded-full bg-white">
              <GoogleIcon className="size-3.5" />
            </span>
            Write your first post free
          </Link>
          <Link prefetch={false}
            href="/ai-blog-writer?from=home_hero"
            className="group inline-flex items-center justify-center gap-1.5 px-2 text-[14px] font-semibold text-[#151515]"
          >
            How it ranks
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </Link>
        </div>
        <p className="mt-3 text-[12.5px] text-[#6B6B60]">
          Free plan: {free.posts} post and {free.reports} keyword report a month · No card
        </p>
      </div>
    </div>
  );
}
