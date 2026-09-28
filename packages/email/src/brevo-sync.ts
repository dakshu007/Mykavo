/**
 * Keeping Brevo's contacts in step with MyKavo's accounts.
 *
 * MyKavo owns the truth: who has an account, their plan, their websites,
 * and who unsubscribed. Brevo gets a copy, in its own "MyKavo" folder so it
 * never mixes with other lists in the same Brevo account:
 *
 *   MyKavo · All users        every account holder
 *   MyKavo · Free plan        on Free
 *   MyKavo · Paid plans       on Starter, Pro or Agency
 *   MyKavo · No website yet   signed up, never added a site
 *
 * Unsubscribes travel both ways: MyKavo's opt-outs are blocklisted in Brevo,
 * and addresses Brevo blocklisted (someone clicked unsubscribe in a
 * campaign) are pulled back into MyKavo's email_opt_out.
 *
 * Only Brevo calls live here; reading MyKavo's database is the caller's job.
 */

import { BrevoError, brevo, brevoContacts } from "./brevo";

export const MYKAVO_FOLDER = "MyKavo";

export const AUDIENCES = {
  all: "MyKavo · All users",
  free: "MyKavo · Free plan",
  paid: "MyKavo · Paid plans",
  no_website: "MyKavo · No website yet",
} as const;
export type AudienceKey = keyof typeof AUDIENCES;
export const AUDIENCE_KEYS = Object.keys(AUDIENCES) as AudienceKey[];

export const AUDIENCE_DESCRIPTIONS: Record<AudienceKey, string> = {
  all: "Every MyKavo account holder",
  free: "Accounts on the Free plan",
  paid: "Starter, Pro and Agency customers",
  no_website: "Signed up but never added a website",
};

export interface SyncContact {
  email: string;
  userId: string;
  firstName: string;
  lastName: string;
  plan: string;
  paid: boolean;
  websites: number;
  signedUpAt: Date;
  optedOut: boolean;
}

export interface Audience {
  key: AudienceKey;
  id: number;
  name: string;
  subscribers: number;
}

/** Which lists a contact belongs in. Pure. */
export function membership(c: Pick<SyncContact, "paid" | "websites">): AudienceKey[] {
  const out: AudienceKey[] = ["all", c.paid ? "paid" : "free"];
  if (c.websites === 0) out.push("no_website");
  return out;
}

/** Brevo contact attributes MyKavo fills in. */
export const ATTRIBUTES: { name: string; type: "text" | "float" | "date" }[] = [
  { name: "MYKAVO_PLAN", type: "text" },
  { name: "MYKAVO_WEBSITES", type: "float" },
  { name: "MYKAVO_SIGNUP", type: "date" },
];

export function contactAttributes(c: SyncContact): Record<string, string | number> {
  return {
    FIRSTNAME: c.firstName,
    LASTNAME: c.lastName,
    EXT_ID: c.userId,
    MYKAVO_PLAN: c.plan,
    MYKAVO_WEBSITES: c.websites,
    MYKAVO_SIGNUP: c.signedUpAt.toISOString().slice(0, 10),
  };
}

const alreadyExists = (err: unknown) => err instanceof BrevoError && err.status === 400;

export async function ensureAttributes(): Promise<void> {
  await Promise.all(
    ATTRIBUTES.map((a) =>
      brevo(`/contacts/attributes/normal/${a.name}`, { method: "POST", body: { type: a.type } }).catch((err) => {
        if (!alreadyExists(err)) throw err;
      }),
    ),
  );
}

type ListRow = { id: number; name: string; uniqueSubscribers?: number; totalSubscribers?: number };

/** Find or create the MyKavo folder and its four lists. */
export async function ensureAudiences(): Promise<Record<AudienceKey, Audience>> {
  const folders = await brevo<{ folders?: { id: number; name: string }[] }>("/contacts/folders", { query: { limit: 50, offset: 0 } });
  let folderId = folders.folders?.find((f) => f.name === MYKAVO_FOLDER)?.id;
  if (!folderId) folderId = (await brevo<{ id: number }>("/contacts/folders", { method: "POST", body: { name: MYKAVO_FOLDER } })).id;

  const lists = await brevo<{ lists?: ListRow[] }>(`/contacts/folders/${folderId}/lists`, { query: { limit: 50, offset: 0 } });
  const out = {} as Record<AudienceKey, Audience>;
  for (const key of AUDIENCE_KEYS) {
    const name = AUDIENCES[key];
    const found = lists.lists?.find((l) => l.name === name);
    const id = found?.id ?? (await brevo<{ id: number }>("/contacts/lists", { method: "POST", body: { name, folderId } })).id;
    out[key] = { key, id, name, subscribers: found?.uniqueSubscribers ?? found?.totalSubscribers ?? 0 };
  }
  return out;
}

/** The four lists without creating anything - null if they have not been set up yet. */
export async function findAudiences(): Promise<Record<AudienceKey, Audience> | null> {
  const folders = await brevo<{ folders?: { id: number; name: string }[] }>("/contacts/folders", { query: { limit: 50, offset: 0 } });
  const folderId = folders.folders?.find((f) => f.name === MYKAVO_FOLDER)?.id;
  if (!folderId) return null;
  const lists = await brevo<{ lists?: ListRow[] }>(`/contacts/folders/${folderId}/lists`, { query: { limit: 50, offset: 0 } });
  const out = {} as Record<AudienceKey, Audience>;
  for (const key of AUDIENCE_KEYS) {
    const found = lists.lists?.find((l) => l.name === AUDIENCES[key]);
    if (!found) return null;
    out[key] = { key, id: found.id, name: found.name, subscribers: found.uniqueSubscribers ?? found.totalSubscribers ?? 0 };
  }
  return out;
}

function chunks<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

async function importContacts(contacts: SyncContact[], listIds: number[], blocklist: boolean): Promise<void> {
  for (const batch of chunks(contacts, 500)) {
    await brevo("/contacts/import", {
      method: "POST",
      body: {
        jsonBody: batch.map((c) => ({ email: c.email, attributes: contactAttributes(c) })),
        listIds,
        updateExistingContacts: true,
        emptyContactsAttributes: false,
        disableNotification: true,
        ...(blocklist ? { emailBlacklist: true } : {}),
      },
    });
  }
}

async function removeFromList(listId: number, emails: string[]): Promise<void> {
  for (const batch of chunks(emails, 150)) {
    // 400 when none of them are in the list - nothing to remove, fine.
    await brevo(`/contacts/lists/${listId}/contacts/remove`, { method: "POST", body: { emails: batch } }).catch((err) => {
      if (!alreadyExists(err)) throw err;
    });
  }
}

export interface PushResult {
  contacts: number;
  blocklisted: number;
}

/**
 * Add or update these contacts in Brevo, in exactly the lists they belong
 * in (and out of the ones they no longer do). Opted-out addresses are sent
 * as blocklisted, so Brevo can never mail them.
 */
export async function pushContacts(contacts: SyncContact[], audiences: Record<AudienceKey, Audience>): Promise<PushResult> {
  const active = contacts.filter((c) => !c.optedOut);
  const optedOut = contacts.filter((c) => c.optedOut);

  const groups = new Map<string, SyncContact[]>();
  for (const c of active) {
    const key = membership(c).join(",");
    groups.set(key, [...(groups.get(key) ?? []), c]);
  }
  // Independent calls, run together: "Sync now" runs inside a short web request.
  await Promise.all([
    ...[...groups].map(([key, group]) => importContacts(group, key.split(",").map((k) => audiences[k as AudienceKey].id), false)),
    ...(optedOut.length ? [importContacts(optedOut, [audiences.all.id], true)] : []),
    // Out of the segment lists they have left (Free -> Paid, first website added).
    ...(["free", "paid", "no_website"] as const).map((key) => {
      const leaving = active.filter((c) => !membership(c).includes(key)).map((c) => c.email);
      return leaving.length ? removeFromList(audiences[key].id, leaving) : Promise.resolve();
    }),
  ]);
  return { contacts: active.length, blocklisted: optedOut.length };
}

/**
 * Remove addresses that are in the MyKavo lists but no longer have a
 * MyKavo account (deleted accounts must stop getting campaigns).
 */
export async function pruneContacts(audiences: Record<AudienceKey, Audience>, keep: Set<string>): Promise<number> {
  const perList = await Promise.all(Object.values(audiences).map((a) => pruneList(a, keep)));
  return perList.reduce((n, x) => n + x, 0);
}

async function pruneList(a: Audience, keep: Set<string>): Promise<number> {
  const stale: string[] = [];
  for (let offset = 0; ; offset += 500) {
    const page = await brevo<{ contacts?: { email?: string }[]; count?: number }>(`/contacts/lists/${a.id}/contacts`, {
      query: { limit: 500, offset },
    });
    for (const c of page.contacts ?? []) if (c.email && !keep.has(c.email.toLowerCase())) stale.push(c.email);
    if ((page.contacts?.length ?? 0) < 500) break;
  }
  if (stale.length) await removeFromList(a.id, stale);
  return stale.length;
}

/** Addresses in the MyKavo lists that Brevo has blocklisted (optionally only recently changed ones). */
export async function blocklistedContacts(allListId: number, since?: Date): Promise<string[]> {
  const out: string[] = [];
  for (let offset = 0; ; offset += 500) {
    const page = await brevoContacts({ listId: allListId, modifiedSince: since?.toISOString(), limit: 500, offset });
    for (const c of page.contacts) if (c.emailBlacklisted && c.email) out.push(c.email.toLowerCase());
    if (page.contacts.length < 500) break;
  }
  return out;
}

/**
 * Add one new account to its lists straight away (called at signup), so it
 * is in Brevo before the next sync. Does nothing if the MyKavo lists have
 * not been created yet - the first sync creates them and adds everyone.
 */
export async function addContactNow(c: SyncContact): Promise<boolean> {
  const audiences = await findAudiences();
  if (!audiences) return false;
  await brevo("/contacts", {
    method: "POST",
    body: {
      email: c.email,
      attributes: contactAttributes(c),
      listIds: membership(c).map((k) => audiences[k].id),
      updateEnabled: true,
      ...(c.optedOut ? { emailBlacklisted: true } : {}),
    },
  });
  return true;
}
