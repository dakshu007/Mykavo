/**
 * Admin tracking - the pure half: which client a request came from, how page
 * paths are stored and named, and how devices are described. No database, so
 * all of it is unit-tested.
 */

export const CHANNELS = ["web", "android", "wordpress", "shopify", "chrome", "mcp"] as const;
export type Channel = (typeof CHANNELS)[number];

export const CHANNEL_LABEL: Record<Channel, string> = {
  web: "Web dashboard",
  android: "Android app",
  wordpress: "WordPress plugin",
  shopify: "Shopify app",
  chrome: "Chrome extension",
  mcp: "AI assistant (MCP)",
};

export interface AppClient {
  platform: "android" | "ios";
  /** App version, when the app says (X-MyKavo-Client); null for older builds. */
  version: string | null;
}

/**
 * Is this request from the MyKavo mobile app? Newer builds say so in
 * X-MyKavo-Client ("android/1.0.2"); older ones are recognised by React
 * Native's HTTP stack, which no browser sends.
 */
export function appClientFrom(userAgent: string | null, clientHeader: string | null): AppClient | null {
  const m = /^(android|ios)\/(\d{1,3}(?:\.\d{1,4}){0,3})$/i.exec((clientHeader ?? "").trim());
  if (m) return { platform: m[1].toLowerCase() as AppClient["platform"], version: m[2] };
  const ua = userAgent ?? "";
  if (/^okhttp\/|Dalvik\//i.test(ua)) return { platform: "android", version: null };
  if (/^MyKavo\/.*CFNetwork/i.test(ua)) return { platform: "ios", version: null };
  return null;
}

/** A human description of a session's User-Agent, for the devices list. */
export function describeUserAgent(ua: string | null | undefined): { label: string; app: boolean } {
  const s = ua ?? "";
  if (!s) return { label: "Unknown device", app: false };
  if (appClientFrom(s, null)) return { label: "Android app", app: true };
  const browser = /Edg\//.test(s)
    ? "Edge"
    : /OPR\/|Opera/.test(s)
      ? "Opera"
      : /Firefox\//.test(s)
        ? "Firefox"
        : /Chrome\/|CriOS\//.test(s)
          ? "Chrome"
          : /Safari\//.test(s)
            ? "Safari"
            : null;
  const os = /Android/.test(s)
    ? "Android"
    : /iPhone|iPad|iPod/.test(s)
      ? "iOS"
      : /Mac OS X|Macintosh/.test(s)
        ? "macOS"
        : /Windows/.test(s)
          ? "Windows"
          : /CrOS/.test(s)
            ? "ChromeOS"
            : /Linux/.test(s)
              ? "Linux"
              : null;
  if (!browser && !os) return { label: s.slice(0, 40), app: false };
  return { label: [browser ?? "Browser", os ? `on ${os}` : ""].filter(Boolean).join(" "), app: false };
}

/**
 * The path stored for a page view: a dashboard path, without query or hash,
 * or null for anything that is not one (so the endpoint cannot be used to
 * store arbitrary text).
 */
export function normalizePagePath(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const path = raw.split(/[?#]/)[0].slice(0, 200);
  if (!/^\/dashboard(\/[A-Za-z0-9._~\-[\]]*)*\/?$/.test(path)) return null;
  return path.length > 1 ? path.replace(/\/+$/, "") || "/" : path;
}

/** Collapse ids so views of different websites/changes group together. */
export function routeOf(path: string): string {
  return path
    .split("/")
    .map((seg) => (/^c[a-z0-9]{20,}$/.test(seg) || /^[0-9a-f-]{24,}$/i.test(seg) ? "[id]" : seg))
    .join("/");
}

const ROUTE_LABELS: Array<[RegExp, string]> = [
  [/^\/dashboard$/, "Overview"],
  [/^\/dashboard\/websites$/, "Websites"],
  [/^\/dashboard\/websites\/new$/, "Add website"],
  [/^\/dashboard\/websites\/\[id\]$/, "Website detail"],
  [/^\/dashboard\/websites\/\[id\]\/pages$/, "Website pages"],
  [/^\/dashboard\/websites\/\[id\]\/seo$/, "SEO report"],
  [/^\/dashboard\/websites\/\[id\]\/eeat$/, "MyKavo Analyser"],
  [/^\/dashboard\/changes$/, "Changes"],
  [/^\/dashboard\/changes\/\[id\]$/, "Change detail"],
  [/^\/dashboard\/scans$/, "Scan history"],
  [/^\/dashboard\/scans\/\[id\]$/, "Scan detail"],
  [/^\/dashboard\/site-audit/, "Site Audit"],
  [/^\/dashboard\/search-console/, "Search Console"],
  [/^\/dashboard\/analyser/, "Analyser"],
  [/^\/dashboard\/notifications/, "Notifications"],
  [/^\/dashboard\/billing/, "Billing"],
  [/^\/dashboard\/settings/, "Settings"],
  [/^\/dashboard\/wordpress/, "WordPress"],
  [/^\/dashboard\/shopify/, "Shopify"],
  [/^\/dashboard\/ai-assistants/, "AI assistants"],
  [/^\/dashboard\/app/, "Android app"],
];

export function pageLabel(route: string): string {
  for (const [re, label] of ROUTE_LABELS) if (re.test(route)) return label;
  return route.replace(/^\/dashboard\/?/, "") || "Overview";
}

/** "YYYY-MM-DD" in UTC. */
export function utcDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** The last `n` UTC days, oldest first, ending today. */
export function lastDays(n: number, now: Date = new Date()): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) out.push(utcDay(new Date(now.getTime() - i * 86_400_000)));
  return out;
}
