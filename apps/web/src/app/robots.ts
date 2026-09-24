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

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/api/"] },
      ...AI_CRAWLERS.map((userAgent) => ({
        userAgent,
        allow: "/",
        disallow: ["/api/"],
      })),
    ],
    sitemap: `${site.url}/sitemap.xml`,
    host: site.url,
  };
}
