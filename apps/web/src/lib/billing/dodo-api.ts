/**
 * Thin Dodo Payments REST client for the few server-side calls we make
 * (cancel a subscription, open the customer portal). Bearer-authed against
 * the mode-specific base URL. No SDK - plain fetch (research §5).
 */

import { dodoApiBase, DODO_API_KEY } from "./config";

function authHeaders(): HeadersInit {
  return {
    authorization: `Bearer ${DODO_API_KEY}`,
    "content-type": "application/json",
  };
}

export const dodoApiConfigured = () => Boolean(DODO_API_KEY);

/** Cancel a subscription at the end of the current billing period. */
export async function cancelSubscriptionAtPeriodEnd(subscriptionId: string): Promise<void> {
  const res = await fetch(`${dodoApiBase()}/subscriptions/${subscriptionId}`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify({ cancel_at_next_billing_date: true }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Dodo cancel failed ${res.status}: ${detail.slice(0, 200)}`);
  }
}

/** Create a customer-portal session and return its link. */
export async function createCustomerPortalSession(customerId: string): Promise<string> {
  const res = await fetch(
    `${dodoApiBase()}/customers/${customerId}/customer-portal/session`,
    { method: "POST", headers: authHeaders() },
  );
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Dodo portal failed ${res.status}: ${detail.slice(0, 200)}`);
  }
  const data = (await res.json()) as { link?: string };
  if (!data.link) throw new Error("Dodo portal returned no link");
  return data.link;
}
