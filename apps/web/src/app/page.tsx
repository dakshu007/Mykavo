import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Baseline,
  Bell,
  CheckCircle2,
  Code2,
  Eye,
  FileSearch,
  GitCompareArrows,
  Globe,
  Link2Off,
  MousePointerClick,
  Radar,
  Search,
  ShieldCheck,
  Store,
  Timer,
  Users,
  Wrench,
  Zap,
} from "lucide-react";
import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
import { HeroUrlInput } from "@/components/marketing/hero-url-input";
import { PlanCards } from "@/components/marketing/plan-cards";
import { DashboardPreview } from "@/components/preview/dashboard-preview";
import { ButtonLink } from "@/components/ui/button";
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

function SectionHeading({
  eyebrow,
  title,
  sub,
}: {
  eyebrow: string;
  title: string;
  sub?: string;
}) {
  return (
    <div className="mx-auto mb-12 max-w-2xl text-center">
      <p className="label-micro mb-3">{eyebrow}</p>
      <h2 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">{title}</h2>
      {sub && <p className="mt-4 text-[15px] leading-7 text-ink-secondary">{sub}</p>}
    </div>
  );
}

const categories = [
  { icon: Zap, name: "Availability", desc: "200 → 404, 500s, timeouts, unexpected redirects." },
  { icon: Eye, name: "Visual", desc: "Screenshot comparison with pixel-level diffs and masks." },
  { icon: Search, name: "SEO", desc: "Titles, meta descriptions, canonicals, robots, H1s, noindex." },
  { icon: FileSearch, name: "Content", desc: "Meaningful text and DOM changes, normalized to cut noise." },
  { icon: Link2Off, name: "Links", desc: "Internal links that break, vanish, or start redirecting." },
  { icon: Code2, name: "Scripts", desc: "Analytics, tag managers, or payment scripts added or removed." },
  { icon: Timer, name: "Performance", desc: "Page weight, request count, and response time regressions." },
  { icon: MousePointerClick, name: "Conversion", desc: "CTAs, forms, and checkout buttons that go missing or hide." },
];

const problems = [
  "A deploy silently breaks the signup button — nobody notices for a week.",
  "A plugin update flips key pages to noindex — rankings quietly fall.",
  "Google Analytics disappears during a rebuild — a month of data lost.",
  "A client edits the homepage — and blames your agency when it breaks.",
];

const workflow = [
  { step: "01", title: "Add your websites", desc: "Point Fluxen at every site you manage. It discovers pages via sitemaps and internal links — you pick what matters." },
  { step: "02", title: "Approve a baseline", desc: "Fluxen captures a full snapshot of each page: screenshots, SEO tags, links, scripts, performance. You approve it as the known-good state." },
  { step: "03", title: "Monitor automatically", desc: "Recurring scans compare every page against its approved baseline using deterministic checks — consistent and reproducible." },
  { step: "04", title: "Fix what matters", desc: "Get one grouped alert with severity levels and before-and-after views. Fix regressions, or approve expected changes as the new baseline." },
];

const useCases = [
  { icon: Users, title: "Agencies", desc: "Monitor every client website from one dashboard. Know about problems before the client calls." },
  { icon: Code2, title: "Developers", desc: "Catch regressions after deploys before users report them. Your post-deploy safety net." },
  { icon: Search, title: "SEO teams", desc: "Know the moment titles, canonicals, robots meta, or indexability signals change unexpectedly." },
  { icon: Wrench, title: "Maintenance businesses", desc: "Prove your maintenance value with monitoring history and clear change reports." },
  { icon: Store, title: "E-commerce", desc: "Checkout buttons, payment scripts, and product pages — watched on every scan." },
  { icon: Globe, title: "Website owners", desc: "Sleep well knowing someone is watching your most important pages every day." },
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
    a: "The free plan monitors 1 website with 5 pages. Paid plans scale from 5 websites ($12/mo) to 100 websites and 2,500 pages ($79/mo) for agencies.",
  },
  {
    q: "Is it safe to point Fluxen at my site?",
    a: "Yes. Fluxen only reads your public pages with strict limits on request counts, sizes, and frequency, respects robots.txt protections, and never stores credentials for your site.",
  },
];

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <MarketingNav />
      <main>
        {/* 2. Hero */}
        <section className="mx-auto max-w-300 px-5 pb-10 pt-20 text-center lg:px-8">
          <p className="label-micro mb-5">Website change &amp; regression monitoring</p>
          <h1 className="mx-auto max-w-3xl text-5xl font-semibold leading-[1.05] tracking-tight text-ink sm:text-6xl">
            Know What Changed.
            <br />
            <span className="text-primary">Fix What Matters.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-[17px] leading-8 text-ink-secondary">
            {site.description}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <ButtonLink href="/signup" size="lg">
              Start Monitoring Free
            </ButtonLink>
            <ButtonLink href="/#how-it-works" size="lg" variant="secondary">
              See How Fluxen Works
            </ButtonLink>
          </div>

          {/* 3. Interactive URL input */}
          <div className="mt-12">
            <HeroUrlInput />
            <p className="mt-3 text-[13px] text-ink-faint">
              Free instant inspection — status, SEO tags, links &amp; scripts. No signup needed.
            </p>
          </div>
        </section>

        {/* 4. Dashboard preview */}
        <section className="mx-auto max-w-300 px-5 pb-8 lg:px-8">
          <DashboardPreview />
        </section>

        {/* 5. Trust indicators — honest, factual */}
        <section className="mx-auto max-w-300 px-5 py-10 lg:px-8">
          <ul className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-sm font-medium text-ink-secondary">
            <li className="flex items-center gap-2">
              <GitCompareArrows className="size-4.5 text-primary" aria-hidden />
              Deterministic detection — reproducible results
            </li>
            <li className="flex items-center gap-2">
              <Baseline className="size-4.5 text-primary" aria-hidden />
              Approved baselines, versioned history
            </li>
            <li className="flex items-center gap-2">
              <Bell className="size-4.5 text-primary" aria-hidden />
              Grouped alerts, tuned for low noise
            </li>
            <li className="flex items-center gap-2">
              <ShieldCheck className="size-4.5 text-primary" aria-hidden />
              Read-only, robots.txt-respecting scans
            </li>
          </ul>
        </section>

        {/* 6. Core problem */}
        <section className="bg-surface py-24">
          <div className="mx-auto max-w-300 px-5 lg:px-8">
            <SectionHeading
              eyebrow="The problem"
              title="Websites break silently"
              sub="Nobody re-checks every page after every deploy, plugin update, or client edit. Small changes slip through — and turn into lost rankings, lost conversions, and awkward client calls."
            />
            <div className="grid gap-5 md:grid-cols-2">
              {problems.map((p) => (
                <div
                  key={p}
                  className="flex items-start gap-4 rounded-card bg-card p-6 shadow-card"
                >
                  <span className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-critical-soft">
                    <AlertTriangle className="size-4.5 text-critical" aria-hidden />
                  </span>
                  <p className="text-[15px] leading-7 text-ink">{p}</p>
                </div>
              ))}
            </div>
            <p className="mx-auto mt-10 max-w-xl text-center text-[15px] leading-7 text-ink-secondary">
              Fluxen answers one question, continuously:{" "}
              <span className="font-semibold text-ink">
                &ldquo;Did something important change or break on any website I manage?&rdquo;
              </span>
            </p>
          </div>
        </section>

        {/* 7. Change categories */}
        <section className="py-24" id="categories">
          <div className="mx-auto max-w-300 px-5 lg:px-8">
            <SectionHeading
              eyebrow="What Fluxen watches"
              title="Eight kinds of change, one monitoring layer"
              sub="Every scan checks each monitored page across all eight categories and scores what it finds by severity."
            />
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {categories.map((c) => (
                <div key={c.name} className="rounded-card bg-card p-6 shadow-card">
                  <span className="inline-flex size-11 items-center justify-center rounded-xl bg-primary-soft">
                    <c.icon className="size-5 text-primary" aria-hidden />
                  </span>
                  <h3 className="mt-4 text-[15px] font-semibold text-ink">{c.name}</h3>
                  <p className="mt-1.5 text-sm leading-6 text-ink-secondary">{c.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 8. Before-and-after comparison */}
        <section className="bg-surface py-24">
          <div className="mx-auto max-w-300 px-5 lg:px-8">
            <SectionHeading
              eyebrow="Before and after"
              title="See exactly what changed"
              sub="Every change event stores the previous state and the current state — values, screenshots, and diffs — so you never have to guess what happened."
            />
            <div className="mx-auto max-w-3xl overflow-hidden rounded-card bg-card shadow-card">
              <div className="grid divide-y divide-line sm:grid-cols-2 sm:divide-x sm:divide-y-0">
                <div className="p-7">
                  <p className="label-micro mb-4">Baseline · approved</p>
                  <dl className="space-y-3 font-mono text-[13px]">
                    <div>
                      <dt className="text-ink-faint">title</dt>
                      <dd className="mt-0.5 rounded-md bg-success-soft px-2 py-1 text-green-800">
                        Aurora Outdoor — Tents &amp; Camping Gear
                      </dd>
                    </div>
                    <div>
                      <dt className="text-ink-faint">robots</dt>
                      <dd className="mt-0.5 rounded-md bg-success-soft px-2 py-1 text-green-800">
                        index, follow
                      </dd>
                    </div>
                    <div>
                      <dt className="text-ink-faint">status</dt>
                      <dd className="mt-0.5 rounded-md bg-success-soft px-2 py-1 text-green-800">
                        200 OK
                      </dd>
                    </div>
                  </dl>
                </div>
                <div className="p-7">
                  <p className="label-micro mb-4">Current scan · today</p>
                  <dl className="space-y-3 font-mono text-[13px]">
                    <div>
                      <dt className="text-ink-faint">title</dt>
                      <dd className="mt-0.5 rounded-md bg-critical-soft px-2 py-1 text-red-700">
                        Home
                      </dd>
                    </div>
                    <div>
                      <dt className="text-ink-faint">robots</dt>
                      <dd className="mt-0.5 rounded-md bg-critical-soft px-2 py-1 text-red-700">
                        noindex, nofollow
                      </dd>
                    </div>
                    <div>
                      <dt className="text-ink-faint">status</dt>
                      <dd className="mt-0.5 rounded-md bg-success-soft px-2 py-1 text-green-800">
                        200 OK
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
              <div className="border-t border-line bg-surface px-7 py-4 text-sm text-ink-secondary">
                <span className="font-semibold text-red-700">Critical:</span> page changed from
                index to noindex — Fluxen alerts you within one scan cycle.
              </div>
            </div>
          </div>
        </section>

        {/* 9. Agency workflow */}
        <section className="py-24">
          <div className="mx-auto grid max-w-300 items-center gap-12 px-5 lg:grid-cols-2 lg:px-8">
            <div>
              <p className="label-micro mb-3">For agencies</p>
              <h2 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
                Every client website, one dashboard
              </h2>
              <p className="mt-4 text-[15px] leading-7 text-ink-secondary">
                Stop finding out about broken client sites from angry emails. Fluxen watches every
                site you maintain and tells you which one needs attention — before the client
                notices.
              </p>
              <ul className="mt-7 space-y-3.5">
                {[
                  "Monitor up to 100 client websites on one plan",
                  "Severity-ranked change feed across all clients",
                  "Before-and-after evidence for every change",
                  "Prove the value of your maintenance retainer",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-3 text-[15px] text-ink">
                    <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" aria-hidden />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-card bg-surface p-6">
              <div className="space-y-3">
                {[
                  { site: "aurora-outdoor.com", state: "3 critical changes", tone: "text-red-700 bg-critical-soft" },
                  { site: "meridianlegal.co", state: "2 high changes", tone: "text-orange-700 bg-orange-soft" },
                  { site: "bloomandroot.shop", state: "Healthy", tone: "text-green-700 bg-success-soft" },
                  { site: "northwinddental.com", state: "Healthy", tone: "text-green-700 bg-success-soft" },
                ].map((row) => (
                  <div
                    key={row.site}
                    className="flex items-center justify-between rounded-tile bg-card px-5 py-4 shadow-card"
                  >
                    <div className="flex items-center gap-3">
                      <span className="inline-flex size-9 items-center justify-center rounded-xl bg-surface">
                        <Radar className="size-4.5 text-ink-secondary" aria-hidden />
                      </span>
                      <span className="font-mono text-[13px] text-ink">{row.site}</span>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${row.tone}`}>
                      {row.state}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 10. How Fluxen works */}
        <section className="bg-surface py-24" id="how-it-works">
          <div className="mx-auto max-w-300 px-5 lg:px-8">
            <SectionHeading
              eyebrow="How it works"
              title="Baseline. Monitor. Detect. Fix."
              sub="A simple loop that keeps every website in a known-good state."
            />
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {workflow.map((w) => (
                <div key={w.step} className="rounded-card bg-card p-6 shadow-card">
                  <p className="font-mono text-sm font-semibold text-primary">{w.step}</p>
                  <h3 className="mt-3 text-[15px] font-semibold text-ink">{w.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-ink-secondary">{w.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 11. Use cases */}
        <section className="py-24" id="use-cases">
          <div className="mx-auto max-w-300 px-5 lg:px-8">
            <SectionHeading
              eyebrow="Who it's for"
              title="Built for people who keep websites working"
            />
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {useCases.map((u) => (
                <div key={u.title} className="rounded-card bg-card p-6 shadow-card">
                  <span className="inline-flex size-11 items-center justify-center rounded-xl bg-primary-soft">
                    <u.icon className="size-5 text-primary" aria-hidden />
                  </span>
                  <h3 className="mt-4 text-[15px] font-semibold text-ink">{u.title}</h3>
                  <p className="mt-1.5 text-sm leading-6 text-ink-secondary">{u.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 12. Free tools */}
        <section className="bg-surface py-24">
          <div className="mx-auto max-w-300 px-5 lg:px-8">
            <SectionHeading
              eyebrow="Free tools"
              title="Try Fluxen's detection engine free"
              sub="No account needed. More free tools are on the way."
            />
            <div className="mx-auto max-w-2xl">
              <Link
                href="/tools/website-change-detector"
                className="group flex items-center justify-between gap-4 rounded-card bg-card p-7 shadow-card transition-shadow hover:shadow-float"
              >
                <div className="flex items-start gap-4">
                  <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary-soft">
                    <GitCompareArrows className="size-6 text-primary" aria-hidden />
                  </span>
                  <div>
                    <h3 className="text-[17px] font-semibold text-ink">
                      Website Change Detector
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-ink-secondary">
                      Snapshot any page&apos;s status, SEO tags, links, and scripts. Compare two
                      URLs side-by-side, or save a snapshot and re-check it later to see exactly
                      what changed.
                    </p>
                  </div>
                </div>
                <ArrowRight
                  className="size-5 shrink-0 text-ink-faint transition-transform group-hover:translate-x-1"
                  aria-hidden
                />
              </Link>
            </div>
          </div>
        </section>

        {/* 13. Pricing */}
        <section className="py-24" id="pricing">
          <div className="mx-auto max-w-300 px-5 lg:px-8">
            <SectionHeading
              eyebrow="Pricing"
              title="Simple plans that scale with your websites"
              sub="Start free. Upgrade when you need more websites, more pages, or daily scans."
            />
            <PlanCards compact />
            <p className="mt-8 text-center text-sm text-ink-secondary">
              Full plan details on the{" "}
              <Link href="/pricing" className="font-medium text-primary hover:underline">
                pricing page →
              </Link>
            </p>
          </div>
        </section>

        {/* 14. FAQ */}
        <section className="bg-surface py-24">
          <div className="mx-auto max-w-300 px-5 lg:px-8">
            <SectionHeading eyebrow="FAQ" title="Questions, answered" />
            <div className="mx-auto max-w-2xl space-y-3">
              {faqs.map((f) => (
                <details
                  key={f.q}
                  className="group rounded-card bg-card px-6 py-5 shadow-card open:pb-6"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-semibold text-ink [&::-webkit-details-marker]:hidden">
                    {f.q}
                    <span className="text-ink-faint transition-transform group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="mt-3 text-sm leading-7 text-ink-secondary">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* 15. Final CTA */}
        <section className="py-24" id="waitlist">
          <div className="mx-auto max-w-300 px-5 lg:px-8">
            <div className="rounded-card bg-ink px-6 py-16 text-center sm:px-12">
              <h2 className="mx-auto max-w-2xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Stop finding out about broken websites from your users
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-[15px] leading-7 text-white/70">
                Create a free account — monitor your first website in minutes. No credit card
                required.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <ButtonLink
                  href="/signup"
                  size="lg"
                  className="bg-white text-ink hover:bg-white/90"
                >
                  Start Monitoring Free
                </ButtonLink>
                <ButtonLink
                  href="/preview"
                  size="lg"
                  variant="ghost"
                  className="text-white/80 hover:bg-white/10 hover:text-white"
                >
                  Explore the dashboard
                </ButtonLink>
              </div>
            </div>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </>
  );
}
