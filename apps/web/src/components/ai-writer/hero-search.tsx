"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Loader2, Search, Sparkles } from "lucide-react";
import { track } from "@/lib/analytics";
import type { Topic, TopicGroups } from "@/lib/tools/blog-topics";

/**
 * The hero's live search: "What should your next post be about?". Type a
 * topic and real Google searches drop down (app/api/tools/blog-topics), each
 * one a "Write it" link into sign-up that records the page and keyword. The
 * placeholder types out examples on a loop until the visitor focuses it.
 */

function useTypingPlaceholder(examples: string[], active: boolean) {
  const [text, setText] = useState("");
  useEffect(() => {
    if (!active || examples.length === 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- static text when motion is off
      setText(examples[0]);
      return;
    }
    let word = 0;
    let chars = 0;
    let deleting = false;
    let timer: number;
    const step = () => {
      const target = examples[word % examples.length];
      chars += deleting ? -1 : 1;
      setText(target.slice(0, chars));
      let wait = deleting ? 35 : 70;
      if (!deleting && chars === target.length) {
        deleting = true;
        wait = 1600;
      } else if (deleting && chars === 0) {
        deleting = false;
        word += 1;
        wait = 300;
      }
      timer = window.setTimeout(step, wait);
    };
    timer = window.setTimeout(step, 600);
    return () => window.clearTimeout(timer);
  }, [examples, active]);
  return text;
}

const LABEL: Record<Topic["kind"], string> = { question: "Question", comparison: "Comparison", audience: "For a reader", idea: "Idea" };

export function HeroSearch({ from, examples }: { from: string; examples: string[] }) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [topics, setTopics] = useState<Topic[] | null>(null);
  const [seed, setSeed] = useState("");
  const placeholder = useTypingPlaceholder(examples, !focused && query === "");
  const inputRef = useRef<HTMLInputElement>(null);

  const run = async (raw: string) => {
    const q = raw.trim();
    if (q.length < 2) {
      setError("Type a topic of at least two letters.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/tools/blog-topics?q=${encodeURIComponent(q)}`);
      const body = (await res.json()) as TopicGroups | { error: string };
      if (!res.ok || "error" in body) {
        setTopics(null);
        setError("error" in body ? body.error : "Something went wrong. Please try again.");
        return;
      }
      // Questions and comparisons first: they make the clearest posts.
      const all = [...body.question, ...body.comparison, ...body.audience, ...body.idea]
        .sort((a, b) => b.popularity - a.popularity)
        .slice(0, 7);
      setSeed(body.seed);
      setTopics(all);
      track("tool_used", { tool: "hero-topic-search", page: from, results: body.total });
    } catch {
      setError("Could not reach the topic finder. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const write = (t: Topic) => `/signup?from=${encodeURIComponent(`${from}:hero-search`)}&keyword=${encodeURIComponent(t.keyword)}`;

  return (
    <div className="relative mx-auto w-full max-w-2xl text-left">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          void run(query || placeholder || examples[0] || "");
        }}
        className="flex items-center gap-2 rounded-[22px] border border-white/40 bg-white/95 p-2 shadow-[0_24px_60px_-20px_rgba(6,30,80,0.6)] focus-within:ring-4 focus-within:ring-[#FFD400]/60"
      >
        <label htmlFor="hero-topic" className="sr-only">
          What should your next post be about?
        </label>
        <Search className="ml-3 size-5 shrink-0 text-[#5b6577]" aria-hidden />
        <input
          id="hero-topic"
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          maxLength={60}
          autoComplete="off"
          placeholder={placeholder ? `${placeholder}|` : "What does your site write about?"}
          className="h-12 min-w-0 flex-1 bg-transparent text-[16px] text-[#151515] outline-none placeholder:text-[#7a8494]"
        />
        <button
          type="submit"
          disabled={loading}
          className="inline-flex h-12 shrink-0 items-center gap-2 rounded-2xl bg-[#151515] px-4 text-[15px] font-semibold text-white transition-colors hover:bg-[#2c2c2a] disabled:opacity-70 sm:px-5"
        >
          {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Sparkles className="size-4 text-[#FFD400]" aria-hidden />}
          <span className="hidden sm:inline">Find posts</span>
          <span className="sm:hidden">Find</span>
        </button>
      </form>

      <div aria-live="polite">
        {error ? (
          <p className="mt-3 rounded-2xl bg-white/95 px-4 py-3 text-[14px] text-[#9b1c1c] shadow-lg">{error}</p>
        ) : null}
        {topics ? (
          <div className="relative z-20 mt-3 overflow-hidden rounded-[22px] border border-white/40 bg-white/97 shadow-[0_30px_70px_-25px_rgba(6,30,80,0.65)]">
            <p className="border-b border-black/5 px-5 py-3 text-[13px] text-[#4a4a42]">
              {topics.length > 0 ? (
                <>
                  Real Google searches around <strong className="text-[#151515]">&ldquo;{seed}&rdquo;</strong>. Pick one and MyKavo
                  writes it.
                </>
              ) : (
                <>Google had no suggestions for that. Try a broader topic in two or three words.</>
              )}
            </p>
            <ul className="max-h-[320px] overflow-y-auto py-1">
              {topics.map((t) => (
                <li key={t.keyword} className="min-w-0">
                  <a
                    href={write(t)}
                    className="group flex min-w-0 items-center gap-3 px-5 py-2.5 transition-colors hover:bg-[#FFD400]/25 focus-visible:bg-[#FFD400]/25 focus-visible:outline-none"
                  >
                    <span className="hidden w-24 shrink-0 font-mono text-[10.5px] uppercase tracking-[0.12em] text-[#6B6B60] sm:block">{LABEL[t.kind]}</span>
                    <span className="min-w-0 flex-1 truncate text-[15px] text-[#151515]">{t.keyword}</span>
                    <span className="inline-flex shrink-0 items-center gap-1 text-[13px] font-semibold text-[#151515] opacity-70 group-hover:opacity-100">
                      Write it <ArrowRight className="size-3.5" aria-hidden />
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}
