import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Braces,
  CheckCircle2,
  Code2,
  Eye,
  FileSearch,
  GitCompareArrows,
  Globe,
  Link2Off,
  ListChecks,
  MousePointerClick,
  Route,
  Search,
  Store,
  Tags,
  Timer,
  Users,
  Wrench,
  Zap,
} from "lucide-react";
import { LandingNav } from "@/components/landing/nav";
import { LandingHero } from "@/components/landing/hero";
import { LandingUrlInput } from "@/components/landing/url-input";
import { SignalMarquee } from "@/components/landing/marquee";
import { StickyCta } from "@/components/landing/sticky-cta";
import { LandingFooter } from "@/components/landing/footer";
import {
  cream,
  darkCard,
  eyebrow,
  fontSans,
  fontSerif,
  landingFontVars,
  lavender,
  periwinkle,
  primary,
  primarySoft,
} from "@/components/landing/style";
import { plans } from "@/config/plans";
import { site } from "@/config/site";

export const metadata: Metadata = {
  title: `${site.name} — Website Change Detection & Regression Monitoring`,
  description: site.description,
  alternates: { canonical: "/" },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: site.name,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description: site.description,
  url: site.url,
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
};

/* ---------------------------------- data --------------------------------- */

const problems = [
  {
    text: "A deploy silently breaks the signup button — nobody notices for a week.",
    color: cream,
    rotate: "-rotate-1",
  },
  {
    text: "A plugin update flips key pages to noindex — rankings quietly fall.",
    color: lavender,
    rotate: "rotate-1",
  },
  {
    text: "Google Analytics disappears during a rebuild — a month of data lost.",
    color: periwinkle,
    rotate: "rotate-[0.5deg]",
  },
  {
    text: "A client edits the homepage — and blames your agency when it breaks.",
    color: primary,
    dark: true,
    rotate: "-rotate-[0.5deg]",
  },
];

const categoryChips = [
  { icon: Zap, name: "Availability" },
  { icon: Eye, name: "Visual" },
  { icon: Search, name: "SEO" },
  { icon: FileSearch, name: "Content" },
  { icon: Link2Off, name: "Links" },
  { icon: Code2, name: "Scripts" },
  { icon: Timer, name: "Performance" },
  { icon: MousePointerClick, name: "Conversion" },
];

const workflow = [
  {
    step: "01",
    title: "Add your websites",
    desc: "Point Fluxen at every site you manage. It discovers pages via sitemaps and internal links — you pick what matters.",
    keyword: "discovers",
  },
  {
    step: "02",
    title: "Approve a baseline",
    desc: "Fluxen captures a full snapshot of each page: screenshots, SEO tags, links, scripts, performance. You approve it as the known-good state.",
    keyword: "known-good",
  },
  {
    step: "03",
    title: "Monitor automatically",
    desc: "Recurring scans compare every page against its approved baseline using deterministic checks — consistent and reproducible.",
    keyword: "deterministic",
  },
  {
    step: "04",
    title: "Fix what matters",
    desc: "Get one grouped alert with severity levels and before-and-after views. Fix regressions, or approve expected changes as the new baseline.",
    keyword: "one grouped alert",
  },
];

const useCases = [
  { icon: Users, title: "Agencies", desc: "Monitor every client website from one dashboard. Know about problems before the client calls." },
  { icon: Code2, title: "Developers", desc: "Catch regressions after deploys before users report them. Your post-deploy safety net." },
  { icon: Search, title: "SEO teams", desc: "Know the moment titles, canonicals, robots meta, or indexability signals change unexpectedly." },
  { icon: Wrench, title: "Maintenance businesses", desc: "Prove your maintenance value with monitoring history and clear change reports." },
  { icon: Store, title: "E-commerce", desc: "Checkout buttons, payment scripts, and product pages — watched on every scan." },
  { icon: Globe, title: "Website owners", desc: "Sleep well knowing someone is watching your most important pages every day." },
];

const freeTools = [
  {
    icon: GitCompareArrows,
    href: "/tools/website-change-detector",
    title: "Website Change Detector",
    word: "Compare",
    color: primary,
    dark: true,
    desc: "Snapshot a page's status, SEO tags, links, and scripts — then re-check later to see what changed.",
  },
  {
    icon: Tags,
    href: "/tools/meta-tag-checker",
    title: "Meta Tag Checker",
    word: "Inspect",
    color: lavender,
    desc: "Grade a page's title, description, canonical, robots meta, Open Graph tags, and H1s.",
  },
  {
    icon: Route,
    href: "/tools/redirect-chain-checker",
    title: "Redirect Chain Checker",
    word: "Trace",
    color: periwinkle,
    desc: "Trace every redirect hop with its status code, and catch loops and long chains.",
  },
  {
    icon: ListChecks,
    href: "/tools/bulk-url-status-checker",
    title: "Bulk URL Status Checker",
    word: "Sweep",
    color: cream,
    desc: "Check status codes and response times of up to 20 URLs in one go.",
  },
  {
    icon: Braces,
    href: "/tools/script-detector",
    title: "Script Detector",
    word: "Reveal",
    color: lavender,
    desc: "List every external script on a page and identify the services behind them.",
  },
];

const faqs = [
  {
    q: "How is Fluxen different from uptime monitoring?",
    a: "Uptime tools tell you if a page responds. Fluxen tells you what changed on it — visual layout, SEO tags, content, links, scripts, performance, and conversion elements — and whether that change matters. A page can be 'up' and still be silently broken.",
  },
  {
    q: "Will I get flooded with alerts for tiny changes?",
    a: "No. Low false-positive rates are a core design goal. Fluxen normalizes dynamic content, lets you ignore volatile selectors, groups related changes into one alert, and applies severity thresholds — so notifications stay meaningful.",
  },
  {
    q: "Does Fluxen use AI to detect changes?",
    a: "No. Detection is fully deterministic: previous value versus current value, normalized DOM hashes, and pixel comparison. Results are consistent, reproducible, and explainable.",
  },
  {
    q: "What is a baseline?",
    a: "A baseline is the approved known-good state of a page. Every scan compares against it. When you make an intentional change, you approve it and it becomes the new baseline — so Fluxen always knows the difference between expected and unexpected changes.",
  },
  {
    q: "How many websites can I monitor?",
    a: "The free plan monitors 1 website with 5 pages. Pro is $12/month with 8 websites and 20 monitored pages per website, and you can add another website anytime for $6/month (up to 3) — ideal for freelancers and teams managing several sites.",
  },
  {
    q: "Is it safe to point Fluxen at my site?",
    a: "Yes. Fluxen only reads your public pages with strict limits on request counts, sizes, and frequency, respects robots.txt protections, and never stores credentials for your site.",
  },
];

/* ------------------------------- primitives ------------------------------ */

/** Full-bleed dark section container. */
function Dark({ id, children, className = "" }: { id?: string; children: React.ReactNode; className?: string }) {
  return (
    <section id={id} className={`mx-auto max-w-6xl px-5 py-20 lg:px-8 lg:py-28 ${className}`}>
      {children}
    </section>
  );
}

/** Inset rounded light panel — stamped's signature section treatment. */
function Panel({
  id,
  color = "#ffffff",
  children,
}: {
  id?: string;
  color?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="p-2 sm:p-2.5">
      <div
        style={{ backgroundColor: color }}
        className="mx-auto rounded-[32px] px-5 py-16 sm:rounded-[40px] sm:px-8 lg:py-24"
      >
        <div className="mx-auto max-w-5xl">{children}</div>
      </div>
    </section>
  );
}

function SerifHeading({
  children,
  dark = false,
  className = "",
}: {
  children: React.ReactNode;
  dark?: boolean;
  className?: string;
}) {
  return (
    <h2
      className={`${fontSerif} text-center text-4xl leading-[1.05] tracking-[-0.01em] sm:text-5xl lg:text-[56px] ${
        dark ? "text-white" : "text-[#0d0c0e]"
      } ${className}`}
    >
      {children}
    </h2>
  );
}

/** The split-pill CTA pair used at the end of light panels. */
function SplitPill({ onLight = true }: { onLight?: boolean }) {
  return (
    <div
      className={`mx-auto mt-12 flex w-fit overflow-hidden rounded-full ${
        onLight ? "border border-[#0d0c0e]/15" : "border border-white/20"
      }`}
    >
      <Link
        href="/signup"
        className="bg-white px-6 py-3.5 text-sm font-semibold text-[#0d0c0e] transition-colors hover:bg-[#3556f4] hover:text-white"
      >
        Start monitoring free
      </Link>
      <Link
        href="/preview"
        className="bg-[#0d0c0e] px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#2a2830]"
      >
        Explore the dashboard
      </Link>
    </div>
  );
}

/* ---------------------------------- page --------------------------------- */

export default function HomePage() {
  return (
    <div className={`${landingFontVars} ${fontSans} bg-[#0d0c0e] text-white antialiased`}>
      {/* PP Fragment (commercial, Pangram Pangram): activates automatically when
          the licensed files exist at public/fonts/ — Instrument Serif renders
          as the fallback until then. */}
      <style>{`
        @font-face {
          font-family: "PP Fragment";
          src: local("PP Fragment Serif Regular"), local("PPFragment-SerifRegular"),
            url("/fonts/PPFragment-SerifRegular.woff2") format("woff2");
          font-weight: 400;
          font-style: normal;
          font-display: swap;
        }
      `}</style>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LandingNav />
      <StickyCta />

      <main>
        {/* Hero — scroll-scrubbed monitoring story */}
        <LandingHero />

        {/* Interactive URL input (product-led, no signup) */}
        <section className="mx-auto max-w-6xl px-5 pb-4 pt-2 lg:px-8">
          <LandingUrlInput />
          <p className="mt-3 text-center text-[13px] text-white/40">
            Free instant inspection — status, SEO tags, links &amp; scripts. No signup needed.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/signup"
              className="rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-[#0d0c0e] transition-colors hover:bg-[#3556f4] hover:text-white"
            >
              Start Monitoring Free
            </Link>
            <Link
              href="/#how-it-works"
              className="rounded-full border border-white/20 px-7 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              See How Fluxen Works
            </Link>
          </div>
        </section>

        {/* Trust ticker — everything a scan checks */}
        <SignalMarquee />

        {/* The problem — white inset panel */}
        <Panel>
          <p className="mb-4 text-center text-[12px] font-medium uppercase tracking-[0.22em] text-[#0d0c0e]/45">
            The problem
          </p>
          <SerifHeading>Websites break silently.</SerifHeading>
          <p className="mx-auto mt-5 max-w-2xl text-center text-[15px] leading-7 text-[#0d0c0e]/65">
            Nobody re-checks every page after every deploy, plugin update, or client edit. Small
            changes slip through — and turn into lost rankings, lost conversions, and awkward
            client calls.
          </p>
          <div className="mt-12 grid gap-4 sm:grid-cols-2">
            {problems.map((p) => (
              <div
                key={p.text}
                style={{ backgroundColor: p.color }}
                className={`flex items-start gap-4 rounded-[24px] p-6 ${p.rotate}`}
              >
                <span
                  className={`mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-full ${p.dark ? "bg-white" : "bg-[#0d0c0e]"}`}
                >
                  <AlertTriangle
                    className={`size-4 ${p.dark ? "text-[#3556f4]" : "text-white"}`}
                    aria-hidden
                  />
                </span>
                <p
                  className={`text-[15px] font-medium leading-7 ${p.dark ? "text-white" : "text-[#0d0c0e]"}`}
                >
                  {p.text}
                </p>
              </div>
            ))}
          </div>
          <p className="mx-auto mt-12 max-w-2xl text-center text-lg leading-8 text-[#0d0c0e]/70">
            Fluxen answers one question, continuously:{" "}
            <span className={`${fontSerif} text-2xl italic text-[#0d0c0e]`}>
              &ldquo;Did something important change or break on any website I manage?&rdquo;
            </span>
          </p>
        </Panel>

        {/* What it watches — three feature cards + category chips */}
        <Dark id="categories">
          <p className={`${eyebrow} mb-4 text-center`}>What Fluxen watches</p>
          <SerifHeading dark>
            Eight kinds of change.
            <br />
            <span className="italic">One monitoring layer.</span>
          </SerifHeading>
          <p className="mx-auto mt-5 max-w-2xl text-center text-[15px] leading-7 text-white/55">
            Every scan checks each monitored page across all eight categories and scores what it
            finds by severity — so you see what matters first.
          </p>

          <div className="mt-14 grid gap-5 lg:grid-cols-3">
            {/* Visual */}
            <div className={`${darkCard} flex flex-col p-7`}>
              <h3 className={`${fontSerif} text-center text-3xl text-white`}>Visual</h3>
              <div className="my-7 flex flex-1 items-center justify-center">
                <div className="relative w-full max-w-60">
                  <div
                    style={{ backgroundColor: lavender }}
                    className="absolute -left-3 top-2 h-32 w-1/2 -rotate-3 rounded-2xl opacity-90"
                  />
                  <div
                    style={{ backgroundColor: primary }}
                    className="relative ml-auto flex h-36 w-3/5 rotate-2 flex-col justify-center gap-2 rounded-2xl p-4 shadow-[0_16px_40px_rgba(0,0,0,0.4)]"
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/60">
                      Pixel diff
                    </p>
                    <p className={`${fontSerif} text-3xl text-white`}>12.4%</p>
                    <p className="text-[11px] font-medium text-white/70">
                      of the page changed overnight
                    </p>
                  </div>
                </div>
              </div>
              <p className="text-center text-sm leading-6 text-white/55">
                Full-page screenshots compared pixel by pixel, with masks and ignore rules that
                keep dynamic content from crying wolf.
              </p>
            </div>

            {/* SEO */}
            <div className={`${darkCard} flex flex-col p-7`}>
              <h3 className={`${fontSerif} text-center text-3xl text-white`}>SEO</h3>
              <div className="my-7 flex flex-1 flex-col items-center justify-center gap-2">
                <div
                  style={{ backgroundColor: cream }}
                  className="w-full max-w-60 -rotate-1 rounded-2xl p-3.5 shadow-[0_16px_40px_rgba(0,0,0,0.4)]"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#0d0c0e]/50">
                    Baseline
                  </p>
                  <p className="mt-1 font-mono text-[12px] text-[#0d0c0e]">robots: index, follow</p>
                </div>
                <div
                  style={{ backgroundColor: primary }}
                  className="w-full max-w-60 rotate-1 rounded-2xl p-3.5 shadow-[0_16px_40px_rgba(0,0,0,0.4)]"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/60">
                    Today · critical
                  </p>
                  <p className="mt-1 font-mono text-[12px] font-semibold text-white">
                    robots: noindex ⚠
                  </p>
                </div>
              </div>
              <p className="text-center text-sm leading-6 text-white/55">
                Titles, descriptions, canonicals, robots meta, H1s, sitemaps, and indexability —
                the tags that decide whether you rank.
              </p>
            </div>

            {/* Links */}
            <div className={`${darkCard} flex flex-col p-7`}>
              <h3 className={`${fontSerif} text-center text-3xl text-white`}>Links</h3>
              <div className="my-7 flex flex-1 items-center justify-center">
                <div
                  style={{ backgroundColor: periwinkle }}
                  className="w-full max-w-60 rotate-[1.5deg] rounded-2xl p-4 shadow-[0_16px_40px_rgba(0,0,0,0.4)]"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#0d0c0e]/50">
                    Site-wide · high
                  </p>
                  <p className={`${fontSerif} mt-1 text-2xl leading-tight text-[#0d0c0e]`}>
                    17 internal links broken
                  </p>
                  <p className="mt-1.5 font-mono text-[11px] text-[#0d0c0e]/60">
                    /pricing → 404 · /docs → 404 · …
                  </p>
                </div>
              </div>
              <p className="text-center text-sm leading-6 text-white/55">
                Every internal link checked on every scan — grouped into one alert when they
                break, never one email per dead link.
              </p>
            </div>
          </div>

          <ul className="mt-8 flex flex-wrap justify-center gap-2.5">
            {categoryChips.map((c) => (
              <li
                key={c.name}
                className="flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-[13px] font-medium text-white/70"
              >
                <c.icon className="size-4" style={{ color: primarySoft }} aria-hidden />
                {c.name}
              </li>
            ))}
          </ul>
        </Dark>

        {/* How it works — royal-blue inset panel */}
        <Panel id="how-it-works" color={primary}>
          <p className="mb-4 text-center text-[12px] font-medium uppercase tracking-[0.22em] text-white/60">
            How it works
          </p>
          <SerifHeading dark>
            Baseline. Monitor.
            <br />
            <span className="italic">Detect. Fix.</span>
          </SerifHeading>
          <div className="mt-14 grid gap-x-10 gap-y-10 sm:grid-cols-2">
            {workflow.map((w) => (
              <div key={w.step}>
                <span className="inline-flex items-center justify-center rounded-full bg-white px-4 py-1.5 font-mono text-[12px] font-semibold text-[#0d0c0e]">
                  {w.step}
                </span>
                <h3 className={`${fontSerif} mt-4 text-2xl text-white`}>{w.title}</h3>
                <p className="mt-2 text-[14.5px] leading-7 text-white/75">
                  {w.desc.split(w.keyword).map((part, i, arr) => (
                    <span key={i}>
                      {part}
                      {i < arr.length - 1 && (
                        <span className="font-semibold text-white underline decoration-white/70 decoration-wavy decoration-1 underline-offset-4">
                          {w.keyword}
                        </span>
                      )}
                    </span>
                  ))}
                </p>
              </div>
            ))}
          </div>
          <SplitPill onLight={false} />
        </Panel>

        {/* Before / after — dark */}
        <Dark>
          <p className={`${eyebrow} mb-4 text-center`}>Before and after</p>
          <SerifHeading dark>See exactly what changed.</SerifHeading>
          <p className="mx-auto mt-5 max-w-2xl text-center text-[15px] leading-7 text-white/55">
            Every change event stores the previous state and the current state — values,
            screenshots, and diffs — so you never have to guess what happened.
          </p>
          <div className={`${darkCard} mx-auto mt-12 max-w-3xl overflow-hidden`}>
            <div className="grid divide-y divide-white/10 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
              <div className="p-7">
                <p className={`${eyebrow} mb-4`}>Baseline · approved</p>
                <dl className="space-y-3 font-mono text-[13px]">
                  {[
                    ["title", "Aurora Outdoor — Tents & Camping Gear"],
                    ["robots", "index, follow"],
                    ["status", "200 OK"],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <dt className="text-white/40">{k}</dt>
                      <dd
                        style={{ backgroundColor: cream }}
                        className="mt-1 rounded-lg px-2.5 py-1.5 text-[#0d0c0e]"
                      >
                        {v}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
              <div className="p-7">
                <p className={`${eyebrow} mb-4`}>Current scan · today</p>
                <dl className="space-y-3 font-mono text-[13px]">
                  {[
                    ["title", "Home", true],
                    ["robots", "noindex, nofollow", true],
                    ["status", "200 OK", false],
                  ].map(([k, v, changed]) => (
                    <div key={k as string}>
                      <dt className="text-white/40">{k}</dt>
                      <dd
                        style={{ backgroundColor: changed ? primary : cream }}
                        className={`mt-1 rounded-lg px-2.5 py-1.5 ${changed ? "font-semibold text-white" : "text-[#0d0c0e]"}`}
                      >
                        {v}
                        {changed ? " ⚠" : ""}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
            <div className="border-t border-white/10 bg-white/[0.03] px-7 py-4 text-sm text-white/60">
              <span className="font-semibold" style={{ color: primarySoft }}>
                Critical:
              </span>{" "}
              page changed from index to noindex — Fluxen alerts you within one scan cycle.
            </div>
          </div>
        </Dark>

        {/* Agencies — dark split */}
        <Dark className="!pt-4">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <p className={`${eyebrow} mb-4`}>For agencies</p>
              <h2 className={`${fontSerif} text-4xl leading-[1.05] text-white sm:text-5xl`}>
                Every client website,
                <br />
                <span className="italic">one dashboard.</span>
              </h2>
              <p className="mt-5 max-w-md text-[15px] leading-7 text-white/55">
                Stop finding out about broken client sites from angry emails. Fluxen watches every
                site you maintain and tells you which one needs attention — before the client
                notices.
              </p>
              <ul className="mt-8 space-y-3.5">
                {[
                  "Severity-ranked change feed across all clients",
                  "Before-and-after evidence for every change",
                  "Weekly client-ready report emails",
                  "Public status pages and uptime badges",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-3 text-[15px] text-white/85">
                    <CheckCircle2
                      className="mt-0.5 size-5 shrink-0"
                      style={{ color: primarySoft }}
                      aria-hidden
                    />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
            <div className={`${darkCard} p-5`}>
              <div className="space-y-2.5">
                {[
                  { site: "aurora-outdoor.com", state: "3 critical changes", color: primary, dark: true },
                  { site: "meridianlegal.co", state: "2 high changes", color: lavender, dark: false },
                  { site: "bloomandroot.shop", state: "Healthy", color: cream, dark: false },
                  { site: "northwinddental.com", state: "Healthy", color: cream, dark: false },
                ].map((row) => (
                  <div
                    key={row.site}
                    className="flex items-center justify-between gap-3 rounded-2xl bg-white/[0.05] px-5 py-4"
                  >
                    <span className="min-w-0 truncate font-mono text-[13px] text-white/85">
                      {row.site}
                    </span>
                    <span
                      style={{ backgroundColor: row.color }}
                      className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${row.dark ? "text-white" : "text-[#0d0c0e]"}`}
                    >
                      {row.state}
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-center text-[12px] text-white/35">
                Illustrative dashboard state
              </p>
            </div>
          </div>

          {/* Use cases */}
          <div className="mt-20 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {useCases.map((u) => (
              <div key={u.title} className={`${darkCard} p-6`}>
                <u.icon className="size-5" style={{ color: primarySoft }} aria-hidden />
                <h3 className="mt-3.5 text-[15px] font-semibold text-white">{u.title}</h3>
                <p className="mt-1.5 text-sm leading-6 text-white/55">{u.desc}</p>
              </div>
            ))}
          </div>
        </Dark>

        {/* Free tools — pastel collage cards */}
        <Dark id="free-tools" className="!pt-8">
          <p className={`${eyebrow} mb-4 text-center`}>Free tools</p>
          <SerifHeading dark>
            Try the detection engine <span className="italic">free.</span>
          </SerifHeading>
          <p className="mx-auto mt-5 max-w-2xl text-center text-[15px] leading-7 text-white/55">
            Five free tools, no account needed. Every one is powered by the same engine that runs
            Fluxen&apos;s monitoring.
          </p>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {freeTools.map((tool) => (
              <Link
                key={tool.href}
                href={tool.href}
                className="group flex flex-col overflow-hidden rounded-[24px] transition-transform duration-300 hover:-translate-y-1"
                style={{ backgroundColor: tool.color }}
              >
                <div className="flex items-center justify-between p-5 pb-0">
                  <tool.icon
                    className={`size-6 ${tool.dark ? "text-white" : "text-[#0d0c0e]"}`}
                    aria-hidden
                  />
                  <ArrowRight
                    className={`size-5 transition-transform group-hover:translate-x-1 ${tool.dark ? "text-white/60" : "text-[#0d0c0e]/50"}`}
                    aria-hidden
                  />
                </div>
                <p
                  className={`${fontSerif} px-5 pt-3 text-4xl italic ${tool.dark ? "text-white" : "text-[#0d0c0e]"}`}
                >
                  {tool.word}
                </p>
                <div
                  className={`mt-4 flex flex-1 flex-col rounded-t-[20px] p-5 ${tool.dark ? "bg-white/10" : "bg-[#0d0c0e]/[0.06]"}`}
                >
                  <h3
                    className={`text-[15px] font-semibold ${tool.dark ? "text-white" : "text-[#0d0c0e]"}`}
                  >
                    {tool.title}
                  </h3>
                  <p
                    className={`mt-1.5 text-[13px] leading-6 ${tool.dark ? "text-white/75" : "text-[#0d0c0e]/65"}`}
                  >
                    {tool.desc}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </Dark>

        {/* Pricing — white inset panel */}
        <Panel id="pricing">
          <p className="mb-4 text-center text-[12px] font-medium uppercase tracking-[0.22em] text-[#0d0c0e]/45">
            Pricing
          </p>
          <SerifHeading>
            Simple plans that scale
            <br />
            <span className="italic">with your websites.</span>
          </SerifHeading>
          <div className="mx-auto mt-14 grid max-w-3xl gap-5 sm:grid-cols-2">
            {plans.map((plan) => {
              const pro = plan.highlighted;
              return (
                <div
                  key={plan.id}
                  className={`flex flex-col rounded-[28px] p-8 ${
                    pro ? "bg-[#0d0c0e] text-white" : "border border-[#0d0c0e]/10 bg-[#faf8f2] text-[#0d0c0e]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h3 className={`${fontSerif} text-3xl`}>{plan.name}</h3>
                    {pro && (
                      <span
                        style={{ backgroundColor: primary }}
                        className="rounded-full px-3 py-1 text-xs font-semibold text-white"
                      >
                        Most popular
                      </span>
                    )}
                  </div>
                  <p className={`mt-2 text-sm leading-6 ${pro ? "text-white/60" : "text-[#0d0c0e]/60"}`}>
                    {plan.headline}
                  </p>
                  <p className="mt-6">
                    <span className={`${fontSerif} text-5xl`}>${plan.priceMonthlyUsd}</span>
                    <span className={`text-sm ${pro ? "text-white/50" : "text-[#0d0c0e]/50"}`}>
                      {" "}
                      / month
                    </span>
                  </p>
                  <ul className="mt-7 flex-1 space-y-3">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-[14px] leading-6">
                        <CheckCircle2
                          className="mt-1 size-4 shrink-0"
                          style={{ color: pro ? primarySoft : "#3d7a33" }}
                          aria-hidden
                        />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/signup"
                    className={`mt-8 rounded-full px-6 py-3.5 text-center text-sm font-semibold transition-colors ${
                      pro
                        ? "bg-white text-[#0d0c0e] hover:bg-[#3556f4] hover:text-white"
                        : "bg-[#0d0c0e] text-white hover:bg-[#2a2830]"
                    }`}
                  >
                    {pro ? "Start with Pro" : "Start free"}
                  </Link>
                </div>
              );
            })}
          </div>
          <p className="mt-8 text-center text-sm text-[#0d0c0e]/60">
            Full plan details on the{" "}
            <Link href="/pricing" className="font-semibold text-[#0d0c0e] underline underline-offset-4">
              pricing page →
            </Link>
          </p>
        </Panel>

        {/* FAQ — dark */}
        <Dark>
          <p className={`${eyebrow} mb-4 text-center`}>FAQ</p>
          <SerifHeading dark>Questions, answered.</SerifHeading>
          <div className="mx-auto mt-12 max-w-2xl space-y-3">
            {faqs.map((f) => (
              <details key={f.q} className={`${darkCard} group px-6 py-5 open:pb-6`}>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-semibold text-white [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <span
                    className="text-xl leading-none text-white/40 transition-transform group-open:rotate-45"
                    aria-hidden
                  >
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-7 text-white/60">{f.a}</p>
              </details>
            ))}
          </div>
        </Dark>

        {/* Final CTA — dark panel with royal-blue ring */}
        <section className="p-2 pb-4 sm:p-2.5">
          <div
            style={{ borderColor: primary }}
            className="mx-auto rounded-[32px] border-[3px] px-5 py-20 text-center sm:rounded-[40px] lg:py-28"
          >
            <h2 className={`${fontSerif} mx-auto max-w-3xl text-4xl leading-[1.05] text-white sm:text-6xl`}>
              Stop finding out about broken websites{" "}
              <span className="italic">from your users.</span>
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-[15px] leading-7 text-white/55">
              Create a free account — monitor your first website in minutes. No credit card
              required.
            </p>
            <SplitPill onLight={false} />
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
