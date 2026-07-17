import type { MetadataRoute } from "next";
import { site } from "@/config/site";

/**
 * Crawl policy: everything public is crawlable, /api/ is not. AI crawlers
 * (AI Overviews, ChatGPT, Claude, Perplexity) are EXPLICITLY welcomed - AI
 * search is an acquisition channel, and /llms.txt gives them a curated
 * product summary to cite.
 */
const AI_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-Web",
  "anthropic-ai",
  "PerplexityBot",
  "Google-Extended",
  "Applebot-Extended",
  "cohere-ai",
  "CCBot",
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
  };
}
