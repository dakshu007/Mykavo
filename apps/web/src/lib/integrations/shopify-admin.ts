/**
 * The few calls MyKavo makes to a store's Admin API. Every host here is a
 * validated *.myshopify.com domain (see isShopDomain), never user-supplied
 * text, so these requests cannot be pointed anywhere else.
 */

import { SHOPIFY_API_VERSION, isShopDomain } from "@/lib/integrations/shopify";

const TIMEOUT_MS = 10_000;

export class ShopifyApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ShopifyApiError";
  }
}

function assertShop(shop: string): void {
  if (!isShopDomain(shop)) throw new ShopifyApiError("Invalid shop domain", 400);
}

/**
 * Shopify-managed install: trade the App Bridge session token for an offline
 * Admin API token. Offline tokens do not expire and are what webhooks and
 * background work use.
 */
export async function exchangeSessionToken(params: {
  shop: string;
  sessionToken: string;
  apiKey: string;
  apiSecret: string;
}): Promise<{ accessToken: string; scope: string }> {
  assertShop(params.shop);
  const res = await fetch(`https://${params.shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      client_id: params.apiKey,
      client_secret: params.apiSecret,
      grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
      subject_token: params.sessionToken,
      subject_token_type: "urn:ietf:params:oauth:token-type:id_token",
      requested_token_type: "urn:shopify:params:oauth:token-type:offline-access-token",
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const data = (await res.json().catch(() => null)) as { access_token?: unknown; scope?: unknown } | null;
  if (!res.ok || !data || typeof data.access_token !== "string") {
    throw new ShopifyApiError(`Token exchange failed (${res.status})`, res.status);
  }
  return { accessToken: data.access_token, scope: typeof data.scope === "string" ? data.scope : "" };
}

interface GraphqlResult<T> {
  data?: T;
  errors?: Array<{ message?: string }>;
}

export async function adminGraphql<T>(
  shop: string,
  accessToken: string,
  query: string,
  variables?: Record<string, unknown>,
): Promise<GraphqlResult<T>> {
  assertShop(shop);
  const res = await fetch(`https://${shop}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
      "x-shopify-access-token": accessToken,
    },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (res.status === 401 || res.status === 403) {
    throw new ShopifyApiError("The store's access token was rejected", res.status);
  }
  if (!res.ok) throw new ShopifyApiError(`Admin API error (${res.status})`, res.status);
  return (await res.json()) as GraphqlResult<T>;
}

export async function fetchShopInfo(
  shop: string,
  accessToken: string,
): Promise<{ name: string | null; primaryDomain: string | null }> {
  const result = await adminGraphql<{ shop: { name: string; primaryDomain: { url: string } | null } }>(
    shop,
    accessToken,
    "{ shop { name primaryDomain { url } } }",
  );
  const info = result.data?.shop;
  let primaryDomain: string | null = null;
  if (info?.primaryDomain?.url) {
    try {
      const url = new URL(info.primaryDomain.url);
      if (url.protocol === "https:" || url.protocol === "http:") primaryDomain = url.origin;
    } catch {
      primaryDomain = null;
    }
  }
  return { name: info?.name ?? null, primaryDomain: primaryDomain ?? `https://${shop}` };
}

export const WEBHOOK_TOPICS = ["THEMES_PUBLISH", "THEMES_UPDATE", "APP_UNINSTALLED"] as const;

const CREATE_WEBHOOK = (field: "uri" | "callbackUrl") => `
  mutation ($topic: WebhookSubscriptionTopic!, $url: ${field === "uri" ? "String!" : "URL!"}) {
    webhookSubscriptionCreate(topic: $topic, webhookSubscription: { ${field}: $url, format: JSON }) {
      webhookSubscription { id }
      userErrors { field message }
    }
  }`;

/**
 * Subscribe the store to the webhooks the app runs on. Idempotent: an
 * address that is already registered comes back as a user error, which is
 * fine. Newer API versions take `uri`, older ones `callbackUrl`; try both.
 */
export async function registerWebhooks(shop: string, accessToken: string, callbackUrl: string): Promise<string[]> {
  const problems: string[] = [];
  let field: "uri" | "callbackUrl" = "uri";
  for (const topic of WEBHOOK_TOPICS) {
    let result = await adminGraphql<{
      webhookSubscriptionCreate: { userErrors: Array<{ message: string }> } | null;
    }>(shop, accessToken, CREATE_WEBHOOK(field), { topic, url: callbackUrl });
    if (result.errors?.length && field === "uri") {
      field = "callbackUrl";
      result = await adminGraphql(shop, accessToken, CREATE_WEBHOOK(field), { topic, url: callbackUrl });
    }
    if (result.errors?.length) {
      problems.push(`${topic}: ${result.errors.map((e) => e.message).join("; ")}`);
      continue;
    }
    for (const err of result.data?.webhookSubscriptionCreate?.userErrors ?? []) {
      if (!/taken|already/i.test(err.message)) problems.push(`${topic}: ${err.message}`);
    }
  }
  return problems;
}
