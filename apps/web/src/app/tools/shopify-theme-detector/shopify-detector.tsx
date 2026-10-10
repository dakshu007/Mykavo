"use client";

import { useState } from "react";
import Link from "next/link";
import { AppWindow, Info, Lock, ShoppingBag } from "lucide-react";
import { ToolUrlForm } from "@/components/tools/url-form";
import { ToolError } from "@/components/tools/tool-error";
import { ToolCta } from "@/components/tools/tool-cta";
import { track } from "@/lib/analytics";
import type { ShopifyReport } from "@/lib/tools/shopify-detect";

const label = "font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6B6B60]";
const inlineLink = "font-semibold text-[#151515] underline decoration-[#FFD400] decoration-2 underline-offset-4";

function themeOrigin(report: ShopifyReport): string {
  if (report.fromThemeStore === true) return "From the Shopify Theme Store";
  if (report.fromThemeStore === false) return "Not a Theme Store theme: custom built or bought elsewhere";
  return "Theme Store origin not shown on this page";
}

export function ShopifyDetector() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState<ShopifyReport | null>(null);

  async function run(url: string) {
    setLoading(true);
    setError("");
    setReport(null);
    try {
      const res = await fetch("/api/tools/shopify-detect", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = (await res.json()) as { report?: ShopifyReport; error?: string };
      if (!res.ok || !data.report) throw new Error(data.error ?? "Something went wrong.");
      setReport(data.report);
      track("tool_used", { tool: "shopify-theme-detector" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  const theme = report?.theme ?? null;
  const renamed = theme?.name && theme.schemaName && theme.name !== theme.schemaName;

  return (
    <div className="space-y-6">
      <ToolUrlForm
        id="shopify-url"
        label="Store URL"
        placeholder="store.com"
        buttonLabel="Detect theme & apps"
        buttonIcon={<ShoppingBag className="size-4" aria-hidden />}
        loading={loading}
        onSubmit={(url) => void run(url)}
      />

      {error && <ToolError message={error} />}

      {report && (
        <>
          <div className="rounded-2xl border border-[#151515] bg-white p-6 shadow-[5px_5px_0_#151515]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-[16px] font-semibold text-[#151515]">
                {report.isShopify ? "This store runs on Shopify" : "No Shopify detected"}
              </h2>
              {report.shop && (
                <span className="rounded-full bg-[#151515] px-3 py-1 font-mono text-xs font-semibold text-[#FFD400]">
                  {report.shop}
                </span>
              )}
            </div>
            <p className="mt-1 truncate font-mono text-xs text-[#6B6B60]" title={report.finalUrl}>
              {report.finalUrl}
            </p>
            {report.isShopify ? (
              <p className="mt-2 text-[13px] text-[#6B6B60]">Found: {report.signals.join(", ")}.</p>
            ) : (
              <p className="mt-3 text-[14px] leading-6 text-[#3d3d38]">
                None of the usual Shopify signals (the Shopify.theme object, cdn.shopify.com or /cdn/shop/ assets, or
                Shopify&apos;s checkout meta tags) are in this page&apos;s HTML. The site may use another platform, or a
                headless front end that hides Shopify.
              </p>
            )}

            {report.passwordProtected && (
              <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-black/10 bg-[#FFFBE0] px-4 py-3">
                <Lock className="mt-0.5 size-4 shrink-0 text-[#151515]" aria-hidden />
                <p className="text-[13px] leading-6 text-[#3d3d38]">
                  The store redirected to its password page, so only what that page loads is shown.
                </p>
              </div>
            )}

            {report.isShopify && (
              <>
                <section className="mt-6 border-t border-black/10 pt-5">
                  <p className={label}>Theme</p>
                  {!theme ? (
                    <p className="mt-2 text-[14px] text-[#6B6B60]">
                      This page doesn&apos;t expose theme details. Headless storefronts (Hydrogen or a custom front end)
                      don&apos;t use an Online Store theme at all.
                    </p>
                  ) : (
                    <div className="mt-3 rounded-xl border border-[#151515] bg-[#FFFBE0] p-4">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="text-[17px] font-semibold text-[#151515]">{theme.schemaName ?? theme.name}</p>
                        {theme.schemaVersion && <span className="font-mono text-[12px] text-[#6B6B60]">v{theme.schemaVersion}</span>}
                      </div>
                      {renamed && (
                        <p className="mt-1 text-[13px] text-[#3d3d38]">
                          Renamed in this store to <span className="font-semibold">{theme.name}</span>
                        </p>
                      )}
                      <p className="mt-2 text-[13px] text-[#3d3d38]">
                        {themeOrigin(report)}
                        {theme.themeStoreId ? <span className="font-mono text-[12px] text-[#6B6B60]"> (ID {theme.themeStoreId})</span> : null}
                      </p>
                      {theme.role && theme.role !== "main" && (
                        <p className="mt-1 text-[13px] text-[#3d3d38]">This is a preview of an unpublished theme ({theme.role}).</p>
                      )}
                    </div>
                  )}
                </section>

                <section className="mt-6 border-t border-black/10 pt-5">
                  <p className={label}>Apps detected ({report.apps.length})</p>
                  {report.apps.length === 0 ? (
                    <p className="mt-2 text-[14px] text-[#6B6B60]">No app loads files on this page.</p>
                  ) : (
                    <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                      {report.apps.map((a) => (
                        <li key={a.name} className="flex items-start gap-2.5 rounded-xl border border-black/10 bg-[#FBFAF3] px-3.5 py-2.5">
                          <AppWindow className="mt-0.5 size-4 shrink-0 text-[#151515]" aria-hidden />
                          <div className="min-w-0">
                            <p className="text-[14px] font-semibold text-[#151515]">{a.name}</p>
                            <p className="truncate font-mono text-[11.5px] text-[#6B6B60]" title={a.source}>
                              {a.evidence}: {a.source}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </>
            )}

            <div className="mt-6 flex items-start gap-2.5 rounded-xl border border-black/10 bg-[#F3F1E6] px-4 py-3">
              <Info className="mt-0.5 size-4 shrink-0 text-[#6B6B60]" aria-hidden />
              <p className="text-[13px] leading-6 text-[#3d3d38]">
                Only apps that load something on this page can be seen. Apps that work in the admin (inventory,
                reporting, fulfilment) or only on other pages, such as the cart, won&apos;t show. Try a product page
                too.
              </p>
            </div>
          </div>

          <ToolCta
            heading="Theme updates and app installs change your store quietly."
            body="MyKavo scans your storefront pages on a schedule and alerts you when an app script vanishes, a page breaks, or a button you told it to watch, like Add to cart, goes missing."
            tool="shopify-theme-detector"
          />
          <p className="text-center text-[13px] text-[#6B6B60]">
            Run a Shopify store?{" "}
            <Link href="/website-monitoring-for-shopify" className={inlineLink}>
              See how MyKavo monitors Shopify
            </Link>
            .
          </p>
        </>
      )}
    </div>
  );
}
