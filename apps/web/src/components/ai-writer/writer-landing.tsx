import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Check, Minus } from "lucide-react";
import { AGENT_LIMITS, FREE_REGENERATIONS_PER_POST } from "@mykavo/keyword-agent/pure";
import { LandingFooter } from "@/components/landing/footer";
import { LandingNav } from "@/components/landing/nav";
import { fontSans } from "@/components/landing/style";
import { WRITER_PAGES, writerPage } from "@/config/ai-writer";
import type { WriterPage } from "@/config/ai-writer/types";
import { plans } from "@/config/plans";
import { site } from "@/config/site";
import { breadcrumbList, faqPage, jsonLdScript, ORGANIZATION_ID, organizationNode } from "@/lib/seo/structured-data";
import { withSocial } from "@/lib/social-metadata";
import { bodoni, fontGiant, fontSerif, spartan } from "./fonts";
import { PostAnatomy } from "./post-anatomy";
import { MotionStory } from "./motion-story";
import { PostGrader } from "./post-grader";
import { SkyBand, SkyHero } from "./sky-hero";
import { TopicFinder } from "./topic-finder";

/** Metadata for one AI Writer page, from its config. */
export function writerMetadata(page: WriterPage): Metadata {
  return withSocial({
    title: { absolute: `${page.metaTitle} - MyKavo` },
    description: page.metaDescription,
    keywords: page.keywords,
    alternates: { canonical: page.path },
    openGraph: { title: page.metaTitle, description: page.metaDescription, url: page.path, type: "website" },
  });
}

/** Topics the hero search types out, per page, so each page speaks to its reader. */
const SEARCH_EXAMPLES: Record<string, string[]> = {
  "/ai-blog-writer": ["wordpress speed", "home workouts", "email marketing", "dog training", "coffee shop"],
  "/best-ai-blog-writer": ["meal prep", "personal finance", "yoga for beginners", "dog training"],
  "/seo-blog-writer": ["local seo", "shopify seo", "seo for dentists", "wordpress speed"],
  "/ai-content-writer": ["email marketing", "saas onboarding", "interior design", "real estate"],
  "/ai-article-writer": ["home workouts", "budget travel", "gardening", "skin care"],
  "/free-ai-blog-writer": ["coffee shop", "bakery", "photography", "yoga"],
  "/blog-post-generator": ["wedding cakes", "dog training", "bike repair", "cold brew"],
  "/ai-blog-writer-for-wordpress": ["woocommerce", "wordpress speed", "elementor", "wordpress security"],
  "/alternatives/jasper-alternative": ["b2b marketing", "saas pricing", "email marketing", "content strategy"],
  "/alternatives/surfer-seo-alternative": ["on page seo", "keyword research", "link building", "technical seo"],
};

/** "seo-blog-writer" from "/seo-blog-writer", for CTA placements and analytics. */
function slugOf(path: string): string {
  return path.replace(/^\/+/, "").replace(/\//g, "-").slice(0, 40) || "home";
}

const AGENT_PLANS = (["free", "starter", "pro", "agency"] as const).map((id) => {
  const plan = plans.find((p) => p.id === id);
  return { id, name: plan?.name ?? id, price: plan?.priceMonthlyUsd ?? 0, ...AGENT_LIMITS[id] };
});

function jsonLd(page: WriterPage) {
  const url = `${site.url}${page.path}`;
  const crumbs = [...(page.breadcrumb ?? []), { name: page.navLabel, path: page.path }];
  return [
    {
      "@context": "https://schema.org",
      "@graph": [
        organizationNode(),
        {
          "@type": "WebPage",
          "@id": `${url}#webpage`,
          url,
          name: page.metaTitle,
          description: page.metaDescription,
          isPartOf: { "@id": `${site.url}/#website` },
          about: { "@id": `${url}#app` },
          ...(page.checkedOn ? { dateModified: new Date(page.checkedOn).toISOString().slice(0, 10) } : {}),
        },
        {
          "@type": "SoftwareApplication",
          "@id": `${url}#app`,
          name: "MyKavo AI Keywords & Blog Writer",
          applicationCategory: "BusinessApplication",
          applicationSubCategory: "AI Blog Writer",
          operatingSystem: "Web",
          url,
          description: page.capsule,
          publisher: { "@id": ORGANIZATION_ID },
          offers: AGENT_PLANS.map((p) => ({
            "@type": "Offer",
            name: p.name,
            price: String(p.price),
            priceCurrency: "USD",
            description: `${p.reports} keyword report${p.reports === 1 ? "" : "s"} and ${p.posts} blog post${p.posts === 1 ? "" : "s"} a month`,
            url: `${site.url}/pricing`,
          })),
        },
      ],
    },
    faqPage(page.faqs),
    breadcrumbList(crumbs),
  ];
}

function Eyebrow({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <p className={`font-mono text-[11.5px] font-semibold uppercase tracking-[0.22em] ${dark ? "text-[#FFD400]" : "text-[#6b5500]"}`}>
      {children}
    </p>
  );
}

function Widget({ page, from }: { page: WriterPage; from: string }) {
  if (page.widget.kind === "grader") return <PostGrader from={from} />;
  if (page.widget.kind === "anatomy") return <PostAnatomy from={from} />;
  return <TopicFinder from={from} />;
}

/** The ten AI Writer pages share this layout; only the config differs. */
export function WriterLanding({ page }: { page: WriterPage }) {
  const from = slugOf(page.path);
  const related = page.related.map(writerPage).filter((p): p is WriterPage => Boolean(p));
  const facts = [
    { value: "3", label: "keyword sources: your Search Console, Google suggestions, today's results" },
    { value: "8 to 20", label: "the positions it hunts: searches you almost rank for" },
    { value: "8", label: "parts in every post: title to schema and review notes" },
    { value: String(FREE_REGENERATIONS_PER_POST), label: "free rewrite per post, so you can change the angle" },
  ];

  return (
    <div className={`${fontSans} ${spartan.variable} ${bodoni.variable} min-h-svh bg-[#FBFAF3] text-[#151515] antialiased`}>
      {jsonLd(page).map((node, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(node) }} />
      ))}
      <LandingNav />
      <main>
        <SkyHero hero={page.hero} from={from} examples={SEARCH_EXAMPLES[page.path] ?? SEARCH_EXAMPLES["/ai-blog-writer"]} />

        {/* The direct answer, then the four facts that make it "built to rank". */}
        <section id="what-it-is" className="relative border-b border-black/10">
          <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-5 py-16 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:px-8 lg:py-20">
            <div>
              {page.breadcrumb ? (
                <nav aria-label="Breadcrumb" className="mb-4 text-[13px] text-[#6B6B60]">
                  {page.breadcrumb.map((c) => (
                    <span key={c.path}>
                      <Link href={c.path} className="hover:text-[#151515] hover:underline">
                        {c.name}
                      </Link>
                      <span className="mx-2">/</span>
                    </span>
                  ))}
                  <span className="text-[#151515]">{page.navLabel}</span>
                </nav>
              ) : null}
              <Eyebrow>In one paragraph</Eyebrow>
              <p className={`${fontSerif} mt-4 text-[clamp(24px,2.6vw,34px)] leading-[1.32] text-[#151515]`}>{page.capsule}</p>
            </div>
            <dl className="grid grid-cols-2 gap-px self-start overflow-hidden rounded-[22px] border border-[#151515] bg-[#151515]">
              {facts.map((f) => (
                <div key={f.label} className="bg-[#FBFAF3] p-5">
                  <dt className={`${fontGiant} text-[40px] font-extrabold leading-none text-[#151515]`}>{f.value}</dt>
                  <dd className="mt-2 text-[13.5px] leading-snug text-[#4a4a42]">{f.label}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* How it works, told as you scroll. */}
        <section id="how-it-works" data-track-section="how-it-works" className="scroll-mt-24 border-b border-black/10 bg-[#F3F1E6]">
          <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-24">
            <div className="mx-auto mb-14 max-w-3xl text-center lg:mb-6">
              <Eyebrow>How it works</Eyebrow>
              <h2 className={`${fontGiant} mt-4 text-[clamp(36px,5.2vw,68px)] font-extrabold uppercase leading-[0.92] tracking-[-0.02em]`}>
                From search to post, in five steps
              </h2>
              <p className="mx-auto mt-5 max-w-2xl text-[17px] leading-relaxed text-[#4a4a42]">
                Scroll through what happens between &ldquo;what should I write?&rdquo; and a finished draft in your editor.
              </p>
            </div>
            <MotionStory />
          </div>
        </section>

        {/* The interactive tool. */}
        <section id="try-it" data-track-section="try-it" className="scroll-mt-24 bg-[#151515] text-white">
          <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-24">
            <div className="mx-auto max-w-3xl text-center">
              <Eyebrow dark>Try it, free, no sign-up</Eyebrow>
              <h2 className={`${fontGiant} mt-4 text-[clamp(38px,5.6vw,72px)] font-extrabold uppercase leading-[0.92] tracking-[-0.02em]`}>
                {page.widget.title}
              </h2>
              <p className="mx-auto mt-5 max-w-2xl text-[17px] leading-relaxed text-white/70">{page.widget.intro}</p>
            </div>
            <div className="mt-12">
              <Widget page={page} from={from} />
            </div>
          </div>
        </section>

        {/* The page's own sections, alternating sides. */}
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          {page.sections.map((s, i) => (
            <section
              key={s.id}
              id={s.id}
              className="grid grid-cols-1 gap-8 border-b border-black/10 py-16 last:border-b-0 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16 lg:py-24"
            >
              <div className={i % 2 === 1 ? "lg:order-2" : ""}>
                <div className="flex items-center gap-3">
                  {/* Decorative ordinal, drawn as generated content: the black
                      stroke makes it readable, and screen readers skip it. */}
                  <span
                    aria-hidden
                    data-n={String(i + 1).padStart(2, "0")}
                    className={`${fontGiant} text-[56px] font-extrabold leading-none text-[#FFD400] [-webkit-text-stroke:1.5px_#151515] before:content-[attr(data-n)]`}
                  />
                  <Eyebrow>{s.eyebrow}</Eyebrow>
                </div>
                <h2 className="mt-5 text-[clamp(30px,3.6vw,46px)] font-semibold leading-[1.08] tracking-[-0.02em]">{s.title}</h2>
              </div>
              <div className={i % 2 === 1 ? "lg:order-1" : ""}>
                {s.body.map((p) => (
                  <p key={p.slice(0, 40)} className="mb-5 text-[17px] leading-[1.75] text-[#33332d] last:mb-0">
                    {p}
                  </p>
                ))}
                {s.bullets ? (
                  <ul className="mt-6 grid gap-2.5 sm:grid-cols-2">
                    {s.bullets.map((b) => (
                      <li key={b} className="flex items-start gap-2.5 rounded-xl border border-black/10 bg-white px-4 py-3 text-[15px] leading-snug">
                        <span aria-hidden className="mt-1.5 size-2 shrink-0 rounded-full bg-[#FFD400] ring-1 ring-[#151515]" />
                        {b}
                      </li>
                    ))}
                  </ul>
                ) : null}
                {s.links ? (
                  <div className="mt-6 flex flex-wrap gap-2">
                    {s.links.map((l) => (
                      <Link
                        key={l.href}
                        href={l.href}
                        className="inline-flex items-center gap-1.5 rounded-full border border-[#151515] px-4 py-2 text-[14px] font-medium transition-colors hover:bg-[#FFD400]"
                      >
                        {l.label}
                        <ArrowUpRight className="size-3.5" aria-hidden />
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            </section>
          ))}
        </div>

        {page.compare ? (
          <section id="comparison" className="border-y border-black/10 bg-[#F3F1E6]">
            <div className="mx-auto max-w-5xl px-5 py-20 lg:px-8 lg:py-24">
              <div className="text-center">
                <Eyebrow>Side by side</Eyebrow>
                <h2 className="mt-4 text-[clamp(30px,3.8vw,48px)] font-semibold leading-[1.08] tracking-[-0.02em]">{page.compare.title}</h2>
                <p className="mx-auto mt-4 max-w-2xl text-[16.5px] leading-relaxed text-[#4a4a42]">{page.compare.intro}</p>
              </div>
              <div className="mt-10 overflow-x-auto rounded-[22px] border border-[#151515] bg-white shadow-[6px_6px_0_#151515]">
                <table className="w-full min-w-[620px] border-collapse text-left text-[15px]">
                  <thead>
                    <tr className="border-b border-[#151515]">
                      <th scope="col" className="w-[30%] px-5 py-4 text-[13px] font-semibold uppercase tracking-[0.08em] text-[#6B6B60]">
                        <span className="sr-only">Feature</span>
                      </th>
                      <th scope="col" className="bg-[#FFD400] px-5 py-4 font-semibold">
                        {page.compare.columns[0]}
                      </th>
                      <th scope="col" className="px-5 py-4 font-semibold text-[#4a4a42]">
                        {page.compare.columns[1]}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {page.compare.rows.map((row) => (
                      <tr key={row.label} className="border-b border-black/10 last:border-b-0">
                        <th scope="row" className="px-5 py-4 align-top text-[14px] font-medium text-[#33332d]">
                          {row.label}
                        </th>
                        <td className="bg-[#FFD400]/10 px-5 py-4 align-top">
                          <span className="flex gap-2">
                            <Check className="mt-0.5 size-4 shrink-0 text-[#1f7a3a]" aria-hidden />
                            {row.mykavo}
                          </span>
                        </td>
                        <td className="px-5 py-4 align-top text-[#4a4a42]">
                          <span className="flex gap-2">
                            <Minus className="mt-0.5 size-4 shrink-0 text-[#9a9a90]" aria-hidden />
                            {row.other}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {page.compare.note ? <p className="mx-auto mt-6 max-w-3xl text-center text-[14.5px] leading-relaxed text-[#4a4a42]">{page.compare.note}</p> : null}
              {page.sources ? (
                <p className="mt-4 text-center text-[13px] text-[#6B6B60]">
                  Competitor details from their own published pages{page.checkedOn ? `, checked ${page.checkedOn}` : ""}:{" "}
                  {page.sources.map((s, i) => (
                    <span key={s.url}>
                      {i > 0 ? ", " : ""}
                      <a href={s.url} rel="nofollow noopener" target="_blank" className="underline underline-offset-2 hover:text-[#151515]">
                        {s.label}
                      </a>
                    </span>
                  ))}
                  .
                </p>
              ) : null}
            </div>
          </section>
        ) : null}

        {/* Plans. */}
        <section id="pricing" className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-24">
          <div className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <Eyebrow>Pricing</Eyebrow>
              <h2 className="mt-4 text-[clamp(30px,3.8vw,48px)] font-semibold leading-[1.08] tracking-[-0.02em]">Start free. Write more when it works.</h2>
              <p className="mt-3 max-w-2xl text-[16px] leading-relaxed text-[#4a4a42]">
                Every plan includes the AI Keywords &amp; Blog Writer and MyKavo&apos;s website monitoring. Monthly billing, cancel anytime.
              </p>
            </div>
            <Link href="/pricing" className="inline-flex items-center gap-1.5 text-[15px] font-medium underline-offset-4 hover:underline">
              Compare every plan <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {AGENT_PLANS.map((p) => (
              <div
                key={p.id}
                className={`rounded-[22px] border p-6 ${p.id === "free" ? "border-[#151515] bg-[#FFD400] shadow-[5px_5px_0_#151515]" : "border-black/10 bg-white"}`}
              >
                <p className="text-[14px] font-semibold uppercase tracking-[0.1em]">{p.name}</p>
                <p className="mt-3">
                  <span className={`${fontGiant} text-[48px] font-extrabold leading-none`}>${p.price}</span>
                  <span className="text-[14px] text-[#4a4a42]">/month</span>
                </p>
                <p className="mt-4 text-[15px] leading-snug">
                  <strong>{p.posts}</strong> blog post{p.posts === 1 ? "" : "s"} and <strong>{p.reports}</strong> keyword report{p.reports === 1 ? "" : "s"} a month
                </p>
                {p.id === "free" ? <p className="mt-2 text-[13.5px]">No card. Does not expire.</p> : null}
              </div>
            ))}
          </div>
        </section>

        {/* FAQ. */}
        <section id="faq" className="border-t border-black/10 bg-white">
          <div className="mx-auto max-w-3xl px-5 py-20 lg:px-8 lg:py-24">
            <div className="text-center">
              <Eyebrow>Questions</Eyebrow>
              <h2 className="mt-4 text-[clamp(30px,3.8vw,48px)] font-semibold leading-[1.08] tracking-[-0.02em]">Asked and answered</h2>
            </div>
            <div className="mt-10 divide-y divide-black/10 rounded-[22px] border border-black/10">
              {page.faqs.map((f) => (
                <details key={f.q} className="group px-5 py-1 [&_summary::-webkit-details-marker]:hidden">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-[16.5px] font-medium">
                    {f.q}
                    <span
                      aria-hidden
                      className="flex size-7 shrink-0 items-center justify-center rounded-full border border-[#151515] text-[18px] leading-none transition-transform group-open:rotate-45 group-open:bg-[#FFD400]"
                    >
                      +
                    </span>
                  </summary>
                  <p className="pb-5 text-[15.5px] leading-relaxed text-[#4a4a42]">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* The rest of the cluster. */}
        {related.length > 0 ? (
          <section id="keep-exploring" className="border-t border-black/10 bg-[#F3F1E6]">
            <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
              <Eyebrow>Keep exploring</Eyebrow>
              <h2 className="mt-4 text-[clamp(28px,3.2vw,40px)] font-semibold leading-[1.1] tracking-[-0.02em]">More from the MyKavo AI Writer</h2>
              <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {related.map((r) => (
                  <Link
                    key={r.path}
                    href={r.path}
                    className="group flex flex-col justify-between rounded-[22px] border border-[#151515] bg-white p-6 transition-all hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#151515]"
                  >
                    <div>
                      <p className={`${fontGiant} text-[22px] font-extrabold uppercase leading-tight tracking-[-0.01em]`}>{r.navLabel}</p>
                      <p className="mt-2 text-[14.5px] leading-snug text-[#4a4a42]">{r.navBlurb}</p>
                    </div>
                    <span className="mt-5 inline-flex items-center gap-1.5 text-[14px] font-medium">
                      Open <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        <SkyBand title={page.cta.title} body={page.cta.body} cta={page.hero.cta} from={from} />
      </main>
      <LandingFooter />
    </div>
  );
}

/** Every cluster page, for the sitemap and the footer. */
export const WRITER_PATHS = WRITER_PAGES.map((p) => p.path);
