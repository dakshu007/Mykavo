import { Sparkles } from "lucide-react";
import { fontDisplay } from "@/components/landing/style";

/**
 * "AI Overview" - the post's answer and key takeaways, right under the hero.
 *
 * Answer engines (Google AI Overviews, ChatGPT search, Perplexity) quote pages
 * that state the answer plainly near the top, so every post leads with its
 * excerpt (written as a self-contained answer) plus a few hard takeaways.
 * Ordinary visible content: what an answer engine reads is what a visitor
 * reads.
 */
export function AiOverview({
  answer,
  takeaways = [],
  className = "",
}: {
  answer: string | null;
  takeaways?: readonly string[];
  className?: string;
}) {
  if (!answer && takeaways.length === 0) return null;
  return (
    <section aria-label="AI Overview" className={className}>
      <div className="relative overflow-hidden rounded-2xl border-2 border-[#151515] bg-white p-6 text-[#151515] shadow-[6px_6px_0_#FFD400] sm:p-8">
        <span aria-hidden className="absolute inset-y-0 left-0 w-1.5 bg-[#FFD400]" />
        <p className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-[#6B6B60]">
          <span className="grid size-6 place-items-center rounded-md bg-[#FFD400] text-[#151515]">
            <Sparkles className="size-3.5" aria-hidden />
          </span>
          AI Overview
        </p>
        {answer && <p className="mt-3 text-[16.5px] leading-7 text-[#2B2B26]">{answer}</p>}
        {takeaways.length > 0 && (
          <div className="mt-5 border-t border-black/10 pt-5">
            <p className={`${fontDisplay} text-[17px] leading-tight`}>Key takeaways</p>
            <ul className="mt-3 space-y-2.5">
              {takeaways.map((item) => (
                <li key={item} className="flex items-start gap-3 text-[15px] leading-6 text-[#2B2B26]">
                  <span aria-hidden className="mt-[9px] size-2 shrink-0 rounded-full bg-[#FFD400] ring-2 ring-[#151515]/80" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
