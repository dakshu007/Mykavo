import { isInternalEmail, prisma } from "@mykavo/database";

/**
 * Real, anonymized proof for the top of the homepage: what MyKavo actually
 * did in the last 30 days, and the serious changes it caught most recently.
 *
 * Honest by construction: counts come straight from the scan and change
 * tables, and each "recently caught" line is a real HIGH or CRITICAL change
 * event. Nothing identifying is ever shown: no site name, URL or page text,
 * only a generic label for the kind of change, the kind of site
 * (WordPress, Shopify or website) and how long ago. Team accounts are left
 * out of the recent list so test sites never appear there.
 */

const DAY_MS = 86_400_000;
const WINDOW_DAYS = 30;

export interface LiveProof {
  windowDays: number;
  scans: number;
  pageChecks: number;
  seriousCaught: number;
  pagesWatched: number;
  recent: { label: string; site: "WordPress site" | "Shopify store" | "Website"; ago: string }[];
}

/** Specific labels first; the category label is the fallback. */
const TYPE_LABELS: [RegExp, string][] = [
  [/noindex/, "Page set to noindex"],
  [/^robots_txt_blocks_all$/, "robots.txt started blocking the site"],
  [/^robots_txt_removed$/, "robots.txt disappeared"],
  [/^conversion_element_missing$/, "Buy button or form went missing"],
  [/^conversion_element_hidden$/, "Buy button or form got hidden"],
  [/^conversion_element_(href|text)_changed$/, "Call-to-action button changed"],
  [/^canonical_removed$/, "Canonical tag removed"],
  [/^canonical_changed$/, "Canonical tag changed"],
  [/^http_status_changed$/, "Page status code changed"],
  [/^final_url_changed$|^redirect_appeared$/, "Page started redirecting"],
  [/^internal_links_broken$/, "Internal links broke"],
  [/^script_removed$/, "Tracking script removed"],
  [/^script_added$/, "New third-party script appeared"],
  [/^sitemap_(removed|shrank)$/, "Sitemap shrank or disappeared"],
  [/^title_changed$/, "Page title changed"],
  [/^meta_description_(changed|removed)$/, "Meta description changed"],
  [/^h1_(changed|removed)$/, "Main heading changed"],
  [/^page_weight_increased$/, "Page weight jumped"],
  [/^response_time_increased$/, "Page got much slower"],
  [/^visual_difference$|redesigned$/, "Layout changed visibly"],
  [/^ai_crawlers_blocked$/, "AI crawlers got blocked"],
  [/^login_wall$|^bot_challenge$/, "Page started blocking visitors"],
];

const CATEGORY_LABELS: Record<string, string> = {
  AVAILABILITY: "Page went down or started erroring",
  VISUAL: "Layout changed visibly",
  SEO: "SEO tag changed",
  CONTENT: "Important content changed",
  LINKS: "Links broke",
  SCRIPT: "Tracking script changed",
  PERFORMANCE: "Page got slower or heavier",
  CONVERSION: "Buy button or form broke",
};

export function proofLabel(changeType: string, category: string): string {
  return TYPE_LABELS.find(([re]) => re.test(changeType))?.[1] ?? CATEGORY_LABELS[category] ?? "Important change caught";
}

export function siteKind(platforms: string[]): LiveProof["recent"][number]["site"] {
  if (platforms.includes("shopify")) return "Shopify store";
  if (platforms.includes("wordpress")) return "WordPress site";
  return "Website";
}

/** "just now", "35m ago", "5h ago", "yesterday", "4 days ago". */
export function agoLabel(at: Date, now: Date = new Date()): string {
  const mins = Math.max(0, Math.round((+now - +at) / 60_000));
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return days <= 1 ? "yesterday" : `${days} days ago`;
}

export async function loadLiveProof(now: Date = new Date()): Promise<LiveProof> {
  const since = new Date(+now - WINDOW_DAYS * DAY_MS);
  const done = { status: { in: ["COMPLETED", "PARTIAL"] as ("COMPLETED" | "PARTIAL")[] }, createdAt: { gte: since } };
  const [scans, checks, seriousCaught, pagesWatched, events] = await Promise.all([
    prisma.scan.count({ where: done }),
    prisma.scan.aggregate({ where: done, _sum: { pagesScanned: true } }),
    prisma.changeEvent.count({ where: { detectedAt: { gte: since }, severity: { in: ["HIGH", "CRITICAL"] } } }),
    prisma.monitoredPage.count({ where: { enabled: true, website: { status: "ACTIVE" } } }),
    prisma.changeEvent.findMany({
      where: { detectedAt: { gte: since }, severity: { in: ["HIGH", "CRITICAL"] } },
      orderBy: { detectedAt: "desc" },
      take: 80,
      select: {
        changeType: true,
        category: true,
        detectedAt: true,
        websiteId: true,
        website: {
          select: {
            siteConnections: { select: { platform: true } },
            workspace: { select: { owner: { select: { email: true } } } },
          },
        },
      },
    }),
  ]);

  const recent: LiveProof["recent"] = [];
  const seen = new Set<string>();
  for (const e of events) {
    if (isInternalEmail(e.website.workspace.owner?.email)) continue;
    const label = proofLabel(e.changeType, String(e.category));
    // One line per site and kind of change, so one noisy site can't fill the list.
    const key = `${e.websiteId}:${label}`;
    if (seen.has(key)) continue;
    seen.add(key);
    recent.push({ label, site: siteKind(e.website.siteConnections.map((c) => c.platform)), ago: agoLabel(e.detectedAt, now) });
    if (recent.length >= 8) break;
  }

  return {
    windowDays: WINDOW_DAYS,
    scans,
    pageChecks: checks._sum.pagesScanned ?? 0,
    seriousCaught,
    pagesWatched,
    recent,
  };
}
