/**
 * Seasonal promotions: the one place a campaign's code, discount and dates
 * live. The top offer bar, the pricing page, the billing page and checkout
 * all read this, so a campaign switches on and off by the clock with no
 * deploy, and comes back on its own the next year.
 *
 * The code itself lives in the Dodo dashboard (Sales > Discounts) with the
 * SAME percent, cycle limit and products. Before anything is shown, the
 * server asks Dodo whether the code is live (lib/billing/campaign-server.ts):
 * a code that was never created, has expired or has the wrong percent shows
 * no offer at all, so the site never promises a discount checkout can't give.
 *
 * EVERY YEAR: extend the code's start and expiry dates in Dodo to cover the
 * window below (or create it again). Nothing in the code needs to change.
 */

export interface Campaign {
  /** Unique per run, e.g. "halloween-2026". */
  id: string;
  /** Shown to people: "Halloween". */
  name: string;
  /** The Dodo discount code, exactly as created there. */
  code: string;
  /** Percent off, as configured in Dodo. */
  percent: number;
  /** Billing cycles the discount covers (Dodo "subscription cycle limit"). */
  cycles: number;
  startsAt: Date;
  /** Exclusive: the campaign is over at this instant. */
  endsAt: Date;
}

interface Window {
  startsAt: Date;
  endsAt: Date;
}

interface SeasonalCampaign {
  key: string;
  name: string;
  code: string;
  percent: number;
  cycles: number;
  /** The yearly window. */
  window: (year: number) => Window;
  /** A year that runs on different dates (or with a different code). */
  overrides?: Record<number, Partial<Window> & { code?: string }>;
}

/** Midnight at the start of a day, India time - the Dodo dashboard's zone. */
function istMidnight(year: number, month: number, day: number): Date {
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return new Date(`${year}-${mm}-${dd}T00:00:00+05:30`);
}

export const SEASONAL_CAMPAIGNS: readonly SeasonalCampaign[] = [
  {
    key: "halloween",
    name: "Halloween",
    code: "SPOOKY30",
    percent: 30,
    cycles: 3,
    // A month before Halloween, through the end of 31 October.
    window: (year) => ({ startsAt: istMidnight(year, 10, 1), endsAt: istMidnight(year, 11, 1) }),
    overrides: {
      // The first run started late and runs to the Dodo code's expiry.
      2026: { startsAt: istMidnight(2026, 10, 20), endsAt: istMidnight(2026, 11, 6) },
    },
  },
];

/** Every seasonal campaign as it runs in `year`. */
export function campaignsForYear(year: number): Campaign[] {
  return SEASONAL_CAMPAIGNS.map((s) => {
    const o = s.overrides?.[year];
    const w = s.window(year);
    return {
      id: `${s.key}-${year}`,
      name: s.name,
      code: o?.code ?? s.code,
      percent: s.percent,
      cycles: s.cycles,
      startsAt: o?.startsAt ?? w.startsAt,
      endsAt: o?.endsAt ?? w.endsAt,
    };
  });
}

/**
 * The campaign running at `now` by the calendar alone. Prefer
 * getLiveCampaign (server) or useLiveCampaign (browser), which also check the
 * code is live in Dodo.
 */
export function activeCampaign(now: Date = new Date()): Campaign | null {
  const t = now.getTime();
  const year = now.getUTCFullYear();
  // A window can straddle New Year in UTC terms; look at both years.
  for (const y of [year, year - 1]) {
    const hit = campaignsForYear(y).find((c) => t >= c.startsAt.getTime() && t < c.endsAt.getTime());
    if (hit) return hit;
  }
  return null;
}

/**
 * [start, end) epoch-millisecond pairs for the next few years, for the
 * <head> script that reserves the offer bar's space before first paint.
 */
export function campaignWindows(fromYear: number, years = 10): [number, number][] {
  const out: [number, number][] = [];
  for (let y = fromYear - 1; y < fromYear + years; y++) {
    for (const c of campaignsForYear(y)) out.push([c.startsAt.getTime(), c.endsAt.getTime()]);
  }
  return out;
}

/** The discounted monthly price, to the cent: $20 at 30% is 14, $79 is 55.3. */
export function campaignPrice(regularUsd: number, percent: number): number {
  return Math.round(regularUsd * (100 - percent)) / 100;
}

/** "$14" or "$55.30" - whole dollars stay whole. */
export function formatUsd(amount: number): string {
  return Number.isInteger(amount) ? `$${amount}` : `$${amount.toFixed(2)}`;
}

/** Whole days left, counting a part day as one: "ends in 3 days". */
export function campaignDaysLeft(campaign: Campaign, now: Date = new Date()): number {
  return Math.max(0, Math.ceil((campaign.endsAt.getTime() - now.getTime()) / 86_400_000));
}

/** "Ends today", "Ends tomorrow", "Ends in 5 days". */
export function campaignEndsLabel(campaign: Campaign, now: Date = new Date()): string {
  const ms = campaign.endsAt.getTime() - now.getTime();
  if (ms <= 24 * 3_600_000) return "Ends today";
  if (ms <= 48 * 3_600_000) return "Ends tomorrow";
  return `Ends in ${campaignDaysLeft(campaign, now)} days`;
}

/** The time left, split for a countdown. */
export function countdownParts(endsAt: Date, now: Date = new Date()) {
  const total = Math.max(0, Math.floor((endsAt.getTime() - now.getTime()) / 1000));
  return {
    days: Math.floor(total / 86_400),
    hours: Math.floor((total % 86_400) / 3_600),
    minutes: Math.floor((total % 3_600) / 60),
    seconds: total % 60,
    done: total === 0,
  };
}

/** The JSON shape /api/campaign sends to the browser. */
export interface CampaignJson {
  id: string;
  name: string;
  code: string;
  percent: number;
  cycles: number;
  startsAt: string;
  endsAt: string;
}

export function campaignToJson(c: Campaign): CampaignJson {
  return { ...c, startsAt: c.startsAt.toISOString(), endsAt: c.endsAt.toISOString() };
}

export function campaignFromJson(j: CampaignJson): Campaign {
  return { ...j, startsAt: new Date(j.startsAt), endsAt: new Date(j.endsAt) };
}
