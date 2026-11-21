import type { MetadataRoute } from "next";
import { site } from "@/config/site";

/**
 * Crawl policy: everything public is crawlable, /api/ is not. AI crawlers
 * (AI Overviews, ChatGPT, Claude, Perplexity) are EXPLICITLY welcomed - AI
 * search is an acquisition channel, and /llms.txt gives them a curated
 * product summary to cite.
 */
const AI_CRAWLERS = [
  // Training and search indexes
  "GPTBot",
  "OAI-SearchBot",
  "ClaudeBot",
  "Claude-SearchBot",
  "anthropic-ai",
  "PerplexityBot",
  "Google-Extended",
  "Applebot-Extended",
  "Amazonbot",
  "Meta-ExternalAgent",
  "DuckAssistBot",
  "cohere-ai",
  "CCBot",
  // Agents fetching a page because a person asked them to
  "ChatGPT-User",
  "Claude-User",
  "Claude-Web",
  "Perplexity-User",
  "MistralAI-User",
];

/**
 * Public files that happen to be served from under /api/ - blog images,
 * narration audio and brand logos. Blocking them hid every blog post's image
 * and audio (the AudioObject in its JSON-LD) from crawlers. The more specific
 * Allow wins over the /api/ Disallow for Google, Bing and the AI crawlers.
 */
const PUBLIC_API_ASSETS = ["/api/blog-images/", "/api/blog-audio/", "/api/brand-logos/"];

export default function robots(): MetadataRoute.Robots {
  const allow = ["/", ...PUBLIC_API_ASSETS];
  return {
    rules: [
      { userAgent: "*", allow, disallow: ["/api/"] },
      ...AI_CRAWLERS.map((userAgent) => ({
        userAgent,
        allow,
        disallow: ["/api/"],
      })),
    ],
    sitemap: `${site.url}/sitemap.xml`,
    host: site.url,
  };
}
