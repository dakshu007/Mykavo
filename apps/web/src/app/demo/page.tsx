import type { Metadata } from "next";
import Link from "next/link";
import { MarketingPageShell } from "@/components/landing/page-shell";
import { LeadForm } from "@/components/marketing/lead-form";
import { breadcrumbList, faqPage, jsonLdScript } from "@/lib/seo/structured-data";

export const metadata: Metadata = {
  title: "Book a MyKavo Demo - See Change Monitoring on Your Own Site",
  description:
    "A 30-minute walkthrough on one of your own websites: baseline, first scan, a real change with before-and-after evidence, and the alert it would have sent. No slides.",
  keywords: ["mykavo demo", "website monitoring demo", "book a demo website monitoring"],
  alternates: { canonical: "/demo" },
};

const faqs = [
  {
    q: "What happens on a MyKavo demo?",
    a: "We add one of your own websites live on the call, run a baseline scan, and walk through a real change on a real page - the before value, the after value, the screenshot diff, the severity it was given and the alert it would have sent. It runs about 30 minutes, and it is a working session rather than a slide deck.",
  },
  {
    q: "Do I need to prepare anything?",
    a: "Just a website you are responsible for and, ideally, one page where something has broken before. Nothing to install: MyKavo visits pages the way a browser does, with no script to embed and no DNS change.",
  },
  {
    q: "Is a demo required to use MyKavo?",
    a: "No. The free plan covers one website with five monitored pages and needs no card, and most people never book a demo. Demos exist for teams evaluating MyKavo across many client sites, where it is faster to be shown the workflow than to infer it.",
  },
  {
    q: "How soon will someone reply?",
    a: "Within one business day, with times to choose from. If you would rather just ask a question, email support@mykavo.app instead - no call needed.",
  },
];

export default function DemoPage() {
  return (
    <MarketingPageShell
      eyebrowText="book a demo"
      title="See MyKavo on one of your own websites"
      intro="Thirty minutes, your site, no slides. We add a real website, run a baseline, and walk through an actual change end to end - what it was, what it is now, how severe MyKavo called it, and the alert you would have received."
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(faqPage(faqs)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(breadcrumbList([{ name: "Book a demo", path: "/demo" }])),
        }}
      />

      <h2>How the demo works</h2>
      <ol>
        <li>
          <strong>You send the form.</strong> Tell us the website you want to look at and roughly
          how many sites you manage. We reply within one business day with times.
        </li>
        <li>
          <strong>We set it up live, on your site.</strong> Adding the website, discovering its
          pages, choosing which to monitor. You see exactly how long it takes, because it is
          happening rather than being described.
        </li>
        <li>
          <strong>We run a baseline and approve it.</strong> The known-good state every future
          scan is compared against.
        </li>
        <li>
          <strong>We show you a real change.</strong> Usually by breaking something harmlessly on
          a staging page, or by walking through history on a site that has changed. You see the
          previous value, the current value, the screenshot diff and the severity.
        </li>
        <li>
          <strong>You ask the awkward questions.</strong> False positives, limits, what it does
          not do. Answers to those are also in{" "}
          <Link href="/docs">the documentation</Link>, so you can check them afterwards.
        </li>
      </ol>

      <h2>Who a demo is actually useful for</h2>
      <p>
        Agencies and teams looking after several sites, where the question is not &quot;does this
        work&quot; but &quot;does this fit how we work&quot;. If you manage one website, the{" "}
        <Link href="/pricing">free plan</Link> will answer that faster than a call will.
      </p>

      <h2>Request a demo</h2>
      <LeadForm
        kind="demo"
        submitLabel="Request a demo"
        successTitle="Request received"
        successBody="We will reply within one business day with a few times to choose from. If it is urgent, email support@mykavo.app."
        fields={[
          { name: "name", label: "Your name", required: true, placeholder: "Alex Morgan" },
          {
            name: "email",
            label: "Work email",
            type: "email",
            required: true,
            placeholder: "you@agency.com",
          },
          { name: "company", label: "Company", placeholder: "Morgan Digital" },
          {
            name: "website",
            label: "A website you would like to look at",
            type: "url",
            placeholder: "https://example.com",
            help: "It should be a site you own or manage.",
          },
          {
            name: "sites",
            label: "How many websites do you manage?",
            type: "select",
            options: ["1", "2-5", "6-25", "26-100", "100+"],
          },
          {
            name: "message",
            label: "Anything specific you want to see?",
            type: "textarea",
            placeholder: "We keep getting caught out by plugin updates changing meta tags…",
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
    </MarketingPageShell>
  );
}
