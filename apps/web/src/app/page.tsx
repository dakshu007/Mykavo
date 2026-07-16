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
import { LogoMark } from "@/components/brand/logo";
import {
  bone,
  card,
  elevated,
  eyebrow,
  fontDisplay,
  fontSans,
  gold,
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

const problems: Array<{ text: string; tone: "white" | "gold" }> = [
  {
    text: "A deploy silently breaks the signup button — nobody notices for a week.",
    tone: "white",
  },
  {
    text: "A plugin update flips key pages to noindex — rankings quietly fall.",
    tone: "white",
  },
  {
    text: "Google Analytics disappears during a rebuild — a month of data lost.",
    tone: "white",
  },
  {
    text: "A client edits the homepage — and blames your agency when it breaks.",
    tone: "gold",
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
    desc: "Point MyKavo at every site you manage. It discovers pages via sitemaps and internal links — you pick what matters.",
    keyword: "discovers",
  },
  {
    step: "02",
    title: "Approve a baseline",
    desc: "MyKavo captures a full snapshot of each page: screenshots, SEO tags, links, scripts, performance. You approve it as the known-good state.",
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

const freeTools: Array<{
  icon: typeof GitCompareArrows;
  href: string;
  title: string;
  word: string;
  tone: "gold" | "bone";
  desc: string;
}> = [
  {
    icon: GitCompareArrows,
    href: "/tools/website-change-detector",
    title: "Website Change Detector",
    word: "Compare",
    tone: "gold",
    desc: "Snapshot a page's status, SEO tags, links, and scripts — then re-check later to see what changed.",
  },
  {
    icon: Tags,
    href: "/tools/meta-tag-checker",
    title: "Meta Tag Checker",
    word: "Inspect",
    tone: "bone",
    desc: "Grade a page's title, description, canonical, robots meta, Open Graph tags, and H1s.",
  },
  {
    icon: Route,
    href: "/tools/redirect-chain-checker",
    title: "Redirect Chain Checker",
    word: "Trace",
    tone: "bone",
    desc: "Trace every redirect hop with its status code, and catch loops and long chains.",
  },
  {
    icon: ListChecks,
    href: "/tools/bulk-url-status-checker",
    title: "Bulk URL Status Checker",
    word: "Sweep",
    tone: "bone",
    desc: "Check status codes and response times of up to 20 URLs in one go.",
  },
  {
    icon: Braces,
    href: "/tools/script-detector",
    title: "Script Detector",
    word: "Reveal",
    tone: "bone",
    desc: "List every external script on a page and identify the services behind them.",
  },
];

const faqs = [
  {
    q: "How is MyKavo different from uptime monitoring?",
    a: "Uptime tools tell you if a page responds. MyKavo tells you what changed on it — visual layout, SEO tags, content, links, scripts, performance, and conversion elements — and whether that change matters. A page can be 'up' and still be silently broken.",
  },
  {
    q: "Will I get flooded with alerts for tiny changes?",
    a: "No. Low false-positive rates are a core design goal. MyKavo normalizes dynamic content, lets you ignore volatile selectors, groups related changes into one alert, and applies severity thresholds — so notifications stay meaningful.",
  },
  {
    q: "Does MyKavo use AI to detect changes?",
    a: "No. Detection is fully deterministic: previous value versus current value, normalized DOM hashes, and pixel comparison. Results are consistent, reproducible, and explainable.",
  },
  {
    q: "What is a baseline?",
    a: "A baseline is the approved known-good state of a page. Every scan compares against it. When you make an intentional change, you approve it and it becomes the new baseline — so MyKavo always knows the difference between expected and unexpected changes.",
  },
  {
    q: "How many websites can I monitor?",
    a: "The free plan monitors 1 website with 5 pages. Pro is $12/month with 8 websites and 20 monitored pages per website, and you can add another website anytime for $6/month (up to 3) — ideal for freelancers and teams managing several sites.",
  },
  {
    q: "Is it safe to point MyKavo at my site?",
    a: "Yes. MyKavo only reads your public pages with strict limits on request counts, sizes, and frequency, respects robots.txt protections, and never stores credentials for your site.",
  },
];

/* ------------------------------- primitives ------------------------------ */

/** Standard dark section container. */
function Section({ id, children, className = "" }: { id?: string; children: React.ReactNode; className?: string }) {
  return (
    <section id={id} className={`mx-auto max-w-6xl px-5 py-20 lg:px-8 lg:py-28 ${className}`}>
      {children}
    </section>
  );
}

/** Full-width bone band — the retool-style warm panel with ink text. */
function BonePanel({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <section id={id} style={{ backgroundColor: bone }} className="border-y border-black/10">
      <div className="mx-auto max-w-6xl px-5 py-20 text-[#151515] lg:px-8 lg:py-28">{children}</div>
    </section>
  );
}

function DisplayHeading({
  children,
  onBone = false,
  className = "",
}: {
  children: React.ReactNode;
  onBone?: boolean;
  className?: string;
}) {
  return (
    <h2
      className={`${fontDisplay} text-center text-4xl leading-[1.06] sm:text-5xl lg:text-[52px] ${
        onBone ? "text-[#151515]" : "text-[#E9EBDF]"
      } ${className}`}
    >
      {children}
    </h2>
  );
}

/** The split CTA pair: gold primary + dark secondary sharing one capsule. */
function SplitPill() {
  return (
    <div className="mx-auto mt-12 flex w-fit overflow-hidden rounded-full border border-black/15">
      <Link
        href="/signup"
        className="bg-[#FFD400] px-6 py-3.5 text-sm font-semibold text-[#151515] transition-colors hover:bg-[#ffe14d]"
      >
        Start monitoring free
      </Link>
      <Link
        href="/preview"
        className="bg-[#151515] px-6 py-3.5 text-sm font-semibold text-[#E9EBDF] transition-colors hover:bg-[#242424]"
      >
        Explore the dashboard
      </Link>
    </div>
  );
}

/* ---------------------------------- page --------------------------------- */

export default function HomePage() {
  return (
    <div className={`${fontSans} bg-[#151515] text-[#E9EBDF] antialiased`}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LandingNav />
      <StickyCta />

      <main>
        {/* Hero — scroll-scrubbed monitoring story */}
        <LandingHero />

        {/* Sub-copy + interactive URL input (product-led, no signup) */}
        <section className="mx-auto max-w-6xl px-5 pb-4 pt-10 lg:px-8">
          <p className="mx-auto mb-10 max-w-xl text-center text-[15px] leading-7 text-[#9C9E93] sm:text-base">
            MyKavo watches your websites for visual, SEO, content, link, script, performance,
            and conversion changes — and alerts you before small problems become expensive ones.
          </p>
          <LandingUrlInput />
          <p className="mt-3 text-center text-[13px] text-[#9C9E93]">
            Free instant inspection — status, SEO tags, links &amp; scripts. No signup needed.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/signup"
              className="rounded-full bg-[#FFD400] px-7 py-3.5 text-sm font-semibold text-[#151515] transition-colors hover:bg-[#ffe14d]"
            >
              Start Monitoring Free
            </Link>
            <Link
              href="/#how-it-works"
              className="rounded-full border border-white/20 px-7 py-3.5 text-sm font-semibold text-[#E9EBDF] transition-colors hover:bg-white/5"
            >
              See How MyKavo Works
            </Link>
          </div>
        </section>

        {/* Trust ticker — everything a scan checks */}
        <SignalMarquee />

        {/* The problem — bone band */}
        <BonePanel>
          <p className="mb-4 text-center text-[12px] font-medium uppercase tracking-[0.22em] text-[#151515]/50">
            The problem
          </p>
          <DisplayHeading onBone>Websites break silently.</DisplayHeading>
          <p className="mx-auto mt-5 max-w-2xl text-center text-[15px] leading-7 text-[#151515]/65">
            Nobody re-checks every page after every deploy, plugin update, or client edit. Small
            changes slip through — and turn into lost rankings, lost conversions, and awkward
            client calls.
          </p>
          <div className="mt-12 grid gap-4 sm:grid-cols-2">
            {problems.map((p) => (
              <div
                key={p.text}
                style={{ backgroundColor: p.tone === "gold" ? gold : "#ffffff" }}
                className="flex items-start gap-4 rounded-2xl border border-black/10 p-6"
              >
                <span className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-[#151515]">
                  <AlertTriangle className="size-4 text-[#FFD400]" aria-hidden />
                </span>
                <p className="text-[15px] font-medium leading-7 text-[#151515]">{p.text}</p>
              </div>
            ))}
          </div>
          <p className="mx-auto mt-12 max-w-2xl text-center text-lg leading-8 text-[#151515]/70">
            MyKavo answers one question, continuously:{" "}
            <span className="font-semibold text-[#151515]">
              &ldquo;Did something important change or break on any website I manage?&rdquo;
            </span>
          </p>
        </BonePanel>

        {/* What it watches — bento feature cells */}
        <Section id="categories">
          <p className={`${eyebrow} mb-4 text-center`}>What MyKavo watches</p>
          <DisplayHeading>
            Eight kinds of change.
            <br />
            <span className="text-[#9C9E93]">One monitoring layer.</span>
          </DisplayHeading>
          <p className="mx-auto mt-5 max-w-2xl text-center text-[15px] leading-7 text-[#9C9E93]">
            Every scan checks each monitored page across all eight categories and scores what it
            finds by severity — so you see what matters first.
          </p>

          <div className="mt-14 grid gap-4 lg:grid-cols-3">
            {/* Visual */}
            <div className={`${card} flex flex-col p-7`}>
              <h3 className={`${fontDisplay} text-center text-3xl font-medium text-[#E9EBDF]`}>Visual</h3>
              <div className="my-7 flex flex-1 items-center justify-center">
                <div className="relative w-full max-w-60">
                  <div
                    style={{ backgroundColor: bone }}
                    className="absolute -left-3 top-2 h-32 w-1/2 -rotate-3 rounded-xl border border-black/10 opacity-90"
                  />
                  <div
                    style={{ backgroundColor: gold }}
                    className="relative ml-auto flex h-36 w-3/5 rotate-2 flex-col justify-center gap-1.5 rounded-xl border border-black/10 p-4 shadow-[0_14px_34px_rgba(0,0,0,0.4)]"
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#151515]/55">
                      Pixel diff
                    </p>
                    <p className={`${fontDisplay} text-3xl font-medium text-[#151515]`}>12.4%</p>
                    <p className="text-[11px] font-medium text-[#151515]/60">
                      of the page changed overnight
                    </p>
                  </div>
                </div>
              </div>
              <p className="text-center text-sm leading-6 text-[#9C9E93]">
                Full-page screenshots compared pixel by pixel, with masks and ignore rules that
                keep dynamic content from crying wolf.
              </p>
            </div>

            {/* SEO */}
            <div className={`${card} flex flex-col p-7`}>
              <h3 className={`${fontDisplay} text-center text-3xl font-medium text-[#E9EBDF]`}>SEO</h3>
              <div className="my-7 flex flex-1 flex-col items-center justify-center gap-2">
                <div
                  style={{ backgroundColor: bone }}
                  className="w-full max-w-60 -rotate-1 rounded-xl border border-black/10 p-3.5 shadow-[0_14px_34px_rgba(0,0,0,0.4)]"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#151515]/55">
                    Baseline
                  </p>
                  <p className="mt-1 font-mono text-[12px] text-[#151515]">robots: index, follow</p>
                </div>
                <div
                  style={{ backgroundColor: gold }}
                  className="w-full max-w-60 rotate-1 rounded-xl border border-black/10 p-3.5 shadow-[0_14px_34px_rgba(0,0,0,0.4)]"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#151515]/55">
                    Today · critical
                  </p>
                  <p className="mt-1 font-mono text-[12px] font-semibold text-[#151515]">
                    robots: noindex ⚠
                  </p>
                </div>
              </div>
              <p className="text-center text-sm leading-6 text-[#9C9E93]">
                Titles, descriptions, canonicals, robots meta, H1s, sitemaps, and indexability —
                the tags that decide whether you rank.
              </p>
            </div>

            {/* Links */}
            <div className={`${card} flex flex-col p-7`}>
              <h3 className={`${fontDisplay} text-center text-3xl font-medium text-[#E9EBDF]`}>Links</h3>
              <div className="my-7 flex flex-1 items-center justify-center">
                <div
                  style={{ backgroundColor: bone }}
                  className="w-full max-w-60 rotate-[1.5deg] rounded-xl border border-black/10 p-4 shadow-[0_14px_34px_rgba(0,0,0,0.4)]"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#151515]/55">
                    Site-wide · high
                  </p>
                  <p className={`${fontDisplay} mt-1 text-2xl font-medium leading-tight text-[#151515]`}>
                    17 internal links broken
                  </p>
                  <p className="mt-1.5 font-mono text-[11px] text-[#151515]/60">
                    /pricing → 404 · /docs → 404 · …
                  </p>
                </div>
              </div>
              <p className="text-center text-sm leading-6 text-[#9C9E93]">
                Every internal link checked on every scan — grouped into one alert when they
                break, never one email per dead link.
              </p>
            </div>
          </div>

          <ul className="mt-8 flex flex-wrap justify-center gap-2.5">
            {categoryChips.map((c) => (
              <li
                key={c.name}
                className="flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-[13px] font-medium text-[#E9EBDF]/80"
              >
                <c.icon className="size-4 text-[#FFD400]" aria-hidden />
                {c.name}
              </li>
            ))}
          </ul>
        </Section>

        {/* How it works — bone band */}
        <BonePanel id="how-it-works">
          <p className="mb-4 text-center text-[12px] font-medium uppercase tracking-[0.22em] text-[#151515]/50">
            How it works
          </p>
          <DisplayHeading onBone>
            Baseline. Monitor.
            <br />
            <span className="text-[#151515]/45">Detect. Fix.</span>
          </DisplayHeading>
          <div className="mt-14 grid gap-x-10 gap-y-10 sm:grid-cols-2">
            {workflow.map((w) => (
              <div key={w.step}>
                <span
                  style={{ backgroundColor: gold }}
                  className="inline-flex items-center justify-center rounded-full px-4 py-1.5 font-mono text-[12px] font-semibold text-[#151515]"
                >
                  {w.step}
                </span>
                <h3 className={`${fontDisplay} mt-4 text-2xl font-medium text-[#151515]`}>{w.title}</h3>
                <p className="mt-2 text-[14.5px] leading-7 text-[#151515]/70">
                  {w.desc.split(w.keyword).map((part, i, arr) => (
                    <span key={i}>
                      {part}
                      {i < arr.length - 1 && (
                        <span className="font-semibold text-[#151515] underline decoration-[#c7a500] decoration-2 underline-offset-4">
                          {w.keyword}
                        </span>
                      )}
                    </span>
                  ))}
                </p>
              </div>
            ))}
          </div>
          <SplitPill />
        </BonePanel>

        {/* Before / after — dark */}
        <Section>
          <p className={`${eyebrow} mb-4 text-center`}>Before and after</p>
          <DisplayHeading>See exactly what changed.</DisplayHeading>
          <p className="mx-auto mt-5 max-w-2xl text-center text-[15px] leading-7 text-[#9C9E93]">
            Every change event stores the previous state and the current state — values,
            screenshots, and diffs — so you never have to guess what happened.
          </p>
          <div className={`${card} mx-auto mt-12 max-w-3xl overflow-hidden`}>
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
                      <dt className="text-[#9C9E93]">{k}</dt>
                      <dd
                        style={{ backgroundColor: bone }}
                        className="mt-1 rounded-lg px-2.5 py-1.5 text-[#151515]"
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
                  {([
                    ["title", "Home", true],
                    ["robots", "noindex, nofollow", true],
                    ["status", "200 OK", false],
                  ] as Array<[string, string, boolean]>).map(([k, v, changed]) => (
                    <div key={k}>
                      <dt className="text-[#9C9E93]">{k}</dt>
                      <dd
                        style={{ backgroundColor: changed ? gold : bone }}
                        className={`mt-1 rounded-lg px-2.5 py-1.5 text-[#151515] ${changed ? "font-semibold" : ""}`}
                      >
                        {v}
                        {changed ? " ⚠" : ""}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
            <div className="border-t border-white/10 bg-white/[0.03] px-7 py-4 text-sm text-[#9C9E93]">
              <span className="font-semibold text-[#FFD400]">Critical:</span> page changed from
              index to noindex — MyKavo alerts you within one scan cycle.
            </div>
          </div>
        </Section>

        {/* Agencies — dark split */}
        <Section className="!pt-4">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <p className={`${eyebrow} mb-4`}>For agencies</p>
              <h2 className={`${fontDisplay} text-4xl leading-[1.06] text-[#E9EBDF] sm:text-5xl`}>
                Every client website,
                <br />
                <span className="text-[#9C9E93]">one dashboard.</span>
              </h2>
              <p className="mt-5 max-w-md text-[15px] leading-7 text-[#9C9E93]">
                Stop finding out about broken client sites from angry emails. MyKavo watches every
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
                  <li key={t} className="flex items-start gap-3 text-[15px] text-[#E9EBDF]/90">
                    <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-[#FFD400]" aria-hidden />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
            <div className={`${card} p-5`}>
              <div className="space-y-2.5">
                {([
                  { site: "aurora-outdoor.com", state: "3 critical changes", tone: "gold" },
                  { site: "meridianlegal.co", state: "2 high changes", tone: "bone" },
                  { site: "bloomandroot.shop", state: "Healthy", tone: "dark" },
                  { site: "northwinddental.com", state: "Healthy", tone: "dark" },
                ] as Array<{ site: string; state: string; tone: "gold" | "bone" | "dark" }>).map((row) => (
                  <div
                    key={row.site}
                    className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.05] px-5 py-4"
                  >
                    <span className="min-w-0 truncate font-mono text-[13px] text-[#E9EBDF]/85">
                      {row.site}
                    </span>
                    <span
                      style={{
                        backgroundColor: row.tone === "gold" ? gold : row.tone === "bone" ? bone : elevated,
                      }}
                      className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                        row.tone === "dark"
                          ? "border border-white/15 text-[#E9EBDF]/85"
                          : "text-[#151515]"
                      }`}
                    >
                      {row.state}
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-center text-[12px] text-[#9C9E93]/80">
                Illustrative dashboard state
              </p>
            </div>
          </div>

          {/* Use cases */}
          <div className="mt-20 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {useCases.map((u) => (
              <div key={u.title} className={`${card} p-6`}>
                <u.icon className="size-5 text-[#FFD400]" aria-hidden />
                <h3 className="mt-3.5 text-[15px] font-semibold text-[#E9EBDF]">{u.title}</h3>
                <p className="mt-1.5 text-sm leading-6 text-[#9C9E93]">{u.desc}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* Free tools */}
        <Section id="free-tools" className="!pt-8">
          <p className={`${eyebrow} mb-4 text-center`}>Free tools</p>
          <DisplayHeading>
            Try the detection engine <span className="text-[#9C9E93]">free.</span>
          </DisplayHeading>
          <p className="mx-auto mt-5 max-w-2xl text-center text-[15px] leading-7 text-[#9C9E93]">
            Five free tools, no account needed. Every one is powered by the same engine that runs
            MyKavo&apos;s monitoring.
          </p>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {freeTools.map((tool) => (
              <Link
                key={tool.href}
                href={tool.href}
                style={{ backgroundColor: tool.tone === "gold" ? gold : bone }}
                className="group flex flex-col overflow-hidden rounded-2xl border border-black/10 transition-transform duration-300 hover:-translate-y-1"
              >
                <div className="flex items-center justify-between p-5 pb-0">
                  <tool.icon className="size-6 text-[#151515]" aria-hidden />
                  <ArrowRight
                    className="size-5 text-[#151515]/50 transition-transform group-hover:translate-x-1"
                    aria-hidden
                  />
                </div>
                <p className={`${fontDisplay} px-5 pt-3 text-4xl font-medium text-[#151515]`}>
                  {tool.word}
                </p>
                <div className="mt-4 flex flex-1 flex-col bg-[#151515]/[0.06] p-5">
                  <h3 className="text-[15px] font-semibold text-[#151515]">{tool.title}</h3>
                  <p className="mt-1.5 text-[13px] leading-6 text-[#151515]/65">{tool.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </Section>

        {/* Pricing — bone band */}
        <BonePanel id="pricing">
          <p className="mb-4 text-center text-[12px] font-medium uppercase tracking-[0.22em] text-[#151515]/50">
            Pricing
          </p>
          <DisplayHeading onBone>
            Simple plans that scale
            <br />
            <span className="text-[#151515]/45">with your websites.</span>
          </DisplayHeading>
          <div className="mx-auto mt-14 grid max-w-3xl gap-5 sm:grid-cols-2">
            {plans.map((plan) => {
              const pro = plan.highlighted;
              return (
                <div
                  key={plan.id}
                  style={pro ? { backgroundColor: gold } : { backgroundColor: "#ffffff" }}
                  className="flex flex-col rounded-2xl border border-black/10 p-8 text-[#151515]"
                >
                  <div className="flex items-center justify-between">
                    <h3 className={`${fontDisplay} text-3xl font-medium`}>{plan.name}</h3>
                    {pro && (
                      <span className="rounded-full bg-[#151515] px-3 py-1 text-xs font-semibold text-[#FFD400]">
                        Most popular
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[#151515]/65">{plan.headline}</p>
                  <p className="mt-6">
                    <span className={`${fontDisplay} text-5xl font-medium`}>${plan.priceMonthlyUsd}</span>
                    <span className="text-sm text-[#151515]/55"> / month</span>
                  </p>
                  <ul className="mt-7 flex-1 space-y-3">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-[14px] leading-6">
                        <CheckCircle2 className="mt-1 size-4 shrink-0 text-[#151515]" aria-hidden />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/signup"
                    className={`mt-8 rounded-full px-6 py-3.5 text-center text-sm font-semibold transition-colors ${
                      pro
                        ? "bg-[#151515] text-[#E9EBDF] hover:bg-[#2a2a2a]"
                        : "bg-[#151515] text-[#E9EBDF] hover:bg-[#2a2a2a]"
                    }`}
                  >
                    {pro ? "Start with Pro" : "Start free"}
                  </Link>
                </div>
              );
            })}
          </div>
          <p className="mt-8 text-center text-sm text-[#151515]/65">
            Full plan details on the{" "}
            <Link href="/pricing" className="font-semibold text-[#151515] underline underline-offset-4">
              pricing page →
            </Link>
          </p>
        </BonePanel>

        {/* FAQ — dark */}
        <Section>
          <p className={`${eyebrow} mb-4 text-center`}>FAQ</p>
          <DisplayHeading>Questions, answered.</DisplayHeading>
          <div className="mx-auto mt-12 max-w-2xl space-y-3">
            {faqs.map((f) => (
              <details key={f.q} className={`${card} group px-6 py-5 open:pb-6`}>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-semibold text-[#E9EBDF] [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <span
                    className="text-xl leading-none text-[#9C9E93] transition-transform group-open:rotate-45"
                    aria-hidden
                  >
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-7 text-[#9C9E93]">{f.a}</p>
              </details>
            ))}
          </div>
        </Section>

        {/* Final CTA — the gold band */}
        <section className="px-5 pb-16 lg:px-8">
          <div
            style={{ backgroundColor: gold }}
            className="relative mx-auto max-w-6xl overflow-hidden rounded-[28px] border border-black/10 px-6 py-20 text-center lg:py-28"
          >
            <LogoMark
              size={340}
              className="pointer-events-none absolute -right-20 -top-16 rotate-12 text-[#151515] opacity-[0.07]"
            />
            <h2 className={`${fontDisplay} relative mx-auto max-w-3xl text-4xl leading-[1.05] text-[#151515] sm:text-6xl`}>
              Stop finding out about broken websites{" "}
              <span className="text-[#151515]/55">from your users.</span>
            </h2>
            <p className="relative mx-auto mt-6 max-w-xl text-[15px] leading-7 text-[#151515]/70">
              Create a free account — monitor your first website in minutes. No credit card
              required.
            </p>
            <div className="relative mx-auto mt-10 flex w-fit overflow-hidden rounded-full border border-black/20">
              <Link
                href="/signup"
                className="bg-[#151515] px-6 py-3.5 text-sm font-semibold text-[#FFD400] transition-colors hover:bg-[#2a2a2a]"
              >
                Start monitoring free
              </Link>
              <Link
                href="/preview"
                className="bg-white px-6 py-3.5 text-sm font-semibold text-[#151515] transition-colors hover:bg-[#F7F8F4]"
              >
                Explore the dashboard
              </Link>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
