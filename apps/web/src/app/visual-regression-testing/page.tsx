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
  title: "Visual Regression Testing - Automated Screenshot Comparison",
  description:
    "Visual regression testing catches unintended layout and design changes by comparing screenshots against an approved baseline. Learn how it works and how to run it on any live website without writing test code.",
  keywords: [
    "visual regression testing",
    "visual regression testing tools",
    "screenshot comparison testing",
    "visual testing for websites",
    "automated visual testing",
    "UI regression testing",
  ],
  alternates: { canonical: "/visual-regression-testing" },
};

const faqs = [
  {
    q: "What is visual regression testing?",
    a: "Visual regression testing compares a screenshot of a page against an approved baseline screenshot and flags pixel differences. It catches unintended visual changes - broken layouts, missing sections, overlapping elements, font swaps - that functional tests and uptime checks miss entirely.",
  },
  {
    q: "How is visual regression testing different from functional testing?",
    a: "Functional tests assert behavior: a button clicks, a form submits. Visual regression testing asserts appearance: the page still looks the way you approved. A page can pass every functional test while its hero section renders behind the navigation - only a visual comparison catches that.",
  },
  {
    q: "Do I need to write code to run visual regression tests?",
    a: "Not with monitoring-based tools. Code-based tools like Percy, Chromatic, or Playwright snapshots run inside your CI pipeline and need test code and CI access. Monitoring-based visual testing like MyKavo points at any live URL, captures baselines automatically, and re-checks on a schedule with no code and no CI integration.",
  },
  {
    q: "How do you avoid false positives from dynamic content?",
    a: "Good visual testing normalizes the page before comparing: fixed viewport and browser version, animations disabled, fonts awaited, and volatile regions (carousels, dates, ads) masked or ignored. MyKavo applies all of these plus configurable difference thresholds, so a rotating testimonial does not page you at 2 AM.",
  },
  {
    q: "How often should visual regression tests run?",
    a: "On every deploy at minimum. For agency and client sites where you do not control every deploy or plugin update, a daily scheduled visual check catches changes you did not make - which are often the ones that hurt most.",
  },
];

const related = [
  { href: "/guides/how-to-monitor-website-changes", label: "How to monitor website changes" },
  { href: "/website-content-monitoring", label: "Website content monitoring" },
  { href: "/guides/website-deployment-checklist", label: "Website deployment checklist" },
  { href: "/tools/website-change-detector", label: "Free tool: Website Change Detector" },
];

export default function VisualRegressionTestingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(faqJsonLd(faqs)) }}
      />
      <MarketingPageShell
        eyebrowText="visual regression testing"
        title={
          <>
            Visual regression testing,
            <br />
            without writing tests.
          </>
        }
        intro="Visual regression testing compares screenshots of your pages against an approved baseline and flags what changed. MyKavo runs it automatically on any live website: no test code, no CI pipeline, just severity-ranked alerts with before-and-after evidence."
      >
        <h2>Why visual bugs slip through everything else</h2>
        <p>
          Uptime monitors say the server responded. Unit tests say the functions return the right
          values. Neither notices when a CSS refactor pushes your pricing table off-screen on
          mobile, a font fails to load, or a cookie banner covers the signup button. Visual bugs
          are the failures your customers see first and your tooling sees last.
        </p>
        <p>
          Visual regression testing closes that gap by treating the rendered page itself as the
          thing under test.
        </p>

        <h2>How MyKavo runs visual regression testing</h2>
        <ol>
          <li>
            <strong>Baseline.</strong> MyKavo captures a full-page screenshot of every monitored
            page in a fixed browser environment (viewport, device scale, locale, timezone) and you
            approve it as the known-good state.
          </li>
          <li>
            <strong>Stabilize.</strong> Before every capture it disables animations and
            transitions, waits for fonts and network quiet, and applies your ignore rules - so
            comparisons are deterministic, not flaky.
          </li>
          <li>
            <strong>Compare.</strong> Each scheduled scan diffs the new screenshot against the
            baseline pixel by pixel, computes a difference percentage, and generates a visual diff
            image highlighting exactly which regions changed.
          </li>
          <li>
            <strong>Score and alert.</strong> Differences map to severity levels with configurable
            thresholds. Small drift stays quiet; a 30% visual change on your checkout page is
            flagged critical and alerts you immediately.
          </li>
          <li>
            <strong>Approve or fix.</strong> Intentional redesign? Approve it and it becomes the
            new baseline. Unintentional break? You have the before, the after, and the diff to
            hand your developer.
          </li>
        </ol>

        <h2>Monitoring-based vs code-based visual testing</h2>
        <table>
          <thead>
            <tr>
              <th></th>
              <th>Monitoring-based (MyKavo)</th>
              <th>Code-based (CI snapshot tools)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Setup</td>
              <td>Paste a URL, approve the baseline</td>
              <td>Test code + CI pipeline integration</td>
            </tr>
            <tr>
              <td>Covers</td>
              <td>Any live site, including ones you do not deploy</td>
              <td>Only apps whose pipeline you control</td>
            </tr>
            <tr>
              <td>Catches</td>
              <td>Deploys, plugin updates, CMS edits, third-party script changes</td>
              <td>Changes that go through the pipeline</td>
            </tr>
            <tr>
              <td>Runs</td>
              <td>On a schedule, continuously</td>
              <td>On each build</td>
            </tr>
            <tr>
              <td>Best for</td>
              <td>Agencies, client sites, marketing sites, WordPress/Shopify/Webflow</td>
              <td>Product teams with mature CI</td>
            </tr>
          </tbody>
        </table>
        <p>
          The two approaches complement each other. If you already snapshot-test your app in CI,
          scheduled monitoring still catches everything that happens outside a deploy: a CMS edit,
          an expired script, a plugin auto-update at 3 AM.
        </p>

        <h2>What visual monitoring pairs with</h2>
        <p>
          A layout can survive while the page still breaks. That is why MyKavo checks visual state
          alongside <Link href="/seo-monitoring">SEO tags</Link>,{" "}
          <Link href="/website-content-monitoring">content</Link>, links, scripts, performance,
          and uptime in the same scan - one alert tells the whole story of what changed.
        </p>

        <FaqSection faqs={faqs} />
        <RelatedLinks links={related} />
        <SeoPageCta heading="Run visual regression tests on your site tonight." />
      </MarketingPageShell>
    </>
  );
}
