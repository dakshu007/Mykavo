import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Check, CheckCircle2, Lock, Plus, RefreshCw, ShoppingBag } from "lucide-react";
import { prisma } from "@mykavo/database";
import { getSession, getCurrentMembership } from "@/lib/session";
import { bareHost } from "@/lib/integrations/site-connection";
import { adminAppUrl, isShopDomain, verifyLinkToken } from "@/lib/integrations/shopify";
import { shopifyConfig } from "@/lib/integrations/shopify-server";

// Per request: it depends on the signed-in member, the link token and the
// Shopify credentials, none of which exist at build time.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Connect Shopify",
  description: "Connect your Shopify store to MyKavo.",
  robots: { index: false },
};

type Search = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | null {
  return typeof value === "string" ? value : null;
}

function hostOf(url: string): string | null {
  try {
    return bareHost(new URL(url).hostname);
  } catch {
    return null;
  }
}

function Problem({ message }: { message: string }) {
  return (
    <>
      <h1 className="mb-1 text-xl font-semibold tracking-tight text-ink">Can&apos;t connect this store</h1>
      <p className="text-sm text-ink-secondary">{message}</p>
      <Link
        href="/dashboard"
        className="mt-6 inline-flex h-10 items-center rounded-full border border-line px-5 text-[13px] font-medium text-ink-secondary hover:text-ink"
      >
        Go to dashboard
      </Link>
    </>
  );
}

const radio =
  "flex cursor-pointer items-center gap-3 rounded-field border border-line px-3.5 py-3 has-checked:border-ink has-checked:bg-surface";

/**
 * The consent screen the MyKavo Shopify app opens (in a new tab, because
 * the app itself lives inside the Shopify admin). The `t` parameter is a
 * link token the app signed after verifying the store's session, so the
 * store shown here is the one that asked - never a name taken from the URL.
 */
export default async function ConnectShopifyPage({ searchParams }: { searchParams: Promise<Search> }) {
  const raw = await searchParams;
  const config = shopifyConfig();
  if (!config) return <Problem message="The Shopify app is not available yet." />;

  // After approving: point the merchant back to the app in their admin.
  const doneShop = first(raw.done);
  if (doneShop && isShopDomain(doneShop)) {
    return (
      <>
        <CheckCircle2 className="size-9 text-success" aria-hidden />
        <h1 className="mb-1 mt-4 text-xl font-semibold tracking-tight text-ink">Store connected</h1>
        <p className="text-sm text-ink-secondary">
          Go back to the MyKavo app in Shopify - it now shows this store&apos;s monitoring. You can close
          this tab.
        </p>
        <a
          href={adminAppUrl(doneShop, config.apiKey)}
          className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-contrast transition-colors hover:bg-primary-hover"
        >
          Back to Shopify
        </a>
      </>
    );
  }

  const t = first(raw.t);
  const shop = verifyLinkToken(t, config.apiSecret);
  if (!shop || !t) {
    return <Problem message="This connect link has expired. Open MyKavo in your Shopify admin and press Connect again." />;
  }

  const session = await getSession();
  if (!session) {
    redirect(`/login?next=${encodeURIComponent(`/connect/shopify?t=${encodeURIComponent(t)}`)}`);
  }

  const store = await prisma.shopifyShop.findUnique({
    where: { shop },
    select: { name: true, primaryDomain: true, uninstalledAt: true },
  });
  if (!store || store.uninstalledAt) {
    return <Problem message="MyKavo is not installed on this store. Install the app from Shopify, then press Connect in it." />;
  }
  const storeUrl = store.primaryDomain ?? `https://${shop}`;
  const storeHost = hostOf(storeUrl);

  const { workspace, role } = await getCurrentMembership(session.user.id, session.user.name);
  if (role === "VIEWER") {
    return <Problem message="Viewers can't connect stores. Ask an owner or admin of this workspace to connect it." />;
  }

  const websites = await prisma.website.findMany({
    where: { workspaceId: workspace.id },
    select: { id: true, name: true, url: true },
    orderBy: { createdAt: "asc" },
  });
  const isStore = (url: string) => {
    const host = hostOf(url);
    return host !== null && (host === storeHost || host === shop);
  };
  const matches = websites.filter((w) => isStore(w.url));
  const others = websites.filter((w) => !isStore(w.url));
  const addUrl = `/dashboard/websites/new?url=${encodeURIComponent(storeUrl)}`;
  const selfUrl = `/connect/shopify?t=${encodeURIComponent(t)}`;

  return (
    <>
      <p className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-faint">Shopify app</p>
      <h1 className="mb-1 text-xl font-semibold tracking-tight text-ink">Connect this store to MyKavo</h1>
      <div className="mt-3 flex items-center gap-2.5 rounded-field bg-surface px-3.5 py-2.5">
        <ShoppingBag className="size-4 shrink-0 text-ink-secondary" aria-hidden />
        <div className="min-w-0">
          {store.name && <p className="truncate text-sm font-medium text-ink">{store.name}</p>}
          <p className="truncate font-mono text-xs text-ink-secondary">{storeUrl}</p>
        </div>
      </div>

      {matches.length === 0 && (
        <div className="mt-6">
          <p className="text-sm text-ink">
            <span className="font-semibold">{storeHost ?? shop}</span> isn&apos;t monitored in{" "}
            <span className="font-semibold">{workspace.name}</span> yet.
          </p>
          <p className="mt-1 text-[13px] text-ink-secondary">
            Add it first - it takes a minute and MyKavo finds your pages for you. Then come back to this tab.
          </p>
          <a
            href={addUrl}
            target="_blank"
            rel="noopener"
            className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-primary text-sm font-semibold text-primary-contrast transition-colors hover:bg-primary-hover"
          >
            <Plus className="size-4" aria-hidden /> Add {storeHost ?? shop} to MyKavo
          </a>
          <Link
            href={selfUrl}
            className="mt-2 inline-flex h-10 w-full items-center justify-center gap-2 rounded-full border border-line text-[13px] font-medium text-ink-secondary hover:text-ink"
          >
            <RefreshCw className="size-3.5" aria-hidden /> I&apos;ve added it
          </Link>
        </div>
      )}

      {websites.length > 0 && (
        <form method="post" action="/api/shopify/connect/approve" className="mt-6">
          <input type="hidden" name="t" value={t} />
          <fieldset>
            <legend className="mb-2 text-[13px] font-medium text-ink">
              {matches.length > 0 ? "Which MyKavo website is this store?" : "Or connect it to an existing website"}
            </legend>
            <div className="space-y-2">
              {[...matches, ...(matches.length > 0 ? [] : others)].map((w, i) => (
                <label key={w.id} className={radio}>
                  <input
                    type="radio"
                    name="websiteId"
                    value={w.id}
                    defaultChecked={i === 0 && matches.length > 0}
                    required
                    className="size-4 accent-[#151515]"
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-ink">{w.name}</span>
                    <span className="block truncate font-mono text-xs text-ink-faint">{w.url}</span>
                  </span>
                </label>
              ))}
            </div>
            {matches.length > 0 && others.length > 0 && (
              <details className="mt-2">
                <summary className="cursor-pointer text-[13px] text-ink-secondary hover:text-ink">Another website</summary>
                <div className="mt-2 space-y-2">
                  {others.map((w) => (
                    <label key={w.id} className={radio}>
                      <input type="radio" name="websiteId" value={w.id} className="size-4 accent-[#151515]" />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-ink">{w.name}</span>
                        <span className="block truncate font-mono text-xs text-ink-faint">{w.url}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </details>
            )}
          </fieldset>

          <div className="mt-5 rounded-field bg-surface px-3.5 py-3">
            <p className="flex items-center gap-1.5 text-[13px] font-medium text-ink">
              <Lock className="size-3.5" aria-hidden /> The Shopify app will be able to
            </p>
            <ul className="mt-2 space-y-1.5">
              {[
                "See this website's status, changes and screenshots",
                "Review, approve or ignore its changes, and run scans",
                "Check the store when its live theme is published or edited",
              ].map((line) => (
                <li key={line} className="flex items-start gap-2 text-[13px] text-ink-secondary">
                  <Check className="mt-0.5 size-3.5 shrink-0 text-success" aria-hidden />
                  {line}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[12px] text-ink-faint">
              Nothing else - not your other websites, billing or team. Disconnect anytime.
            </p>
          </div>

          <button
            type="submit"
            className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-contrast transition-colors hover:bg-primary-hover"
          >
            Connect
          </button>
        </form>
      )}

      <p className="mt-4 text-center text-[13px] text-ink-faint">
        Connecting to <span className="font-medium text-ink-secondary">{workspace.name}</span>
      </p>
    </>
  );
}
