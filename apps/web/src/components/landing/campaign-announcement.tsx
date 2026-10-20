"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Ghost, X } from "lucide-react";
import { PLAN_PRICES_USD } from "@mykavo/shared/plan-tier";
import { track } from "@/lib/analytics";
import {
  activeCampaign,
  campaignEndsLabel,
  campaignPrice,
  formatUsd,
  type Campaign,
} from "@/config/campaign";
import { AppAnnouncement } from "./app-announcement";

/**
 * The marketing pages' floating card: a running campaign's offer while it
 * lasts, the standing Chrome announcement otherwise. One card at a time - two
 * stacked notifications read as clutter.
 *
 * Decided after mount from the visitor's clock, never on the server: these
 * pages are cached, and an offer baked into the HTML would outlive its code.
 */
export function SiteAnnouncement() {
  const [campaign, setCampaign] = useState<Campaign | null | undefined>(undefined);

  useEffect(() => {
    const timer = window.setTimeout(() => setCampaign(activeCampaign()), 0);
    return () => window.clearTimeout(timer);
  }, []);

  if (campaign === undefined) return null;
  return campaign ? <CampaignAnnouncement campaign={campaign} /> : <AppAnnouncement />;
}

function dismissKey(campaign: Campaign): string {
  return `mykavo-campaign-dismissed:${campaign.id}`;
}

function wasDismissed(campaign: Campaign): boolean {
  try {
    return window.localStorage.getItem(dismissKey(campaign)) !== null;
  } catch {
    return false;
  }
}

function CampaignAnnouncement({ campaign }: { campaign: Campaign }) {
  const [shown, setShown] = useState(false);
  const [endsLabel, setEndsLabel] = useState("");
  // The homepage's sticky signup button takes the bottom of a phone screen
  // once the visitor is past the hero (same rule as StickyCta); the slim bar
  // steps aside then instead of stacking on it.
  const isHome = usePathname() === "/";
  const [pastHero, setPastHero] = useState(false);

  useEffect(() => {
    if (!isHome) return;
    const onScroll = () => setPastHero(window.scrollY > window.innerHeight * 1.5);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isHome]);

  useEffect(() => {
    if (wasDismissed(campaign)) return;
    // Arrives after the page settles, like the standing announcement.
    const timer = window.setTimeout(() => {
      setEndsLabel(campaignEndsLabel(campaign));
      setShown(true);
      track("campaign_banner_viewed", { campaign: campaign.id });
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [campaign]);

  function dismiss() {
    setShown(false);
    try {
      window.localStorage.setItem(dismissKey(campaign), String(Date.now()));
    } catch {
      // Private mode - it simply reappears next visit.
    }
  }

  if (!shown) return null;

  const pro = formatUsd(campaignPrice(PLAN_PRICES_USD.pro, campaign.percent));

  return (
    <div
      role="region"
      aria-label={`${campaign.name} offer`}
      /* Bottom-left on desktop like the standing announcement. Unlike it, this
         one shows on phones too (an offer applies on any device), as a slim
         bar at the very bottom. */
      className={`fixed bottom-4 left-4 right-4 z-40 sm:bottom-5 sm:right-auto sm:max-w-sm ${pastHero ? "max-sm:hidden" : ""}`}
    >
      {/* Phones: one slim line. The full card covered the homepage's URL box,
          the page's main action, on a 390px screen. */}
      <div className="flex items-center gap-2.5 rounded-full border border-[#151515] bg-[#151515] py-1.5 pl-1.5 pr-1.5 shadow-[4px_4px_0_#FF7A1A,4px_4px_0_1px_#151515] sm:hidden">
        <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-[#FF7A1A]">
          <Ghost className="size-4 text-[#151515]" aria-hidden />
        </span>
        <Link
          href="/pricing"
          onClick={() => track("campaign_banner_clicked", { campaign: campaign.id, placement: "mobile_bar" })}
          className="min-w-0 flex-1 truncate text-[13px] font-semibold text-[#F5F5F0]"
        >
          {campaign.name}: {campaign.percent}% off Pro
        </Link>
        <Link
          href="/pricing"
          onClick={() => track("campaign_banner_clicked", { campaign: campaign.id, placement: "mobile_bar" })}
          className="shrink-0 rounded-full bg-[#FF7A1A] px-3 py-1.5 text-[12px] font-semibold text-[#151515]"
        >
          Claim
        </Link>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="shrink-0 rounded-full p-1 text-[#9C9E93] hover:text-[#F5F5F0]"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>

      <div className="hidden items-start gap-3 rounded-2xl sm:flex border border-[#151515] bg-[#151515] p-4 shadow-[6px_6px_0_#FF7A1A,6px_6px_0_1px_#151515]">
        <span className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#FF7A1A]">
          <Ghost className="size-5 text-[#151515]" aria-hidden />
        </span>

        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#FF9A4D]">
            {campaign.name} offer · {endsLabel}
          </p>
          <p className="mt-1 text-[14px] font-semibold text-[#F5F5F0]">
            {campaign.percent}% off Pro and Agency for {campaign.cycles} months
          </p>
          <p className="mt-0.5 text-[12.5px] leading-5 text-[#9C9E93]">
            Pro from {pro}/month instead of ${PLAN_PRICES_USD.pro}. Code{" "}
            <span className="font-mono font-semibold text-[#F5F5F0]">{campaign.code}</span> is applied for you at
            checkout.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
            <Link
              href="/pricing"
              onClick={() => track("campaign_banner_clicked", { campaign: campaign.id })}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#FF7A1A] px-3.5 py-2 text-[12.5px] font-semibold text-[#151515] transition-colors hover:bg-[#ff9447]"
            >
              Claim {campaign.percent}% off
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </div>
        </div>

        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="-mr-1 -mt-1 shrink-0 rounded-full p-1.5 text-[#9C9E93] transition-colors hover:bg-white/10 hover:text-[#F5F5F0]"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}

/**
 * The pricing page's offer banner. Renders nothing outside a campaign, so the
 * cached page needs no rebuild when it ends.
 */
export function PricingCampaignBanner() {
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [endsLabel, setEndsLabel] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const c = activeCampaign();
      setCampaign(c);
      if (c) setEndsLabel(campaignEndsLabel(c));
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  if (!campaign) return null;

  const pro = formatUsd(campaignPrice(PLAN_PRICES_USD.pro, campaign.percent));
  const agency = formatUsd(campaignPrice(PLAN_PRICES_USD.agency, campaign.percent));

  return (
    <div className="mx-auto mb-10 flex max-w-3xl flex-col gap-4 rounded-2xl border border-[#151515] bg-[#151515] p-5 text-left shadow-[6px_6px_0_#FF7A1A,6px_6px_0_1px_#151515] sm:flex-row sm:items-center sm:p-6">
      <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#FF7A1A]">
        <Ghost className="size-6 text-[#151515]" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-[#FF9A4D]">
          {campaign.name} offer · {endsLabel}
        </p>
        <p className="mt-1 text-[17px] font-semibold text-[#F5F5F0]">
          {campaign.percent}% off Pro and Agency for your first {campaign.cycles} months
        </p>
        <p className="mt-1 text-[14px] leading-6 text-[#B8BAAE]">
          Pro <span className="text-[#F5F5F0]">{pro}/month</span>{" "}
          <span className="line-through">${PLAN_PRICES_USD.pro}</span>, Agency{" "}
          <span className="text-[#F5F5F0]">{agency}/month</span>{" "}
          <span className="line-through">${PLAN_PRICES_USD.agency}</span>. Code{" "}
          <span className="font-mono font-semibold text-[#F5F5F0]">{campaign.code}</span> is applied automatically at
          checkout. Regular price from month {campaign.cycles + 1}. Cancel anytime.
        </p>
      </div>
      <Link
        href="/signup"
        onClick={() => track("campaign_banner_clicked", { campaign: campaign.id, placement: "pricing" })}
        className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-[#FF7A1A] px-5 py-2.5 text-[14px] font-semibold text-[#151515] transition-colors hover:bg-[#ff9447]"
      >
        Start free, then upgrade
        <ArrowRight className="size-4" aria-hidden />
      </Link>
    </div>
  );
}
