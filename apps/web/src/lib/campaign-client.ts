"use client";

import { useEffect, useState } from "react";
import { campaignFromJson, type Campaign, type CampaignJson } from "@/config/campaign";

/**
 * The live campaign for the browser, from /api/campaign (which checks the
 * code with Dodo). One request per page load, shared by every component that
 * asks: the top bar and the pricing banner read the same answer.
 *
 * undefined while loading, null when there is no offer.
 */
let pending: Promise<Campaign | null> | null = null;

function load(): Promise<Campaign | null> {
  pending ??= fetch("/api/campaign")
    .then((r) => (r.ok ? (r.json() as Promise<{ campaign: CampaignJson | null }>) : { campaign: null }))
    .then((body) => (body.campaign ? campaignFromJson(body.campaign) : null))
    .catch(() => null);
  return pending;
}

export function useLiveCampaign(): Campaign | null | undefined {
  const [campaign, setCampaign] = useState<Campaign | null | undefined>(undefined);
  useEffect(() => {
    let alive = true;
    void load().then((c) => {
      if (alive) setCampaign(c);
    });
    return () => {
      alive = false;
    };
  }, []);
  return campaign;
}

/** Set by the <head> boot script when the calendar says an offer is on. */
export const PROMO_ATTR = "data-promo";
