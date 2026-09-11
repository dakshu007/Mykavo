import { NextResponse } from "next/server";
import { z } from "zod";
import { safeFetch, UnsafeUrlError } from "@/lib/security/ssrf";
import { clientKey, rateLimit } from "@/lib/security/rate-limit";
import { parseUrlInput } from "@/lib/url";
import { extractSnapshot } from "@/lib/tools/snapshot";
import { compareForCompetitor } from "@/lib/tools/competitor";
import { SAFE_FETCH_USER_MESSAGES } from "@/lib/tools/user-messages";

const bodySchema = z.object({
  yourUrl: z.string().trim().min(1).max(2048),
  theirUrl: z.string().trim().min(1).max(2048),
});

export async function POST(request: Request) {
  // Half the limit of the single-URL tools: each call fetches TWO pages, so
  // the cost per request is double.
  const limit = rateLimit(`competitor:${clientKey(request)}`, {
    limit: 5,
    windowMs: 60_000,
  });
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
    return NextResponse.json({ error: "Please enter both URLs." }, { status: 400 });
  }

  const yours = parseUrlInput(input.yourUrl);
  const theirs = parseUrlInput(input.theirUrl);
  if (!yours) {
    return NextResponse.json({ error: "Your URL doesn't look valid." }, { status: 400 });
  }
  if (!theirs) {
    return NextResponse.json({ error: "The competitor URL doesn't look valid." }, { status: 400 });
  }
  if (yours.href === theirs.href) {
    return NextResponse.json(
      { error: "Those are the same URL - enter a competitor's page to compare against." },
      { status: 400 },
    );
  }

  // Both fetches go through safeFetch, so a submitted URL can never be used to
  // reach internal infrastructure (spec §11). Sequential rather than parallel:
  // this is an unauthenticated endpoint, and two concurrent outbound fetches
  // per request is a cheaper amplification primitive than one.
  try {
    const yourFetched = await safeFetch(yours.href);
    const theirFetched = await safeFetch(theirs.href);
    const report = compareForCompetitor(
      extractSnapshot(yourFetched, yours.href),
      extractSnapshot(theirFetched, theirs.href),
    );
    return NextResponse.json({ report });
  } catch (err) {
    if (err instanceof UnsafeUrlError) {
      return NextResponse.json({ error: SAFE_FETCH_USER_MESSAGES[err.code] }, { status: 400 });
    }
    console.error("[competitor] unexpected failure", err);
    return NextResponse.json(
      { error: "Something went wrong comparing those pages. Please try again." },
      { status: 500 },
    );
  }
}
