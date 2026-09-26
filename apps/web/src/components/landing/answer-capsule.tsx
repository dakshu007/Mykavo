import { fontDisplay } from "./style";

/**
 * "In short" - a direct answer, placed right under a page's hero.
 *
 * Search engines' AI answers (Google AI Overviews, ChatGPT search,
 * Perplexity) quote pages that state the answer plainly, near the top, in a
 * self-contained paragraph - not pages that make the reader scroll through
 * marketing to find out what the thing is. So each page gets one: the
 * question a searcher would type, a two-to-three sentence answer that makes
 * sense on its own, and a few hard facts.
 *
 * It is ordinary visible content, not hidden markup: what an answer engine
 * reads here is exactly what a visitor reads. Keep it true to the page.
 */
export function AnswerCapsule({
  question,
  answer,
  facts = [],
  className = "",
}: {
  /** The searcher's question, e.g. "What is the MyKavo WordPress plugin?" */
  question?: string;
  answer: string;
  facts?: { label: string; value: string }[];
  className?: string;
}) {
  return (
    <section aria-label="In short" className={className}>
      <div className="relative overflow-hidden rounded-2xl border-2 border-[#151515] bg-white p-6 text-[#151515] shadow-[6px_6px_0_#FFD400] sm:p-8">
        <span aria-hidden className="absolute inset-y-0 left-0 w-1.5 bg-[#FFD400]" />
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-[#6B6B60]">In short</p>
        {question && (
          <h2 className={`${fontDisplay} mt-2 text-2xl leading-tight sm:text-[28px]`}>{question}</h2>
        )}
        <p className={`${question ? "mt-3" : "mt-2"} text-[16px] leading-7 text-[#2B2B26]`}>{answer}</p>
        {facts.length > 0 && (
          <dl className="mt-5 grid gap-x-6 gap-y-3 border-t border-black/10 pt-5 sm:grid-cols-2">
            {facts.map((f) => (
              <div key={f.label} className="flex flex-col gap-0.5">
                <dt className="font-mono text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#6B6B60]">{f.label}</dt>
                <dd className="text-[14.5px] font-medium leading-6">{f.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </section>
  );
}
