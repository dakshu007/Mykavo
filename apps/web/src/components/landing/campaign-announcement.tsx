"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Ghost, Tag } from "lucide-react";
import { PLAN_PRICES_USD } from "@mykavo/shared/plan-tier";
import { track } from "@/lib/analytics";
import { activeCampaign, campaignEndsLabel, campaignPlansLabel, campaignPrice, formatUsd, type Campaign } from "@/config/campaign";
import { PROMO_ATTR, useLiveCampaign } from "@/lib/campaign-client";
import { PromoBar } from "@/components/promo/promo-bar";

/**
 * The marketing pages' offer bar, pinned to the top of every page that has
 * the nav.
 *
 * The <head> boot script already reserved its space if the calendar says an
 * offer is on, so it fills that space at once from the calendar, then follows
 * the server's answer (which checks the code with Dodo): confirmed, it stays;
 * refused, it goes and the space is given back.
 */
export function SitePromoBar() {
  const live = useLiveCampaign();
  const [calendar, setCalendar] = useState<Campaign | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (document.documentElement.hasAttribute(PROMO_ATTR)) setCalendar(activeCampaign());
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (live === undefined) return;
    const root = document.documentElement;
    if (live) root.setAttribute(PROMO_ATTR, "");
    else root.removeAttribute(PROMO_ATTR);
  }, [live]);

  const campaign = live === undefined ? calendar : live;
  if (!campaign) return null;
  return <PromoBar campaign={campaign} variant="fixed" href={campaign.page} placement="site_bar" />;
}

/**
 * The pricing page's offer banner. Renders nothing outside a campaign, so the
 * cached page needs no rebuild when it ends.
 */
export function PricingCampaignBanner() {
  const campaign = useLiveCampaign();
  const [endsLabel, setEndsLabel] = useState("");

  useEffect(() => {
    if (!campaign) return;
    const timer = window.setTimeout(() => setEndsLabel(campaignEndsLabel(campaign)), 0);
    return () => window.clearTimeout(timer);
  }, [campaign]);

  if (!campaign) return null;

  const bf = campaign.theme === "black-friday";
  const prices = campaign.plans
    .filter((p): p is "pro" | "agency" => p === "pro" || p === "agency")
    .map((p) => ({
      name: p === "pro" ? "Pro" : "Agency",
      regular: PLAN_PRICES_USD[p],
      offer: formatUsd(campaignPrice(PLAN_PRICES_USD[p], campaign.percent)),
    }));

  return (
    <div
      className={`mx-auto mb-10 flex max-w-3xl flex-col gap-4 rounded-2xl border p-5 text-left sm:flex-row sm:items-center sm:p-6 ${bf ? "border-[#0B0B0B] bg-[#0B0B0B] shadow-[6px_6px_0_#FFCF00,6px_6px_0_1px_#0B0B0B]" : "border-[#151515] bg-[#151515] shadow-[6px_6px_0_#FF7A1A,6px_6px_0_1px_#151515]"}`}
    >
      {bf ? (
        <span className="bf-stamp inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#FFCF00]">
          <Tag className="size-6 text-[#0B0B0B]" aria-hidden />
        </span>
      ) : (
        <span className="promo-bob inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#FF7A1A]">
          <Ghost className="size-6 text-[#151515]" aria-hidden />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className={`font-mono text-[11px] font-bold uppercase tracking-[0.14em] ${bf ? "text-[#FFCF00]" : "text-[#FF9A4D]"}`}>
          {campaign.name} offer{endsLabel ? ` · ${endsLabel}` : ""}
        </p>
        <p className="mt-1 text-[17px] font-semibold text-[#F5F5F0]">
          {campaign.percent}% off {campaignPlansLabel(campaign)} for your first {campaign.cycles} months
        </p>
        <p className="mt-1 text-[14px] leading-6 text-[#B8BAAE]">
          {prices.map((p, i) => (
            <span key={p.name}>
              {i > 0 ? ", " : ""}
              {p.name} <span className="text-[#F5F5F0]">{p.offer}/month</span>{" "}
              <span className="line-through">${p.regular}</span>
            </span>
          ))}
          . Code <span className="font-mono font-semibold text-[#F5F5F0]">{campaign.code}</span> is applied
          automatically at checkout on monthly billing. Regular price from month {campaign.cycles + 1}. Cancel anytime.
        </p>
      </div>
      <Link
        href={bf ? campaign.page : "/signup"}
        onClick={() => track("campaign_banner_clicked", { campaign: campaign.id, placement: "pricing" })}
        className={`inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full px-5 py-2.5 text-[14px] font-semibold transition-colors ${bf ? "bf-glow bg-[#FFCF00] text-[#0B0B0B] hover:bg-[#ffdb3d]" : "promo-glow bg-[#FF7A1A] text-[#151515] hover:bg-[#ff9447]"}`}
      >
        {bf ? "See the Black Friday deal" : "Start free, then upgrade"}
        <ArrowRight className="size-4" aria-hidden />
      </Link>
    </div>
  );
}
