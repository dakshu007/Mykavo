/**
 * One Brevo contact sync, start to finish. The database side comes in as a
 * store, so the worker's scheduled syncs and the admin's "Sync now" run the
 * very same steps.
 */

import { blocklistedContacts, ensureAttributes, ensureAudiences, pruneContacts, pushContacts, type SyncContact } from "./brevo-sync";

export interface BrevoSyncStore {
  /** All account holders (since = null), or those changed since a time. */
  loadContacts(since: Date | null): Promise<SyncContact[]>;
  /** Save addresses Brevo unsubscribed; returns how many were new. */
  saveOptOuts(emails: string[]): Promise<number>;
}

export interface BrevoSyncResult {
  contacts: number;
  blocklisted: number;
  removed: number;
  pulledUnsubscribes: number;
}

/** Incremental syncs look back this far - wider than the hourly cadence, so a missed sweep is covered. */
export const INCREMENTAL_WINDOW_MS = 3 * 60 * 60 * 1000;

export async function runBrevoSyncWith(store: BrevoSyncStore, kind: "full" | "incremental"): Promise<BrevoSyncResult> {
  await ensureAttributes();
  const audiences = await ensureAudiences();
  const since = kind === "incremental" ? new Date(Date.now() - INCREMENTAL_WINDOW_MS) : null;

  // Unsubscribes first: someone who opted out in a campaign must not be
  // pushed back as subscribed a moment later.
  const pulledUnsubscribes = await store.saveOptOuts(await blocklistedContacts(audiences.all.id, since ?? undefined));

  const contacts = await store.loadContacts(since);
  const pushed = await pushContacts(contacts, audiences);
  // Full syncs also take deleted accounts out of the lists.
  const removed = since ? 0 : await pruneContacts(audiences, new Set(contacts.map((c) => c.email)));
  return { ...pushed, removed, pulledUnsubscribes };
}
