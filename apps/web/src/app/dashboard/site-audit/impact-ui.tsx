import { Bot, ShieldCheck, ShoppingCart, Users } from "lucide-react";
import {
  AUDIT_CHECKS,
  IMPACT_AREA_LABEL,
  summarizeImpact,
  type AuditImpactArea,
  type AuditIssueGroup,
} from "@mykavo/seo-audit";
import { Card } from "@/components/ui/card";

/**
 * Site Audit, in business terms: what the issues on a site can cost its
 * owner (visitors, sales and leads, trust, AI answers), next to the SEO
 * explanation of what each issue is.
 */

const AREA_ICON: Record<AuditImpactArea, typeof Users> = {
  visitors: Users,
  sales: ShoppingCart,
  trust: ShieldCheck,
  ai: Bot,
};

const AREA_HEADLINE: Record<AuditImpactArea, string> = {
  visitors: "Can cost you visitors",
  sales: "Can cost you sales and leads",
  trust: "Can cost you trust",
  ai: "Can keep you out of AI answers",
};

const AREA_HELP: Record<AuditImpactArea, string> = {
  visitors: "Pages Google shows less, or people can't reach.",
  sales: "Broken, slow or unsafe pages people leave before buying or getting in touch.",
  trust: "Things that make the site look broken or careless.",
  ai: "What stops ChatGPT, Claude or Perplexity from naming you.",
};

/** Small tags saying what an issue hurts. */
export function ImpactTags({ hurts }: { hurts: AuditImpactArea[] }) {
  return (
    <span className="inline-flex flex-wrap gap-1">
      {hurts.map((area) => {
        const Icon = AREA_ICON[area];
        return (
          <span
            key={area}
            className="inline-flex items-center gap-1 rounded-full bg-surface px-2 py-0.5 text-[10.5px] font-medium text-ink-secondary"
          >
            <Icon className="size-3" aria-hidden />
            {IMPACT_AREA_LABEL[area]}
          </span>
        );
      })}
    </span>
  );
}

/** "What these issues can cost you": the business case for fixing them. */
export function ImpactSummary({ issues }: { issues: AuditIssueGroup[] }) {
  const summary = summarizeImpact(issues);
  const errorPages = issues
    .filter((g) => AUDIT_CHECKS[g.checkId]?.severity === "ERROR")
    .reduce((s, g) => s + g.count, 0);
  const areas = (["visitors", "sales", "trust", "ai"] as AuditImpactArea[]).filter(
    (a) => summary[a].issues > 0,
  );
  if (areas.length === 0) return null;
  return (
    <Card>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[15px] font-semibold text-ink">What these issues can cost you</h2>
        <p className="text-[12px] text-ink-faint">Why fixing them is worth it</p>
      </div>
      <p className="mt-1 max-w-3xl text-[13px] leading-5 text-ink-secondary">
        Most site problems are invisible to the owner but not to visitors: a broken page, a slow
        load or a missing title quietly loses people before they buy, sign up or get in touch.
        {errorPages > 0
          ? ` Start with the ${errorPages.toLocaleString("en-US")} error${errorPages === 1 ? "" : "s"}: they are the most likely to be costing you right now.`
          : " There are no errors, so these are improvements rather than emergencies."}
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {areas.map((area) => {
          const Icon = AREA_ICON[area];
          return (
            <div key={area} className="rounded-tile bg-surface px-4 py-3.5">
              <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-ink">
                <Icon className="size-4" aria-hidden />
                {AREA_HEADLINE[area]}
              </p>
              <p className="mt-1.5 text-2xl font-semibold tabular-nums tracking-tight text-ink">
                {summary[area].issues}
                <span className="ml-1 text-[12px] font-normal text-ink-faint">
                  issue type{summary[area].issues === 1 ? "" : "s"} · {summary[area].pages.toLocaleString("en-US")} found
                </span>
              </p>
              <p className="mt-1 text-[12px] leading-4 text-ink-faint">{AREA_HELP[area]}</p>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
