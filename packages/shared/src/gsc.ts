/**
 * Google Search Console integration core - shared by the web app (OAuth,
 * on-demand calls) and the worker (daily sync). Three parts:
 *
 * 1. Token crypto: OAuth tokens are AES-256-GCM encrypted at rest with
 *    GSC_TOKEN_KEY (32-byte hex). Never store or log plaintext tokens.
 * 2. Google API client: bare-fetch wrappers for the OAuth token endpoint and
 *    the Search Console API (readonly scope only, spec: never request write
 *    beyond sitemap submission which webmasters scope covers).
 * 3. Pure analysis: period-over-period merging and the Priority
 *    Opportunities engine - the correlation layer that joins search data
 *    with Site Audit issues (the reason this feature exists).
 */

import { createCipheriv, createDecipheriv, createHmac, randomBytes } from "node:crypto";

// ---------- Dead-grant detection ----------

/**
 * OAuth token-endpoint errors that mean the stored grant is permanently dead:
 * retrying, and re-running the sync, can never succeed - the user has to
 * consent again. `invalid_grant` is overwhelmingly the one seen in practice.
 *
 * The most common cause is NOT a bug: while the Google OAuth consent screen is
 * in "Testing" publishing status, Google expires every refresh token after
 * SEVEN DAYS. Connections then die on a weekly rhythm no matter what this code
 * does. Publishing the consent screen (which needs Google verification for the
 * sensitive webmasters.readonly scope) is the only real fix. Others: the user
 * revoked access, the password changed, or the OAuth client was rotated.
 */
const REAUTH_ERRORS = new Set(["invalid_grant", "unauthorized_client", "invalid_client"]);

/** Marker phrase persisted in GscConnection.lastError so the UI can classify it. */
export const GSC_REAUTH_MARKER = "Reconnect Google Search Console";

/** Thrown when Google rejects the saved grant. Never worth retrying. */
export class GscAuthError extends Error {
  readonly reauthRequired = true;
  constructor(public readonly googleError: string) {
    super(
      `Google rejected the saved authorization (${googleError}). ${GSC_REAUTH_MARKER} to resume syncing.`,
    );
    this.name = "GscAuthError";
  }
}

/**
 * Does this stored `lastError` mean the connection needs re-consent? Matches
 * both the marker above and the raw `invalid_grant` text written by earlier
 * builds, so connections already broken in the database classify correctly
 * without a migration or a backfill.
 */
export function isGscReauthMessage(message: string | null | undefined): boolean {
  if (typeof message !== "string") return false;
  return (
    message.includes(GSC_REAUTH_MARKER) ||
    [...REAUTH_ERRORS].some((e) => message.includes(e))
  );
}

// ---------- Token crypto ----------

function keyBytes(hexKey: string): Buffer {
  const key = Buffer.from(hexKey, "hex");
  if (key.length !== 32) throw new Error("GSC_TOKEN_KEY must be 32 bytes of hex");
  return key;
}

/** iv.ciphertext.tag, base64url segments. */
export function encryptToken(plaintext: string, hexKey: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyBytes(hexKey), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return [iv, encrypted, cipher.getAuthTag()]
    .map((b) => b.toString("base64url"))
    .join(".");
}

export function decryptToken(stored: string, hexKey: string): string {
  const [iv, data, tag] = stored.split(".").map((s) => Buffer.from(s, "base64url"));
  const decipher = createDecipheriv("aes-256-gcm", keyBytes(hexKey), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

/** HMAC-signed OAuth state: `<websiteId>.<ts>.<sig>` - CSRF protection. */
export function signOauthState(websiteId: string, hexKey: string, now = Date.now()): string {
  const payload = `${websiteId}.${now}`;
  const sig = createHmac("sha256", keyBytes(hexKey)).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifyOauthState(
  state: string,
  hexKey: string,
  maxAgeMs = 15 * 60 * 1000,
  now = Date.now(),
): string | null {
  const parts = state.split(".");
  if (parts.length !== 3) return null;
  const [websiteId, ts, sig] = parts;
  const expected = createHmac("sha256", keyBytes(hexKey)).update(`${websiteId}.${ts}`).digest("base64url");
  if (sig !== expected) return null;
  if (now - Number(ts) > maxAgeMs) return null;
  return websiteId;
}

// ---------- Google API ----------

export const GSC_SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const API = "https://www.googleapis.com/webmasters/v3";
const SEARCH_API = "https://searchconsole.googleapis.com/v1";

export interface GoogleTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
}

async function tokenRequest(body: URLSearchParams): Promise<GoogleTokens> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  const data = (await res.json()) as {
    access_token?: string; refresh_token?: string; expires_in?: number; error?: string;
  };
  if (!res.ok || !data.access_token) {
    const googleError = String(data.error ?? res.status);
    // A dead grant cannot be retried - only re-consent fixes it. Raise it as
    // its own error type so callers stop retrying and prompt a reconnect.
    if (REAUTH_ERRORS.has(googleError)) throw new GscAuthError(googleError);
    throw new Error(`Google token endpoint: ${googleError}`);
  }
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: new Date(Date.now() + (data.expires_in ?? 3600) * 1000 - 60_000),
  };
}

export function exchangeAuthCode(params: {
  code: string; clientId: string; clientSecret: string; redirectUri: string;
}): Promise<GoogleTokens> {
  return tokenRequest(new URLSearchParams({
    grant_type: "authorization_code",
    code: params.code,
    client_id: params.clientId,
    client_secret: params.clientSecret,
    redirect_uri: params.redirectUri,
  }));
}

export function refreshAccessToken(params: {
  refreshToken: string; clientId: string; clientSecret: string;
}): Promise<GoogleTokens> {
  return tokenRequest(new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: params.refreshToken,
    client_id: params.clientId,
    client_secret: params.clientSecret,
  }));
}

async function gscGet<T>(path: string, accessToken: string, base = API): Promise<T> {
  const res = await fetch(`${base}${path}`, {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`GSC API ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return (await res.json()) as T;
}

async function gscPost<T>(path: string, accessToken: string, body?: unknown, base = API): Promise<T> {
  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`GSC API ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const text = await res.text();
  return (text ? JSON.parse(text) : {}) as T;
}

export async function listProperties(accessToken: string): Promise<{ siteUrl: string; permissionLevel: string }[]> {
  const data = await gscGet<{ siteEntry?: { siteUrl: string; permissionLevel: string }[] }>(
    "/sites", accessToken,
  );
  return data.siteEntry ?? [];
}

export interface SearchAnalyticsRow {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export async function querySearchAnalytics(params: {
  accessToken: string;
  property: string;
  startDate: string;
  endDate: string;
  dimensions: string[];
  rowLimit?: number;
}): Promise<SearchAnalyticsRow[]> {
  const data = await gscPost<{ rows?: SearchAnalyticsRow[] }>(
    `/sites/${encodeURIComponent(params.property)}/searchAnalytics/query`,
    params.accessToken,
    {
      startDate: params.startDate,
      endDate: params.endDate,
      dimensions: params.dimensions,
      rowLimit: params.rowLimit ?? 100,
      dataState: "final",
    },
  );
  return data.rows ?? [];
}

export interface GscSitemap {
  path: string;
  lastSubmitted?: string;
  lastDownloaded?: string;
  isPending?: boolean;
  errors?: string;
  warnings?: string;
  contents?: { type: string; submitted?: string; indexed?: string }[];
}

export async function listSitemaps(accessToken: string, property: string): Promise<GscSitemap[]> {
  const data = await gscGet<{ sitemap?: GscSitemap[] }>(
    `/sites/${encodeURIComponent(property)}/sitemaps`, accessToken,
  );
  return data.sitemap ?? [];
}

export async function submitSitemap(accessToken: string, property: string, feedpath: string): Promise<void> {
  const res = await fetch(
    `${API}/sites/${encodeURIComponent(property)}/sitemaps/${encodeURIComponent(feedpath)}`,
    { method: "PUT", headers: { authorization: `Bearer ${accessToken}` } },
  );
  if (!res.ok) throw new Error(`Sitemap submit failed: ${res.status}`);
}

export interface UrlInspection {
  verdict?: string;
  coverageState?: string;
  indexingState?: string;
  lastCrawlTime?: string;
  googleCanonical?: string;
  userCanonical?: string;
  referringSitemaps?: string[];
  robotsTxtState?: string;
  richResults?: { detectedItems?: unknown[] } | null;
}

export async function inspectUrl(params: {
  accessToken: string; property: string; url: string;
}): Promise<UrlInspection> {
  const data = await gscPost<{ inspectionResult?: {
    indexStatusResult?: Record<string, unknown>;
    richResultsResult?: { detectedItems?: unknown[] };
  } }>(
    "/urlInspection/index:inspect",
    params.accessToken,
    { inspectionUrl: params.url, siteUrl: params.property },
    SEARCH_API,
  );
  const idx = (data.inspectionResult?.indexStatusResult ?? {}) as Record<string, unknown>;
  return {
    verdict: idx.verdict as string | undefined,
    coverageState: idx.coverageState as string | undefined,
    indexingState: idx.indexingState as string | undefined,
    lastCrawlTime: idx.lastCrawlTime as string | undefined,
    googleCanonical: idx.googleCanonical as string | undefined,
    userCanonical: idx.userCanonical as string | undefined,
    referringSitemaps: idx.referringSitemaps as string[] | undefined,
    robotsTxtState: idx.robotsTxtState as string | undefined,
    richResults: data.inspectionResult?.richResultsResult ?? null,
  };
}

// ---------- Pure analysis ----------

export interface DimensionMetrics {
  key: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface MergedRow extends DimensionMetrics {
  clicksDelta: number | null;
  positionDelta: number | null;
}

/** Merge current vs previous period rows by key (position delta: negative =
 *  improved, matching how GSC users read "moved up"). */
export function mergePeriods(
  current: DimensionMetrics[],
  previous: DimensionMetrics[],
): MergedRow[] {
  const prevByKey = new Map(previous.map((r) => [r.key, r]));
  return current.map((row) => {
    const prev = prevByKey.get(row.key);
    return {
      ...row,
      clicksDelta: prev ? row.clicks - prev.clicks : null,
      positionDelta: prev ? Number((row.position - prev.position).toFixed(1)) : null,
    };
  });
}

export interface PageAuditFacts {
  /** ERROR/WARNING issue titles hitting this URL in the latest audit. */
  issues: { title: string; severity: "ERROR" | "WARNING" | "NOTICE"; checkId: string }[];
}

export interface Opportunity {
  page: string;
  priority: "HIGH" | "MEDIUM";
  reason: string;
  action: string;
  clicks: number;
  impressions: number;
  position: number;
  issues: string[];
}

/**
 * The correlation engine (the PRD's "most important feature"): join search
 * performance with Site Audit findings and surface the pages where fixing
 * something would actually move traffic. Deterministic rules, worst first.
 */
export function buildOpportunities(
  pages: MergedRow[],
  auditByUrl: Map<string, PageAuditFacts>,
): Opportunity[] {
  const opportunities: Opportunity[] = [];
  for (const page of pages) {
    const audit = auditByUrl.get(page.key) ?? auditByUrl.get(page.key.replace(/\/$/, ""));
    const issues = audit?.issues ?? [];
    const errorTitles = issues.filter((i) => i.severity === "ERROR").map((i) => i.title);
    const has = (checkId: string) => issues.some((i) => i.checkId === checkId);
    const base = {
      page: page.key,
      clicks: page.clicks,
      impressions: page.impressions,
      position: Number(page.position.toFixed(1)),
    };

    if (issues.some((i) => i.checkId === "noindex-page") && page.impressions > 0) {
      opportunities.push({ ...base, priority: "HIGH", issues: ["Noindex page"],
        reason: "This page still gets impressions but is marked noindex - its search traffic will disappear.",
        action: "Remove the noindex directive if the page should keep ranking." });
      continue;
    }
    if (errorTitles.length > 0 && page.impressions >= 500) {
      opportunities.push({ ...base, priority: "HIGH", issues: errorTitles.slice(0, 3),
        reason: `High-visibility page (${page.impressions.toLocaleString("en-US")} impressions) with ${errorTitles.length} critical audit issue${errorTitles.length === 1 ? "" : "s"}.`,
        action: "Fix the critical issues on this page first - it is where the traffic already is." });
      continue;
    }
    if (page.clicksDelta !== null && page.clicksDelta < 0 &&
        Math.abs(page.clicksDelta) >= Math.max(20, page.clicks) &&
        page.clicks + Math.abs(page.clicksDelta) >= 50) {
      opportunities.push({ ...base, priority: "HIGH", issues: errorTitles.slice(0, 3),
        reason: `Clicks dropped by ${Math.abs(page.clicksDelta).toLocaleString("en-US")} vs the previous period.`,
        action: "Compare this page against its baseline in Changes - something on it likely regressed." });
      continue;
    }
    if (page.positionDelta !== null && page.positionDelta >= 3 && page.impressions >= 200) {
      opportunities.push({ ...base, priority: "MEDIUM", issues: errorTitles.slice(0, 3),
        reason: `Average position slipped ${page.positionDelta.toFixed(1)} places vs the previous period.`,
        action: "Review recent changes to this page and its internal links." });
      continue;
    }
    if ((has("desc-missing") || has("desc-empty")) && page.impressions >= 300) {
      opportunities.push({ ...base, priority: "MEDIUM", issues: ["Missing meta description"],
        reason: `${page.impressions.toLocaleString("en-US")} impressions with no meta description - the snippet is left to chance.`,
        action: "Write a 70-155 character description that sells the click." });
      continue;
    }
    if (page.position >= 4 && page.position <= 15 && page.impressions >= 500 && page.ctr < 0.015) {
      opportunities.push({ ...base, priority: "MEDIUM", issues: [],
        reason: `Ranks ${page.position.toFixed(1)} with only ${(page.ctr * 100).toFixed(1)}% CTR - the snippet is underperforming its position.`,
        action: "Rework the title and description; consider FAQ/product schema for a richer result." });
    }
  }
  const rank = { HIGH: 0, MEDIUM: 1 };
  return opportunities
    .sort((a, b) => rank[a.priority] - rank[b.priority] || b.impressions - a.impressions)
    .slice(0, 10);
}

/** yyyy-mm-dd in UTC, offset by `daysAgo`. */
export function gscDate(daysAgo: number, now = new Date()): string {
  const d = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}
