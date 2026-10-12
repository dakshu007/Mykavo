/**
 * The MyKavo support knowledge base: what the support assistant knows.
 *
 * Each article is one problem or question, the many ways people actually
 * ask it, and one verified answer. The assistant (lib/support/engine.ts)
 * matches a visitor's question against `questions` (plus title and
 * keywords) and replies with `answer`. Nothing is generated: every reply is
 * written here, checked against the product, so it can't invent features.
 *
 * Answer format (rendered by the chat widget):
 *  - Paragraphs separated by a blank line.
 *  - "- " bullet lines and "1. " numbered steps.
 *  - **bold**, and [label](/path) or [label](https://...) links.
 *  - Hyphens, never em dashes.
 */

export type SupportCategory =
  | "getting-started"
  | "websites-scans"
  | "changes-alerts"
  | "wordpress"
  | "shopify"
  | "integrations"
  | "billing"
  | "account"
  | "apps"
  | "tools"
  | "troubleshooting"
  | "about";

export interface SupportArticle {
  /** kebab-case, unique across the whole knowledge base. */
  id: string;
  category: SupportCategory;
  /** The canonical question, as a person would ask it. */
  title: string;
  /**
   * The ways people actually type this: full questions, short fragments,
   * typos, non-native English, frustrated phrasings ("wp plugin not
   * connecting", "how add site", "why no email alert"). 15-30 per article.
   */
  questions: string[];
  /** Extra single words or short terms that point here. */
  keywords?: string[];
  /** The reply. 40-140 words, plain English, steps when there is something to do. */
  answer: string;
  /** Article ids worth suggesting next. */
  related?: string[];
  /**
   * Held-out phrasings used ONLY by the accuracy test (never matched
   * against), so the test measures how well the assistant handles wording
   * it has not seen. 3 per article, different from `questions`.
   */
  evalQuestions?: string[];
}

export const SUPPORT_CATEGORIES: Record<SupportCategory, { title: string; blurb: string }> = {
  "getting-started": { title: "Getting started", blurb: "Sign up, add a website, your first baseline." },
  "websites-scans": { title: "Websites & scans", blurb: "Pages, scan schedules, baselines and limits." },
  "changes-alerts": { title: "Changes & alerts", blurb: "What MyKavo flags, severity, approving and emails." },
  wordpress: { title: "WordPress plugin", blurb: "Connecting, Safe Updates and update history." },
  shopify: { title: "Shopify", blurb: "Monitoring a store and the Shopify app." },
  integrations: { title: "Integrations", blurb: "Slack, webhooks, Search Console, deploy hooks." },
  billing: { title: "Plans & billing", blurb: "Prices, upgrades, invoices, cancelling, refunds." },
  account: { title: "Account & team", blurb: "Login, 2FA, workspaces, teammates, deleting data." },
  apps: { title: "Apps & extension", blurb: "Android app, Chrome extension and AI assistants." },
  tools: { title: "Free tools", blurb: "The free checkers and what they do." },
  troubleshooting: { title: "Troubleshooting", blurb: "When something isn't working as expected." },
  about: { title: "About MyKavo", blurb: "What MyKavo is, privacy, security and data." },
};
