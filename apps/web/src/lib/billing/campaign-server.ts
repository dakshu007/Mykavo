import { activeCampaign, type Campaign } from "@/config/campaign";
import { DODO_API_KEY, DODO_PRODUCT_ID, dodoApiBase } from "./config";
import { logger } from "@/lib/logger";

/**
 * The calendar's campaign, confirmed against the code in Dodo.
 *
 * The calendar says when an offer SHOULD run; only Dodo knows whether its
 * code will actually be accepted. Showing a banner for a code that was never
 * created (next year, say) would promise customers a discount checkout then
 * refuses. So a definite "no" from Dodo hides the offer:
 *  - the code doesn't exist (404),
 *  - it hasn't started or has expired (in its dates, or a 422 saying so),
 *  - its percent differs from what the banner would say,
 *  - it's restricted to products that don't include Pro.
 * When Dodo can't be asked (no API key, an outage, a key without discount
 * read access) the calendar decides: checkout still falls back to a normal
 * session if the code is refused, so nothing breaks.
 *
 * The offer ends at whichever comes first: the calendar window or the code's
 * expiry in Dodo.
 */

interface DodoDiscount {
  code?: string;
  type?: string;
  /** Basis points for percentage discounts: 3000 is 30%. */
  amount?: number;
  starts_at?: string | null;
  expires_at?: string | null;
  restricted_to?: string[] | null;
}

type Verdict = { live: true; expiresAt: Date | null } | { live: false } | { live: "unknown" };

const TTL_MS = 5 * 60_000;
const cache = new Map<string, { at: number; verdict: Verdict }>();

/** Pure: does this Dodo discount honour `campaign` at `now`? */
export function judgeDiscount(campaign: Campaign, d: DodoDiscount, now: Date): Verdict {
  if (d.type !== "percentage" || d.amount !== campaign.percent * 100) return { live: false };
  const t = now.getTime();
  if (d.starts_at && new Date(d.starts_at).getTime() > t) return { live: false };
  const expiresAt = d.expires_at ? new Date(d.expires_at) : null;
  if (expiresAt && expiresAt.getTime() <= t) return { live: false };
  const restricted = d.restricted_to ?? [];
  if (restricted.length > 0 && DODO_PRODUCT_ID && !restricted.includes(DODO_PRODUCT_ID)) return { live: false };
  return { live: true, expiresAt };
}

/** Pure: is this Dodo error body a code that isn't active right now? */
export function isInactiveCode(body: string): boolean {
  return /NOT_YET_ACTIVE|EXPIRED|INACTIVE|USAGE_LIMIT/i.test(body);
}

async function askDodo(campaign: Campaign, now: Date): Promise<Verdict> {
  if (!DODO_API_KEY) return { live: "unknown" };
  const hit = cache.get(campaign.code);
  if (hit && now.getTime() - hit.at < TTL_MS) return hit.verdict;

  let verdict: Verdict;
  try {
    const res = await fetch(`${dodoApiBase()}/discounts/code/${encodeURIComponent(campaign.code)}`, {
      headers: { authorization: `Bearer ${DODO_API_KEY}` },
      signal: AbortSignal.timeout(5_000),
      cache: "no-store",
    });
    if (res.status === 404) {
      verdict = { live: false };
    } else if (res.status === 422 && isInactiveCode(await res.text().catch(() => ""))) {
      // Dodo answers a code that exists but hasn't started (or has ended)
      // with a 422; checkout would refuse it, so no offer is shown.
      verdict = { live: false };
    } else if (!res.ok) {
      verdict = { live: "unknown" };
      logger.warn("campaign: Dodo discount lookup failed", { code: campaign.code, status: res.status });
    } else {
      verdict = judgeDiscount(campaign, (await res.json()) as DodoDiscount, now);
    }
  } catch (err) {
    verdict = { live: "unknown" };
    logger.warn("campaign: Dodo discount lookup error", {
      code: campaign.code,
      error: err instanceof Error ? err.message : String(err),
    });
  }
  if (verdict.live === false) {
    logger.warn("campaign: code is not live in Dodo, offer hidden", { campaign: campaign.id, code: campaign.code });
  }
  cache.set(campaign.code, { at: now.getTime(), verdict });
  return verdict;
}

/** The running campaign, if the calendar says so and Dodo doesn't say no. */
export async function getLiveCampaign(now: Date = new Date()): Promise<Campaign | null> {
  const campaign = activeCampaign(now);
  if (!campaign) return null;
  const verdict = await askDodo(campaign, now);
  if (verdict.live === false) return null;
  if (verdict.live === true && verdict.expiresAt && verdict.expiresAt < campaign.endsAt) {
    return { ...campaign, endsAt: verdict.expiresAt };
  }
  return campaign;
}

/** For tests. */
export function clearCampaignCache(): void {
  cache.clear();
}
