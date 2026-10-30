import { NextResponse } from "next/server";

/**
 * Shared HTTP helpers for the MCP endpoint and its OAuth endpoints.
 *
 * CORS is open (*) on purpose: browser-based MCP clients and inspectors call
 * these from their own origin. No cookie is ever read on these routes - a
 * request is authorised only by the bearer token or client credentials it
 * carries - so an open origin grants nothing.
 */
export const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, Accept, Mcp-Protocol-Version, Mcp-Session-Id",
  "Access-Control-Expose-Headers": "WWW-Authenticate, Mcp-Protocol-Version",
  "Access-Control-Max-Age": "86400",
};

export function preflight(): NextResponse {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export function json(body: unknown, status = 200, extra: Record<string, string> = {}): NextResponse {
  return NextResponse.json(body, { status, headers: { ...CORS_HEADERS, "Cache-Control": "no-store", ...extra } });
}

/** An OAuth error response (RFC 6749 section 5.2). */
export function oauthError(error: string, description: string, status = 400, extra: Record<string, string> = {}): NextResponse {
  return json({ error, error_description: description }, status, extra);
}

/** Form-encoded (the OAuth standard) or JSON body, as a flat string map. */
export async function readParams(request: Request): Promise<Record<string, string>> {
  const type = request.headers.get("content-type") ?? "";
  const text = (await request.text()).slice(0, 16 * 1024);
  if (type.includes("application/json")) {
    try {
      const parsed: unknown = JSON.parse(text);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
      return Object.fromEntries(
        Object.entries(parsed as Record<string, unknown>).filter((e): e is [string, string] => typeof e[1] === "string"),
      );
    } catch {
      return {};
    }
  }
  return Object.fromEntries(new URLSearchParams(text));
}

/** Requester IP for rate limiting (Netlify sets x-nf-client-connection-ip). */
export function clientIp(request: Request): string {
  return (
    request.headers.get("x-nf-client-connection-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/**
 * Hands the browser back to the app after the consent form. A plain 303
 * would be blocked: the site's CSP limits form-action to our own origin,
 * and browsers apply that to redirects that follow a form post. A page that
 * navigates on its own (meta refresh, plus a link) is not a form submission.
 */
export function redirectPage(url: string, appLabel: string): NextResponse {
  const href = escapeHtml(url);
  const label = escapeHtml(appLabel);
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><meta http-equiv="refresh" content="0;url=${href}"><title>Returning to ${label}</title><style>body{font-family:system-ui,sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;background:#f6f6f4;color:#151515}a{color:#151515;font-weight:600}</style></head><body><p>Returning to ${label}&hellip; <a href="${href}">Continue</a></p></body></html>`;
  return new NextResponse(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" },
  });
}
