"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, HelpCircle, Loader2, Scale, Search, Sparkles, Users } from "lucide-react";
import { track } from "@/lib/analytics";
import type { Topic, TopicGroups, TopicKind } from "@/lib/tools/blog-topics";

const EXAMPLES = ["wordpress speed", "home workouts", "email marketing", "dog training", "coffee shop"];

const GROUPS: { kind: TopicKind; title: string; hint: string; Icon: typeof HelpCircle }[] = [
  { kind: "question", title: "Questions", hint: "How-to and explainer posts", Icon: HelpCircle },
  { kind: "comparison", title: "Comparisons", hint: "Best-of and versus posts", Icon: Scale },
  { kind: "audience", title: "For a reader", hint: "Posts for one audience", Icon: Users },
  { kind: "idea", title: "More ideas", hint: "Guides and lists", Icon: Sparkles },
];

function Dots({ value }: { value: number }) {
  return (
    <span role="img" className="inline-flex shrink-0 gap-0.5" aria-label={`Popularity ${value} of 5`} title={`Popularity ${value} of 5 (from Google autocomplete, not search volume)`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={`size-1.5 rounded-full ${n <= value ? "bg-[#FFD400]" : "bg-white/20"}`} />
      ))}
    </span>
  );
}

/**
 * Live blog topic finder: real Google autocomplete searches for a seed,
 * grouped into the kinds of post they ask for (app/api/tools/blog-topics).
 * Each topic links to sign-up with the page and keyword as the CTA, so the
 * account records which topic brought it.
 */
export function TopicFinder({ from }: { from: string }) {
  const [query, setQuery] = useState("");
  const [data, setData] = useState<TopicGroups | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  const run = async (raw: string) => {
    const q = raw.trim();
    if (q.length < 2) {
      setError("Type a topic of at least two letters.");
      return;
    }
    setQuery(q);
    started.current = true;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/tools/blog-topics?q=${encodeURIComponent(q)}`);
      const body = (await res.json()) as TopicGroups | { error: string };
      if (!res.ok || "error" in body) {
        setData(null);
        setError("error" in body ? body.error : "Something went wrong. Please try again.");
      } else {
        setData(body);
        track("tool_used", { tool: "blog-topic-finder", page: from, results: body.total });
      }
    } catch {
      setError("Could not reach the topic finder. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  // Show real results the first time the tool scrolls into view, so it never
  // sits empty. The API caches each seed for a day.
  useEffect(() => {
    const el = box.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting) && !started.current) {
          started.current = true;
          io.disconnect();
          void run(EXAMPLES[0]);
        }
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once, on first view
  }, []);

  const signupFor = (t: Topic) => `/signup?from=${encodeURIComponent(`${from}:topic`)}&keyword=${encodeURIComponent(t.keyword)}`;

  return (
    <div ref={box} className="rounded-[28px] border border-white/10 bg-[#1d1d1b] p-5 shadow-[0_30px_80px_rgba(0,0,0,0.35)] sm:p-8">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void run(query);
        }}
        className="flex flex-col gap-3 sm:flex-row"
      >
        <label className="relative flex-1">
          <span className="sr-only">A topic your site writes about</span>
          <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-white/45" aria-hidden />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            maxLength={60}
            placeholder="A topic your site covers, e.g. wordpress speed"
            className="h-14 w-full rounded-2xl border border-white/15 bg-white/[0.06] pl-12 pr-4 text-[16px] text-white outline-none placeholder:text-white/40 focus-visible:border-[#FFD400] focus-visible:ring-2 focus-visible:ring-[#FFD400]/30"
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-[#FFD400] px-7 text-[15px] font-semibold text-[#151515] transition-transform hover:-translate-y-0.5 disabled:opacity-70"
        >
          {loading ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <Sparkles className="size-5" aria-hidden />}
          {loading ? "Finding topics" : "Find topics"}
        </button>
      </form>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-[13px] text-white/55">
        <span>Try:</span>
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
            onClick={() => void run(ex)}
            className="rounded-full border border-white/15 px-3 py-1 text-white/75 transition-colors hover:border-[#FFD400] hover:text-[#FFD400]"
          >
            {ex}
          </button>
        ))}
      </div>

      <div aria-live="polite">
        {error ? <p className="mt-6 rounded-xl bg-red-500/10 px-4 py-3 text-[14px] text-red-200">{error}</p> : null}

        {data && data.total === 0 ? (
          <p className="mt-6 text-[14px] text-white/70">Google had no suggestions for that. Try a broader topic, in two or three words.</p>
        ) : null}

        {data && data.total > 0 ? (
          <>
            <p className="mt-7 text-[14px] text-white/70">
              <span className="font-semibold text-white">{data.total} real searches</span> around &ldquo;{data.seed}&rdquo;. Dots show
              how strongly Google suggests each one (not search volume).
            </p>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              {GROUPS.map(({ kind, title, hint, Icon }) => {
                const items = data[kind];
                if (items.length === 0) return null;
                return (
                  <div key={kind} className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="flex items-center gap-2">
                      <Icon className="size-4 text-[#FFD400]" aria-hidden />
                      <p className="text-[14px] font-semibold text-white">{title}</p>
                      <p className="text-[12.5px] text-white/60">{hint}</p>
                    </div>
                    <ul className="mt-3 space-y-1">
                      {items.map((t) => (
                        <li key={t.keyword}>
                          <a
                            href={signupFor(t)}
                            className="group flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-[14px] text-white/85 transition-colors hover:bg-[#FFD400] hover:text-[#151515]"
                          >
                            <span className="min-w-0 truncate">{t.keyword}</span>
                            <span className="flex items-center gap-2">
                              <Dots value={t.popularity} />
                              <span className="hidden items-center gap-1 text-[12.5px] font-semibold group-hover:inline-flex">
                                Write it <ArrowRight className="size-3.5" aria-hidden />
                              </span>
                            </span>
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
            <p className="mt-5 text-[13px] text-white/55">
              Signed in, MyKavo adds the searches your own site already ranks for in Google Search Console, checks today&apos;s results
              for each, and ranks them by what to write first.
            </p>
          </>
        ) : null}
      </div>
    </div>
  );
}
