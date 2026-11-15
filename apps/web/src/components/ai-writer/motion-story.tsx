"use client";

import { useEffect, useRef, useState } from "react";
import { BadgeCheck, Check, FileText, Globe, Search, Send, Sparkles, TrendingUp } from "lucide-react";

/**
 * "From search to post, in five steps": a scroll-told explainer. On wide
 * screens the steps scroll on the left while one app window stays pinned on
 * the right and replays a small animation for the step in view; on phones
 * each step carries its own window. Every scene is an illustration (a
 * fictional bakery), labelled as such, not customer data.
 */

const STEPS = [
  {
    icon: Globe,
    kicker: "Step 1",
    title: "It learns your business",
    body: "MyKavo reads your website and writes a short profile: what you sell, who buys it, where and in what language. You confirm it once, and every post is written for that business.",
  },
  {
    icon: Search,
    kicker: "Step 2",
    title: "It finds searches you can win",
    body: "From your own Search Console data it pulls the searches you already rank for in positions 8 to 20, adds real Google suggestions, and ranks them by what to write first.",
  },
  {
    icon: TrendingUp,
    kicker: "Step 3",
    title: "It checks today's page one",
    body: "Before writing, it looks at what Google shows today for the keyword, so the post matches the intent and covers what the pages ranking now leave out.",
  },
  {
    icon: FileText,
    kicker: "Step 4",
    title: "It writes the whole post",
    body: "One click gives you the full SEO package: title, URL slug, meta description, the article with a short answer up top, an FAQ, JSON-LD, and review notes on where to add your experience.",
  },
  {
    icon: Send,
    kicker: "Step 5",
    title: "You publish when it's right",
    body: "Edit in MyKavo, then copy it to any site, or save it straight to your WordPress drafts with the free plugin. Nothing is ever published for you.",
  },
] as const;

/** A child that fades and rises in, `i` steps after the scene starts. */
function In({ i, children, className = "" }: { i: number; children: React.ReactNode; className?: string }) {
  return (
    <div className={`ms-in ${className}`} style={{ animationDelay: `${120 + i * 160}ms` }}>
      {children}
    </div>
  );
}

function Dots({ n }: { n: number }) {
  return (
    <span role="img" className="inline-flex gap-0.5" aria-label={`Popularity ${n} of 5`}>
      {[1, 2, 3, 4, 5].map((d) => (
        <span key={d} className={`size-1.5 rounded-full ${d <= n ? "bg-[#d4a900]" : "bg-black/10"}`} />
      ))}
    </span>
  );
}

function Scene({ step }: { step: number }) {
  if (step === 0)
    return (
      <div className="space-y-3">
        <In i={0} className="flex items-center gap-3 rounded-xl border border-black/10 bg-[#F6F5EE] px-4 py-3">
          <Globe className="size-4 text-[#1a63c4]" aria-hidden />
          <span className="font-mono text-[13px] text-[#151515]">sweetcrumb-bakery.com</span>
          <span className="ms-scan ml-auto h-1.5 w-20 overflow-hidden rounded-full bg-black/10">
            <span className="block h-full w-1/2 rounded-full bg-[#1a63c4]" />
          </span>
        </In>
        {[
          ["Business", "Bakery and cafe, custom cakes"],
          ["Audience", "Local families, event planners"],
          ["Services", "Birthday and wedding cakes, catering"],
          ["Market", "United States, English"],
        ].map(([k, v], i) => (
          <In key={k} i={i + 1} className="grid grid-cols-[96px_minmax(0,1fr)] items-center gap-3 rounded-xl border border-black/10 px-4 py-2.5">
            <span className="text-[12px] font-medium uppercase tracking-[0.1em] text-[#6B6B60]">{k}</span>
            <span className="truncate text-[14px] text-[#151515]">{v}</span>
          </In>
        ))}
        <In i={5} className="flex items-center gap-2 text-[13px] font-semibold text-[#1f7a3a]">
          <BadgeCheck className="size-4" aria-hidden /> Profile confirmed
        </In>
      </div>
    );
  if (step === 1)
    return (
      <div>
        <In i={0} className="mb-2 flex items-center justify-between text-[12px] uppercase tracking-[0.1em] text-[#6B6B60]">
          <span>Search</span>
          <span className="flex gap-6">
            <span>Position</span>
            <span>Popularity</span>
          </span>
        </In>
        {[
          ["custom birthday cakes near me", "#14", 4, true],
          ["how much is a wedding cake", "#11", 5, true],
          ["gluten free cupcakes", "#18", 3, true],
          ["best cake flavors for weddings", "new", 4, false],
          ["bakery open sunday", "#34", 2, false],
        ].map(([kw, pos, pop, sd], i) => (
          <In
            key={String(kw)}
            i={i + 1}
            className={`mb-1.5 flex items-center gap-3 rounded-xl px-3 py-2.5 ${sd ? "bg-[#FFD400]/20 ring-1 ring-[#d4a900]/40" : "bg-[#F6F5EE]"}`}
          >
            <span className="min-w-0 flex-1 truncate text-[14px] text-[#151515]">{kw}</span>
            <span className="w-10 shrink-0 text-right font-mono text-[13px] text-[#151515]">{pos}</span>
            <span className="w-16 shrink-0 text-right">
              <Dots n={Number(pop)} />
            </span>
          </In>
        ))}
        <In i={6} className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#151515] px-3 py-1.5 text-[12.5px] font-semibold text-[#FFD400]">
          <Sparkles className="size-3.5" aria-hidden /> 3 searches in striking distance
        </In>
      </div>
    );
  if (step === 2)
    return (
      <div className="space-y-2.5">
        <In i={0} className="flex items-center gap-2 rounded-full border border-black/10 px-4 py-2.5">
          <Search className="size-4 text-[#6B6B60]" aria-hidden />
          <span className="text-[14px] text-[#151515]">how much is a wedding cake</span>
        </In>
        {[
          ["A forum thread from 2021", "Old, no clear answer", "weak"],
          ["Price list page, 180 words", "Thin, no guidance", "weak"],
          ["Big wedding site guide", "Strong, but generic", "strong"],
        ].map(([t, d, tone], i) => (
          <In key={t} i={i + 1} className="rounded-xl border border-black/10 px-4 py-3">
            <p className="text-[14.5px] font-medium text-[#1a0dab]">{t}</p>
            <p className="mt-0.5 flex items-center justify-between text-[13px] text-[#4a4a42]">
              {d}
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${tone === "weak" ? "bg-[#e7f6ec] text-[#1f7a3a]" : "bg-black/5 text-[#4a4a42]"}`}>
                {tone === "weak" ? "Beatable" : "Strong"}
              </span>
            </p>
          </In>
        ))}
        <In i={4} className="flex items-center gap-2 text-[13px] font-semibold text-[#1f7a3a]">
          <Check className="size-4" aria-hidden /> Winnable: answer the price question clearly, by size and style
        </In>
      </div>
    );
  if (step === 3)
    return (
      <div className="space-y-2">
        {[
          ["Title", "How Much Is a Wedding Cake? Prices by Size and Style"],
          ["Slug", "/how-much-is-a-wedding-cake"],
          ["Meta", "Real price ranges by tier, servings and style, and what changes the cost."],
          ["Answer", "Most wedding cakes cost $3 to $8 per slice. Size, tiers and decoration move the price most."],
          ["Sections", "Prices by size · Tiers and servings · What changes the cost"],
          ["FAQ", "Can I save money with a smaller cake and a sheet cake?"],
          ["Schema", '{ "@type": "Article" } + { "@type": "FAQPage" }'],
        ].map(([k, v], i) => (
          <In key={k} i={i} className="flex items-start gap-3 rounded-lg px-1 py-1">
            <Check className="mt-0.5 size-4 shrink-0 text-[#1f7a3a]" aria-hidden />
            <span className="w-16 shrink-0 text-[12px] font-medium uppercase tracking-[0.08em] text-[#6B6B60]">{k}</span>
            <span className={`min-w-0 flex-1 text-[13.5px] leading-snug text-[#151515] ${k === "Slug" || k === "Schema" ? "font-mono text-[12.5px]" : ""}`}>{v}</span>
          </In>
        ))}
        <In i={7} className="mt-1 rounded-lg bg-[#FFD400]/25 px-3 py-2 text-[13px] text-[#151515]">
          Review note: add your own price list and a photo of a recent cake.
        </In>
      </div>
    );
  return (
    <div className="space-y-3">
      <In i={0} className="rounded-xl border border-black/10">
        <div className="flex items-center gap-2 border-b border-black/10 bg-[#F6F5EE] px-4 py-2 text-[12px] text-[#4a4a42]">
          <span className="font-semibold text-[#21759B]">WordPress</span> · Posts · Drafts
        </div>
        <div className="flex items-center gap-3 px-4 py-3">
          <FileText className="size-4 text-[#6B6B60]" aria-hidden />
          <span className="min-w-0 flex-1 truncate text-[14px] text-[#151515]">How Much Is a Wedding Cake? Prices by Size and Style</span>
          <span className="shrink-0 rounded-full bg-[#fff4cc] px-2 py-0.5 text-[11px] font-semibold text-[#7a5b00]">Draft</span>
        </div>
      </In>
      <In i={1} className="flex items-center gap-2 rounded-xl bg-[#151515] px-4 py-3 text-[13.5px] text-white">
        <Check className="size-4 text-[#FFD400]" aria-hidden /> Saved to WordPress drafts. Never published for you.
      </In>
      <In i={2} className="text-[13px] text-[#4a4a42]">Not on WordPress? Copy the finished post into Shopify, Webflow, Wix or any site.</In>
    </div>
  );
}

function Window({ step, compact = false }: { step: number; compact?: boolean }) {
  const Icon = STEPS[step].icon;
  return (
    <div className={`overflow-hidden rounded-[24px] border border-[#151515] bg-white shadow-[8px_8px_0_#151515] ${compact ? "" : "min-h-[440px]"}`}>
      <div className="flex items-center gap-2 border-b border-black/10 bg-[#FBFAF3] px-4 py-3">
        <span className="flex gap-1.5" aria-hidden>
          <span className="size-2.5 rounded-full bg-[#ff5f57]" />
          <span className="size-2.5 rounded-full bg-[#febc2e]" />
          <span className="size-2.5 rounded-full bg-[#28c840]" />
        </span>
        <span className="ml-2 inline-flex min-w-0 items-center gap-1.5 text-[12.5px] font-medium text-[#4a4a42]">
          <Icon className="size-3.5 shrink-0" aria-hidden />
          <span className="truncate">MyKavo · {STEPS[step].title}</span>
        </span>
        <span className="ml-auto hidden shrink-0 text-[10.5px] uppercase tracking-[0.14em] text-[#6B6B60] sm:inline">Illustration</span>
      </div>
      {/* Remounted per step so its entrance animation replays. */}
      <div key={step} className="p-5 sm:p-6">
        <Scene step={step} />
      </div>
    </div>
  );
}

export function MotionStory() {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.step));
        }
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    refs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16">
      <ol className="relative">
        {/* The progress rail. */}
        <span aria-hidden className="absolute bottom-6 left-[19px] top-6 hidden w-px bg-black/10 lg:block" />
        {STEPS.map((s, i) => {
          const on = i === active;
          return (
            <li
              key={s.title}
              ref={(el) => {
                refs.current[i] = el;
              }}
              data-step={i}
              className="relative pb-12 lg:flex lg:min-h-[62vh] lg:items-center lg:pb-0"
            >
              <div className="flex min-w-0 gap-4 sm:gap-5">
                <span
                  className={`relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full border transition-all duration-300 ${
                    on ? "border-[#151515] bg-[#FFD400] text-[#151515] shadow-[3px_3px_0_#151515]" : "border-black/15 bg-white text-[#6B6B60]"
                  }`}
                >
                  <s.icon className="size-4.5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-[11.5px] font-semibold uppercase tracking-[0.2em] text-[#6b5500]">{s.kicker}</p>
                  <h3 className={`mt-2 text-[26px] font-semibold leading-tight tracking-[-0.01em] transition-colors sm:text-[30px] ${on ? "text-[#151515]" : "text-[#151515]/60 lg:text-[#151515]/55"}`}>
                    {s.title}
                  </h3>
                  <p className="mt-3 max-w-md text-[16px] leading-relaxed text-[#4a4a42]">{s.body}</p>
                  <div className="mt-6 lg:hidden">
                    <Window step={i} compact />
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
      <div className="hidden lg:block">
        <div className="sticky top-[calc(var(--promo-h,0px)+7rem)]">
          <Window step={active} />
          <div className="mt-5 flex justify-center gap-2" aria-hidden>
            {STEPS.map((s, i) => (
              <span key={s.title} className={`h-1.5 rounded-full transition-all duration-300 ${i === active ? "w-8 bg-[#151515]" : "w-1.5 bg-black/15"}`} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
