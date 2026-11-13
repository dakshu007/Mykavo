import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  FileCode2,
  FileText,
  Globe,
  Link2,
  ListChecks,
  Lock,
  PenLine,
  RefreshCw,
  ScanSearch,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import { AGENT_LIMITS, FREE_REGENERATIONS_PER_POST } from "@mykavo/keyword-agent/pure";
import { withSocial } from "@/lib/social-metadata";
import { GoogleButton } from "@/components/landing/google-cta";
import { LandingFooter } from "@/components/landing/footer";
import { LandingNav } from "@/components/landing/nav";
import { BlogWriterAnimation } from "@/components/landing/blog-writer-animation";
import { eyebrow, eyebrowOnDark, fontDisplay, fontSans } from "@/components/landing/style";
import { plans } from "@/config/plans";
import { site } from "@/config/site";
import {
  ORGANIZATION_ID,
  breadcrumbList,
  faqPage,
  jsonLdScript,
  organizationNode,
} from "@/lib/seo/structured-data";

const PATH = "/ai-blog-writer";
const FREE = AGENT_LIMITS.free;
const PRO = AGENT_LIMITS.pro;

export const metadata: Metadata = withSocial({
  title: "AI Keyword Research & Blog Writer - Know What to Write Next",
  description: `MyKavo's AI Keywords & Blog Writer finds the searches your website can win, from your own Google Search Console data, Google suggestions and today's results, then writes the full SEO blog post in one click. Free plan: ${FREE.reports} keyword report and ${FREE.posts} post a month.`,
  keywords: [
    "ai blog writer",
    "ai keyword research",
    "ai seo writer",
    "seo blog post generator",
    "striking distance keywords",
    "search console keyword ideas",
    "ai content writer for websites",
  ],
  alternates: { canonical: PATH },
  openGraph: {
    title: "MyKavo AI Keywords & Blog Writer - know what to write next",
    description:
      "Find the searches you can win from your own Search Console data, then get the full SEO post written in one click.",
    url: PATH,
  },
});

const numbers = [
  { value: "3", label: "keyword sources: your Search Console, Google suggestions, today's results" },
  { value: "8-20", label: "the positions MyKavo looks for: on page two, close to page one" },
  { value: "1", label: "click from a keyword to a full SEO post, ready to edit" },
  { value: "0", label: "posts published without you: it stays a draft until you copy it" },
];

const steps = [
  {
    icon: ScanSearch,
    title: "It learns your business",
    desc: "MyKavo reads your website and fills in a short profile: what you do, who you serve, your services, your market and language. You check it and confirm.",
  },
  {
    icon: Target,
    title: "It finds what to write",
    desc: "Google's own search suggestions and today's live results, ranked by what to write first for your business. With Search Console, also the searches you already rank 8 to 20 for.",
  },
  {
    icon: PenLine,
    title: "It writes the post",
    desc: `One click writes the whole post for that keyword. Edit it in MyKavo, and every post includes ${FREE_REGENERATIONS_PER_POST} free rewrite.`,
  },
  {
    icon: FileText,
    title: "You publish it",
    desc: "Copy the finished post into WordPress, Shopify, Webflow or any site. MyKavo never publishes to your site on its own.",
  },
];

const sources = [
  {
    icon: TrendingUp,
    title: "Your Search Console",
    desc: "The searches Google already shows you for. The ones where you sit on page two, ranking 8 to 20, are often the quickest wins: improve the page that ranks, or add a focused post.",
    note: "Already ranking · optional",
  },
  {
    icon: Search,
    title: "Google suggestions",
    desc: "What people type after your topic, straight from Google's search suggestions. Real phrasing, not invented keyword lists.",
    note: "Keyword report",
  },
  {
    icon: Globe,
    title: "Today's results",
    desc: "MyKavo checks who ranks on page one right now, so it can favour searches where the competition looks weak: forums, thin or outdated pages.",
    note: "Keyword report",
  },
];

const anatomy = [
  { icon: FileText, label: "Title and URL slug", desc: "Written for the keyword and the click." },
  { icon: Search, label: "Meta description", desc: "The line under your result in Google." },
  { icon: PenLine, label: "The article", desc: "Headings, sections and a clear answer up top." },
  { icon: ListChecks, label: "FAQ section", desc: "The questions people ask next, answered." },
  { icon: FileCode2, label: "JSON-LD schema", desc: "Structured data, ready to paste in." },
  { icon: ShieldCheck, label: "Review notes", desc: "What to check or add before you publish." },
  { icon: Link2, label: "Internal links", desc: "Only to pages that really exist on your site." },
  { icon: RefreshCw, label: "A free rewrite", desc: `${FREE_REGENERATIONS_PER_POST} per post, if the first take misses.` },
];

const faqs = [
  {
    q: "What is the AI Keywords & Blog Writer?",
    a: "It is the part of MyKavo that helps your website win new search traffic. MyKavo reads your site and learns your business, finds the keywords worth writing about from your own Google Search Console data, Google's search suggestions and today's results, ranks them by what to write first, and writes a full SEO blog post for the one you choose: title, URL slug, meta description, the article, an FAQ section, JSON-LD structured data and review notes.",
  },
  {
    q: "How is it different from a generic AI writer?",
    a: "A generic writer starts from a blank prompt. MyKavo starts from your website and your own search data. It knows what you sell and who you sell to, its keyword report checks who ranks today, and with Search Console it sees the searches Google already shows you for. You can add your own experience or examples before it writes, and its links only point to pages that exist on your site. So you get a post for a keyword your site can realistically win, written for your business.",
  },
  {
    q: "Do I need Google Search Console?",
    a: "No. Without it, MyKavo still finds keywords from Google's search suggestions and today's results. With it connected, it also finds your striking distance searches: queries where you already rank 8 to 20, which are often the quickest wins.",
  },
  {
    q: "Does MyKavo publish posts to my website?",
    a: "No. Every post stays a draft in MyKavo until you copy it into your site. You review it, edit it in MyKavo, then publish it in WordPress, Shopify, Webflow or whatever your site runs on.",
  },
  {
    q: "Is it included in the free plan?",
    a: `Yes. Free includes ${FREE.reports} keyword report and ${FREE.posts} blog post a month, with the top ${FREE.visibleOpportunities} keywords shown. Starter includes ${AGENT_LIMITS.starter.reports} reports and ${AGENT_LIMITS.starter.posts} posts, Pro ${PRO.reports} and ${PRO.posts}, Agency ${AGENT_LIMITS.agency.reports} and ${AGENT_LIMITS.agency.posts}. Paid plans see every keyword. Allowances refill monthly: paid plans on the billing date, Free on the date you signed up.`,
  },
  {
    q: "Will these posts rank?",
    a: "Nobody can promise a ranking, and MyKavo does not. What it does is pick keywords your site has a realistic chance at, based on your own data and today's results, and write a complete, structured post for them. Your edits, your expertise and your site's authority still matter.",
  },
  {
    q: "What data does the AI see?",
    a: "Your website's public pages, the business profile you confirm and, if you connect it, your Search Console queries for that site. Requests go to Anthropic's Claude API, which does not train its models on this data.",
  },
  {
    q: "How does this fit with website monitoring?",
    a: "They are two halves of the same job. Monitoring protects the traffic you have: it alerts you when a title, canonical, noindex, script or layout changes. AI Keywords helps you win more: it finds what to write and writes it. Both live in one MyKavo dashboard, on every plan.",
  },
];

/** A Search Console style table: the searches already on page two. */
function StrikingDistanceMock() {
  const rows = [
    { q: "sourdough starter for beginners", pos: 11.4, imp: "2,140" },
    { q: "how long to proof bread dough", pos: 14.2, imp: "1,380" },
    { q: "sourdough discard recipes", pos: 17.8, imp: "960" },
    { q: "why is my sourdough dense", pos: 19.1, imp: "720" },
  ];
  return (
    <div className="overflow-hidden rounded-2xl border-2 border-[#151515] bg-white shadow-[8px_8px_0_#FFD400,8px_8px_0_1px_#151515]">
      <div className="flex items-center gap-2 border-b border-black/10 bg-[#FBFAF3] px-5 py-3">
        <span className="inline-flex size-7 items-center justify-center rounded-lg bg-[#FFD400]">
          <TrendingUp className="size-4" aria-hidden />
        </span>
        <span className="text-[14px] font-semibold">Already ranking</span>
        <span className="ml-auto rounded-full bg-[#FFF6CC] px-2.5 py-0.5 text-[12px] font-bold text-[#7A5C00]">Positions 8 to 20</span>
      </div>
      <table className="w-full border-collapse text-left text-[13.5px]">
        <thead>
          <tr className="border-b border-black/10 font-mono text-[10px] uppercase tracking-[0.14em] text-[#6B6B60]">
            <th scope="col" className="px-5 py-2.5 font-semibold">Search</th>
            <th scope="col" className="px-3 py-2.5 text-right font-semibold">Position</th>
            <th scope="col" className="hidden px-5 py-2.5 text-right font-semibold sm:table-cell">Impressions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.q} className={`border-b border-black/5 last:border-b-0 ${i === 0 ? "bg-[#FFD400]/15" : ""}`}>
              <td className="px-5 py-3 font-medium">{r.q}</td>
              <td className="px-3 py-3 text-right font-mono tabular-nums">{r.pos.toFixed(1)}</td>
              <td className="hidden px-5 py-3 text-right font-mono tabular-nums text-[#6B6B60] sm:table-cell">{r.imp}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex items-center gap-2 border-t border-black/10 bg-[#FBFAF3] px-5 py-3 text-[13px]">
        <Sparkles className="size-4 shrink-0" aria-hidden />
        <span>
          <strong>On page two, one post from page one.</strong> <span className="text-[#6B6B60]">Write post</span>
        </span>
      </div>
    </div>
  );
}

/** What one written post contains, as the editor shows it. */
function PostMock() {
  return (
    <div className="overflow-hidden rounded-2xl border-2 border-[#151515] bg-white shadow-[8px_8px_0_#151515]">
      <div className="flex items-center gap-2 border-b border-black/10 bg-[#FBFAF3] px-5 py-3">
        <span className="inline-flex size-7 items-center justify-center rounded-lg bg-[#FFD400]">
          <PenLine className="size-4" aria-hidden />
        </span>
        <span className="text-[14px] font-semibold">Your post</span>
        <span className="ml-auto rounded-full bg-[#E5F6EC] px-2.5 py-0.5 text-[12px] font-bold text-[#166534]">Draft ready</span>
      </div>
      <div className="space-y-3 p-5">
        <p className="font-mono text-[11px] text-[#166534]">/blog/sourdough-starter-for-beginners</p>
        <p className="text-[19px] font-semibold leading-7">Sourdough Starter for Beginners: A 7-Day Guide</p>
        <p className="text-[13.5px] leading-6 text-[#6B6B60]">
          Make a starter at home in 7 days: what to feed it, how to tell it&apos;s ready and what to avoid.
        </p>
        <div className="space-y-2 border-t border-black/10 pt-3">
          <p className="text-[14px] font-semibold">What you need to start</p>
          <div className="h-2 w-full rounded-full bg-black/[0.07]" />
          <div className="h-2 w-11/12 rounded-full bg-black/[0.07]" />
          <p className="pt-1 text-[14px] font-semibold">Day 1 to day 3: the first feeds</p>
          <div className="h-2 w-full rounded-full bg-black/[0.07]" />
          <div className="h-2 w-3/4 rounded-full bg-black/[0.07]" />
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          {["FAQ · 5 questions", "JSON-LD schema", "3 review notes"].map((c, i) => (
            <span
              key={c}
              className={`rounded-lg border-[1.5px] border-[#151515] px-2.5 py-1 text-[12px] font-bold ${i === 1 ? "bg-[#FFD400]" : "bg-white"}`}
            >
              {c}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AiBlogWriterPage() {
  const pageJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      organizationNode(),
      {
        "@type": "WebPage",
        "@id": `${site.url}${PATH}#page`,
        url: `${site.url}${PATH}`,
        name: "MyKavo AI Keywords & Blog Writer",
        description: metadata.description,
        about: {
          "@type": "SoftwareApplication",
          name: "MyKavo AI Keywords & Blog Writer",
          applicationCategory: "BusinessApplication",
          operatingSystem: "Web",
          publisher: { "@id": ORGANIZATION_ID },
          featureList: [
            "Keyword ideas from your own Google Search Console data",
            "Striking distance searches: queries ranking 8 to 20",
            "Google search suggestions and today's live results",
            "Keywords ranked by what to write first",
            "One-click SEO blog posts with title, slug, meta description, FAQ and JSON-LD",
            "Website change monitoring in the same dashboard",
          ],
          offers: plans.map((plan) => ({
            "@type": "Offer",
            name: plan.name,
            price: String(plan.priceMonthlyUsd),
            priceCurrency: "USD",
            url: `${site.url}/pricing`,
          })),
        },
      },
    ],
  };

  return (
    <div className={`${fontSans} min-h-svh bg-[#FBFAF3] text-[#151515] antialiased`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(pageJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(faqPage(faqs)) }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(breadcrumbList([{ name: "AI Keywords & Blog Writer", path: PATH }])) }}
      />
      <LandingNav />

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden px-5 pb-16 pt-32 sm:pt-36 lg:px-8">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 [background-image:radial-gradient(circle,#15151514_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,black,transparent)]"
          />
          <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
            <div>
              <p className={`${eyebrow} mb-4 flex items-center gap-2`}>
                <span className="rounded-full bg-[#151515] px-2 py-0.5 text-[10px] tracking-[0.14em] text-[#FFD400]">New</span>
                {"// ai keywords & blog writer //"}
              </p>
              <h1 className={`${fontDisplay} text-[2.4rem] leading-[1.04] min-[360px]:text-5xl sm:text-6xl`}>
                Know what to write next.
                <br />
                <span className="relative inline-block">
                  <span aria-hidden className="absolute inset-x-[-4px] bottom-[6%] top-[14%] -rotate-1 rounded-md bg-[#FFD400]" />
                  <span className="relative">Then get it written.</span>
                </span>
              </h1>
              <p className="mt-6 max-w-xl text-[16px] leading-7 text-[#6B6B60]">
                MyKavo reads your website, finds the searches you can win from{" "}
                <strong className="text-[#151515]">your own Search Console data, Google&apos;s suggestions and today&apos;s results</strong>,
                and writes the full SEO post in one click. Title, meta description, article, FAQ and schema, ready to edit.
              </p>
              <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                <GoogleButton />
                <Link href="/signup" className="text-[13px] text-[#6B6B60] underline underline-offset-4 hover:text-[#151515]">
                  or sign up with email
                </Link>
              </div>
              <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.14em] text-[#6B6B60]">
                Free plan · {FREE.reports} keyword report + {FREE.posts} blog post a month · No card
              </p>
            </div>
            <div className="rounded-3xl border border-black/10 bg-[#F3F1E6] p-3 sm:p-5">
              <BlogWriterAnimation />
              <p className="mt-2 text-center font-mono text-[10.5px] uppercase tracking-[0.16em] text-[#6B6B60]">
                Illustrative example website and post
              </p>
            </div>
          </div>
        </section>

        {/* Numbers band */}
        <section className="border-y border-[#151515] bg-[#151515]">
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-3 px-5 py-14 sm:gap-4 lg:grid-cols-4 lg:px-8">
            {numbers.map((z) => (
              <div key={z.label} className="rounded-2xl border border-white/12 bg-white/[0.04] p-4 sm:p-6">
                <p className={`${fontDisplay} text-4xl text-[#FFD400] sm:text-5xl`}>{z.value}</p>
                <p className="mt-2 text-[13px] leading-5 text-[#E9EBDF] sm:text-[14px] sm:leading-6">{z.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Feature 1: striking distance */}
        <section className="mx-auto max-w-6xl px-5 py-20 lg:px-8 lg:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <p className={`${eyebrow} mb-4`}>{"// striking distance //"}</p>
              <h2 className={`${fontDisplay} text-4xl leading-[1.06] sm:text-5xl`}>
                The searches you almost win.
              </h2>
              <p className="mt-5 max-w-md text-[15px] leading-7 text-[#6B6B60]">
                Your Search Console is full of searches where Google already shows you, just not on page one. Positions 8
                to 20 get seen but rarely clicked. MyKavo finds them, estimates the extra clicks a better position could bring, and tells you whether to improve the page or write a new post.
              </p>
              <ul className="mt-7 space-y-3">
                {[
                  "Read straight from your own Search Console",
                  "Only searches your site already ranks 8 to 20 for",
                  "Matched to the page that ranks today",
                  "A next step for each: improve that page, or write a post",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-3 text-[15px]">
                    <CheckCircle2 className="mt-0.5 size-5 shrink-0 rounded-full bg-[#FFD400] p-0.5" aria-hidden />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <StrikingDistanceMock />
              <p className="mt-4 text-center font-mono text-[10.5px] uppercase tracking-[0.16em] text-[#6B6B60]">
                Illustrative Search Console data
              </p>
            </div>
          </div>
        </section>

        {/* Sources */}
        <section className="border-y border-black/10 bg-[#F3F1E6]">
          <div className="mx-auto max-w-6xl px-5 py-20 lg:px-8 lg:py-24">
            <p className={`${eyebrow} mb-4 text-center`}>{"// where keywords come from //"}</p>
            <h2 className={`${fontDisplay} mx-auto max-w-3xl text-center text-4xl leading-[1.06] sm:text-5xl`}>
              Real search data. Not a guess.
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-center text-[15px] leading-7 text-[#6B6B60]">
              Your keyword report combines Google&apos;s suggestions with a look at today&apos;s results, ranked by how well each search
              matches what you sell and how weak the competition is. Search Console adds the searches you already rank for.
            </p>
            <div className="mt-12 grid gap-4 md:grid-cols-3">
              {sources.map((s) => (
                <div key={s.title} className="flex flex-col rounded-2xl border-2 border-[#151515] bg-white p-6 shadow-[6px_6px_0_#151515]">
                  <s.icon className="size-10 rounded-xl border border-[#151515] bg-[#FFD400] p-2" aria-hidden />
                  <h3 className="mt-5 text-[18px] font-semibold">{s.title}</h3>
                  <p className="mt-2 flex-1 text-[14px] leading-6 text-[#6B6B60]">{s.desc}</p>
                  <p className="mt-5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[#151515]">{s.note}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Feature 2: what one post contains */}
        <section className="mx-auto max-w-6xl px-5 py-20 lg:px-8 lg:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div className="order-2 lg:order-1">
              <PostMock />
              <p className="mt-4 text-center font-mono text-[10.5px] uppercase tracking-[0.16em] text-[#6B6B60]">
                Illustrative post
              </p>
            </div>
            <div className="order-1 lg:order-2">
              <p className={`${eyebrow} mb-4`}>{"// one click, one full post //"}</p>
              <h2 className={`${fontDisplay} text-4xl leading-[1.06] sm:text-5xl`}>Everything the post needs.</h2>
              <p className="mt-5 max-w-md text-[15px] leading-7 text-[#6B6B60]">
                Not a paragraph to expand. A complete post written for your business and your keyword, with the SEO parts
                most writers forget. Edit any of it in MyKavo before you copy it out.
              </p>
              <dl className="mt-8 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                {anatomy.map((a) => (
                  <div key={a.label} className="flex items-start gap-3">
                    <a.icon className="mt-0.5 size-8 shrink-0 rounded-lg border border-[#151515] bg-white p-1.5" aria-hidden />
                    <div>
                      <dt className="text-[14.5px] font-semibold">{a.label}</dt>
                      <dd className="text-[13.5px] leading-5 text-[#6B6B60]">{a.desc}</dd>
                    </div>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="border-t border-black/10 bg-white">
          <div className="mx-auto max-w-6xl px-5 py-20 lg:px-8 lg:py-24">
            <p className={`${eyebrow} mb-4 text-center`}>{"// how it works //"}</p>
            <h2 className={`${fontDisplay} text-center text-4xl leading-[1.06] sm:text-5xl`}>Learn. Find. Write. Publish.</h2>
            <ol className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map((s, i) => (
                <li key={s.title} className="relative rounded-2xl border border-black/10 bg-[#FBFAF3] p-6">
                  <div className="flex items-center justify-between">
                    <s.icon className="size-9 rounded-xl border border-[#151515] bg-[#FFD400] p-2" aria-hidden />
                    <span className="font-mono text-[12px] font-semibold text-[#6B6B60]">0{i + 1}</span>
                  </div>
                  <h3 className="mt-4 text-[17px] font-semibold">{s.title}</h3>
                  <p className="mt-2 text-[14px] leading-6 text-[#6B6B60]">{s.desc}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Protect + grow */}
        <section className="border-y border-[#151515] bg-[#151515]">
          <div className="mx-auto max-w-6xl px-5 py-20 lg:px-8 lg:py-24">
            <p className={`${eyebrowOnDark} mb-4 text-center`}>{"// one dashboard, both halves //"}</p>
            <h2 className={`${fontDisplay} mx-auto max-w-3xl text-center text-4xl leading-[1.06] text-[#E9EBDF] sm:text-5xl`}>
              Protect the traffic you have. <span className="text-[#FFD400]">Win the traffic you don&apos;t.</span>
            </h2>
            <div className="mt-12 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-white/12 bg-white/[0.04] p-7">
                <ShieldCheck className="size-10 rounded-xl bg-[#E9EBDF] p-2 text-[#151515]" aria-hidden />
                <p className="mt-5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.16em] text-[#9C9E93]">Website monitoring</p>
                <h3 className="mt-1 text-[20px] font-semibold text-[#E9EBDF]">Know what changed. Fix what matters.</h3>
                <p className="mt-3 text-[14px] leading-6 text-[#9C9E93]">
                  MyKavo scans your important pages on a schedule and alerts you when a title, canonical, noindex, script,
                  link or layout changes, before it costs you rankings or sales.
                </p>
                <Link href="/#how-it-works" className="mt-5 inline-flex items-center gap-1.5 text-[14px] font-semibold text-[#E9EBDF] underline decoration-[#FFD400] decoration-2 underline-offset-4">
                  How monitoring works <ArrowRight className="size-3.5" aria-hidden />
                </Link>
              </div>
              <div className="rounded-2xl border-2 border-[#FFD400] bg-white/[0.06] p-7">
                <Sparkles className="size-10 rounded-xl bg-[#FFD400] p-2 text-[#151515]" aria-hidden />
                <p className="mt-5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.16em] text-[#FFD400]">AI Keywords &amp; Blog Writer</p>
                <h3 className="mt-1 text-[20px] font-semibold text-[#E9EBDF]">Know what to write. Get it written.</h3>
                <p className="mt-3 text-[14px] leading-6 text-[#9C9E93]">
                  MyKavo finds the searches your site can win and writes the post for each one, so the pages you monitor
                  keep growing.
                </p>
                <Link href="/signup" className="mt-5 inline-flex items-center gap-1.5 text-[14px] font-semibold text-[#E9EBDF] underline decoration-[#FFD400] decoration-2 underline-offset-4">
                  Try it free <ArrowRight className="size-3.5" aria-hidden />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Trust */}
        <section className="mx-auto max-w-6xl px-5 py-20 lg:px-8 lg:py-24">
          <p className={`${eyebrow} mb-4 text-center`}>{"// you stay in charge //"}</p>
          <h2 className={`${fontDisplay} text-center text-4xl leading-[1.06] sm:text-5xl`}>AI that writes. You decide.</h2>
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {[
              {
                icon: FileText,
                title: "Always a draft first",
                desc: "Nothing goes live on its own. You read it, edit it, and copy it into your site when it is right.",
              },
              {
                icon: Target,
                title: "Written for your business",
                desc: "Every keyword and post comes from the profile you confirmed: your services, your audience, your market and language.",
              },
              {
                icon: Lock,
                title: "Your data stays yours",
                desc: "The AI sees your public pages, your confirmed profile and, if connected, your Search Console queries. It is not used to train AI models.",
              },
            ].map((c) => (
              <div key={c.title} className="rounded-2xl border border-black/10 bg-white p-6">
                <c.icon className="size-9 rounded-xl border border-[#151515] bg-[#FFD400] p-2" aria-hidden />
                <h3 className="mt-4 text-[17px] font-semibold">{c.title}</h3>
                <p className="mt-2 text-[14px] leading-6 text-[#6B6B60]">{c.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Plans */}
        <section className="border-t border-black/10 bg-white">
          <div className="mx-auto max-w-4xl px-5 py-20 lg:px-8">
            <p className={`${eyebrow} mb-4 text-center`}>{"// on every plan //"}</p>
            <h2 className={`${fontDisplay} text-center text-4xl leading-[1.06] sm:text-5xl`}>Included. No add-on.</h2>
            <div className="mt-10 overflow-x-auto rounded-2xl border border-black/15">
              <table className="w-full min-w-[560px] border-collapse text-left text-[14px]">
                <thead>
                  <tr className="border-b border-black/15 bg-[#F3F1E6]">
                    <th scope="col" className="px-4 py-3 font-semibold">Plan</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Price</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Keyword reports</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Blog posts</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Keywords shown</th>
                  </tr>
                </thead>
                <tbody>
                  {plans.map((plan) => {
                    const limits = AGENT_LIMITS[plan.id as keyof typeof AGENT_LIMITS] ?? FREE;
                    return (
                      <tr key={plan.id} className="border-b border-black/10 last:border-b-0">
                        <td className="px-4 py-3 font-medium">{plan.name}</td>
                        <td className="px-4 py-3 text-[#6B6B60]">${plan.priceMonthlyUsd}/month</td>
                        <td className="px-4 py-3 text-[#6B6B60]">{limits.reports} a month</td>
                        <td className="px-4 py-3 text-[#6B6B60]">{limits.posts} a month</td>
                        <td className="px-4 py-3 text-[#6B6B60]">
                          {limits.visibleOpportunities === Infinity ? "All" : `Top ${limits.visibleOpportunities}`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-5 text-center text-[14px] text-[#6B6B60]">
              Every plan also includes website change monitoring, AI Website Insights and Site Audit.{" "}
              <Link href="/pricing" className="font-semibold text-[#151515] underline decoration-[#FFD400] decoration-2 underline-offset-4">
                Compare plans
              </Link>
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section className="mx-auto max-w-3xl px-5 py-20 lg:px-8">
          <p className={`${eyebrow} mb-4 text-center`}>{"// questions //"}</p>
          <h2 className={`${fontDisplay} text-center text-4xl leading-[1.06]`}>FAQ</h2>
          <div className="mt-10 divide-y divide-black/10 rounded-2xl border border-black/10 bg-white">
            {faqs.map((f) => (
              <details key={f.q} className="group px-6 py-5">
                <summary className="cursor-pointer list-none text-[15px] font-semibold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#151515]">
                  {f.q}
                </summary>
                <p className="mt-3 text-[14px] leading-6 text-[#6B6B60]">{f.a}</p>
              </details>
            ))}
          </div>
          <ul className="mt-8 space-y-2 text-[14px]">
            {[
              { href: "/ai-website-insights", label: "AI Website Insights: every website change, explained" },
              { href: "/seo-monitoring", label: "SEO monitoring: know when important tags change" },
              { href: "/site-audit", label: "Site Audit: every technical issue, found and sorted" },
            ].map((l) => (
              <li key={l.href} className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-[#151515]" aria-hidden />
                <Link href={l.href} className="font-medium underline decoration-[#FFD400] decoration-2 underline-offset-4">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* Final CTA */}
        <section className="border-t border-[#151515] bg-[#151515]">
          <div className="mx-auto max-w-4xl px-5 py-20 text-center lg:px-8">
            <p className={`${eyebrowOnDark} mb-4`}>{"// try it free //"}</p>
            <h2 className={`${fontDisplay} text-4xl leading-[1.06] text-[#E9EBDF] sm:text-5xl`}>
              Your next post is already
              <br />
              <span className="text-[#FFD400]">in your search data.</span>
            </h2>
            <div className="mt-9 flex flex-col items-center gap-3">
              <GoogleButton onDark />
              <Link href="/signup" className="text-[13px] text-[#9C9E93] underline underline-offset-4 hover:text-[#E9EBDF]">
                or sign up with email
              </Link>
            </div>
            <p className="mt-6 text-sm text-[#E9EBDF]/70">
              {FREE.reports} keyword report and {FREE.posts} blog post a month on the free plan.{" "}
              <Link href="/pricing" className="inline-flex items-center gap-1 underline decoration-[#FFD400] underline-offset-4">
                See plans <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            </p>
          </div>
        </section>
      </main>
      <LandingFooter />
    </div>
  );
}
