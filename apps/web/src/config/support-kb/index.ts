/**
 * The support assistant's knowledge base: every article, in category order.
 * Each file holds one or more categories; ids are unique across all of them
 * (checked by lib/support/kb.test.ts).
 */

import { ARTICLES as about } from "./about";
import { ARTICLES as account } from "./account";
import { ARTICLES as apps } from "./apps";
import { ARTICLES as billing } from "./billing";
import { ARTICLES as changesAlerts } from "./changes-alerts";
import { ARTICLES as gettingStarted } from "./getting-started";
import { ARTICLES as integrations } from "./integrations";
import { ARTICLES as shopify } from "./shopify";
import { ARTICLES as tools } from "./tools";
import { ARTICLES as troubleshooting } from "./troubleshooting";
import { ARTICLES as websitesScans } from "./websites-scans";
import { ARTICLES as wordpress } from "./wordpress";
import { SUPPORT_CATEGORIES, type SupportArticle, type SupportCategory } from "./types";

export { SUPPORT_CATEGORIES };
export type { SupportArticle, SupportCategory };

export const SUPPORT_ARTICLES: SupportArticle[] = [
  ...gettingStarted,
  ...websitesScans,
  ...changesAlerts,
  ...wordpress,
  ...shopify,
  ...integrations,
  ...billing,
  ...account,
  ...apps,
  ...tools,
  ...troubleshooting,
  ...about,
];

export const CATEGORY_ORDER = Object.keys(SUPPORT_CATEGORIES) as SupportCategory[];

export function articlesIn(category: SupportCategory): SupportArticle[] {
  return SUPPORT_ARTICLES.filter((a) => a.category === category);
}
