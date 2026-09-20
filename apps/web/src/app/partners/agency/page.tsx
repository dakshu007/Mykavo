import type { Metadata } from "next";
import Link from "next/link";
import { MarketingPageShell } from "@/components/landing/page-shell";
import { LeadForm } from "@/components/marketing/lead-form";
import { breadcrumbList, faqPage, jsonLdScript } from "@/lib/seo/structured-data";

export const metadata: Metadata = {
  title: "Agency Partner Program - Monitor Client Websites with MyKavo",
  description:
    "For agencies and maintenance teams looking after client websites: white-label reporting, a workspace built for many sites, and a direct line to us. Apply to the MyKavo Agency Partner track.",
  keywords: [
    "website monitoring agency partner",
    "white label website monitoring",
    "agency website maintenance tools",
    "mykavo agency program",
  ],
  alternates: { canonical: "/partners/agency" },
};

const faqs = [
  {
    q: "Who is the Agency Partner track for?",
    a: "Agencies, freelancers and maintenance teams responsible for websites they did not necessarily build - WordPress, Shopify, Webflow or custom. If a client calls you when their site breaks, this track is aimed at you.",
  },
  {
    q: "Is there a minimum number of client sites?",
    a: "No hard minimum, but the track is most useful once you are past a handful of sites, because that is where checking manually stops being possible and reporting starts to matter.",
  },
  {
    q: "Can I put my own branding on the reports?",
    a: "Yes. Client reports are white-label: your logo and colours, scheduled, and written to be forwarded to a client without editing.",
  },
  {
    q: "Do partners get a discount?",
    a: "The program is not a discount scheme. It is about reporting, workspace structure and support. If volume pricing makes sense for your portfolio we will discuss it on the call rather than publishing a tier table nobody fits.",
  },
];

export default function AgencyPartnerPage() {
  return (
    <MarketingPageShell
      eyebrowText="partner program / agency"
      title="Agency Partner"
      intro="For teams looking after websites they do not own. The problem is rarely one site - it is knowing which of ninety needs attention this morning, and being able to show a client what happened without writing the report by hand."
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
              { name: "Agency Partner", path: "/partners/agency" },
            ]),
          ),
        }}
      />

      <h2>What the track includes</h2>
      <ul>
        <li>
          <strong>White-label client reports.</strong> Your branding, on a schedule, ready to
          forward without editing.
        </li>
        <li>
          <strong>A workspace structure built for many sites.</strong> One dashboard answering
          &quot;which client needs me today&quot;, rather than one login per site.
        </li>
        <li>
          <strong>Onboarding help for your portfolio.</strong> Getting sites in, choosing pages
          worth monitoring, and masking the noisy regions so alerts stay trustworthy.
        </li>
        <li>
          <strong>A direct line.</strong> Somewhere to send &quot;this alert looks wrong&quot;
          and get an answer from someone who can change the product.
        </li>
        <li>
          <strong>Input on the roadmap.</strong> Agency needs drove conversion-element
          monitoring and white-label reporting; partner requests are read.
        </li>
      </ul>

      <h2>What we ask in return</h2>
      <p>
        Honest feedback, including when something does not work, and a willingness to tell us what
        broke on a client site that MyKavo should have caught and did not. That is the most
        valuable thing a partner gives us, and it is worth more than a logo on a page.
      </p>
      <p>
        We do not ask for a backlink, a case study, or a minimum spend as a condition of joining.
      </p>

      <h2>Before you apply</h2>
      <p>
        If you have not used MyKavo yet, put one client site on{" "}
        <Link href="/pricing">the free plan</Link> first - one website, five pages, no card. The
        conversation is far more useful when you have seen a real baseline and a real change. The{" "}
        <Link href="/docs/getting-started/quick-start">quick start</Link> takes about ten minutes.
      </p>

      <h2>Apply as an Agency Partner</h2>
      <LeadForm
        kind="partner-agency"
        submitLabel="Apply as an Agency Partner"
        successTitle="Application received"
        successBody="We review applications weekly and reply within five business days, either way."
        fields={[
          { name: "name", label: "Your name", required: true, placeholder: "Alex Morgan" },
          {
            name: "email",
            label: "Work email",
            type: "email",
            required: true,
            placeholder: "you@agency.com",
          },
          { name: "company", label: "Agency name", required: true, placeholder: "Morgan Digital" },
          {
            name: "website",
            label: "Agency website",
            type: "url",
            required: true,
            placeholder: "https://morgandigital.com",
          },
          {
            name: "clientSites",
            label: "Client websites you look after",
            type: "select",
            required: true,
            options: ["1-5", "6-25", "26-50", "51-100", "100+"],
          },
          {
            name: "platforms",
            label: "Main platforms",
            placeholder: "WordPress, Shopify, Webflow…",
          },
          {
            name: "message",
            label: "What would you want from a partnership?",
            type: "textarea",
            placeholder:
              "Client reporting, catching plugin updates that change meta tags, proving to clients that something broke before we fixed it…",
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
        Building an integration rather than managing client sites?{" "}
        <Link href="/partners/tech">See the Technology Partner track</Link>.
      </p>
    </MarketingPageShell>
  );
}
