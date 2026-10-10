import { NextResponse } from "next/server";
import { z } from "zod";
import { safeFetch, UnsafeUrlError } from "@/lib/security/ssrf";
import { clientKey, rateLimit } from "@/lib/security/rate-limit";
import { parseUrlInput } from "@/lib/url";
import { mapWithBudget } from "@/lib/tools/broken-links";
import {
  MAX_RESOURCES_MEASURED,
  MAX_RESOURCE_BYTES,
  buildPageSizeReport,
  extractResources,
  type ResourceSize,
} from "@/lib/tools/page-size";
import { SAFE_FETCH_USER_MESSAGES } from "@/lib/tools/user-messages";

const bodySchema = z.object({
  url: z.string().trim().min(1).max(2048),
});

const USER_AGENT = "MyKavoBot/0.1 (+https://mykavo.app/bot; page size checker)";
/** Page fetch + resource budget stay well under ~25s in the worst case. */
const PAGE_TIMEOUT_MS = 8_000;
const RESOURCE_BUDGET_MS = 14_000;
const RESOURCE_TIMEOUT_MS = 6_000;
const RESOURCE_CONCURRENCY = 6;
/** Bandwidth cap per request across all resources - spec §60 cost control. */
const TOTAL_DOWNLOAD_BUDGET_BYTES = 25 * 1024 * 1024;

const NOT_MEASURED: ResourceSize = { kind: "not-measured" };

export async function POST(request: Request) {
  // Stricter than the single-fetch tools: one request downloads up to 40 files.
  const limit = rateLimit(`page-size:${clientKey(request)}`, { limit: 5, windowMs: 60_000 });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many requests - please wait a moment and try again." },
      { status: 429, headers: { "retry-after": String(limit.retryAfterSeconds) } },
    );
  }

  let input: z.infer<typeof bodySchema>;
  try {
    input = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Please enter a URL." }, { status: 400 });
  }

  const parsed = parseUrlInput(input.url);
  if (!parsed) {
    return NextResponse.json({ error: "That doesn't look like a valid URL." }, { status: 400 });
  }

  try {
    const page = await safeFetch(parsed.href, { timeoutMs: PAGE_TIMEOUT_MS, userAgent: USER_AGENT });
    if (page.status < 200 || page.status >= 300) {
      return NextResponse.json(
        { error: `That page returned HTTP ${page.status}, so there is nothing to measure. Check the URL and try again.` },
        { status: 400 },
      );
    }
    const contentType = page.headers.get("content-type") ?? "";
    if (contentType && !/html/i.test(contentType)) {
      return NextResponse.json({ error: "That URL isn't an HTML page. Enter the address of a web page." }, { status: 400 });
    }

    const resources = extractResources(page.body, page.finalUrl);
    let downloaded = 0;
    // Every resource fetch goes through safeFetch: SSRF-validated on each hop.
    const sizes = await mapWithBudget(
      resources.slice(0, MAX_RESOURCES_MEASURED),
      { concurrency: RESOURCE_CONCURRENCY, budgetMs: RESOURCE_BUDGET_MS },
      async (resource): Promise<ResourceSize> => {
        if (downloaded >= TOTAL_DOWNLOAD_BUDGET_BYTES) return NOT_MEASURED;
        try {
          const res = await safeFetch(resource.url, {
            timeoutMs: RESOURCE_TIMEOUT_MS,
            maxBytes: MAX_RESOURCE_BYTES,
            userAgent: USER_AGENT,
          });
          downloaded += res.bodyBytes;
          return { kind: "measured", bytes: res.bodyBytes, status: res.status };
        } catch (err) {
          if (err instanceof UnsafeUrlError) {
            if (err.code === "RESPONSE_TOO_LARGE") {
              downloaded += MAX_RESOURCE_BYTES;
              return { kind: "too-large" };
            }
            if (err.code === "TIMEOUT") return { kind: "failed", reason: "Timed out" };
            if (err.code === "BLOCKED_HOST" || err.code === "BLOCKED_IP") return { kind: "failed", reason: "Host not checked" };
          }
          return { kind: "failed", reason: "Couldn't download" };
        }
      },
      () => NOT_MEASURED,
    );

    const report = buildPageSizeReport({
      url: parsed.href,
      finalUrl: page.finalUrl,
      httpStatus: page.status,
      htmlBytes: page.bodyBytes,
      contentEncoding: page.headers.get("content-encoding"),
      contentLength: page.headers.get("content-length"),
      resources,
      sizes,
    });
    return NextResponse.json({ report });
  } catch (err) {
    if (err instanceof UnsafeUrlError) {
      return NextResponse.json({ error: SAFE_FETCH_USER_MESSAGES[err.code] }, { status: 400 });
    }
    console.error("[page-size] unexpected failure", err);
    return NextResponse.json({ error: "Something went wrong measuring that page. Please try again." }, { status: 500 });
  }
}
