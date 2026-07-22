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
  title: "Website Maintenance Checklist - Weekly, Monthly & Quarterly Tasks",
  description:
    "A no-fluff website maintenance checklist: weekly, monthly, and quarterly tasks covering updates, backups, security, SEO health, performance, and content - plus which parts you should automate.",
  keywords: [
    "website maintenance checklist",
    "website maintenance tasks",
    "monthly website maintenance",
    "website upkeep checklist",
    "website maintenance plan",
    "agency website maintenance",
  ],
  alternates: { canonical: "/guides/website-maintenance-checklist" },
};

const faqs = [
  {
    q: "What does website maintenance include?",
    a: "Four buckets: software (CMS, plugin, theme, dependency updates), safety (backups, security scans, SSL, uptime), health (broken links, SEO tags, performance, forms), and content (accuracy, legal pages, freshness). A good checklist assigns each task a cadence - weekly, monthly, or quarterly - and an owner.",
  },
  {
    q: "How often should website maintenance be done?",
    a: "Weekly for updates, backup verification, and reviewing what changed on key pages; monthly for broken-link sweeps, performance checks, form tests, and content review; quarterly for access audits, dependency cleanups, and restore drills. Uptime and change detection should be continuous and automated, not calendar tasks.",
  },
  {
    q: "What is the most commonly skipped maintenance task?",
    a: "Verifying that updates did not break anything. Most teams run updates and glance at the homepage. The damage usually lands elsewhere - a form on the contact page, SEO tags on category pages, a script on checkout. Post-update verification across key pages is exactly what change monitoring automates.",
  },
  {
    q: "How do agencies use a maintenance checklist?",
    a: "As the backbone of maintenance retainers: the checklist defines the service, monitoring provides the evidence, and the monthly report proves the work. Automated change reports with before-and-after evidence make the retainer tangible to clients.",
  },
];

const related = [
  { href: "/guides/website-monitoring-checklist", label: "Website monitoring checklist" },
  { href: "/website-monitoring-for-wordpress", label: "Website monitoring for WordPress" },
  { href: "/guides/website-deployment-checklist", label: "Website deployment checklist" },
  { href: "/tools/bulk-url-status-checker", label: "Free tool: Bulk URL Status Checker" },
];

export default function MaintenanceChecklistPage() {
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
            The website maintenance
            <br />
            checklist.
          </>
        }
        intro="A practical website maintenance checklist organized by cadence: what to do weekly, monthly, and quarterly across updates, backups, security, SEO health, performance, and content - and which parts to automate so they actually happen."
      >
        <h2>Continuous (automate these - they should never be calendar tasks)</h2>
        <ul>
          <li>Uptime monitoring with immediate alerts.</li>
          <li>SSL certificate expiry warnings.</li>
          <li>
            Change detection on key pages - layout, content, SEO tags, links, scripts - against
            approved baselines.
          </li>
          <li>Automated backups on a schedule appropriate to how often the site changes.</li>
        </ul>

        <h2>Weekly</h2>
        <ul>
          <li>Apply CMS, plugin, theme, and dependency updates (security patches same-day).</li>
          <li>
            <strong>Verify the updates:</strong> review what actually changed on key pages after
            updating - not just &ldquo;the homepage still loads&rdquo;.
          </li>
          <li>Confirm the latest backup exists and is the expected size.</li>
          <li>Scan the week&apos;s change alerts; approve intentional changes, fix regressions.</li>
          <li>Check error logs or error-monitoring for new recurring entries.</li>
        </ul>

        <h2>Monthly</h2>
        <ul>
          <li>
            Broken-link sweep across the site (start with the free{" "}
            <Link href="/tools/bulk-url-status-checker">Bulk URL Status Checker</Link>).
          </li>
          <li>Submit-test every form and conversion path: contact, signup, checkout.</li>
          <li>Performance check on top pages - page weight, response time, Core Web Vitals trend.</li>
          <li>SEO spot check: titles, descriptions, canonicals, robots meta on money pages.</li>
          <li>Review analytics and tag coverage - pixels present and firing on key pages.</li>
          <li>Content pass: prices, dates, offers, team info still accurate.</li>
          <li>Remove unused plugins, themes, and admin accounts.</li>
        </ul>

        <h2>Quarterly</h2>
        <ul>
          <li>
            Restore a backup to staging - a backup you have never restored is a hope, not a
            plan.
          </li>
          <li>Access audit: rotate credentials, prune users, enforce 2FA.</li>
          <li>Dependency deep-clean: major version upgrades you deferred.</li>
          <li>Review legal pages (privacy, terms, cookies) against current practice.</li>
          <li>Crawl the site for orphaned pages and outdated landing pages.</li>
          <li>Re-review your monitoring coverage: new pages monitored, dead ones retired.</li>
        </ul>

        <h2>The maintenance trap: doing the work, skipping the proof</h2>
        <p>
          Most maintenance failures are not missed tasks - they are unverified ones. The update
          ran, the checkbox got ticked, and the contact form has been broken for three weeks.
          Closing the loop is cheap when it is automated: MyKavo baselines your key pages and
          tells you, after every update or edit, exactly what changed and whether it matters -
          with the before-and-after to prove it. Agencies attach those reports to retainers; see{" "}
          <Link href="/pricing">pricing</Link>.
        </p>

        <FaqSection faqs={faqs} />
        <RelatedLinks links={related} />
        <SeoPageCta heading="Automate the verification half of maintenance." />
      </MarketingPageShell>
    </>
  );
}
