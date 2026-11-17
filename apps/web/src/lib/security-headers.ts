/**
 * Production security headers (spec §59).
 *
 * next.config.ts previously returned NO headers in production - the dev-only
 * CORS block short-circuited on NODE_ENV, so the live site shipped without
 * HSTS, clickjacking protection, MIME-sniffing protection or a CSP.
 *
 * Kept here rather than inline in next.config so the policy is testable and
 * so each decision can carry the reason it was made.
 */

/**
 * Origins the app genuinely loads at runtime. Deliberately short - fonts are
 * self-hosted by next/font, screenshots are served through same-origin app
 * routes, and Dodo checkout is a top-level redirect rather than an embed.
 */
const GTM = "https://www.googletagmanager.com";
const GA = "https://*.google-analytics.com";
const GA_ANALYTICS = "https://*.analytics.google.com";
const GA_APEX = "https://analytics.google.com https://stats.g.doubleclick.net https://www.google.com";
const DODO_CHECKOUT = "https://checkout.dodopayments.com";
/**
 * Microsoft Clarity on public pages. Scripts come from exactly two hosts (the
 * tag and the bundle it loads); only the data collector varies by subdomain.
 */
const CLARITY = "https://www.clarity.ms https://scripts.clarity.ms";
const CLARITY_COLLECT = "https://*.clarity.ms https://c.bing.com";
/** /video-tutorials plays videos in YouTube's privacy-enhanced player. */
const YOUTUBE_EMBED = "https://www.youtube-nocookie.com";

/**
 * The CSP is ENFORCED in production (November 2026), after shipping
 * report-only first: a policy that is wrong by one directive takes the
 * whole site down, so real traffic was read before switching. Violations
 * still go to /api/csp-report, now meaning "this was blocked".
 * Development keeps it report-only: the dev server's tooling uses eval.
 *
 * HONEST LIMIT: script-src carries 'unsafe-inline'. Next.js emits inline
 * bootstrap scripts, and the alternative - per-request nonces - forces every
 * static page to render dynamically, which would cost this site most of its
 * caching for a partial XSS mitigation. So CSP here is NOT a strong XSS
 * defence. What it does still buy is real: script sources are limited to us
 * and the analytics hosts, object-src blocks plugin-based attacks, base-uri
 * stops <base> tag hijacking of every relative URL, form-action stops forms
 * posting to non-web schemes, and frame-ancestors blocks clickjacking.
 */
const CSP_DIRECTIVES = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${GTM} https://www.google-analytics.com ${CLARITY}`,
  // Next.js and Tailwind both emit inline styles; there is no nonce-free
  // alternative, and injected CSS is a far smaller prize than injected JS.
  // Google Fonts: the Brand Video preview renders in the customer's own
  // brand fonts (packages/brand-video compose.ts), exactly as the export.
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https://fonts.gstatic.com",
  // Exported brand videos play from short-lived signed links to the private
  // R2 bucket (too large to pass through a serverless response).
  "media-src 'self' blob: https://*.r2.cloudflarestorage.com",
  // GA4 also posts to the apex analytics.google.com (a *. wildcard never
  // matches the apex) and, with Google Signals, to stats.g.doubleclick.net
  // and google.com; both showed up in real violation reports. Signals'
  // regional google.<tld> audience pings stay blocked: they are ad
  // remarketing, not measurement.
  `connect-src 'self' ${GA} ${GA_ANALYTICS} ${GA_APEX} ${GTM} ${CLARITY_COLLECT}`,
  `frame-src 'self' ${DODO_CHECKOUT} ${YOUTUBE_EMBED}`,
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  // No <object>/<embed>/<applet> anywhere in this app.
  "object-src 'none'",
  // Without this, an injected <base href> silently repoints every relative
  // URL on the page - including form posts and script sources.
  "base-uri 'self'",
  // Our forms post to us, but Chrome also applies form-action to the
  // REDIRECT after a post, and three approve forms redirect off-site by
  // design: WordPress connect returns to the customer's wp-admin (any
  // domain, sometimes plain http), and AI assistant connect returns to the
  // app's redirect URI (claude.ai, or http://127.0.0.1 for local clients).
  // So any http(s) target is allowed; javascript:, data: and other schemes
  // are not.
  "form-action 'self' https: http:",
  // Clickjacking: the modern equivalent of X-Frame-Options, which is also
  // sent below for older browsers.
  "frame-ancestors 'self'",
].join("; ");

/**
 * Directives that only mean something in an ENFORCING policy. Browsers ignore
 * upgrade-insecure-requests in a report-only header and log a console warning
 * on every page load saying so - which Lighthouse counts against Best
 * Practices. Add these when the header switches to Content-Security-Policy.
 */
export const CSP_ENFORCE_ONLY_DIRECTIVES = ["upgrade-insecure-requests"];

export const CSP_REPORT_PATH = "/api/csp-report";

export const securityHeaders: Array<{ key: string; value: string }> = [
  // Two years, subdomains included. `preload` is deliberately omitted: getting
  // onto the browser preload list is close to irreversible, and it should be a
  // considered decision rather than a side effect of adding headers.
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains",
  },
  // Stops a browser from second-guessing Content-Type - the trick that turns
  // an uploaded "image" into executable script.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // SAMEORIGIN rather than DENY: the public /r/[token] and /status/[token]
  // report pages are plausibly embedded by an agency in a client portal.
  // Third-party framing is still blocked.
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // Send the full URL to ourselves, only the origin cross-site. Dashboard
  // URLs carry website and scan ids that should not leak in Referer headers.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // This app never needs any of these; denying them means an injected script
  // cannot ask for them either.
  {
    key: "Permissions-Policy",
    value:
      "camera=(), microphone=(), geolocation=(), usb=(), magnetometer=(), browsing-topics=()",
  },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  cspHeader(),
];

/** The CSP header: enforced in production, report-only in development. */
export function cspHeader(env: string | undefined = process.env.NODE_ENV): { key: string; value: string } {
  if (env === "production") {
    return {
      key: "Content-Security-Policy",
      value: `${CSP_DIRECTIVES}; ${CSP_ENFORCE_ONLY_DIRECTIVES.join("; ")}; report-uri ${CSP_REPORT_PATH}`,
    };
  }
  return { key: "Content-Security-Policy-Report-Only", value: `${CSP_DIRECTIVES}; report-uri ${CSP_REPORT_PATH}` };
}
