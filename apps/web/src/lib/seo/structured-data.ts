/**
 * Shared schema.org builders (spec §48 SEO acquisition).
 *
 * Two audiences read this markup and they want different things:
 *
 *  - Search engines use it for rich results (FAQ accordions, breadcrumb
 *    trails, product pricing in the SERP).
 *  - AI answer engines - Google AI Overviews, ChatGPT Search, Perplexity,
 *    Claude - use it to decide whether a page can be *cited* as the answer to
 *    a question. A page that states its answer in machine-readable form is far
 *    likelier to be quoted than one that buries it in prose.
 *
 * Rule that keeps this honest: NEVER emit a fact here that is not also visible
 * on the rendered page. Schema that disagrees with the page is spam, gets
 * rich results revoked, and teaches answer engines to distrust the domain.
 * Every builder below is fed from the same constants the page renders.
 */

import { site } from "@/config/site";

/** Escape `<` so a JSON-LD payload can never break out of its script tag. */
export function jsonLdScript(payload: object): string {
  return JSON.stringify(payload).replace(/</g, "\\u003c");
}

export const ORGANIZATION_ID = `${site.url}/#organization`;
export const WEBSITE_ID = `${site.url}/#website`;

/** The publisher node every other node points at, so the graph stays linked. */
export function organizationNode() {
  return {
    "@type": "Organization",
    "@id": ORGANIZATION_ID,
    name: site.name,
    url: site.url,
    logo: `${site.url}/icon.png`,
    description: site.description,
    founder: { "@type": "Person", name: "Dakshesh B" },
  } as const;
}

export function websiteNode() {
  return {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    name: site.name,
    url: site.url,
    publisher: { "@id": ORGANIZATION_ID },
  } as const;
}

export interface FaqItem {
  q: string;
  a: string;
}

/**
 * FAQPage - the highest-leverage schema for AI answer engines, because each
 * question/answer pair is a self-contained citable unit. Only pass questions
 * whose answers are actually rendered on the page.
 */
export function faqPage(items: readonly FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
}

export interface Crumb {
  name: string;
  /** Path relative to the site root, e.g. "/guides/website-monitoring-checklist". */
  path: string;
}

/**
 * BreadcrumbList tells both crawlers and answer engines where a page sits in
 * the site's hierarchy, which is what turns a pile of pages into a structure
 * they can reason about. "Home" is prepended automatically.
 */
export function breadcrumbList(crumbs: readonly Crumb[]) {
  const all: Crumb[] = [{ name: "Home", path: "" }, ...crumbs];
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: all.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: `${site.url}${crumb.path}`,
    })),
  };
}

export interface OfferInput {
  name: string;
  priceUsd: number;
  description: string;
}

/**
 * SoftwareApplication + Offers. This is what lets an answer engine respond to
 * "how much does MyKavo cost" with real numbers instead of guessing from prose.
 * Prices come from config/plans.ts - never hardcode them here (spec §37).
 */
export function softwareApplicationNode(params: {
  offers: readonly OfferInput[];
  featureList: string;
}) {
  return {
    "@type": "SoftwareApplication",
    "@id": `${site.url}/#software`,
    name: site.name,
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "Website Monitoring Tool",
    operatingSystem: "Web",
    description: site.description,
    url: site.url,
    publisher: { "@id": ORGANIZATION_ID },
    offers: params.offers.map((offer) => ({
      "@type": "Offer",
      name: offer.name,
      price: String(offer.priceUsd),
      priceCurrency: "USD",
      description: offer.description,
      availability: "https://schema.org/InStock",
      url: `${site.url}/pricing`,
    })),
    featureList: params.featureList,
  };
}

/**
 * Everything MyKavo monitors, as one comma-separated string. Single source so
 * the homepage graph, the pricing page and llms.txt cannot drift apart - they
 * did drift once, when a week of shipped features never reached the metadata.
 */
export const FEATURE_LIST = [
  "Website change detection",
  "Visual regression monitoring with pixel diffs",
  "SEO change monitoring",
  "Technical SEO site audit",
  "Google Search Console integration",
  "E-E-A-T content analysis",
  "Broken link monitoring",
  "Third-party script monitoring",
  "Performance regression monitoring",
  "Lighthouse audits",
  "Uptime and SSL monitoring",
  "Conversion element monitoring",
  "White-label client reports",
].join(", ");

export interface BlogListItem {
  slug: string;
  title: string;
  publishedAt: Date | null;
}

/**
 * Blog + ItemList for the index. Gives answer engines the full post inventory
 * from one fetch rather than making them crawl every card.
 */
export function blogIndexGraph(posts: readonly BlogListItem[]) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Blog",
        "@id": `${site.url}/blog#blog`,
        name: `${site.name} Blog`,
        url: `${site.url}/blog`,
        description:
          "Guides and field notes on website change detection, regression monitoring, and technical SEO.",
        publisher: { "@id": ORGANIZATION_ID },
      },
      {
        "@type": "ItemList",
        itemListElement: posts.map((post, index) => ({
          "@type": "ListItem",
          position: index + 1,
          url: `${site.url}/blog/${post.slug}`,
          name: post.title,
        })),
      },
    ],
  };
}
