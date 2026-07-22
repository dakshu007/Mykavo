import Link from "next/link";

/**
 * Shared building blocks for the keyword landing pages and guides
 * (/visual-regression-testing, /guides/*, /website-monitoring-for-*).
 * Server-safe: no client hooks. Pages own their content; these keep the
 * CTA band, FAQ rendering, and JSON-LD helpers consistent site-wide.
 */

export interface PageFaq {
  q: string;
  a: string;
}

/** FAQPage JSON-LD payload for a page's FAQ list. */
export function faqJsonLd(faqs: PageFaq[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

/**
 * Escape "<" so page-authored text can never terminate the script element -
 * JSON.stringify alone does not prevent this.
 */
export function jsonLdScript(payload: object): string {
  return JSON.stringify(payload).replace(/</g, "\\u003c");
}

/** Semantic FAQ section - plain h2/h3/p so crawlers and LLMs read it directly. */
export function FaqSection({ faqs }: { faqs: PageFaq[] }) {
  return (
    <section aria-label="Frequently asked questions">
      <h2>Frequently asked questions</h2>
      {faqs.map((f) => (
        <div key={f.q}>
          <h3>{f.q}</h3>
          <p>{f.a}</p>
        </div>
      ))}
    </section>
  );
}

/** Gold CTA band closing every keyword page - same capsule as the homepage. */
export function SeoPageCta({ heading }: { heading?: string }) {
  return (
    <aside className="not-prose mt-12 rounded-2xl border border-[#151515] bg-[#151515] px-6 py-10 text-center shadow-[6px_6px_0_#FFD400,6px_6px_0_1px_#151515]">
      <p className="text-xl font-semibold leading-snug text-[#E9EBDF] sm:text-2xl">
        {heading ?? "Know what changed. Fix what matters."}
      </p>
      <div className="mx-auto mt-6 flex w-fit overflow-hidden rounded-full border border-[#FFD400]/40">
        <Link
          href="/signup"
          className="bg-[#FFD400] px-6 py-3 text-sm font-semibold text-[#151515] no-underline transition-colors hover:bg-[#ffe14d]"
        >
          Start Monitoring Free
        </Link>
        <Link
          href="/preview"
          className="bg-white/[0.06] px-6 py-3 text-sm font-semibold text-[#E9EBDF] no-underline transition-colors hover:bg-white/[0.12]"
        >
          See the dashboard
        </Link>
      </div>
      <p className="mt-3 text-[12px] text-[#9C9E93]">* No credit card required</p>
    </aside>
  );
}

/** "Keep reading" cross-links - the internal-linking mesh between these pages. */
export function RelatedLinks({ links }: { links: { href: string; label: string }[] }) {
  return (
    <section aria-label="Related guides and tools">
      <h2>Keep reading</h2>
      <ul>
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href}>{l.label}</Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
