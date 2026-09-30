import {
  isMissingTableError,
  loadAndroidAppUsers,
  loadPluginInstalls,
  loadUpdateNoticeState,
  prisma,
} from "@mykavo/database";
import {
  PRODUCT_ANDROID,
  PRODUCT_WORDPRESS,
  UPDATE_EMAIL_SPACING_MS,
  WPORG_PLUGIN_INFO_URL,
  appUpdateRecipients,
  highestVersion,
  parseWpOrgPluginInfo,
  pluginUpdateRecipients,
  type Product,
} from "@mykavo/shared";
import { WP_PLUGIN_VERSION } from "@/config/wordpress-plugin";
import { logger } from "@/lib/logger";

/**
 * Admin > Automations > Update emails: per product, the newest release, who
 * runs an older version, and how many have been told. Callers check
 * isPlatformAdmin first.
 */

export interface UpdatePerson {
  email: string;
  name: string;
  /** e.g. "modyn.com (1.0.0)" or "1.0.1" / "unknown". */
  detail: string;
  status: "notified" | "waiting" | "spaced" | "unsubscribed";
}

export interface ProductPanel {
  product: Product;
  /** Newest release MyKavo knows about. */
  release: { version: string; source: string; detectedAt: string; sendRequestedAt: string | null; notes: string[] } | null;
  /** Suggested version for the Send form. */
  suggestedVersion: string;
  /** People on an older version than the release (or the suggestion). */
  outdated: UpdatePerson[];
  /** Installs/users in total. */
  total: number;
}

export interface UpdateEmailsPanel {
  ready: boolean;
  wordpressOrg: { version: string | null; checked: boolean };
  plugin: ProductPanel;
  app: ProductPanel;
}

async function wordpressOrgVersion(): Promise<{ version: string | null; checked: boolean }> {
  try {
    const res = await fetch(WPORG_PLUGIN_INFO_URL, { next: { revalidate: 600 }, signal: AbortSignal.timeout(5000) });
    if (res.status === 404) return { version: null, checked: true };
    if (!res.ok) return { version: null, checked: false };
    return { version: parseWpOrgPluginInfo(await res.json())?.version ?? null, checked: true };
  } catch {
    return { version: null, checked: false };
  }
}

async function latestRelease(product: Product): Promise<ProductPanel["release"]> {
  const rows = await prisma.productRelease.findMany({
    where: { product },
    select: { version: true, source: true, detectedAt: true, sendRequestedAt: true, notes: true },
  });
  const v = highestVersion(rows.map((r) => r.version));
  const r = rows.find((x) => x.version === v);
  return r
    ? {
        version: r.version,
        source: r.source,
        detectedAt: r.detectedAt.toISOString(),
        sendRequestedAt: r.sendRequestedAt?.toISOString() ?? null,
        notes: Array.isArray(r.notes) ? r.notes.filter((n): n is string => typeof n === "string") : [],
      }
    : null;
}

function statusOf(
  userId: string,
  email: string,
  state: Awaited<ReturnType<typeof loadUpdateNoticeState>>,
): UpdatePerson["status"] {
  if (state.notified.has(userId)) return "notified";
  if (state.optedOut.has(email.trim().toLowerCase())) return "unsubscribed";
  if (state.recentlyNotified.has(userId)) return "spaced";
  return "waiting";
}

export async function loadUpdateEmailsPanel(): Promise<UpdateEmailsPanel> {
  const [wordpressOrg, installs, appUsers] = await Promise.all([
    wordpressOrgVersion(),
    loadPluginInstalls(prisma),
    loadAndroidAppUsers(prisma).catch((err: unknown) => {
      logger.error("update emails: could not load app users", {}, err);
      return [];
    }),
  ]);

  let ready = true;
  let pluginRelease: ProductPanel["release"] = null;
  let appRelease: ProductPanel["release"] = null;
  try {
    [pluginRelease, appRelease] = await Promise.all([latestRelease(PRODUCT_WORDPRESS), latestRelease(PRODUCT_ANDROID)]);
  } catch (err) {
    if (!isMissingTableError(err)) throw err;
    ready = false;
  }

  const pluginTarget = highestVersion([pluginRelease?.version, wordpressOrg.version, WP_PLUGIN_VERSION].filter((v): v is string => !!v)) ?? WP_PLUGIN_VERSION;
  const appTarget = appRelease?.version ?? "1.0.2";

  const empty = { notified: new Set<string>(), recentlyNotified: new Set<string>(), optedOut: new Set<string>() };
  const [pluginState, appState] = ready
    ? await Promise.all([
        loadUpdateNoticeState(prisma, PRODUCT_WORDPRESS, pluginTarget, UPDATE_EMAIL_SPACING_MS),
        loadUpdateNoticeState(prisma, PRODUCT_ANDROID, appTarget, UPDATE_EMAIL_SPACING_MS),
      ])
    : [empty, empty];

  const pluginPeople = pluginUpdateRecipients(installs, pluginTarget).map((r) => ({
    email: r.email,
    name: r.name,
    detail: r.sites.map((s) => `${s.label} (${s.currentVersion ?? "older"})`).join(", "),
    status: statusOf(r.userId, r.email, pluginState),
  }));
  const appPeople = appUpdateRecipients(appUsers, appTarget).map((u) => ({
    email: u.email,
    name: u.name,
    detail: u.version ? `on ${u.version}` : "on 1.0.1 or older",
    status: statusOf(u.userId, u.email, appState),
  }));
  return {
    ready,
    wordpressOrg,
    plugin: {
      product: PRODUCT_WORDPRESS,
      release: pluginRelease,
      suggestedVersion: pluginTarget,
      outdated: pluginPeople,
      total: new Set(installs.map((i) => i.userId)).size,
    },
    app: { product: PRODUCT_ANDROID, release: appRelease, suggestedVersion: appTarget, outdated: appPeople, total: appUsers.length },
  };
}
