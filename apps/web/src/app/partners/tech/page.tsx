import type { Metadata } from "next";
import Link from "next/link";
import { MarketingPageShell } from "@/components/landing/page-shell";
import { LeadForm } from "@/components/marketing/lead-form";
import { breadcrumbList, faqPage, jsonLdScript } from "@/lib/seo/structured-data";

export const metadata: Metadata = {
  title: "Technology Partner Program - Build with MyKavo",
  description:
    "For hosts, CMS platforms, deployment tools and reporting suites that want website change monitoring inside their own product. Apply to the MyKavo Technology Partner track.",
  keywords: [
    "website monitoring api partner",
    "saas technology partner program",
    "website change detection integration",
    "mykavo integration",
  ],
  alternates: { canonical: "/partners/tech" },
};

const faqs = [
  {
    q: "Who is the Technology Partner track for?",
    a: "Products whose users would benefit from knowing what changed on a website: hosting platforms, CMS and page builders, deployment and CI tools, SEO and reporting suites, and agencies with their own internal platform.",
  },
  {
    q: "Does MyKavo have a public API?",
    a: "Not yet as a published, self-serve product. A public API is deliberately out of scope until the core monitoring workflow is fully reliable, which is why this track starts with a conversation rather than a signup form and a key. Partners with a concrete integration in mind are exactly who we want to design it with.",
  },
  {
    q: "What can I integrate with today?",
    a: "Outbound alerting is available now: Slack, Discord, Microsoft Teams and generic webhooks, which is enough to push change events into another system. Anything beyond that - reading scans, triggering them, embedding results - is what this track exists to discuss.",
  },
  {
    q: "What does it cost?",
    a: "Nothing to apply or to discuss. Commercial terms depend entirely on the shape of the integration, and we would rather work that out with you than publish a tier table that fits nobody.",
  },
];

export default function TechPartnerPage() {
  return (
    <MarketingPageShell
      eyebrowText="partner program / technology"
      title="Technology Partner"
      intro="For products that want to know what changed on a website - hosts, CMS platforms, deployment tools, reporting suites. Tell us what you would build, and we will tell you honestly what is possible today and what is not."
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(faqPage(faqs)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(
            breadcrumbList([
              { name: "Partners", path: "/partners" },
              { name: "Technology Partner", path: "/partners/tech" },
            ]),
          ),
        }}
      />

      <h2>Where an integration makes sense</h2>
      <ul>
        <li>
          <strong>Hosting and deployment.</strong> Compare a site before and after a release, and
          surface regressions next to the deploy that caused them.
        </li>
        <li>
          <strong>CMS and page builders.</strong> Warn an editor when a change removes a canonical
          tag, breaks indexability or drops a conversion element.
        </li>
        <li>
          <strong>Reporting and SEO suites.</strong> Pull change history and audit findings into a
          report your users already read.
        </li>
        <li>
          <strong>Agency platforms.</strong> Put &quot;which client site needs attention&quot;
          into the dashboard your team already has open.
        </li>
      </ul>

      <h2>What exists today, plainly</h2>
      <p>
        Outbound alerting is production-ready: Slack, Discord, Microsoft Teams and generic
        webhooks carry change events into other systems now. A published public API is not
        available yet - it is deliberately out of scope until the core monitoring workflow is
        fully reliable, and we would rather say that than imply otherwise and waste a quarter of
        your roadmap.
      </p>
      <p>
        That is exactly why this track starts with a conversation. If you have a concrete
        integration in mind, you are the person we want shaping what gets built first.
      </p>

      <h2>Apply as a Technology Partner</h2>
      <LeadForm
        kind="partner-tech"
        submitLabel="Apply as a Technology Partner"
        successTitle="Application received"
        successBody="We review applications weekly and reply within five business days, either way."
        fields={[
          { name: "name", label: "Your name", required: true, placeholder: "Alex Morgan" },
          {
            name: "email",
            label: "Work email",
            type: "email",
            required: true,
            placeholder: "you@company.com",
          },
          { name: "company", label: "Company", required: true, placeholder: "Deployly" },
          {
            name: "website",
            label: "Product website",
            type: "url",
            required: true,
            placeholder: "https://deployly.com",
          },
          {
            name: "category",
            label: "What kind of product is it?",
            type: "select",
            required: true,
            options: [
              "Hosting",
              "CMS or page builder",
              "Deployment or CI",
              "SEO or reporting suite",
              "Agency platform",
              "Other",
            ],
          },
          {
            name: "message",
            label: "What would you build?",
            type: "textarea",
            required: true,
            placeholder:
              "We would show a before-and-after diff on every deploy, and block a release if a page loses its canonical tag…",
            help: "Be specific. It is the difference between a useful call and a generic one.",
          },
        ]}
      />

      <h2>Frequently asked questions</h2>
      {faqs.map((faq) => (
        <div key={faq.q}>
          <h3>{faq.q}</h3>
          <p>{faq.a}</p>
        </div>
      ))}

      <p>
        Managing client websites rather than building an integration?{" "}
        <Link href="/partners/agency">See the Agency Partner track</Link>.
      </p>
    </MarketingPageShell>
  );
}
