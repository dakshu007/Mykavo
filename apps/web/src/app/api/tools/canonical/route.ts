import { NextResponse } from "next/server";
import { z } from "zod";
import { safeFetch, UnsafeUrlError } from "@/lib/security/ssrf";
import { clientKey, rateLimit } from "@/lib/security/rate-limit";
import { parseUrlInput } from "@/lib/url";
import {
  buildCanonicalReport,
  canonicalTargetToCheck,
  type CanonicalPageInput,
  type CanonicalTargetFetch,
} from "@/lib/tools/canonical";
import { SAFE_FETCH_USER_MESSAGES } from "@/lib/tools/user-messages";

const bodySchema = z.object({
  url: z.string().trim().min(1).max(2048),
});

/** Fetch the canonical target. Failures are reported in the result, never thrown. */
async function fetchTarget(url: string): Promise<CanonicalTargetFetch> {
  try {
    const res = await safeFetch(url, { timeoutMs: 8_000 });
    return {
      url,
      finalUrl: res.finalUrl,
      status: res.status,
      redirectCount: res.redirectChain.length,
      html: res.body,
      linkHeader: res.headers.get("link"),
      xRobotsTag: res.headers.get("x-robots-tag"),
      error: null,
    };
  } catch (err) {
    if (!(err instanceof UnsafeUrlError)) console.error("[canonical] target fetch failed", err);
    return {
      url,
      finalUrl: null,
      status: null,
      redirectCount: 0,
      html: "",
      linkHeader: null,
      xRobotsTag: null,
      error: err instanceof UnsafeUrlError ? SAFE_FETCH_USER_MESSAGES[err.code] : "We couldn't fetch the canonical URL.",
    };
  }
}

export async function POST(request: Request) {
  const limit = rateLimit(`canonical:${clientKey(request)}`, { limit: 10, windowMs: 60_000 });
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
    const fetched = await safeFetch(parsed.href);
    const pageInput: CanonicalPageInput = {
      url: parsed.href,
      finalUrl: fetched.finalUrl,
      httpStatus: fetched.status,
      redirectCount: fetched.redirectChain.length,
      html: fetched.body,
      linkHeader: fetched.headers.get("link"),
      xRobotsTag: fetched.headers.get("x-robots-tag"),
    };
    const targetUrl = canonicalTargetToCheck(pageInput);
    const target = targetUrl ? await fetchTarget(targetUrl) : null;
    const report = buildCanonicalReport(pageInput, target);
    return NextResponse.json({ report });
  } catch (err) {
    if (err instanceof UnsafeUrlError) {
      return NextResponse.json({ error: SAFE_FETCH_USER_MESSAGES[err.code] }, { status: 400 });
    }
    console.error("[canonical] unexpected failure", err);
    return NextResponse.json({ error: "Something went wrong checking that page. Please try again." }, { status: 500 });
  }
}
