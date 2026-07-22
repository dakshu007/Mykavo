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
  title: "Website Deployment Checklist - Pre-Launch, Launch & Post-Deploy",
  description:
    "A battle-tested website deployment checklist: pre-deploy verification, launch steps, and the post-deploy checks most teams skip - SEO tags, redirects, tracking scripts, and visual state on real pages.",
  keywords: [
    "website deployment checklist",
    "website launch checklist",
    "pre launch website checklist",
    "post deployment verification",
    "deployment checklist for websites",
    "go live checklist",
  ],
  alternates: { canonical: "/guides/website-deployment-checklist" },
};

const faqs = [
  {
    q: "What should a website deployment checklist include?",
    a: "Three phases. Pre-deploy: tests green, staging reviewed, backups and rollback ready, SEO tags verified on staging. Deploy: migrations, cache invalidation, DNS/SSL if applicable. Post-deploy: verify real pages - status codes, visual state, SEO tags, redirects, tracking scripts, forms - because this is where silent breakage hides.",
  },
  {
    q: "What is the most commonly missed step?",
    a: "Post-deploy verification beyond the homepage. Classic misses: a noindex tag shipped from staging, canonicals pointing at the staging domain, the analytics snippet dropped from the new layout, and redirects lost during a URL restructure. All invisible on a quick homepage glance.",
  },
  {
    q: "How do I verify a deployment automatically?",
    a: "Baseline your key pages before the release, then scan right after it. A change-monitoring scan compares every page against the pre-deploy baseline and reports exactly what the release changed - expected changes get approved, unexpected ones get fixed while the deploy is still fresh.",
  },
  {
    q: "Does this apply to CMS publishes, not just code deploys?",
    a: "Yes. A Webflow publish, a WordPress plugin update, or a big CMS content push is a deployment in effect: the live site changes. The post-deploy phase of the checklist applies unchanged - which is why continuous monitoring beats remembering to check.",
  },
];

const related = [
  { href: "/guides/website-monitoring-checklist", label: "Website monitoring checklist" },
  { href: "/visual-regression-testing", label: "Visual regression testing" },
  { href: "/tools/redirect-chain-checker", label: "Free tool: Redirect Chain Checker" },
  { href: "/guides/how-to-monitor-website-changes", label: "How to monitor website changes" },
];

export default function DeploymentChecklistPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(faqJsonLd(faqs)) }}
      />
      <MarketingPageShell
        eyebrowText="checklist"
        title={
          <>
            The website deployment
            <br />
            checklist.
          </>
        }
        intro="A website deployment checklist in three phases: what to verify before you ship, the launch steps themselves, and the post-deploy checks that catch what staging never shows. The third phase is where most silent damage happens - and the easiest one to automate."
      >
        <h2>Phase 1: Pre-deploy</h2>
        <ul>
          <li>All tests green; build reproducible from the release branch.</li>
          <li>Staging reviewed on desktop and mobile for the pages this release touches.</li>
          <li>Database migrations rehearsed; rollback path written down, not assumed.</li>
          <li>Fresh backup taken and verified.</li>
          <li>
            SEO state on staging checked: intended titles, descriptions, canonicals pointing at
            the PRODUCTION domain, robots meta correct (staging usually noindexes - production
            must not inherit it).
          </li>
          <li>Redirect map prepared for any changed or removed URLs.</li>
          <li>Baseline captured: current production state of key pages recorded for comparison.</li>
        </ul>

        <h2>Phase 2: Deploy</h2>
        <ul>
          <li>Ship during low-traffic hours when the release is risky.</li>
          <li>Run migrations; watch error rates during rollout.</li>
          <li>Invalidate CDN/page caches so users get the new release, whole.</li>
          <li>Confirm SSL and DNS if infrastructure changed.</li>
          <li>Smoke-test the golden path immediately: home, login, one conversion flow.</li>
        </ul>

        <h2>Phase 3: Post-deploy (where silent breakage lives)</h2>
        <ul>
          <li>Every key page returns 200 - not just the homepage.</li>
          <li>Visual state on key pages matches intent - no reflowed layouts, missing sections, or font fallbacks.</li>
          <li>Robots meta: NO unexpected noindex anywhere (the classic staging leak).</li>
          <li>Canonicals point at production URLs, not staging.</li>
          <li>Old URLs 301 to the right destinations; no new redirect chains.</li>
          <li>Analytics, tag manager, and pixels present and firing on key templates.</li>
          <li>Payment/checkout scripts intact; conversion CTAs exist, visible, correctly linked.</li>
          <li>Internal links on updated pages resolve; sitemap.xml regenerated and reachable.</li>
          <li>Page weight and response times within normal range of pre-deploy baseline.</li>
          <li>Forms submit end-to-end (a real test submission, not a glance).</li>
        </ul>

        <h2>Automating phase 3</h2>
        <p>
          Phase 3 is a diff problem: &ldquo;what does production look like now versus before the
          release?&rdquo; That is exactly what baseline change monitoring does. With MyKavo, the
          pre-deploy baseline is already there; run a scan after shipping and every difference
          across visual state, SEO tags, links, scripts, and performance is listed with severity
          and before-and-after evidence. Expected changes: approve into the new baseline.
          Unexpected ones: fixed while the deploy is still warm - not discovered in next month&apos;s
          traffic report. Check a single URL&apos;s redirect behavior anytime with the free{" "}
          <Link href="/tools/redirect-chain-checker">Redirect Chain Checker</Link>.
        </p>

        <FaqSection faqs={faqs} />
        <RelatedLinks links={related} />
        <SeoPageCta heading="Make post-deploy verification automatic." />
      </MarketingPageShell>
    </>
  );
}
