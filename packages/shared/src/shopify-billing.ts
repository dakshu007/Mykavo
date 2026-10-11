/**
 * Shopify App Pricing - how a store pays for MyKavo through Shopify.
 *
 * The Shopify App Store only lists apps that charge through Shopify, so a
 * merchant who installs MyKavo there picks a plan on Shopify's own plan page
 * (hosted by Shopify, configured in the Partner Dashboard) and pays on their
 * Shopify bill. Since April 2026 Shopify sends no webhook for that: the
 * active subscription is read from the Partner API, after the merchant comes
 * back from the plan page, when the app opens, and on a schedule in the
 * worker (for cancellations and freezes, which happen without a redirect).
 *
 * Shared by the web app and the worker. Network code is limited to one
 * fetch so the rest stays testable.
 */

/** Partner API version for activeSubscription. */
export const SHOPIFY_PARTNER_API_VERSION = "2026-07";

export type ShopifyPaidPlan = "pro" | "agency";

export interface ShopifyBillingConfig {
  /** Numeric organization id from the Partner Dashboard URL. */
  orgId: string;
  /** Partner API client access token with the "Manage apps" permission. */
  accessToken: string;
  /** gid://shopify/App/<numeric id>. */
  appGid: string;
  /** The app's handle, used in the plan page URL. */
  appHandle: string;
}

type Env = Record<string, string | undefined>;

/**
 * Billing settings from the environment, or null while Shopify billing is
 * not set up (the app then shows no plan links at all, as before).
 */
export function shopifyBillingConfig(env: Env): ShopifyBillingConfig | null {
  const orgId = env.SHOPIFY_PARTNER_ORG_ID?.trim() ?? "";
  const accessToken = env.SHOPIFY_PARTNER_API_TOKEN?.trim() ?? "";
  const appIdRaw = env.SHOPIFY_APP_ID?.trim() ?? "";
  const appHandle = env.SHOPIFY_APP_HANDLE?.trim() ?? "";
  if (!/^\d{1,20}$/.test(orgId) || !accessToken || !/^[a-z0-9][a-z0-9-]{0,99}$/.test(appHandle)) return null;
  const appGid = /^\d{1,20}$/.test(appIdRaw)
    ? `gid://shopify/App/${appIdRaw}`
    : /^gid:\/\/shopify\/App\/\d{1,20}$/.test(appIdRaw)
      ? appIdRaw
      : null;
  if (!appGid) return null;
  return { orgId, accessToken, appGid, appHandle };
}

/** "cool-shop.myshopify.com" -> the store handle Shopify uses in admin URLs. */
export function storeHandle(shop: string): string | null {
  const m = /^([a-z0-9][a-z0-9-]*)\.myshopify\.com$/.exec(shop.toLowerCase());
  return m ? m[1] : null;
}

/** Shopify's hosted plan page for this store. */
export function planSelectionUrl(shop: string, appHandle: string): string | null {
  const handle = storeHandle(shop);
  if (!handle || !/^[a-z0-9][a-z0-9-]{0,99}$/.test(appHandle)) return null;
  return `https://admin.shopify.com/store/${handle}/charges/${appHandle}/pricing_plans`;
}

/**
 * Which MyKavo plan a Shopify plan handle stands for. Handles are set in the
 * Partner Dashboard ("pro", "agency", "mykavo-pro", "agency_yearly", ...),
 * so the word is matched, not the exact string. Anything else - the free
 * plan, a test plan - grants nothing.
 */
export function planFromHandle(handle: string | null | undefined): ShopifyPaidPlan | null {
  const words = (handle ?? "").toLowerCase().split(/[^a-z0-9]+/);
  if (words.includes("agency")) return "agency";
  if (words.includes("pro")) return "pro";
  return null;
}

export interface ShopifySubscription {
  /** The paid plan, or null when the store is on a free or unknown plan. */
  plan: ShopifyPaidPlan | null;
  handle: string | null;
  /** End of the current billing cycle, or of the trial. */
  periodEnd: Date | null;
  cancelAtEnd: boolean;
}

interface ActiveSubscriptionNode {
  cancelAtEndOfCycle?: boolean | null;
  trialEndsAt?: string | null;
  currentBillingCycle?: { endTime?: string | null } | null;
  items?: Array<{ handle?: string | null }> | null;
}

function toDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Turn the Partner API's activeSubscription into a plan. null (no active
 * contract) means no paid plan. With several items, the highest plan wins.
 */
export function subscriptionFromNode(node: ActiveSubscriptionNode | null): ShopifySubscription {
  if (!node) return { plan: null, handle: null, periodEnd: null, cancelAtEnd: false };
  let plan: ShopifyPaidPlan | null = null;
  let handle: string | null = null;
  for (const item of node.items ?? []) {
    const p = planFromHandle(item.handle);
    if (p === "agency" || (p === "pro" && plan === null)) {
      plan = p;
      handle = item.handle ?? null;
    } else if (handle === null && item.handle) {
      handle = item.handle;
    }
  }
  return {
    plan,
    handle,
    periodEnd: toDate(node.currentBillingCycle?.endTime) ?? toDate(node.trialEndsAt),
    cancelAtEnd: node.cancelAtEndOfCycle === true,
  };
}

export class ShopifyBillingError extends Error {
  constructor(
    message: string,
    readonly status: number | null,
  ) {
    super(message);
    this.name = "ShopifyBillingError";
  }
}

const ACTIVE_SUBSCRIPTION_QUERY = `query ActiveSubscription($appId: ID!, $shopId: ID!) {
  activeSubscription(appId: $appId, shopId: $shopId) {
    cancelAtEndOfCycle
    trialEndsAt
    currentBillingCycle { endTime }
    items { handle }
  }
}`;

/**
 * The store's active subscription, from the Partner API. Throws on any
 * failure (throttling, a bad token, an outage) so callers keep the plan they
 * last confirmed instead of taking a paying store down to Free.
 */
export async function fetchShopifySubscription(
  config: ShopifyBillingConfig,
  shopGid: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ShopifySubscription> {
  if (!/^gid:\/\/shopify\/Shop\/\d{1,20}$/.test(shopGid)) {
    throw new ShopifyBillingError("Invalid shop id", null);
  }
  const res = await fetchImpl(
    `https://partners.shopify.com/${config.orgId}/api/${SHOPIFY_PARTNER_API_VERSION}/graphql.json`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        "x-shopify-access-token": config.accessToken,
      },
      body: JSON.stringify({ query: ACTIVE_SUBSCRIPTION_QUERY, variables: { appId: config.appGid, shopId: shopGid } }),
      signal: AbortSignal.timeout(10_000),
    },
  );
  if (!res.ok) throw new ShopifyBillingError(`Partner API error (${res.status})`, res.status);
  const body = (await res.json()) as {
    data?: { activeSubscription?: ActiveSubscriptionNode | null } | null;
    errors?: Array<{ message?: string }>;
  };
  if (body.errors?.length || !body.data || !("activeSubscription" in body.data)) {
    const message = body.errors?.map((e) => e.message).filter(Boolean).join("; ") || "unexpected response";
    throw new ShopifyBillingError(`Partner API: ${message.slice(0, 200)}`, res.status);
  }
  return subscriptionFromNode(body.data.activeSubscription ?? null);
}
