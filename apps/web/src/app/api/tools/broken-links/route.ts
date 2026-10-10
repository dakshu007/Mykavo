import { NextResponse } from "next/server";
import { z } from "zod";
import { safeFetch, UnsafeUrlError } from "@/lib/security/ssrf";
import { clientKey, rateLimit } from "@/lib/security/rate-limit";
import { parseUrlInput } from "@/lib/url";
import {
  MAX_LINKS_CHECKED,
  NOT_CHECKED_TIME_LIMIT,
  buildBrokenLinkReport,
  extractLinks,
  mapWithBudget,
  type LinkProbe,
} from "@/lib/tools/broken-links";
import { checkUrlStatus } from "@/lib/tools/status-check";
import { SAFE_FETCH_USER_MESSAGES } from "@/lib/tools/user-messages";

const bodySchema = z.object({
  url: z.string().trim().min(1).max(2048),
});

const USER_AGENT = "MyKavoBot/0.1 (+https://mykavo.app/bot; broken link checker)";
/** Page fetch + link budget stay well under ~25s in the worst case. */
const PAGE_TIMEOUT_MS = 8_000;
const LINK_BUDGET_MS = 14_000;
const LINK_TIMEOUT_MS = 5_000;
const LINK_CONCURRENCY = 5;

/** Forces GET - used to confirm a failure, since some servers mishandle HEAD. */
const getOnly = (url: string, init: RequestInit) => fetch(url, { ...init, method: "GET" });

/**
 * HEAD first (cheap, via status-check); any 4xx/5xx is re-checked with GET
 * before it is reported, so a server that only mishandles HEAD isn't
 * reported as broken. Every redirect hop is SSRF-validated.
 */
async function probeLink(url: string): Promise<LinkProbe> {
  const options = { timeoutMs: LINK_TIMEOUT_MS, userAgent: USER_AGENT };
  let result = await checkUrlStatus(url, options);
  if (result.status !== null && result.status >= 400) {
    result = await checkUrlStatus(url, { ...options, fetchImpl: getOnly });
  }
  return { status: result.status, finalUrl: result.finalUrl, redirectCount: result.redirectCount, error: result.error };
}

export async function POST(request: Request) {
  // Stricter than the single-fetch tools: one request fans out to up to 100 checks.
  const limit = rateLimit(`broken-links:${clientKey(request)}`, { limit: 5, windowMs: 60_000 });
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
        { error: `That page returned HTTP ${page.status}, so there are no links to check. Check the URL and try again.` },
        { status: 400 },
      );
    }
    const contentType = page.headers.get("content-type") ?? "";
    if (contentType && !/html/i.test(contentType)) {
      return NextResponse.json({ error: "That URL isn't an HTML page, so it has no links to check." }, { status: 400 });
    }

    const all = extractLinks(page.body, page.finalUrl);
    const links = all.slice(0, MAX_LINKS_CHECKED);
    const probes = await mapWithBudget(
      links,
      { concurrency: LINK_CONCURRENCY, budgetMs: LINK_BUDGET_MS },
      (link) => probeLink(link.url),
      (): LinkProbe => ({ status: null, finalUrl: null, redirectCount: 0, error: NOT_CHECKED_TIME_LIMIT }),
    );

    const report = buildBrokenLinkReport({
      url: parsed.href,
      finalUrl: page.finalUrl,
      httpStatus: page.status,
      links,
      totalLinks: all.length,
      probes,
      timeoutSeconds: LINK_TIMEOUT_MS / 1000,
    });
    return NextResponse.json({ report });
  } catch (err) {
    if (err instanceof UnsafeUrlError) {
      return NextResponse.json({ error: SAFE_FETCH_USER_MESSAGES[err.code] }, { status: 400 });
    }
    console.error("[broken-links] unexpected failure", err);
    return NextResponse.json({ error: "Something went wrong checking that page. Please try again." }, { status: 500 });
  }
}
