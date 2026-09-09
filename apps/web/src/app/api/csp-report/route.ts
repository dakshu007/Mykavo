import { NextResponse } from "next/server";

/**
 * CSP violation collector.
 *
 * The policy ships report-only (see lib/security-headers), so browsers post
 * here instead of blocking. Reading these tells us exactly what a real policy
 * would break BEFORE it breaks it - far better evidence than reading source
 * and hoping nothing was missed.
 *
 * Unauthenticated by necessity: browsers post these without credentials, and
 * a violation report is not sensitive. That also makes it trivially
 * spammable, so the body is capped, the response is always 204, and only a
 * few fields are logged - never the whole report.
 */

const MAX_BODY_BYTES = 16_384;

/** The subset worth logging. Everything else is noise or attacker-controlled. */
interface CspReport {
  "document-uri"?: string;
  "violated-directive"?: string;
  "effective-directive"?: string;
  "blocked-uri"?: string;
}

function short(value: unknown, max = 200): string | undefined {
  return typeof value === "string" ? value.slice(0, max) : undefined;
}

export async function POST(request: Request): Promise<Response> {
  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) return new NextResponse(null, { status: 204 });

    const parsed = JSON.parse(raw) as { "csp-report"?: CspReport } & CspReport;
    // Browsers disagree: the older syntax nests under "csp-report", the
    // Reporting API sends the fields flat.
    const report = parsed["csp-report"] ?? parsed;

    console.warn(
      JSON.stringify({
        level: "warn",
        app: "csp",
        msg: "csp violation (report-only - nothing was blocked)",
        documentUri: short(report["document-uri"]),
        directive: short(report["violated-directive"] ?? report["effective-directive"], 80),
        blockedUri: short(report["blocked-uri"]),
      }),
    );
  } catch {
    // Malformed body - nothing useful to log, and never worth an error page.
  }

  // 204 regardless: browsers ignore the response, and an error status would
  // only invite retries.
  return new NextResponse(null, { status: 204 });
}
