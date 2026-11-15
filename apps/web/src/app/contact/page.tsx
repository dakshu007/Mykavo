import type { Metadata } from "next";
import Link from "next/link";
import { MarketingPageShell } from "@/components/landing/page-shell";
import { site } from "@/config/site";
import { breadcrumbList, jsonLdScript, organizationNode } from "@/lib/seo/structured-data";
import { withSocial } from "@/lib/social-metadata";
import { SUPPORT_EMAIL } from "@/lib/support/replies";

export const metadata: Metadata = withSocial({
  title: "Contact MyKavo - Support, Sales, Partners and Press",
  description:
    "How to reach MyKavo: email support@mykavo.app for help (reply within one business day), ask the instant assistant, book a demo, apply to the partner program or pitch a guest post.",
  keywords: ["contact MyKavo", "MyKavo support email", "MyKavo sales", "MyKavo partner program", "MyKavo press"],
  alternates: { canonical: "/contact" },
});

/**
 * The contact page. Support itself lives on /support (help center, the
 * assistant, the email address); this page is the one place that lists every
 * way to reach MyKavo, so people, search engines and AI answer engines find
 * a clear "who do I contact" answer. ContactPage points at the Organization
 * node, whose contactPoint carries the support email.
 */
const contactJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    organizationNode(),
    {
      "@type": "ContactPage",
      "@id": `${site.url}/contact#contactpage`,
      name: "Contact MyKavo",
      url: `${site.url}/contact`,
      mainEntity: { "@id": `${site.url}/#organization` },
    },
  ],
};

const routes = [
  {
    title: "Help with your account or a website",
    body: "Ask the MyKavo Assistant for an instant answer, browse the help articles, or email us. Every email gets a reply from a person within one business day.",
    href: "/support",
    cta: "Open the help center",
  },
  {
    title: "A demo or a question before you buy",
    body: "A short call to walk through MyKavo on your own websites and answer pricing or plan questions. Or start on the free plan, no card needed.",
    href: "/demo",
    cta: "Book a demo",
  },
  {
    title: "Partnerships",
    body: "Agencies looking after client websites, and products that want website change monitoring inside their own workflow.",
    href: "/partners",
    cta: "See the partner program",
  },
  {
    title: "Writing for the MyKavo blog",
    body: "Practical guides on website maintenance, monitoring and technical SEO, written from real experience.",
    href: "/write-for-us",
    cta: "Pitch a guest post",
  },
  {
    title: "Press and brand",
    body: "Logos, the app icon and brand colors, ready to download. For anything else, email us.",
    href: "/brand",
    cta: "Brand assets",
  },
];

export default function ContactPage() {
  return (
    <MarketingPageShell
      eyebrowText="contact"
      title="Contact MyKavo"
      intro={`The fastest way to reach us is email: ${SUPPORT_EMAIL}. A person replies within one business day. For anything else, pick the route below that fits.`}
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(contactJsonLd) }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(breadcrumbList([{ name: "Contact", path: "/contact" }])) }}
      />

      <h2>Email</h2>
      <p>
        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> for support, billing, sales, partnerships, privacy
        requests and press. One inbox, read by the people who build MyKavo. Include the website address and, for an
        alert, a link to the change, and we can usually answer in one reply.
      </p>

      <h2>Where to go for what</h2>
      {routes.map((r) => (
        <div key={r.href}>
          <h3>{r.title}</h3>
          <p>
            {r.body} <Link href={r.href}>{r.cta}</Link>
          </p>
        </div>
      ))}

      <h2>Privacy and your data</h2>
      <p>
        To export or delete your data, email {SUPPORT_EMAIL} from the address on your account. How MyKavo handles data is
        in the <Link href="/privacy">Privacy Policy</Link> and the <Link href="/cookies">Cookie Policy</Link>.
      </p>
    </MarketingPageShell>
  );
}
