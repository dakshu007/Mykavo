import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Building2, Plug } from "lucide-react";
import { MarketingPageShell } from "@/components/landing/page-shell";
import { SeoPageCta } from "@/components/landing/seo-page";
import { breadcrumbList, faqPage, jsonLdScript } from "@/lib/seo/structured-data";

export const metadata: Metadata = {
  title: "MyKavo Partner Program - Agency and Technology Partners",
  description:
    "Two ways to partner with MyKavo: Agency Partners who monitor client websites at scale, and Technology Partners building integrations. How each works, what you get, and how to apply.",
  keywords: [
    "mykavo partner program",
    "website monitoring agency partner",
    "saas technology partner program",
    "white label website monitoring",
  ],
  alternates: { canonical: "/partners" },
};

const faqs = [
  {
    q: "What is the MyKavo Partner Program?",
    a: "Two tracks. Agency Partners look after client websites and use MyKavo across their portfolio, with white-label reporting and a shared workspace structure. Technology Partners build integrations on top of MyKavo, or connect MyKavo into their own product. They are separate because the two need entirely different things from us.",
  },
  {
    q: "Does it cost anything to apply?",
    a: "No. Applying is free and there is no minimum commitment to be considered. Partners still pay for the plans they use; the program is about support, reporting and integration work, not a discount scheme you buy into.",
  },
  {
    q: "How long does an application take?",
    a: "We review applications weekly and reply within five business days either way. If it is a fit we set up a short call to work out what you actually need before anything is announced.",
  },
  {
    q: "Do I need to be an existing MyKavo customer?",
    a: "For the agency track it helps, because the conversation is much more concrete if you have monitored a few client sites already - the free plan is enough for that. For the technology track it is not required.",
  },
];

const tracks = [
  {
    href: "/partners/agency",
    icon: Building2,
    eyebrow: "Track one",
    title: "Agency Partner",
    body: "For agencies, freelancers and maintenance teams looking after other people's websites. White-label reports, a workspace structure built for many client sites, and a direct line when something breaks at 5pm on a Friday.",
    cta: "Agency Partner details",
  },
  {
    href: "/partners/tech",
    icon: Plug,
    eyebrow: "Track two",
    title: "Technology Partner",
    body: "For products that want MyKavo's monitoring inside their own workflow, or want to build on top of it - hosts, CMS platforms, deployment tools, reporting suites and agencies' internal platforms.",
    cta: "Technology Partner details",
  },
];

export default function PartnersPage() {
  return (
    <MarketingPageShell
      eyebrowText="partner program"
      title="Partner with MyKavo"
      intro="Two tracks, because an agency monitoring ninety client sites and a platform embedding change detection need completely different things. Pick the one that describes you - each has its own page and its own application."
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(faqPage(faqs)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(breadcrumbList([{ name: "Partners", path: "/partners" }])),
        }}
      />

      <div className="not-prose my-8 grid gap-4">
        {tracks.map((track) => (
          <Link
            key={track.href}
            href={track.href}
            className="group rounded-2xl border border-black/15 bg-white px-6 py-6 no-underline transition-shadow hover:shadow-[4px_4px_0_#151515]"
          >
            <span className="inline-flex size-10 items-center justify-center rounded-xl bg-[#F3F1E6]">
              <track.icon className="size-5 text-[#151515]" aria-hidden />
            </span>
            <p className="mt-4 font-mono text-[10.5px] uppercase tracking-[0.16em] text-[#6B6B60]">
              {track.eyebrow}
            </p>
            <p className="mt-1.5 text-[19px] font-semibold leading-snug text-[#151515]">
              {track.title}
            </p>
            <p className="mt-2 text-[14.5px] leading-6 text-[#6B6B60]">{track.body}</p>
            <span className="mt-4 inline-flex items-center gap-1.5 text-[14px] font-medium text-[#151515]">
              {track.cta}
              <ArrowRight
                className="size-4 transition-transform group-hover:translate-x-0.5"
                aria-hidden
              />
            </span>
          </Link>
        ))}
      </div>

      <h2>How applying works</h2>
      <ol>
        <li>
          <strong>Apply on the track page.</strong> A short form - who you are, what you look
          after or what you are building.
        </li>
        <li>
          <strong>We review weekly</strong> and reply within five business days, including a no.
        </li>
        <li>
          <strong>A short call</strong> to work out what you actually need, before anything is
          agreed or announced.
        </li>
        <li>
          <strong>You are set up</strong> with whatever the track involves - reporting, a shared
          workspace structure, integration access.
        </li>
      </ol>

      <h2>What we are not offering</h2>
      <p>
        No reseller tiers, no badge you buy, and no directory listing in exchange for a link. A
        partner program that exists mainly to generate backlinks helps nobody, and it is obvious
        from the outside. These two tracks exist because agencies and platforms kept asking for
        specific things, and this is where those things live.
      </p>

      <h2>Frequently asked questions</h2>
      {faqs.map((faq) => (
        <div key={faq.q}>
          <h3>{faq.q}</h3>
          <p>{faq.a}</p>
        </div>
      ))}

      <SeoPageCta heading="Know what changed. Fix what matters." />
    </MarketingPageShell>
  );
}
