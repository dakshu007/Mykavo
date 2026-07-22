import type { Metadata } from "next";
import Link from "next/link";
import { MarketingPageShell } from "@/components/landing/page-shell";
import {
  FaqSection,
  RelatedLinks,
  SeoPageCta,
  faqJsonLd,
  jsonLdScript,
} from "@/components/landing/seo-page";

export const metadata: Metadata = {
  title: "Website Content Monitoring - Track Text & Page Changes Automatically",
  description:
    "Website content monitoring tracks the text and structure of your pages and alerts you when they change. Catch unauthorized edits, CMS mistakes, and silent content loss with before-and-after comparison.",
  keywords: [
    "website content monitoring",
    "web page content monitoring",
    "monitor web page text changes",
    "content change detection",
    "track website content changes",
    "page change monitoring",
  ],
  alternates: { canonical: "/website-content-monitoring" },
};

const faqs = [
  {
    q: "What is website content monitoring?",
    a: "Website content monitoring automatically tracks the text and structure of web pages and alerts you when they change. It compares each page against an approved baseline, so you see exactly which words, sections, or elements were added, removed, or rewritten - and when.",
  },
  {
    q: "How does MyKavo detect content changes without false alarms?",
    a: "Raw HTML is too noisy to compare - frameworks re-render markup constantly. MyKavo normalizes the DOM (stripping volatile attributes, timestamps, and framework noise), compares visible text separately, and lets you ignore selectors for parts that are supposed to change, like dates or rotating banners. What remains is real content change.",
  },
  {
    q: "Who uses content monitoring?",
    a: "Agencies verifying client edits landed correctly, teams with compliance copy (pricing, legal disclaimers, medical or financial wording) that must not drift, SEO teams protecting content that ranks, and anyone who has been burned by a CMS migration that silently dropped paragraphs.",
  },
  {
    q: "Can it monitor pages behind JavaScript rendering?",
    a: "Yes. MyKavo renders every page in a real browser before extracting content, so client-side rendered sites (React, Vue, and similar) are compared on what visitors actually see, not on an empty HTML shell.",
  },
  {
    q: "Is content monitoring the same as defacement detection?",
    a: "It covers that case and more. A defacement is just an extreme unauthorized content change - the same baseline comparison that catches a deleted paragraph also catches injected spam links, unexpected scripts, or replaced pages, and flags them at high severity.",
  },
];

const related = [
  { href: "/visual-regression-testing", label: "Visual regression testing" },
  { href: "/seo-monitoring", label: "SEO monitoring: what to track" },
  { href: "/tools/website-change-detector", label: "Free tool: Website Change Detector" },
  { href: "/guides/how-to-monitor-website-changes", label: "How to monitor website changes" },
];

export default function ContentMonitoringPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(faqJsonLd(faqs)) }}
      />
      <MarketingPageShell
        eyebrowText="content monitoring"
        title={
          <>
            Website content monitoring
            <br />
            with a paper trail.
          </>
        }
        intro="Website content monitoring tracks what your pages actually say and alerts you when it changes. MyKavo compares every monitored page against an approved baseline - normalized markup plus visible text - and shows you exactly what was added, removed, or rewritten."
      >
        <h2>Content changes nobody signed off on</h2>
        <ul>
          <li>A CMS migration drops the second half of your best-ranking article.</li>
          <li>An editor overwrites compliance wording on a pricing or disclaimer page.</li>
          <li>A translation plugin replaces a page with its untranslated fallback.</li>
          <li>An integration writes placeholder text (&ldquo;Lorem ipsum&rdquo;, &ldquo;undefined&rdquo;) into production.</li>
          <li>Spam links appear inside old blog posts after a credential leak.</li>
          <li>A client &ldquo;small edit&rdquo; deletes the section your ads land on.</li>
        </ul>
        <p>
          None of these throw errors. All of them change what customers and crawlers read. Content
          monitoring is how you find out on day one instead of quarter-end.
        </p>

        <h2>How it works in MyKavo</h2>
        <ol>
          <li>
            <strong>Baseline the page.</strong> The approved state includes its normalized
            structure and visible text.
          </li>
          <li>
            <strong>Scan on schedule.</strong> Every scan renders the page in a real browser and
            extracts the same normalized view.
          </li>
          <li>
            <strong>Compare deterministically.</strong> Text and structure hashes flag change;
            the diff shows precisely what moved. No AI guessing - the same input always gives the
            same answer.
          </li>
          <li>
            <strong>Filter the noise.</strong> Ignore selectors for dates, counters, and rotating
            sections; severity thresholds keep trivial edits from paging anyone.
          </li>
          <li>
            <strong>Review with evidence.</strong> Each change event stores the previous value,
            the current value, and when it was detected - approve intentional edits into the new
            baseline, escalate the rest.
          </li>
        </ol>

        <h2>Content, in context</h2>
        <p>
          A text change rarely travels alone. Because MyKavo checks{" "}
          <Link href="/visual-regression-testing">visual state</Link>,{" "}
          <Link href="/seo-monitoring">SEO tags</Link>, links, and scripts in the same scan, a
          single alert tells you the CMS migration that rewrote your copy also dropped two
          canonicals and broke nine internal links - one incident, one report, instead of four
          mysteries.
        </p>

        <FaqSection faqs={faqs} />
        <RelatedLinks links={related} />
        <SeoPageCta heading="Put your important pages under watch." />
      </MarketingPageShell>
    </>
  );
}
