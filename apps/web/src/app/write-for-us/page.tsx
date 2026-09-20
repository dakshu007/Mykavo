import type { Metadata } from "next";
import Link from "next/link";
import { MarketingPageShell } from "@/components/landing/page-shell";
import { LeadForm } from "@/components/marketing/lead-form";
import { breadcrumbList, faqPage, jsonLdScript } from "@/lib/seo/structured-data";

export const metadata: Metadata = {
  title: "Write for Us - Guest Posts on Website Monitoring and Technical SEO",
  description:
    "Pitch a guest post to the MyKavo blog. We publish practical writing on website change monitoring, regression prevention, technical SEO and running client sites - from people who have actually done the work.",
  keywords: [
    "write for us website monitoring",
    "technical seo write for us",
    "guest post website monitoring",
    "submit a guest post seo",
  ],
  alternates: { canonical: "/write-for-us" },
};

const faqs = [
  {
    q: "What does MyKavo publish?",
    a: "Practical writing about keeping websites working: change and regression monitoring, technical SEO, deployment hygiene, incident stories, and how agencies run maintenance at scale. The test is whether a reader could do something differently on Monday because they read it.",
  },
  {
    q: "Do you accept links in guest posts?",
    a: "One relevant link to your own site in the author bio, always. Links inside the body are fine where they genuinely support a point, and they are nofollowed if they are commercial. We do not sell links or accept paid placements, so please do not ask - it wastes your time and ours.",
  },
  {
    q: "How long should a guest post be?",
    a: "Long enough to be useful and no longer - usually 1,200 to 2,000 words. We would rather have 900 words of something you actually did than 2,500 words of general advice.",
  },
  {
    q: "How long until I hear back?",
    a: "We reply to every pitch within five business days, including the ones we turn down. If a pitch is accepted we will agree an angle and a deadline before you write the whole thing.",
  },
];

export default function WriteForUsPage() {
  return (
    <MarketingPageShell
      eyebrowText="write for us"
      title="Write for the MyKavo blog"
      intro="We publish practical writing about keeping websites working - change monitoring, regressions, technical SEO and the realities of looking after client sites. If you have done the work and can explain it, we would like to read your pitch."
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(faqPage(faqs)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(breadcrumbList([{ name: "Write for us", path: "/write-for-us" }])),
        }}
      />

      <h2>What we are looking for</h2>
      <ul>
        <li>
          <strong>Things that actually happened.</strong> The deploy that removed a canonical tag.
          The plugin update that dropped the analytics script. What it cost, and how you caught it.
        </li>
        <li>
          <strong>Process that survives contact with clients.</strong> How you run maintenance
          across thirty sites, what you check before and after a release, how you report to people
          who do not read technical detail.
        </li>
        <li>
          <strong>Technical depth.</strong> Crawling, indexability, structured data, Core Web
          Vitals, sitemaps, redirects - written for someone who already knows the basics.
        </li>
        <li>
          <strong>Honest comparisons and post-mortems.</strong> Including ones where the tooling,
          ours included, did not help.
        </li>
      </ul>

      <h2>What we will not publish</h2>
      <ul>
        <li>Anything written mainly to place a link. It is obvious, and it is an instant no.</li>
        <li>AI-generated filler, or a rewrite of an article that already ranks.</li>
        <li>Generic listicles with no first-hand experience behind them.</li>
        <li>Pieces that need fake statistics or invented case studies to make their point.</li>
      </ul>

      <h2>How it works</h2>
      <ol>
        <li>
          <strong>Send a pitch, not a finished draft.</strong> A working title, the angle, and two
          or three sentences on what the reader will be able to do afterwards.
        </li>
        <li>
          <strong>We reply within five business days</strong> - including a no, with a reason.
        </li>
        <li>
          <strong>If it is a yes,</strong> we agree the angle, rough length and a deadline before
          you write.
        </li>
        <li>
          <strong>We edit for clarity, not for voice.</strong> You see the edited version before
          it goes live, and you keep a byline with one link to your own site.
        </li>
      </ol>

      <h2>Pitch us</h2>
      <LeadForm
        kind="guest-post"
        submitLabel="Send pitch"
        successTitle="Pitch received"
        successBody="We read every pitch and reply within five business days, including the ones we turn down."
        fields={[
          { name: "name", label: "Your name", required: true, placeholder: "Alex Morgan" },
          {
            name: "email",
            label: "Email",
            type: "email",
            required: true,
            placeholder: "you@example.com",
          },
          {
            name: "website",
            label: "Your site or portfolio",
            type: "url",
            placeholder: "https://example.com",
          },
          {
            name: "title",
            label: "Working title",
            required: true,
            placeholder: "What a broken canonical tag cost one client in six weeks",
          },
          {
            name: "message",
            label: "The pitch",
            type: "textarea",
            required: true,
            placeholder:
              "The angle, and what a reader will be able to do differently afterwards. If you have written something similar before, link it.",
            help: "A few sentences is plenty. Please do not send a finished draft.",
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
        Want to see what we publish first? <Link href="/blog">Read the blog</Link>.
      </p>
    </MarketingPageShell>
  );
}
