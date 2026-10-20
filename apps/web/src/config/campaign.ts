/**
 * Time-boxed promotions: the one place a campaign's code, discount and dates
 * live. The banner, the pricing page, the billing page and checkout all read
 * this, so a campaign switches on and off by the clock with no deploy.
 *
 * The code itself is created in the Dodo dashboard (Sales > Discounts) with
 * the SAME percent, cycle limit, products and dates. This file never grants a
 * discount on its own: Dodo validates the code at checkout, and a code Dodo
 * rejects falls back to a normal checkout (see the checkout route).
 */

export interface Campaign {
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

export const CAMPAIGNS: readonly Campaign[] = [
  {
    id: "halloween-2026",
    name: "Halloween",
    code: "SPOOKY30",
    percent: 30,
    cycles: 3,
    // Dodo's start and expiry dates are whole days in the dashboard's time
    // zone (IST), and an expiry of 6 November stops the code as that day
    // begins - so the offer ends then too, never advertising a code that
    // checkout would refuse.
    startsAt: new Date("2026-10-20T00:00:00+05:30"),
    endsAt: new Date("2026-11-06T00:00:00+05:30"),
  },
];

/** The campaign running at `now`, if any. */
export function activeCampaign(now: Date = new Date()): Campaign | null {
  const t = now.getTime();
  return CAMPAIGNS.find((c) => t >= c.startsAt.getTime() && t < c.endsAt.getTime()) ?? null;
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
