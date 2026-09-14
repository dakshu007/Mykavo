/**
 * Gathers usage figures for every external service MyKavo depends on.
 *
 * The design rule for this whole module: **never report a number we did not
 * measure.** A usage dashboard exists to be trusted at a glance, so a figure
 * that is stale, partial, or came from a provider we could not reach must say
 * so rather than render as a confident meter. Every source therefore carries
 * a `state`, and the UI renders "unavailable" and "not configured"
 * differently from a real reading.
 *
 * Sources fall into three groups:
 *
 *  - Measured from our own Postgres (size, connections, table growth, email
 *    sends, volumes). No extra credentials, always current, cheap.
 *  - Measured from R2 by listing the bucket. Needs the keys we already have,
 *    but costs a list request per 1,000 objects, so it is bounded and can
 *    come back partial.
 *  - Reported by a provider API (Netlify). Needs a token this deployment may
 *    not have, in which case the row says what to set rather than vanishing.
 *
 * Email sends are counted from our own `notification` table rather than from
 * Resend, deliberately: that table is written on every send attempt, so it is
 * the authoritative record of what MyKavo asked Resend to do, and it needs no
 * API token. It will diverge from Resend's own counter if something else
 * sends through the same account.
 */

import { prisma } from "@mykavo/database";
// The /storage SUBPATH, not the package index - the index re-exports
// lighthouse.ts, which drags Lighthouse and Playwright into the Next bundle
// and fails the page with a module-not-found. Every other web import of this
// package uses the subpath for the same reason.
import { getDefaultStorage } from "@mykavo/scanner/storage";
import { QUOTAS, type Quota } from "@/config/quotas";
import type { UsageUnit } from "./format";
import { logger } from "@/lib/logger";

/**
 * How much to trust a figure.
 *
 * "partial" matters more than it looks: a truncated bucket walk produces a
 * number that is real but is a floor, and showing it as a total would
 * understate storage - the one direction that costs money silently.
 */
export type MetricState = "measured" | "partial" | "unavailable" | "unconfigured";

export interface UsageMeter {
  id: string;
  label: string;
  provider: string;
  used: number;
  limit: number;
  unit: UsageUnit;
  state: MetricState;
  /** Where the cap came from, or why the reading is missing. */
  detail: string;
}

export interface UsageStat {
  id: string;
  /**
   * Render order. Assigned explicitly because these rows are appended by
   * whichever probe finished first, which put "Email failures today" below
   * six table-size rows - an arbitrary order reads as an unsorted dump.
   */
  order: number;
  label: string;
  provider: string;
  value: number | null;
  unit: UsageUnit;
  state: MetricState;
  detail: string;
}

export interface UsageReport {
  generatedAt: string;
  meters: UsageMeter[];
  stats: UsageStat[];
  /** Services with no cap worth metering - stated so they are not "missing". */
  uncapped: { label: string; detail: string }[];
  /** Sources that failed, for the page footer. */
  problems: string[];
}

const PROBE_TIMEOUT_MS = 8_000;

/** Postgres bigint arrives as BigInt; anything unexpected becomes NaN, not 0. */
function toNumber(value: unknown): number {
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : Number.NaN;
  }
  return Number.NaN;
}

function message(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** Reject rather than hang - a slow provider must not hold the page open. */
function withTimeout<T>(promise: Promise<T>, ms: number, what: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${what} timed out after ${ms}ms`)), ms),
    ),
  ]);
}

function meter(
  id: string,
  label: string,
  provider: string,
  used: number,
  quota: Quota,
  unit: UsageUnit,
  state: MetricState = "measured",
  extra?: string,
): UsageMeter {
  return {
    id,
    label,
    provider,
    used,
    limit: quota.limit,
    unit,
    state,
    detail: extra ? `${extra} ${quota.note}` : quota.note,
  };
}

function missingMeter(
  id: string,
  label: string,
  provider: string,
  quota: Quota,
  unit: UsageUnit,
  state: "unavailable" | "unconfigured",
  detail: string,
): UsageMeter {
  return { id, label, provider, used: Number.NaN, limit: quota.limit, unit, state, detail };
}

// ---------------------------------------------------------------- Postgres

interface DatabaseFigures {
  sizeBytes: number;
  connectionsUsed: number;
  connectionsMax: number | null;
  tables: { name: string; bytes: number }[];
}

async function collectDatabase(): Promise<DatabaseFigures> {
  const [size] = await prisma.$queryRaw<{ bytes: bigint }[]>`
    SELECT pg_database_size(current_database()) AS bytes
  `;

  // max_connections read from the server rather than assumed: on Supabase it
  // depends on instance size and on whether you are behind a pooler, so a
  // hardcoded cap here would be wrong for most deployments.
  const [conns] = await prisma.$queryRaw<
    { used: bigint; max_connections: string | null }[]
  >`
    SELECT
      (SELECT count(*) FROM pg_stat_activity WHERE datname = current_database()) AS used,
      (SELECT setting FROM pg_settings WHERE name = 'max_connections') AS max_connections
  `;

  // Which tables are actually growing. Without this, "database 82% full" is
  // a problem you cannot act on.
  const tables = await prisma.$queryRaw<{ name: string; bytes: bigint }[]>`
    SELECT c.relname AS name, pg_total_relation_size(c.oid) AS bytes
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
    ORDER BY pg_total_relation_size(c.oid) DESC
    LIMIT 6
  `;

  const max = conns?.max_connections ? Number(conns.max_connections) : Number.NaN;
  return {
    sizeBytes: toNumber(size?.bytes),
    connectionsUsed: toNumber(conns?.used),
    connectionsMax: Number.isFinite(max) ? max : null,
    tables: tables.map((t) => ({ name: t.name, bytes: toNumber(t.bytes) })),
  };
}

// ------------------------------------------------------------------ Resend

/** Start of the current UTC day and month - the windows Resend bills on. */
function windows(now: Date) {
  const dayStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  return { dayStart, monthStart };
}

async function collectEmail(now: Date) {
  const { dayStart, monthStart } = windows(now);
  const where = { channelType: "EMAIL" as const, status: "SENT" as const };
  const [today, month, failedToday] = await Promise.all([
    prisma.notification.count({ where: { ...where, sentAt: { gte: dayStart } } }),
    prisma.notification.count({ where: { ...where, sentAt: { gte: monthStart } } }),
    prisma.notification.count({
      where: { channelType: "EMAIL", status: "FAILED", createdAt: { gte: dayStart } },
    }),
  ]);
  return { today, month, failedToday };
}

// --------------------------------------------------------------------- R2

async function collectStorage() {
  const storage = getDefaultStorage();
  if (typeof storage.usage !== "function") {
    // Local disk and Netlify Blobs cannot answer this. Say which backend is
    // in use rather than implying R2 is broken.
    throw new Error(
      `The configured artifact store (${process.env.ARTIFACT_STORE ?? "local disk"}) does not report storage usage.`,
    );
  }
  return storage.usage({ maxPages: 20 });
}

// ---------------------------------------------------------------- Netlify

/**
 * Netlify's bandwidth figure.
 *
 * The account bandwidth endpoint is not part of Netlify's documented public
 * API, so this is written to fail cleanly rather than confidently: any
 * non-OK response, or a body without the fields expected, becomes an
 * "unavailable" row naming the status. It is never allowed to guess.
 */
async function collectNetlify(signal: AbortSignal) {
  const token = process.env.NETLIFY_AUTH_TOKEN;
  if (!token || token.trim().length === 0) {
    throw Object.assign(new Error("NETLIFY_AUTH_TOKEN is not set for the web app."), {
      unconfigured: true,
    });
  }

  const headers = { authorization: `Bearer ${token.trim()}`, accept: "application/json" };
  const accountsRes = await fetch("https://api.netlify.com/api/v1/accounts", {
    headers,
    signal,
  });
  if (!accountsRes.ok) {
    throw new Error(`Netlify accounts request returned ${accountsRes.status}.`);
  }
  const accounts: unknown = await accountsRes.json();
  if (!Array.isArray(accounts) || accounts.length === 0) {
    throw new Error("Netlify returned no accounts for this token.");
  }

  const wanted = process.env.NETLIFY_ACCOUNT_SLUG?.trim().toLowerCase();
  const account = (accounts as { id?: unknown; slug?: unknown }[]).find((a) =>
    wanted ? String(a.slug).toLowerCase() === wanted : typeof a.id === "string",
  );
  if (!account || typeof account.id !== "string") {
    throw new Error(
      wanted
        ? `No Netlify account matched NETLIFY_ACCOUNT_SLUG=${wanted}.`
        : "Netlify account response had no usable id.",
    );
  }

  const res = await fetch(
    `https://api.netlify.com/api/v1/accounts/${encodeURIComponent(account.id)}/bandwidth`,
    { headers, signal },
  );
  if (!res.ok) {
    throw new Error(`Netlify bandwidth request returned ${res.status}.`);
  }
  const body: unknown = await res.json();
  const used = toNumber((body as { used?: unknown })?.used);
  const included = toNumber((body as { included?: unknown })?.included);
  if (!Number.isFinite(used)) {
    throw new Error("Netlify bandwidth response had no numeric `used` field.");
  }
  return { used, included: Number.isFinite(included) ? included : null };
}

// ----------------------------------------------------------------- volumes

async function collectVolumes(now: Date) {
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const [
    workspaces,
    users,
    websites,
    monitoredPages,
    scans24h,
    scans30d,
    snapshotsWithScreenshot,
    pushDevices,
  ] = await Promise.all([
    prisma.workspace.count(),
    prisma.user.count(),
    prisma.website.count(),
    prisma.monitoredPage.count({ where: { enabled: true } }),
    prisma.scan.count({ where: { createdAt: { gte: dayAgo } } }),
    prisma.scan.count({ where: { createdAt: { gte: monthAgo } } }),
    prisma.pageSnapshot.count({ where: { screenshotStorageKey: { not: null } } }),
    prisma.pushDevice.count({ where: { enabled: true } }),
  ]);
  return {
    workspaces,
    users,
    websites,
    monitoredPages,
    scans24h,
    scans30d,
    snapshotsWithScreenshot,
    pushDevices,
  };
}

// ------------------------------------------------------------------ report

/**
 * Runs every probe in parallel and assembles the report.
 *
 * `allSettled`, not `all`: one unreachable provider must degrade its own row,
 * not blank the page. That matters most exactly when something is wrong.
 */
export async function collectUsage(now: Date = new Date()): Promise<UsageReport> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);

  const [database, email, storage, netlify, volumes] = await Promise.allSettled([
    withTimeout(collectDatabase(), PROBE_TIMEOUT_MS, "Database probe"),
    withTimeout(collectEmail(now), PROBE_TIMEOUT_MS, "Email count"),
    withTimeout(collectStorage(), PROBE_TIMEOUT_MS * 3, "Storage walk"),
    withTimeout(collectNetlify(controller.signal), PROBE_TIMEOUT_MS, "Netlify"),
    withTimeout(collectVolumes(now), PROBE_TIMEOUT_MS, "Volume counts"),
  ]);
  clearTimeout(timer);

  const meters: UsageMeter[] = [];
  const stats: UsageStat[] = [];
  const problems: string[] = [];

  // --- database
  const dbQuota = QUOTAS.databaseBytes();
  if (database.status === "fulfilled") {
    meters.push(
      meter("db-size", "Database size", "Supabase Postgres", database.value.sizeBytes, dbQuota, "bytes"),
    );
    const max = database.value.connectionsMax;
    meters.push(
      max !== null
        ? {
            id: "db-connections",
            label: "Database connections",
            provider: "Supabase Postgres",
            used: database.value.connectionsUsed,
            limit: max,
            unit: "count",
            state: "measured",
            detail: `max_connections reported by the server as ${max}.`,
          }
        : meter(
            "db-connections",
            "Database connections",
            "Supabase Postgres",
            database.value.connectionsUsed,
            QUOTAS.databaseConnections(),
            "count",
          ),
    );
    for (const table of database.value.tables) {
      stats.push({
        id: `table-${table.name}`,
        label: `Table: ${table.name}`,
        provider: "Supabase Postgres",
        value: table.bytes,
        unit: "bytes",
        state: "measured",
        order: 30,
        detail: "Includes indexes and TOAST.",
      });
    }
  } else {
    problems.push(`Database: ${message(database.reason)}`);
    meters.push(
      missingMeter("db-size", "Database size", "Supabase Postgres", dbQuota, "bytes", "unavailable", message(database.reason)),
    );
  }

  // --- email
  if (email.status === "fulfilled") {
    meters.push(
      meter("email-day", "Emails sent today", "Resend", email.value.today, QUOTAS.emailsPerDay(), "count", "measured", "Counted from MyKavo's own notification log (UTC day)."),
    );
    meters.push(
      meter("email-month", "Emails sent this month", "Resend", email.value.month, QUOTAS.emailsPerMonth(), "count", "measured", "Counted from MyKavo's own notification log (UTC month)."),
    );
    stats.push({
      id: "email-failed",
      label: "Email failures today",
      provider: "Resend",
      value: email.value.failedToday,
      unit: "count",
      state: "measured",
      order: 20,
      detail: "Sends that errored. Anything above zero is worth a look.",
    });
  } else {
    problems.push(`Email counts: ${message(email.reason)}`);
    meters.push(
      missingMeter("email-day", "Emails sent today", "Resend", QUOTAS.emailsPerDay(), "count", "unavailable", message(email.reason)),
    );
  }

  // --- storage
  const storageQuota = QUOTAS.storageBytes();
  if (storage.status === "fulfilled") {
    meters.push(
      meter(
        "r2-bytes",
        "Object storage",
        "Cloudflare R2",
        storage.value.bytes,
        storageQuota,
        "bytes",
        storage.value.truncated ? "partial" : "measured",
        storage.value.truncated
          ? "Stopped after 20,000 objects, so this is a FLOOR, not a total."
          : `Summed across ${storage.value.objects.toLocaleString("en-US")} objects.`,
      ),
    );
    stats.push({
      id: "r2-objects",
      label: "Objects in bucket",
      provider: "Cloudflare R2",
      value: storage.value.objects,
      unit: "count",
      order: 11,
      state: storage.value.truncated ? "partial" : "measured",
      detail: storage.value.truncated ? "Walk stopped at the page budget." : "Counted by listing the bucket.",
    });
  } else {
    problems.push(`Storage: ${message(storage.reason)}`);
    meters.push(
      missingMeter("r2-bytes", "Object storage", "Cloudflare R2", storageQuota, "bytes", "unavailable", message(storage.reason)),
    );
  }

  // --- netlify
  const bandwidthQuota = QUOTAS.bandwidthBytes();
  if (netlify.status === "fulfilled") {
    meters.push({
      id: "netlify-bandwidth",
      label: "Bandwidth this period",
      provider: "Netlify",
      used: netlify.value.used,
      limit: netlify.value.included ?? bandwidthQuota.limit,
      unit: "bytes",
      state: "measured",
      detail:
        netlify.value.included !== null
          ? "Cap reported by Netlify for this account."
          : bandwidthQuota.note,
    });
  } else {
    const reason = netlify.reason;
    const unconfigured =
      typeof reason === "object" && reason !== null && "unconfigured" in reason;
    if (!unconfigured) problems.push(`Netlify: ${message(reason)}`);
    meters.push(
      missingMeter(
        "netlify-bandwidth",
        "Bandwidth this period",
        "Netlify",
        bandwidthQuota,
        "bytes",
        unconfigured ? "unconfigured" : "unavailable",
        unconfigured
          ? "Add NETLIFY_AUTH_TOKEN to the web app's environment to read this."
          : message(reason),
      ),
    );
  }

  // --- volumes
  if (volumes.status === "fulfilled") {
    const v = volumes.value;
    const orphans = v.snapshotsWithScreenshot;
    stats.push(
      { id: "websites", label: "Websites monitored", provider: "MyKavo", value: v.websites, unit: "count", state: "measured", detail: "Across every workspace.", order: 1 },
      { id: "pages", label: "Monitored pages", provider: "MyKavo", value: v.monitoredPages, unit: "count", state: "measured", detail: "Enabled pages. This is what drives scan cost.", order: 2 },
      { id: "scans-24h", label: "Scans, last 24h", provider: "MyKavo", value: v.scans24h, unit: "count", state: "measured", detail: "Every other figure here follows from this one.", order: 3 },
      { id: "scans-30d", label: "Scans, last 30d", provider: "MyKavo", value: v.scans30d, unit: "count", state: "measured", detail: "", order: 4 },
      { id: "workspaces", label: "Workspaces", provider: "MyKavo", value: v.workspaces, unit: "count", state: "measured", detail: `${v.users} user${v.users === 1 ? "" : "s"}.`, order: 5 },
      { id: "push-devices", label: "Phones registered for push", provider: "Expo / FCM", value: v.pushDevices, unit: "count", state: "measured", detail: "Enabled devices.", order: 6 },
      {
        id: "screenshot-rows",
        label: "Snapshots holding a screenshot",
        provider: "MyKavo",
        value: orphans,
        unit: "count",
        state: "measured",
        order: 10,
        detail:
          "Compare with objects in the bucket: many more objects than rows means retention deleted rows without deleting the files, and you are paying to store nothing.",
      },
    );
  } else {
    problems.push(`Volume counts: ${message(volumes.reason)}`);
  }

  return {
    generatedAt: now.toISOString(),
    meters,
    // Volumes, then the storage/email signals they explain, then table sizes.
    stats: stats.sort((a, b) => a.order - b.order),
    uncapped: [
      {
        label: "Push notifications (Expo + FCM)",
        detail:
          "No message cap and no per-message charge on either service. Expo rate-limits per second, not per month.",
      },
      {
        label: "APK builds (GitHub Actions)",
        detail:
          "Unmetered, because this repository is public. A private repository would meter build minutes.",
      },
      {
        label: "Google Play",
        detail: "The $25 developer fee is one-off. Unlimited apps, updates and installs.",
      },
    ],
    problems,
  };
}

/** Log failures server-side too, so a broken probe is visible without opening the page. */
export function logUsageProblems(report: UsageReport): void {
  for (const problem of report.problems) {
    logger.warn("usage probe failed", { problem });
  }
}
