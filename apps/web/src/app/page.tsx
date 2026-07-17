import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Braces,
  CheckCircle2,
  Code2,
  GitCompareArrows,
  Globe,
  ListChecks,
  Route,
  Search,
  Store,
  Tags,
  Users,
  Wrench,
} from "lucide-react";
import { LandingNav } from "@/components/landing/nav";
import { ValueQuoteBanner } from "@/components/value-quote";
import { Price } from "@/components/region";
import { LandingHero } from "@/components/landing/hero";
import { SignalMarquee } from "@/components/landing/marquee";
import { CategoryTabs } from "@/components/landing/categories";
import { StickyCta } from "@/components/landing/sticky-cta";
import { LandingFooter } from "@/components/landing/footer";
import { LogoMark } from "@/components/brand/logo";
import { eyebrow, eyebrowOnDark, fontDisplay, fontSans } from "@/components/landing/style";
import { plans } from "@/config/plans";
import { site } from "@/config/site";

export const metadata: Metadata = {
  // Absolute title (not the layout template) so the homepage leads with the
  // primary keywords: site monitoring tool / website change monitoring.
  title: {
    absolute: "MyKavo - Site Monitoring Tool for Website Change Detection",
  },
  description:
    "One of the best site monitoring tools for agencies and developers. MyKavo watches your websites for SEO, visual, link, script and performance changes - and alerts you before small problems become expensive ones.",
  keywords: [
    "site monitoring tools",
    "best site monitoring tools",
    "website monitoring tool",
    "website change detection",
    "website change monitoring",
    "monitor website changes",
    "website regression monitoring",
    "visual website monitoring",
    "SEO change monitoring",
    "broken link monitoring",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    title: "MyKavo - Site Monitoring Tool for Website Change Detection",
    description:
      "Know what changed on every website you manage. Visual, SEO, link, script, performance and uptime monitoring with severity-ranked alerts.",
    url: "/",
    type: "website",
  },
};

// Structured data for search engines AND AI answer engines (AI Overviews,
// ChatGPT, Perplexity): organization, website, the app with real prices, and
// the homepage FAQ. faqJsonLd is built below from the same `faqs` array the
// page renders, so the markup can never drift from the visible answers.
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${site.url}/#organization`,
      name: site.name,
      url: site.url,
      logo: `${site.url}/icon.png`,
      founder: { "@type": "Person", name: "Dakshesh B" },
    },
    {
      "@type": "WebSite",
      "@id": `${site.url}/#website`,
      name: site.name,
      url: site.url,
      publisher: { "@id": `${site.url}/#organization` },
    },
    {
      "@type": "SoftwareApplication",
      name: site.name,
      applicationCategory: "BusinessApplication",
      applicationSubCategory: "Website Monitoring Tool",
      operatingSystem: "Web",
      description: site.description,
      url: site.url,
      offers: [
        { "@type": "Offer", name: "Free", price: "0", priceCurrency: "USD" },
        {
          "@type": "Offer",
          name: "Pro",
          price: "20",
          priceCurrency: "USD",
          description: "8 websites with 15 monitored pages each, daily scans and alerts.",
        },
      ],
      featureList:
        "Website change detection, visual website monitoring, SEO change monitoring, broken link monitoring, script monitoring, performance regression monitoring, uptime and SSL monitoring, conversion element monitoring",
    },
  ],
};

/* ---------------------------------- data --------------------------------- */

const problems = [
  {
    time: "Mon 14:09",
    source: "deploy #212",
    text: "A deploy silently breaks the signup button - nobody notices for a week.",
  },
  {
    time: "Tue 03:41",
    source: "plugin update",
    text: "A plugin update flips key pages to noindex - rankings quietly fall.",
  },
  {
    time: "Wed 11:26",
    source: "site rebuild",
    text: "Google Analytics disappears during a rebuild - a month of data lost.",
  },
  {
    time: "Fri 17:58",
    source: "client edit",
    text: "A client edits the homepage - and blames your agency when it breaks.",
  },
];

const beforeAfter = [
  {
    label: "Finding out a page broke",
    before: "An angry client email, days later",
    after: "One grouped alert, minutes after the scan",
  },
  {
    label: "Re-checking pages after a deploy",
    before: "Hours of clicking through every page",
    after: "Automatic on every scheduled scan",
  },
  {
    label: "Proving what actually changed",
    before: "Guesswork and screenshots from memory",
    after: "Stored before-and-after evidence",
  },
];

const workflow = [
  {
    step: "01",
    title: "Add your websites",
    desc: "Point MyKavo at every site you manage. It discovers pages via sitemaps and internal links - you pick what matters.",
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
    desc: "Recurring scans compare every page against its approved baseline using deterministic checks - consistent and reproducible.",
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
  { icon: Store, title: "E-commerce", desc: "Checkout buttons, payment scripts, and product pages - watched on every scan." },
  { icon: Globe, title: "Website owners", desc: "Sleep well knowing someone is watching your most important pages every day." },
];

const freeTools = [
  {
    icon: GitCompareArrows,
    href: "/tools/website-change-detector",
    title: "Website Change Detector",
    word: "Compare",
    desc: "Snapshot a page's status, SEO tags, links, and scripts - then re-check later to see what changed.",
    featured: true,
  },
  {
    icon: Tags,
    href: "/tools/meta-tag-checker",
    title: "Meta Tag Checker",
    word: "Inspect",
    desc: "Grade a page's title, description, canonical, robots meta, Open Graph tags, and H1s.",
    featured: false,
  },
  {
    icon: Route,
    href: "/tools/redirect-chain-checker",
    title: "Redirect Chain Checker",
    word: "Trace",
    desc: "Trace every redirect hop with its status code, and catch loops and long chains.",
    featured: false,
  },
  {
    icon: ListChecks,
    href: "/tools/bulk-url-status-checker",
    title: "Bulk URL Status Checker",
    word: "Sweep",
    desc: "Check status codes and response times of up to 20 URLs in one go.",
    featured: false,
  },
  {
    icon: Braces,
    href: "/tools/script-detector",
    title: "Script Detector",
    word: "Reveal",
    desc: "List every external script on a page and identify the services behind them.",
    featured: false,
  },
];

const faqs = [
  {
    q: "How is MyKavo different from uptime monitoring?",
    a: "Uptime tools tell you if a page responds. MyKavo tells you what changed on it - visual layout, SEO tags, content, links, scripts, performance, and conversion elements - and whether that change matters. A page can be 'up' and still be silently broken.",
  },
  {
    q: "Will I get flooded with alerts for tiny changes?",
    a: "No. Low false-positive rates are a core design goal. MyKavo normalizes dynamic content, lets you ignore volatile selectors, groups related changes into one alert, and applies severity thresholds - so notifications stay meaningful.",
  },
  {
    q: "Does MyKavo use AI to detect changes?",
    a: "No. Detection is fully deterministic: previous value versus current value, normalized DOM hashes, and pixel comparison. Results are consistent, reproducible, and explainable.",
  },
  {
    q: "What is a baseline?",
    a: "A baseline is the approved known-good state of a page. Every scan compares against it. When you make an intentional change, you approve it and it becomes the new baseline - so MyKavo always knows the difference between expected and unexpected changes.",
  },
  {
    q: "How many websites can I monitor?",
    a: "The free plan monitors 1 website with 5 pages. Pro is $20/month with 8 websites and 15 monitored pages per website - ideal for freelancers and teams managing several sites.",
  },
  {
    q: "Is it safe to point MyKavo at my site?",
    a: "Yes. MyKavo only reads your public pages with strict limits on request counts, sizes, and frequency, respects robots.txt protections, and never stores credentials for your site.",
  },
];

/* ------------------------------- primitives ------------------------------ */

function Section({ id, children, className = "" }: { id?: string; children: React.ReactNode; className?: string }) {
  return (
    <section id={id} className={`mx-auto max-w-6xl px-5 py-20 lg:px-8 lg:py-28 ${className}`}>
      {children}
    </section>
  );
}

function DisplayHeading({
  children,
  onDark = false,
  className = "",
}: {
  children: React.ReactNode;
  onDark?: boolean;
  className?: string;
}) {
  return (
    <h2
      className={`${fontDisplay} text-center text-4xl leading-[1.06] sm:text-5xl lg:text-[52px] ${
        onDark ? "text-[#E9EBDF]" : "text-[#151515]"
      } ${className}`}
    >
      {children}
    </h2>
  );
}

/** The split CTA pair: gold primary + ink secondary sharing one crisp capsule. */
function SplitPill() {
  return (
    <div className="mx-auto mt-12 flex w-fit overflow-hidden rounded-full border border-[#151515] shadow-[4px_4px_0_#151515]">
      <Link
        href="/signup"
        className="bg-[#FFD400] px-6 py-3.5 text-sm font-semibold text-[#151515] transition-colors hover:bg-[#ffe14d]"
      >
        Start monitoring free
      </Link>
      <Link
        href="/preview"
        className="border-l border-[#151515] bg-[#151515] px-6 py-3.5 text-sm font-semibold text-[#F5F5F0] transition-colors hover:bg-[#2a2a2a]"
      >
        Explore the dashboard
      </Link>
    </div>
  );
}

/* ---------------------------------- page --------------------------------- */

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

export default function HomePage() {
  return (
    <div className={`${fontSans} bg-[#FBFAF3] text-[#151515] antialiased`}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <LandingNav />
      <StickyCta />

      <main>
        {/* Hero - badge, headline, URL input, browser-frame dashboard mock */}
        <LandingHero />

        {/* Gold ticker - everything a scan checks */}
        <SignalMarquee />

        {/* The problem - dark ink band with incident-log cards */}
        <section className="mt-16 border-y border-[#151515] bg-[#151515]">
          <div className="mx-auto max-w-6xl px-5 py-20 lg:px-8 lg:py-28">
            <p className={`${eyebrowOnDark} mb-4 text-center`}>{"// the problem //"}</p>
            <DisplayHeading onDark>
              Websites break <span className="text-[#FFD400]">silently.</span>
            </DisplayHeading>
            <p className="mx-auto mt-5 max-w-2xl text-center text-[15px] leading-7 text-[#9C9E93]">
              Nobody re-checks every page after every deploy, plugin update, or client edit. Small
              changes slip through - and turn into lost rankings, lost conversions, and awkward
              client calls.
            </p>

            <div className="mt-12 grid gap-4 sm:grid-cols-2">
              {problems.map((p) => (
                <div
                  key={p.text}
                  className="rounded-2xl border border-white/12 bg-white/[0.04] p-6 transition-colors hover:border-[#FFD400]/40"
                >
                  <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-[#9C9E93]">
                    <span className="text-[#FFD400]">✗</span> {p.time} · {p.source}
                  </p>
                  <p className="mt-3 text-[15px] font-medium leading-7 text-[#E9EBDF]">{p.text}</p>
                </div>
              ))}
            </div>

            <p className="mx-auto mt-12 max-w-2xl text-center text-lg leading-8 text-[#9C9E93]">
              MyKavo answers one question, continuously:{" "}
              <span className="font-semibold text-[#E9EBDF]">
                &ldquo;Did something important change or break on any website I manage?&rdquo;
              </span>
            </p>
          </div>
        </section>

        {/* What it watches - interactive category tabs */}
        <Section id="categories">
          <p className={`${eyebrow} mb-4 text-center`}>{"// what mykavo watches //"}</p>
          <DisplayHeading>
            Eight kinds of change.
            <br />
            <span className="text-[#6B6B60]">One monitoring layer.</span>
          </DisplayHeading>
          <p className="mx-auto mt-5 max-w-2xl text-center text-[15px] leading-7 text-[#6B6B60]">
            Every scan checks each monitored page across all eight categories and scores what it
            finds by severity - so you see what matters first. Pick a category to see a real
            example.
          </p>
          <CategoryTabs />
        </Section>

        {/* Before / after MyKavo - v7-style stat pairs */}
        <section className="border-y border-black/10 bg-[#F3F1E6]">
          <div className="mx-auto max-w-6xl px-5 py-20 lg:px-8 lg:py-28">
            <p className={`${eyebrow} mb-4 text-center`}>{"// before & after //"}</p>
            <DisplayHeading>
              Your week, <span className="text-[#6B6B60]">with and without it.</span>
            </DisplayHeading>
            <div className="mx-auto mt-14 max-w-4xl space-y-4">
              {beforeAfter.map((row) => (
                <div
                  key={row.label}
                  className="grid overflow-hidden rounded-2xl border border-[#151515] bg-white shadow-[5px_5px_0_#151515] md:grid-cols-[1.1fr_1fr_1fr]"
                >
                  <div className="flex items-center border-b border-black/10 p-6 md:border-b-0 md:border-r">
                    <p className={`${fontDisplay} text-[19px] leading-snug text-[#151515]`}>{row.label}</p>
                  </div>
                  <div className="border-b border-black/10 p-6 md:border-b-0 md:border-r">
                    <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.16em] text-[#6B6B60]">
                      Before
                    </p>
                    <p className="mt-2 text-[14.5px] leading-6 text-[#151515]/60 line-through decoration-[#151515]/30">
                      {row.before}
                    </p>
                  </div>
                  <div className="bg-[#FFF7CC] p-6">
                    <p className="font-mono text-[10.5px] font-bold uppercase tracking-[0.16em] text-[#151515]">
                      With MyKavo
                    </p>
                    <p className="mt-2 text-[14.5px] font-semibold leading-6 text-[#151515]">{row.after}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Evidence card - the before/after diff every change stores */}
            <div className="mx-auto mt-14 max-w-3xl overflow-hidden rounded-2xl border border-black/10 bg-white">
              <div className="grid divide-y divide-black/10 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
                <div className="p-7">
                  <p className={`${eyebrow} mb-4`}>Baseline · approved</p>
                  <dl className="space-y-3 font-mono text-[13px]">
                    {[
                      ["title", "Aurora Outdoor - Tents & Camping Gear"],
                      ["robots", "index, follow"],
                      ["status", "200 OK"],
                    ].map(([k, v]) => (
                      <div key={k}>
                        <dt className="text-[#6B6B60]">{k}</dt>
                        <dd className="mt-1 rounded-lg bg-[#F3F1E6] px-2.5 py-1.5 text-[#151515]">{v}</dd>
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
                        <dt className="text-[#6B6B60]">{k}</dt>
                        <dd
                          className={`mt-1 rounded-lg px-2.5 py-1.5 text-[#151515] ${
                            changed
                              ? "border border-[#151515]/20 bg-[#FFD400] font-semibold"
                              : "bg-[#F3F1E6]"
                          }`}
                        >
                          {v}
                          {changed ? " ⚠" : ""}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </div>
              <div className="border-t border-black/10 bg-[#151515] px-7 py-4 text-sm text-[#9C9E93]">
                <span className="font-semibold text-[#FFD400]">Critical:</span> page changed from
                index to noindex - MyKavo alerts you within one scan cycle.
              </div>
            </div>
          </div>
        </section>

        {/* How it works - numbered rail */}
        <Section id="how-it-works">
          <p className={`${eyebrow} mb-4 text-center`}>{"// how it works //"}</p>
          <DisplayHeading>
            Baseline. Monitor.
            <br />
            <span className="text-[#6B6B60]">Detect. Fix.</span>
          </DisplayHeading>

          <div className="relative mt-16 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
            {/* Connecting rail (desktop) */}
            <div aria-hidden className="absolute left-0 right-0 top-[22px] hidden border-t-2 border-dashed border-[#151515]/15 lg:block" />
            {workflow.map((w) => (
              <div key={w.step} className="relative">
                <span className="relative inline-flex items-center justify-center rounded-full border border-[#151515] bg-[#FFD400] px-4 py-2 font-mono text-[13px] font-bold text-[#151515] shadow-[3px_3px_0_#151515]">
                  {w.step}
                </span>
                <h3 className={`${fontDisplay} mt-5 text-[22px] leading-snug text-[#151515]`}>{w.title}</h3>
                <p className="mt-2.5 text-[14px] leading-6.5 text-[#6B6B60]">
                  {w.desc.split(w.keyword).map((part, i, arr) => (
                    <span key={i}>
                      {part}
                      {i < arr.length - 1 && (
                        <span className="font-semibold text-[#151515] underline decoration-[#FFD400] decoration-[3px] underline-offset-4">
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
        </Section>

        {/* Agencies - split with client health board */}
        <section className="border-y border-black/10 bg-white">
          <div className="mx-auto max-w-6xl px-5 py-20 lg:px-8 lg:py-28">
            <div className="grid items-center gap-12 lg:grid-cols-2">
              <div>
                <p className={`${eyebrow} mb-4`}>{"// for agencies //"}</p>
                <h2 className={`${fontDisplay} text-4xl leading-[1.06] text-[#151515] sm:text-5xl`}>
                  Every client website,
                  <br />
                  <span className="text-[#6B6B60]">one dashboard.</span>
                </h2>
                <p className="mt-5 max-w-md text-[15px] leading-7 text-[#6B6B60]">
                  Stop finding out about broken client sites from angry emails. MyKavo watches every
                  site you maintain and tells you which one needs attention - before the client
                  notices.
                </p>
                <ul className="mt-8 space-y-3.5">
                  {[
                    "Severity-ranked change feed across all clients",
                    "Before-and-after evidence for every change",
                    "Weekly client-ready report emails",
                    "Public status pages and uptime badges",
                  ].map((t) => (
                    <li key={t} className="flex items-start gap-3 text-[15px] text-[#151515]/90">
                      <CheckCircle2 className="mt-0.5 size-5 shrink-0 rounded-full bg-[#FFD400] p-0.5 text-[#151515]" aria-hidden />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border border-[#151515] bg-[#FBFAF3] p-5 shadow-[6px_6px_0_#FFD400,6px_6px_0_1px_#151515]">
                <div className="space-y-2.5">
                  {([
                    { site: "aurora-outdoor.com", state: "3 critical changes", tone: "gold" },
                    { site: "meridianlegal.co", state: "2 high changes", tone: "ink" },
                    { site: "bloomandroot.shop", state: "Healthy", tone: "quiet" },
                    { site: "northwinddental.com", state: "Healthy", tone: "quiet" },
                  ] as Array<{ site: string; state: string; tone: "gold" | "ink" | "quiet" }>).map((row) => (
                    <div
                      key={row.site}
                      className="flex items-center justify-between gap-3 rounded-xl border border-black/10 bg-white px-5 py-4"
                    >
                      <span className="min-w-0 truncate font-mono text-[13px] text-[#151515]/85">
                        {row.site}
                      </span>
                      <span
                        className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                          row.tone === "gold"
                            ? "border border-black/15 bg-[#FFD400] text-[#151515]"
                            : row.tone === "ink"
                              ? "bg-[#151515] text-[#F5F5F0]"
                              : "border border-black/15 bg-white text-[#151515]/70"
                        }`}
                      >
                        {row.state}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-center font-mono text-[10.5px] uppercase tracking-[0.16em] text-[#6B6B60]">
                  Illustrative dashboard state
                </p>
              </div>
            </div>

            {/* Use cases */}
            <div className="mt-20 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {useCases.map((u) => (
                <div
                  key={u.title}
                  className="group rounded-2xl border border-black/10 bg-[#FBFAF3] p-6 transition-all hover:-translate-y-0.5 hover:border-[#151515] hover:shadow-[4px_4px_0_#151515]"
                >
                  <span className="inline-flex size-9 items-center justify-center rounded-xl border border-black/15 bg-[#FFD400]">
                    <u.icon className="size-4.5 text-[#151515]" aria-hidden />
                  </span>
                  <h3 className="mt-3.5 text-[15px] font-semibold text-[#151515]">{u.title}</h3>
                  <p className="mt-1.5 text-sm leading-6 text-[#6B6B60]">{u.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Free tools */}
        <Section id="free-tools">
          <p className={`${eyebrow} mb-4 text-center`}>{"// free tools //"}</p>
          <DisplayHeading>
            Try the detection engine <span className="text-[#6B6B60]">free.</span>
          </DisplayHeading>
          <p className="mx-auto mt-5 max-w-2xl text-center text-[15px] leading-7 text-[#6B6B60]">
            Five free tools, no account needed. Every one is powered by the same engine that runs
            MyKavo&apos;s monitoring.
          </p>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {freeTools.map((tool) => (
              <Link
                key={tool.href}
                href={tool.href}
                className={`group flex flex-col overflow-hidden rounded-2xl border transition-all hover:-translate-y-1 ${
                  tool.featured
                    ? "border-[#151515] bg-[#FFD400] shadow-[5px_5px_0_#151515]"
                    : "border-black/10 bg-white hover:border-[#151515] hover:shadow-[5px_5px_0_#151515]"
                }`}
              >
                <div className="flex items-center justify-between p-5 pb-0">
                  <tool.icon className="size-6 text-[#151515]" aria-hidden />
                  <ArrowRight
                    className="size-5 text-[#151515]/50 transition-transform group-hover:translate-x-1"
                    aria-hidden
                  />
                </div>
                <p className={`${fontDisplay} px-5 pt-3 text-4xl text-[#151515]`}>{tool.word}</p>
                <div
                  className={`mt-4 flex flex-1 flex-col border-t p-5 ${
                    tool.featured ? "border-black/15 bg-[#151515]/[0.06]" : "border-black/10 bg-[#FBFAF3]"
                  }`}
                >
                  <h3 className="text-[15px] font-semibold text-[#151515]">{tool.title}</h3>
                  <p className="mt-1.5 text-[13px] leading-6 text-[#151515]/65">{tool.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </Section>

        {/* Pricing */}
        <section id="pricing" className="border-y border-black/10 bg-[#F3F1E6]">
          <div className="mx-auto max-w-6xl px-5 py-20 lg:px-8 lg:py-28">
            <p className={`${eyebrow} mb-4 text-center`}>{"// pricing //"}</p>
            <DisplayHeading>
              Simple plans that scale
              <br />
              <span className="text-[#6B6B60]">with your websites.</span>
            </DisplayHeading>
            <div className="mt-14">
              <ValueQuoteBanner />
            </div>
            <div className="mx-auto mt-14 grid max-w-3xl gap-6 sm:grid-cols-2">
              {plans.map((plan) => {
                const pro = plan.highlighted;
                return (
                  <div
                    key={plan.id}
                    className={`flex flex-col rounded-2xl border p-8 text-[#151515] ${
                      pro
                        ? "border-[#151515] bg-[#FFD400] shadow-[7px_7px_0_#151515]"
                        : "border-black/10 bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <h3 className={`${fontDisplay} text-3xl`}>{plan.name}</h3>
                      {pro && (
                        <span className="rounded-full bg-[#151515] px-3 py-1 text-xs font-semibold text-[#FFD400]">
                          Most popular
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-[#151515]/65">{plan.headline}</p>
                    <p className="mt-6">
                      <span className={`${fontDisplay} text-5xl`}>
                        <Price usd={plan.priceMonthlyUsd} />
                      </span>
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
                      className="mt-8 rounded-full border border-[#151515] bg-[#151515] px-6 py-3.5 text-center text-sm font-semibold text-[#F5F5F0] transition-colors hover:bg-[#2a2a2a]"
                    >
                      {pro ? "Start with Pro" : "Start free"}
                    </Link>
                  </div>
                );
              })}
            </div>
            <p className="mt-8 text-center text-sm text-[#6B6B60]">
              Full plan details on the{" "}
              <Link href="/pricing" className="font-semibold text-[#151515] underline decoration-[#FFD400] decoration-2 underline-offset-4">
                pricing page →
              </Link>
            </p>
          </div>
        </section>

        {/* FAQ */}
        <Section>
          <p className={`${eyebrow} mb-4 text-center`}>{"// faq //"}</p>
          <DisplayHeading>Questions, answered.</DisplayHeading>
          <div className="mx-auto mt-12 max-w-2xl space-y-3">
            {faqs.map((f) => (
              <details
                key={f.q}
                className="group rounded-2xl border border-black/10 bg-white px-6 py-5 transition-colors open:border-[#151515] open:pb-6 open:shadow-[4px_4px_0_#FFD400]"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-semibold text-[#151515] [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <span
                    className="text-xl leading-none text-[#6B6B60] transition-transform group-open:rotate-45"
                    aria-hidden
                  >
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-7 text-[#6B6B60]">{f.a}</p>
              </details>
            ))}
          </div>
        </Section>

        {/* Final CTA - the ink band with the gold spark */}
        <section className="px-5 pb-20 lg:px-8">
          <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[28px] border border-[#151515] bg-[#151515] px-6 py-20 text-center shadow-[10px_10px_0_#FFD400,10px_10px_0_1px_#151515] lg:py-28">
            <LogoMark
              size={380}
              className="pointer-events-none absolute -right-20 -top-16 rotate-12 text-[#FFD400] opacity-[0.08]"
            />
            <h2 className={`${fontDisplay} relative mx-auto max-w-3xl text-4xl leading-[1.05] text-[#E9EBDF] sm:text-6xl`}>
              Stop finding out about broken websites{" "}
              <span className="text-[#FFD400]">from your users.</span>
            </h2>
            <p className="relative mx-auto mt-6 max-w-xl text-[15px] leading-7 text-[#9C9E93]">
              Create a free account - monitor your first website in minutes. No credit card
              required.
            </p>
            <div className="relative mx-auto mt-10 flex w-fit overflow-hidden rounded-full border border-[#FFD400]/40">
              <Link
                href="/signup"
                className="bg-[#FFD400] px-6 py-3.5 text-sm font-semibold text-[#151515] transition-colors hover:bg-[#ffe14d]"
              >
                Start monitoring free
              </Link>
              <Link
                href="/preview"
                className="bg-white/[0.06] px-6 py-3.5 text-sm font-semibold text-[#E9EBDF] transition-colors hover:bg-white/[0.12]"
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
