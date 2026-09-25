"use client";

import { useEffect, useState } from "react";
import {
  Code2,
  Eye,
  FileSearch,
  Link2Off,
  MousePointerClick,
  Search,
  Timer,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { CategoryScene, type SceneKey } from "./category-scenes";
import { fontDisplay } from "./style";

/**
 * Playground-style category tabs: eight pills, one for every change category
 * MyKavo watches. The active tab plays that category's animation
 * (category-scenes.tsx) - the page is fine, the change happens, MyKavo
 * catches it - ending on baseline vs current and the severity MyKavo
 * assigns. The tour advances by itself, with the active pill filling up as
 * a timer; hover or focus pauses it. Static data, no network.
 */

interface Category {
  key: SceneKey;
  name: string;
  icon: LucideIcon;
  headline: string;
  blurb: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM";
  field: string;
  before: string;
  after: string;
  footnote: string;
}

const CATEGORIES: Category[] = [
  {
    key: "availability",
    name: "Availability",
    icon: Zap,
    headline: "A page starts failing",
    blurb:
      "Every scan records the HTTP status and final URL of every monitored page. A 200 that turns into a 404 or 500 is flagged as critical immediately.",
    severity: "CRITICAL",
    field: "HTTP status · /checkout",
    before: "200 OK",
    after: "500 Internal Server Error",
    footnote: "Detected on the next scan - before your customers pile up in support.",
  },
  {
    key: "visual",
    name: "Visual",
    icon: Eye,
    headline: "The layout silently breaks",
    blurb:
      "Full-page screenshots compared pixel by pixel against the approved baseline, with masks and ignore rules so dynamic content never cries wolf.",
    severity: "HIGH",
    field: "Pixel diff · homepage",
    before: "0.3% (normal drift)",
    after: "12.4% of the page changed",
    footnote: "Before-and-after screenshots plus a diff image stored with every event.",
  },
  {
    key: "seo",
    name: "SEO",
    icon: Search,
    headline: "Rankings quietly at risk",
    blurb:
      "Titles, meta descriptions, canonicals, robots meta, H1s, and indexability signals - deterministic previous-vs-current comparison on the tags that decide whether you rank.",
    severity: "CRITICAL",
    field: "robots meta · /tents",
    before: "index, follow",
    after: "noindex, nofollow",
    footnote: "An accidental noindex can erase a page from Google. MyKavo treats it as critical.",
  },
  {
    key: "content",
    name: "Content",
    icon: FileSearch,
    headline: "Words change without warning",
    blurb:
      "Normalized text comparison catches meaningful copy changes - prices, headlines, legal text - while ignoring volatile fragments like timestamps.",
    severity: "MEDIUM",
    field: "H1 · /pricing",
    before: "Simple pricing for every team",
    after: "Home",
    footnote: "A CMS revert or template bug often shows up as content regression first.",
  },
  {
    key: "links",
    name: "Links",
    icon: Link2Off,
    headline: "Internal links start 404ing",
    blurb:
      "Every internal link extracted and checked on every scan. Breakages are grouped into one alert - never one email per dead link.",
    severity: "HIGH",
    field: "Internal links · site-wide",
    before: "142 links · all resolving",
    after: "17 links → 404",
    footnote: "One grouped alert: “17 internal links became broken”, with the full list.",
  },
  {
    key: "scripts",
    name: "Scripts",
    icon: Code2,
    headline: "A tracking script vanishes",
    blurb:
      "External scripts are extracted and identified - Analytics, Tag Manager, Meta Pixel, Stripe, and more. Removals and unknown additions get flagged.",
    severity: "HIGH",
    field: "Scripts · site-wide",
    before: "googletagmanager.com present",
    after: "googletagmanager.com missing",
    footnote: "A rebuild that drops Analytics costs you a month of data. Caught in one scan.",
  },
  {
    key: "performance",
    name: "Performance",
    icon: Timer,
    headline: "The page gets heavy",
    blurb:
      "Lightweight indicators tracked on every scan: response time, page weight, request count. Sustained regressions raise severity across scans.",
    severity: "MEDIUM",
    field: "Page weight · /booking",
    before: "1.4 MB · 38 requests",
    after: "2.0 MB · 61 requests",
    footnote: "A +43% weight jump after a deploy is a regression, not a redesign.",
  },
  {
    key: "conversion",
    name: "Conversion",
    icon: MousePointerClick,
    headline: "Your signup button disappears",
    blurb:
      "Define the elements your business depends on - CTAs, forms, checkout buttons. MyKavo checks existence, visibility, text, and destination on every scan.",
    severity: "CRITICAL",
    field: "“Start Free Trial” button · /pricing",
    before: "present · visible",
    after: "missing from the page",
    footnote: "The most expensive kind of silent breakage - and the easiest to miss by eye.",
  },
];

const SEVERITY_CHIP: Record<Category["severity"], string> = {
  CRITICAL: "bg-[#151515] text-[#FFD400]",
  HIGH: "bg-[#FFD400] text-[#151515] border border-black/15",
  MEDIUM: "bg-white text-[#151515] border border-black/15",
};

const ROTATE_MS = 8500;

export function CategoryTabs() {
  const [activeKey, setActiveKey] = useState<SceneKey>("availability");
  const [paused, setPaused] = useState(false);
  const active = CATEGORIES.find((c) => c.key === activeKey) ?? CATEGORIES[2];

  // Auto-advance to the next category every 7s. Hovering (or keyboard focus
  // inside) pauses the tour; any switch - manual or automatic - restarts the
  // full interval because activeKey is a dependency. Users who prefer
  // reduced motion get a static panel.
  useEffect(() => {
    if (paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setTimeout(() => {
      const index = CATEGORIES.findIndex((c) => c.key === activeKey);
      setActiveKey(CATEGORIES[(index + 1) % CATEGORIES.length].key);
    }, ROTATE_MS);
    return () => clearTimeout(timer);
  }, [activeKey, paused]);

  return (
    <div
      className="mt-12"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setPaused(false);
      }}
    >
      {/* Tab pills */}
      <div role="tablist" aria-label="Change categories" className="flex flex-wrap justify-center gap-2">
        {CATEGORIES.map((c) => {
          const selected = c.key === activeKey;
          return (
            <button
              key={c.key}
              role="tab"
              id={`category-tab-${c.key}`}
              aria-selected={selected}
              aria-controls="category-panel"
              onClick={() => setActiveKey(c.key)}
              className={`relative flex items-center gap-2 overflow-hidden rounded-full border px-4 py-2 text-[13px] font-semibold transition-all ${
                selected
                  ? "border-[#151515] bg-[#FFD400] text-[#151515] shadow-[3px_3px_0_#151515]"
                  : "border-[#151515]/15 bg-white text-[#151515]/70 hover:-translate-y-0.5 hover:border-[#151515]/40 hover:text-[#151515]"
              }`}
            >
              {selected && (
                <span
                  key={c.key}
                  aria-hidden
                  className="cat-timer absolute bottom-0 left-0 h-[3px] bg-[#151515]"
                  style={{ animationPlayState: paused ? "paused" : "running" }}
                />
              )}
              <c.icon className="size-4" aria-hidden />
              {c.name}
            </button>
          );
        })}
      </div>

      {/* Demo panel */}
      <div
        id="category-panel"
        role="tabpanel"
        aria-labelledby={`category-tab-${active.key}`}
        className="mx-auto mt-8 max-w-5xl overflow-hidden rounded-[22px] border border-[#151515] bg-white shadow-[8px_8px_0_#151515]"
      >
        <div className="grid md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
          {/* Story side */}
          <div key={active.key} className="cat-story flex flex-col justify-center p-7 sm:p-10">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl border border-[#151515] bg-[#FFD400] shadow-[2px_2px_0_#151515]">
                <active.icon className="size-5 text-[#151515]" aria-hidden />
              </span>
              <span
                className={`w-fit rounded-full px-3 py-1 font-mono text-[10.5px] font-bold uppercase tracking-[0.14em] ${SEVERITY_CHIP[active.severity]}`}
              >
                {active.severity}
              </span>
            </div>
            <h3 className={`${fontDisplay} mt-5 text-[28px] leading-tight text-[#151515] sm:text-[34px]`}>
              {active.headline}
            </h3>
            <p className="mt-3 text-[15px] leading-7 text-[#6B6B60]">{active.blurb}</p>
            <p className="mt-6 border-l-2 border-[#FFD400] pl-4 text-[13.5px] leading-6 text-[#151515]/80">
              {active.footnote}
            </p>
            <p className="mt-6 font-mono text-[10.5px] uppercase tracking-[0.16em] text-[#6B6B60]">
              {active.field}
            </p>
          </div>

          {/* The animation */}
          <div className="relative border-t border-black/10 bg-[#F7F6EE] bg-[radial-gradient(rgba(21,21,21,0.07)_1px,transparent_1.2px)] [background-size:18px_18px] p-3 sm:p-5 md:border-l md:border-t-0">
            <CategoryScene
              key={active.key}
              scene={active.key}
              before={active.before}
              after={active.after}
              severity={active.severity}
              label={`${active.name} example: ${active.headline}. Baseline ${active.before}, current scan ${active.after}, severity ${active.severity}.`}
            />
          </div>
        </div>
      </div>
      <style>{`
        @keyframes cat-timer { from { width: 0%; } to { width: 100%; } }
        .cat-timer { animation: cat-timer ${ROTATE_MS}ms linear forwards; }
        @keyframes cat-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
        .cat-story > * { animation: cat-in 450ms ease-out both; }
        .cat-story > *:nth-child(2) { animation-delay: 60ms; }
        .cat-story > *:nth-child(3) { animation-delay: 120ms; }
        .cat-story > *:nth-child(4) { animation-delay: 180ms; }
        @media (prefers-reduced-motion: reduce) {
          .cat-timer { display: none; }
          .cat-story > * { animation: none; }
        }
      `}</style>
    </div>
  );
}
