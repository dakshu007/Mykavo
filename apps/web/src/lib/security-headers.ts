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
const DODO_CHECKOUT = "https://checkout.dodopayments.com";

/**
 * The CSP is shipped REPORT-ONLY first. A policy that is wrong by one
 * directive takes the whole site down, and no amount of reading source
 * beats real traffic for finding the one asset nobody remembered. Violations
 * go to /api/csp-report; once the reports are quiet, switch the header name
 * to `Content-Security-Policy` to start enforcing.
 *
 * HONEST LIMIT: script-src carries 'unsafe-inline'. Next.js emits inline
 * bootstrap scripts, and the alternative - per-request nonces - forces every
 * static page to render dynamically, which would cost this site most of its
 * caching for a partial XSS mitigation. So CSP here is NOT a strong XSS
 * defence. What it does still buy is real: object-src blocks plugin-based
 * attacks, base-uri stops <base> tag hijacking of every relative URL,
 * form-action stops a injected form posting credentials to another host, and
 * frame-ancestors blocks clickjacking.
 */
const CSP_DIRECTIVES = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${GTM} https://www.google-analytics.com`,
  // Next.js and Tailwind both emit inline styles; there is no nonce-free
  // alternative, and injected CSS is a far smaller prize than injected JS.
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' ${GA} ${GA_ANALYTICS} ${GTM}`,
  `frame-src 'self' ${DODO_CHECKOUT}`,
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  // No <object>/<embed>/<applet> anywhere in this app.
  "object-src 'none'",
  // Without this, an injected <base href> silently repoints every relative
  // URL on the page - including form posts and script sources.
  "base-uri 'self'",
  // Credentials and billing forms may only post back to us.
  `form-action 'self' ${DODO_CHECKOUT}`,
  // Clickjacking: the modern equivalent of X-Frame-Options, which is also
  // sent below for older browsers.
  "frame-ancestors 'self'",
  "upgrade-insecure-requests",
].join("; ");

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
  {
    key: "Content-Security-Policy-Report-Only",
    value: `${CSP_DIRECTIVES}; report-uri ${CSP_REPORT_PATH}`,
  },
];
