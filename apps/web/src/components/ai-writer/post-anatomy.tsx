"use client";

import { useRef, useState } from "react";
import { track } from "@/lib/analytics";

type PartId = "title" | "slug" | "meta" | "answer" | "sections" | "faq" | "schema" | "notes";

const PARTS: { id: PartId; label: string; why: string; what: string }[] = [
  {
    id: "title",
    label: "Title",
    what: "Written for the click, with the search in it, under 65 characters so Google shows it whole.",
    why: "The title is the strongest relevance signal you control, and the first thing a searcher judges.",
  },
  {
    id: "slug",
    label: "URL slug",
    what: "Short, readable, built from the keyword. No dates, no stop-word clutter.",
    why: "Clean URLs are easier to share and to understand at a glance in results.",
  },
  {
    id: "meta",
    label: "Meta description",
    what: "A one-line pitch for the result, around 150 characters, with the search in it.",
    why: "It does not move rankings, but a clear one wins the click when Google uses it.",
  },
  {
    id: "answer",
    label: "Short answer up top",
    what: "Two or three sentences that answer the search before anything else.",
    why: "This is the part AI answers and featured snippets quote. Buried answers get skipped.",
  },
  {
    id: "sections",
    label: "H2 sections from page one",
    what: "Sections planned from what today's results cover, plus what they miss.",
    why: "Matching search intent is how a post earns its place next to what already ranks.",
  },
  {
    id: "faq",
    label: "FAQ",
    what: "The follow-up questions people search, each with a short, direct answer.",
    why: "It answers the next question in the reader's head and keeps them on your page.",
  },
  {
    id: "schema",
    label: "JSON-LD schema",
    what: "Structured data for the article and its FAQ, ready to paste into your page.",
    why: "It tells search engines and AI answer engines exactly what the page is.",
  },
  {
    id: "notes",
    label: "Review notes",
    what: "Facts to double check, and the spots where your own experience belongs.",
    why: "Your experience is what no other page on the results has. It is what makes a draft rank-worthy.",
  },
];

function Region({
  id,
  active,
  onPick,
  children,
  className = "",
}: {
  id: PartId;
  active: PartId;
  onPick: (id: PartId) => void;
  children: React.ReactNode;
  className?: string;
}) {
  const on = id === active;
  const n = PARTS.findIndex((p) => p.id === id) + 1;
  return (
    <button
      type="button"
      onClick={() => onPick(id)}
      onMouseEnter={() => onPick(id)}
      aria-pressed={on}
      className={`relative block w-full rounded-lg px-3 py-2 text-left transition-all ${
        on ? "bg-[#FFD400]/15 ring-2 ring-[#FFD400]" : "ring-1 ring-transparent hover:bg-white/[0.04] hover:ring-white/15"
      } ${className}`}
    >
      <span
        aria-hidden
        className={`absolute -left-2.5 -top-2.5 flex size-5 items-center justify-center rounded-full text-[10.5px] font-bold ${
          on ? "bg-[#FFD400] text-[#151515]" : "bg-white/15 text-white/80"
        }`}
      >
        {n}
      </span>
      {children}
    </button>
  );
}

/**
 * Anatomy of a MyKavo draft: an illustrated post where each part can be
 * picked to see what MyKavo writes there and why it matters for ranking.
 */
export function PostAnatomy({ from }: { from: string }) {
  const [active, setActive] = useState<PartId>("answer");
  const tracked = useRef(false);
  const part = PARTS.find((p) => p.id === active)!;
  const pick = (id: PartId) => {
    setActive(id);
    if (!tracked.current) {
      tracked.current = true;
      track("tool_used", { tool: "post-anatomy", page: from });
    }
  };
  const r = { active, onPick: pick };

  return (
    <div className="grid gap-5 rounded-[28px] border border-white/10 bg-[#1d1d1b] p-5 shadow-[0_30px_80px_rgba(0,0,0,0.35)] sm:p-8 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
      <div className="min-w-0 rounded-2xl border border-white/10 bg-[#121211] p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex gap-1.5" aria-hidden>
            <span className="size-2.5 rounded-full bg-white/15" />
            <span className="size-2.5 rounded-full bg-white/15" />
            <span className="size-2.5 rounded-full bg-white/15" />
          </div>
          <span className="text-[11px] uppercase tracking-[0.16em] text-white/40">Illustration of a MyKavo draft</span>
        </div>
        <div className="space-y-3 text-white">
          <Region id="title" {...r}>
            <p className="text-[19px] font-semibold leading-snug">How to Speed Up WordPress: 12 Fixes That Work</p>
          </Region>
          <div className="grid gap-3 sm:grid-cols-2">
            <Region id="slug" {...r}>
              <p className="font-mono text-[12.5px] text-[#9fd3ff]">/speed-up-wordpress</p>
            </Region>
            <Region id="meta" {...r}>
              <p className="text-[12.5px] leading-snug text-white/70">Measure first, then fix caching, images, PHP and plugins, in order.</p>
            </Region>
          </div>
          <Region id="answer" {...r}>
            <p className="text-[13.5px] leading-relaxed text-white/85">
              To speed up WordPress, measure your Core Web Vitals, turn on page caching, compress images and upgrade PHP. Then remove
              plugins you do not use.
            </p>
          </Region>
          <Region id="sections" {...r}>
            <ul className="space-y-1 text-[13.5px] font-medium text-white/90">
              <li>## Measure before you change anything</li>
              <li>## Turn on page caching</li>
              <li>## Compress and resize images</li>
            </ul>
          </Region>
          <Region id="faq" {...r}>
            <p className="text-[13px] font-semibold text-white/90">FAQ</p>
            <p className="text-[12.5px] text-white/65">Why is my WordPress site slow all of a sudden?</p>
            <p className="text-[12.5px] text-white/65">Do cache plugins really help?</p>
          </Region>
          <div className="grid gap-3 sm:grid-cols-2">
            <Region id="schema" {...r}>
              <p className="font-mono text-[11.5px] leading-snug text-[#c3e88d]">{'{ "@type": "FAQPage", ... }'}</p>
            </Region>
            <Region id="notes" {...r}>
              <p className="text-[12.5px] leading-snug text-[#FFD400]">Add your own before and after load times here.</p>
            </Region>
          </div>
        </div>
      </div>

      <div className="flex min-w-0 flex-col">
        <div className="flex flex-wrap gap-1.5">
          {PARTS.map((p, i) => (
            <button
              key={p.id}
              type="button"
              onClick={() => pick(p.id)}
              aria-pressed={p.id === active}
              className={`rounded-full px-3 py-1.5 text-[12.5px] font-medium transition-colors ${
                p.id === active ? "bg-[#FFD400] text-[#151515]" : "border border-white/15 text-white/70 hover:text-white"
              }`}
            >
              {i + 1}. {p.label}
            </button>
          ))}
        </div>
        <div key={part.id} className="anatomy-panel mt-5 flex-1 rounded-2xl border border-white/10 bg-white/[0.03] p-5" aria-live="polite">
          <p className="text-[12px] uppercase tracking-[0.18em] text-[#FFD400]">{part.label}</p>
          <p className="mt-3 text-[17px] font-medium leading-snug text-white">{part.what}</p>
          <p className="mt-4 text-[14.5px] leading-relaxed text-white/65">
            <span className="font-semibold text-white/85">Why it matters: </span>
            {part.why}
          </p>
        </div>
        <p className="mt-4 text-[13px] text-white/50">Every MyKavo post includes all eight parts. A chatbot prompt usually gives you only the article.</p>
      </div>
    </div>
  );
}
