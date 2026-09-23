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

/**
 * Move a subscription to another product. An upgrade applies now and bills
 * the prorated difference, and stays on the old plan if that charge fails. A
 * downgrade waits for the next billing date, so the customer keeps what they
 * already paid for until the period ends. Dodo confirms either with a
 * subscription.plan_changed webhook, which is what changes the entitlement.
 */
export async function changeSubscriptionPlan(
  subscriptionId: string,
  params: { productId: string; direction: "upgrade" | "downgrade" },
): Promise<void> {
  const body =
    params.direction === "upgrade"
      ? {
          product_id: params.productId,
          quantity: 1,
          proration_billing_mode: "prorated_immediately",
          effective_at: "immediately",
          on_payment_failure: "prevent_change",
        }
      : {
          product_id: params.productId,
          quantity: 1,
          proration_billing_mode: "do_not_bill",
          effective_at: "next_billing_date",
        };
  const res = await fetch(`${dodoApiBase()}/subscriptions/${subscriptionId}/change-plan`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Dodo change-plan failed ${res.status}: ${detail.slice(0, 200)}`);
  }
}
